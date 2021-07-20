import Plugin, { tools } from '../../plugin'
import Options, { apiOrigin } from '../../options'

class PlateActivity extends Plugin {
  constructor() {
    super()
  }
  public name = '实物活动抽奖'
  public description = '自动参与实物活动抽奖'
  public version = '0.0.1'
  public author = 'ShmilyChen'

  public async load({
    defaultOptions,
    whiteList,
  }: {
    defaultOptions: options
    whiteList: Set<string>
  }) {
    // 实物活动抽奖
    defaultOptions.newUserData['plateActivity'] = false
    defaultOptions.info['plateActivity'] = {
      description: '实物活动抽奖',
      tip: '自动进行实物活动抽奖',
      type: 'boolean',
    }
    whiteList.add('plateActivity')
    defaultOptions.config['plateActivityUrl'] = 'http://qc.nbtester.com/content/images/plateActivity.json'
    defaultOptions.info['plateActivityUrl'] = {
      description: '活动列表链接',
      tip: '获取活动列表的链接',
      type: 'string'
    }
    whiteList.add('plateActivityUrl')
    this.loaded = true
  }

  public async start({ users }: { users: Map<string, User> }) {
    this.doActivity(users)
  }

  public async loop({
    cstMin,
    cstHour,
    users,
  }: {
    cstMin: number
    cstHour: number
    cstString: string
    users: Map<string, User>
  }) {
    if (cstMin === 1 && cstHour % 8 === 0) { this.doActivity(users) }
  }

  private async getActivityList() {
    const activityListXHR: XHRoptions = {
      url: <string>Options._.config["plateActivityUrl"],
      method: 'GET',
      responseType: 'json',
    }
    const activityList = await tools.XHR<ActivityInfo[]>(activityListXHR)
    if (activityList != undefined && activityList.response.statusCode == 200) {
      return activityList.body
    }
    return []
  }

  private async _doActivity(user: User, activityList: ActivityInfo[], awardList: award[]) {
    if (!user.userData['plateActivity']) return
    let userAwards: award = { nickname: user.nickname, awards: [] }
    for await (const activity of activityList) {
      const { name, sid } = activity
      let error = 0
      let activityGifts: activityGifts = { activityName: name, gifts: [] }
      await this.addLotteryTimes(user, name, sid)
      await tools.Sleep(10000)
      const activityCount = await this.getLotteryMytimes(user, sid)
      tools.Log(user.nickname, '实物抽奖', name, `可参加${activityCount}次`)
      await tools.Sleep(1500)
      for (let index = 0; index < activityCount; index++) {
        if (error > 3) break
        const { message, status } = await this.lotteryDo(user, sid)
        tools.Log(user.nickname, '实物抽奖', name, !message.includes('未中奖') && status === true ? `获奖信息：${message}` : message)
        if (!message.includes('未中奖') && status === true && !message.includes('优惠券') && !message.includes('头像框')) activityGifts.gifts.push(message)
        if (message.includes('点击过快，请稍后重试')) index--
        if (!status) error++
        await tools.Sleep(tools.random(10, 15) * 1000)
      }
      if (activityGifts.gifts.length > 0) userAwards.awards.push(activityGifts)
    }
    if (userAwards.awards.length > 0) awardList.push(userAwards)
  }

  private async doActivity(users: Map<string, User>) {
    const activityList: ActivityInfo[] = await this.getActivityList()
    tools.Log('实物抽奖', `获取到${activityList.length}个主站实物抽奖活动`)
    // const asyncTask = []
    let awardList: award[] = []
    for (const { 1: user } of users) {
      // asyncTask.push(this._doActivity(user, activityList, awardList))
      await this._doActivity(user, activityList, awardList)
    }

    // await Promise.all(asyncTask)

    if (awardList.length > 0) {
      let SCMeaasge = `# bilive_client 实物情况报告\n`
      for (const userAwards of awardList) {
        SCMeaasge += `# 用户 *****${userAwards.nickname}***** \n`
        for (const activityGifts of userAwards.awards) {
          SCMeaasge += `## 活动：*****${activityGifts.activityName}***** \n`
          for (let i = 0; i < activityGifts.gifts.length; i++) {
            SCMeaasge += `${i + 1}. ${activityGifts.gifts[i]}\n`
          }
        }
      }
      tools.emit('SCMSG', <systemMSG>{
        message: SCMeaasge,
        options: Options._
      })
    }
  }

  private async lotteryDo(user: User, sid: string) {
    const lotteryDoXHR: XHRoptions = {
      url: `${apiOrigin}/x/activity/lottery/do`,
      method: 'POST',
      body: `sid=${sid}&type=1&csrf=${user.csrf_token}`,
      responseType: 'json',
      cookieJar: user.jar,
    }
    const lotteryDo = await tools.XHR<bilibiliXHR<lotteryDoData[]>>(lotteryDoXHR)
    if (lotteryDo !== undefined && lotteryDo.response.statusCode === 200) {
      if (lotteryDo.body.code === 0) {
        return { message: lotteryDo.body.data[0].gift_name, status: true }
      } else if (lotteryDo.body.code === 75400) {
        await tools.Sleep(9000)
      }
      return { message: lotteryDo.body.message, status: false }
    }
    return { message: '', status: false }
  }

  private async getLotteryMytimes(user: User, sid: string) {
    const mytimesXHR: XHRoptions = {
      url: `${apiOrigin}/x/activity/lottery/mytimes?sid=${sid}`,
      method: 'GET',
      responseType: 'json',
      cookieJar: user.jar,
    }
    const mytimes = await tools.XHR<bilibiliXHR<mytimesData>>(mytimesXHR)
    if (mytimes !== undefined && mytimes.response.statusCode === 200 && mytimes.body.code === 0) {
      return mytimes.body.data.times
    }
    return 0
  }

  private async addLotteryTimes(user: User, name: string, sid: string) {
    const addtimesXHR: XHRoptions = {
      url: `${apiOrigin}/x/activity/lottery/addtimes`,
      method: 'POST',
      body: `sid=${sid}&action_type=3&csrf=${user.csrf_token}`,
      responseType: 'json',
      cookieJar: user.jar,
    }
    let error = 0
    for (let i = 0; i < 5 && error < 2; i++) {
      const addtimes = await tools.XHR<addtimesData>(addtimesXHR)
      if (addtimes !== undefined && addtimes.response.statusCode === 200) {
        if (addtimes.body.code === 0) continue
        if (addtimes.body.code === 75003) {
          tools.Log(user.nickname, '实物抽奖', name, '活动已结束')
          return false
        } else {
          tools.Log(user.nickname, '实物抽奖', name, addtimes.body.message)
          return false
        }
      } else {
        i--
        error++
      }
      await tools.Sleep(tools.random(3, 7) * 1000)
    }
    return true
  }
}

interface ActivityInfo {
  name: string
  sid: string
}

interface addtimesData {
  code: number
  message: string
  ttl: number
}

interface mytimesData {
  times: number
}

interface lotteryDoData {
  id: number
  mid: number
  ip: number
  num: number
  gift_id: number
  gift_name: string
  gift_type: number
  img_url: string
  type: number
  ctime: number
  cid: number
  extra: {}
}

interface award {
  nickname: string
  awards: activityGifts[]
}

interface activityGifts {
  activityName: string
  gifts: string[]
}
export default new PlateActivity()
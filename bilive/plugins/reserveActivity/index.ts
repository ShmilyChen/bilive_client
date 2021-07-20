import Plugin, { tools } from '../../plugin'
import Options, { apiOrigin } from '../../options'

class ReserveActivity extends Plugin {
  constructor() {
    super()
  }
  public name = '直播预约抽奖'
  public description = '自动参与直播预约抽奖'
  public version = '0.0.1'
  public author = 'ShmilyChen'

  public async load({
    defaultOptions,
    whiteList,
  }: {
    defaultOptions: options
    whiteList: Set<string>
  }) {
    // 风纪任务
    defaultOptions.newUserData['reserveActivity'] = false
    defaultOptions.info['reserveActivity'] = {
      description: '直播预约抽奖',
      tip: '自动进行直播预约抽奖',
      type: 'boolean',
    }
    whiteList.add('reserveActivity')
    defaultOptions.config['reserveActivityUrl'] = 'https://gitee.com/java_cn/BILIBLI_RES/raw/master/HNPLATE/reserveSid.json'
    defaultOptions.info['reserveActivityUrl'] = {
      description: '直播预约链接',
      tip: '获取直播预约列表的链接',
      type: 'string'
    }
    whiteList.add('reserveActivityUrl')
    this.loaded = true
  }

  public async start({ users }: { users: Map<string, User> }) {
    this.doActivity(users)
  }

  private LotteryRecord: LotteryRecord = {}

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
      url: <string>Options._.config["reserveActivityUrl"],
      method: 'GET',
      responseType: 'json',
    }
    const list: number[] = []
    const activityList = await tools.XHR<ActivityList>(activityListXHR)
    if (activityList != undefined && activityList.response.statusCode == 200) {
      const now: number = Date.now() / 1000
      for (const key in activityList.body) {
        if (Object.prototype.hasOwnProperty.call(activityList.body, key)) {
          const element = activityList.body[key]
          if (element.etime > now && element.stime <= now && element.state === 100) {
            list.push(element.sid)
          }
        }
      }
    }
    return list
  }

  private async _doActivity(user: User, activityList: number[]) {
    if (!user.userData['reserveActivity']) return
    this.LotteryRecord[user.uid] = this.LotteryRecord[user.uid] || []
    for await (const activity of activityList) {
      if (this.LotteryRecord[user.uid].includes(activity)) continue
      await this.lotteryDo(user, activity);
      await tools.Sleep(tools.random(5, 10) * 1000)
    }
  }

  private async doActivity(users: Map<string, User>) {
    const activityList: number[] = await this.getActivityList()
    tools.Log('直播预约抽奖', `获取到${activityList.length}个直播预约抽奖活动`)
    const asyncTask = []
    for (const { 1: user } of users) {
      asyncTask.push(this._doActivity(user, activityList))
      // await this._doActivity(user, activityList)
    }
    await Promise.all(asyncTask)
  }

  private async lotteryDo(user: User, sid: number) {
    const lotteryDoXHR: XHRoptions = {
      url: `${apiOrigin}/x/space/reserve`,
      method: 'POST',
      body: `sid=${sid}&csrf=${user.csrf_token}`,
      responseType: 'json',
      cookieJar: user.jar,
    }
    const lotteryDo = await tools.XHR<bilibiliXHR<object>>(lotteryDoXHR)
    if (lotteryDo !== undefined && lotteryDo.response.statusCode === 200) {
      if (lotteryDo.body.code === 0) {
        this.LotteryRecord[user.uid].push(sid)
      } else {
        tools.Log(user.nickname, "直播预约抽奖", `参与失败`, sid, lotteryDo.body.message);
        if (lotteryDo.body.message.includes("重复参加")) this.LotteryRecord[user.uid].push(sid)
      }
    }
  }
}
interface ActivityList {
  [index: string]: ActivityInfo
}

interface ActivityInfo {
  sid: number
  name: string
  total: number
  stime: number
  etime: number
  isFollow: number
  state: number
  oid: string
  type: number
  upmid: number
  reserveRecordCtime: number
  livePlanStartTime: number
  upActVisible: number
  lotteryType: number
  prizeInfo: PrizeInfo
  reserveTotalShowLimit: number
}

interface PrizeInfo {
  text: string
  jumpUrl: string
}

interface LotteryRecord {
  [index: string]: number[]
}

export default new ReserveActivity()
import Plugin, { tools } from '../../plugin'

class JudGement extends Plugin {
  constructor() {
    super()
  }
  public name = '风纪插件'
  public description = '执行风纪功能'
  public version = '0.0.1'
  public author = 'ShmilyChen'

  public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
    // 风纪任务
    defaultOptions.newUserData['judGement'] = false
    defaultOptions.info['judGement'] = {
      description: '风纪委员',
      tip: '自动进行风纪委员活动',
      type: 'boolean'
    }
    whiteList.add('judGement')
    this.loaded = true
  }

  public async start({ users }: { users: Map<string, User> }) {
    this.doJudGement(users)
  }

  public async loop({ cstMin, cstHour, users }: { cstMin: number, cstHour: number, users: Map<string, User> }) {
    // 每天08:30, 12:30,16:30, 20:30做任务
    if (cstHour > 7 && cstMin === 30 && cstHour % 4 === 0) this.doJudGement(users)
  }

  private async doJudGement(users: Map<string, User>) {
    for (const { 1: user } of users) {
      if (!user.userData['judGement']) continue
      const flag = await this.getJudGementInfo(user)
      await tools.Sleep(5 * 1000)
      if (flag) {
        let error = 0
        for (let index = 0; index < 30 && error < 5; index++) {
          const juryId = await this.getJuryID(user)
          await tools.Sleep(5 * 1000)
          if (juryId > 0) {
            let i = 0
            for (; i < 3; i++) {
              const voteFlog = await this.doVote(juryId, user)
              if (voteFlog) {
                break
              }
              await tools.Sleep(5 * 1000)
            }
            if (i < 3) {
              await tools.Sleep(tools.random(5, 30) * 1000)
              continue
            }
          } else if (juryId === -1) {
            break
          } else {
            error++
          }
        }
        const caseListXHR: XHRoptions = {
          url: `https://api.bilibili.com/x/credit/jury/caseList?jsonp=jsonp&pn=1&ps=20&_=${Date.now()}`,
          method: 'GET',
          json: true,
          headers: { referer: 'https://www.bilibili.com/judgement/index' },
          jar: user.jar
        }
        const caseList = await tools.XHR<bilibiliXHR<caseList[]>>(caseListXHR)
        if (caseList !== undefined && caseList.response.statusCode === 2000 && caseList.body.code === 0) {
          for (const data of caseList.body.data.filter(data => data.vote === 0)) {
            await this.doVote(data.id, user)
            await tools.Sleep(tools.random(5, 20) * 1000)
          }
        }

      }
      tools.Log(user.nickname, '风纪任务', '今日任务已完成')
      await tools.Sleep(5 * 1000)
    }
  }

  private async getJudGementInfo(user: User) {
    const xhr: XHRoptions = {
      url: "https://api.bilibili.com/x/credit/jury/jury",
      json: true,
      cookieJar: user.jar,
      headers: { referer: 'https://www.bilibili.com/judgement/index' }
    }
    const judGementInfo = await tools.XHR<bilibiliXHR<juryData>>(xhr)
    if (judGementInfo !== undefined && judGementInfo.response.statusCode === 200) {
      if (judGementInfo.body.code === 0) {
        const data = judGementInfo.body.data
        tools.Log(user.nickname, '风纪委员', `${data.uname}：已参与众裁${data.caseTotal}次，剩余任期${data.restDays}天`)
        return true
      } else {
        tools.Log(user.nickname, '风纪委员', judGementInfo.body.message)
      }
    } else {
      tools.Log(user.nickname, '风纪委员', '获取信息失败')
    }
    return false
  }

  /**
   * 获取风纪投票id
   * @param user 
   */
  private async getJuryID(user: User): Promise<-1 | 0 | number> {
    const xhr: XHRoptions = {
      url: 'https://api.bilibili.com/x/credit/jury/caseObtain',
      method: 'POST',
      json: true,
      body: `jsonp=jsonp&csrf=${tools.getCookie(user.jar, 'bili_jct')}`,
      headers: { referer: 'https://www.bilibili.com/judgement/index' },
      jar: user.jar
    }
    const juryId = await tools.XHR<bilibiliXHR<juryIdData>>(xhr)
    if (juryId !== undefined && juryId.response.statusCode === 200) {
      if (juryId.body.code === 0) {
        if ((typeof juryId.body.data.id) === 'number') {
          return juryId.body.data.id
        }
      } else {
        if (juryId.body.code === 25014 || juryId.body.code === 25008) {
          tools.Log(user.nickname, '风纪任务', '今日已完成风纪任务')
          return -1
        }
        tools.Log(user.nickname, '风纪获取题目失败', juryId.body.message)
      }
    }
    return 0
  }


  private async doVote(id: number, user: User) {
    // 获取案件信息
    const juryCaseXHR: XHRoptions = {
      url: `https://api.bilibili.com/x/credit/jury/juryCase?jsonp=jsonp&cid=${id}&_=${Date.now()}`,
      method: 'GET',
      json: true,
      headers: { referer: `https://www.bilibili.com/judgement/vote/${id}` },
      jar: user.jar
    }
    const juryCase = await tools.XHR<bilibiliXHR<juryCaseData>>(juryCaseXHR)
    if (!(juryCase !== undefined && juryCase.response.statusCode === 200)) {
      return false
    }
    const juryCaseData = juryCase.body.data
    tools.Log(user.nickname, '风纪新案件', `案件id：${id}用户:${juryCaseData.uname}涉嫌:${juryCaseData.punishTitle}，发布内容:${juryCaseData.originContent}`)
    await tools.Sleep(tools.random(120, 180) * 1000)
    // 获取大家的投票结果
    const caseListXHR: XHRoptions = {
      url: `https://api.bilibili.com/x/credit/jury/caseList?jsonp=jsonp&pn=1&ps=20&_=${Date.now()}`,
      method: 'GET',
      json: true,
      headers: { referer: 'https://www.bilibili.com/judgement/index' },
      jar: user.jar
    }
    const caseList = await tools.XHR<bilibiliXHR<caseList[]>>(caseListXHR)
    let vote = 4
    // 获取大家投票的结果，取投票最多的，若无，则默认投删除
    if (caseList !== undefined && caseList.response.statusCode === 200 && caseList.body.code === 0) {
      caseList.body.data.filter((data => data.id === id)).forEach((data) => {
        if (data.voteBreak + data.voteDelete > data.voteRule) {
          if (data.voteBreak > data.voteDelete) {
            vote = 1
          }
        } else {
          vote = 2
        }
      })
    }
    await tools.Sleep(tools.random(5, 10) * 1000)
    // 进行风纪投票
    const voteXHR: XHRoptions = {
      url: `https://api.bilibili.com/x/credit/jury/vote`,
      method: 'POST',
      json: true,
      body: `jsonp=jsonp&cid=${id}&vote=${vote}&content=&likes=&hates=&attr=0&csrf=${tools.getCookie(user.jar, 'bili_jct')}`,
      headers: { referer: `https://www.bilibili.com/judgement/vote/${id}` },
      jar: user.jar
    }
    const voteData = await tools.XHR<vote>(voteXHR)
    if (voteData !== undefined && voteData.response.statusCode === 200 && voteData.body.code === 0) {
      const voteInfo = { 1: '封禁', 2: '否', 3: '弃权', 4: '删除' }
      // @ts-ignore
      tools.Log(user.nickname, '风纪投票', `案件id：${id}，投票：${voteInfo[vote] || vote}`)
      return true
    }
    tools.Log(user.nickname, '风纪投票', `案件id：，投票：失败`)
    return false
  }

}
interface juryData {
  caseTotal: number
  face: string
  restDays: number
  rightRadio: number
  status: number
  uname: string
}

interface juryIdData {
  id: number
}

interface juryCaseData {
  blockedDays: number
  case_type: number
  ctime: number
  endTime: number
  expiredMillis: number
  face: string
  id: number
  judgeType: number
  mid: number
  mtime: number
  originContent: string
  originTitle: string
  originType: number
  originUrl: string
  punishResult: number
  punishTitle: string
  putTotal: number
  reasonType: number
  relationId: string
  startTime: number
  status: number
  statusTitle: string
  uname: string
  vote: number
  voteBreak: number
  voteDelete: number
  voteRule: number
}

interface vote {
  code: number
  message: string
  ttl: number
}

interface caseList {
  blockedDays: number
  case_type: number
  ctime: number
  endTime: number
  face: string
  id: number
  judgeType: number
  mid: number
  mtime: number
  originContent: string
  originTitle: string
  originType: number
  originUrl: string
  punishResult: number
  punishTitle: string
  putTotal: number
  reasonType: number
  relationId: string
  startTime: number
  status: number
  uname: string
  vote: number
  voteBreak: number
  voteDelete: number
  voteRule: number
  voteTime: number
}

export default new JudGement()
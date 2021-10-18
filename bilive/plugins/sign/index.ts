import Plugin, { tools, AppClient } from '../../plugin'

class Sign extends Plugin {
  constructor() {
    super()
  }
  public name = '自动签到'
  public description = '每天自动签到'
  public version = '0.0.2'
  public author = 'lzghzr'
  /**
   * 任务表
   *
   * @private
   * @type {Map<string, boolean>}
   * @memberof Sign
   */
  private _signList: Map<string, boolean> = new Map()
  public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
    // 自动签到
    defaultOptions.newUserData['doSign'] = false
    defaultOptions.info['doSign'] = {
      description: '自动签到',
      tip: '每天自动签到',
      type: 'boolean'
    }
    whiteList.add('doSign')
    this.loaded = true
  }
  public async start({ users }: { users: Map<string, User> }) {
    this._getSignInfo(users)
  }
  public async loop({ cstMin, cstHour, cstString, users }: { cstMin: number, cstHour: number, cstString: string, users: Map<string, User> }) {
    // 每天 00:10 刷新任务
    if (cstString === '00:10') this._signList.clear()
    // 每天 04:30, 12:30, 20:30 做任务
    if (cstMin === 30 && cstHour % 8 === 4) this._getSignInfo(users)
  }
  /**
   * 获取签到信息
   *
   * @private
   * @param {Map<string, User>} users
   * @memberof Sign
   */
  private _getSignInfo(users: Map<string, User>) {
    users.forEach(async (user, uid) => {
      if (this._signList.get(uid) || !user.userData['doSign']) return
      const sign: XHRoptions = {
        url: `https://api.live.bilibili.com/rc/v2/Sign/getSignInfo?${AppClient.signQueryBase(user.tokenQuery)}`,
        responseType: 'json',
        headers: user.headers
      }
      const getSignInfo = await tools.XHR<getSignInfo>(sign, 'Android')
      if (getSignInfo !== undefined && getSignInfo.response.statusCode === 200) {
        if (getSignInfo.body.code === 0) {
          if (getSignInfo.body.data.is_signed) tools.Log(user.nickname, '签到', '今日已签到过')
          else await this._doSign(user, uid)
        }
        else tools.Log(user.nickname, '自动签到', getSignInfo.body)
      }
      else tools.Log(user.nickname, '自动签到', '网络错误')
    })
  }
  /**
   * 自动签到
   *
   * @private
   * @param {User} user
   * @param {string} uid
   * @memberof Sign
   */
  private async _doSign(user: User, uid: string) {
    const sign: XHRoptions = {
      url: `https://api.live.bilibili.com/rc/v1/Sign/doSign?${AppClient.signQueryBase(user.tokenQuery)}`,
      responseType: 'json',
      headers: user.headers
    }
    const doSign = await tools.XHR<doSign>(sign, 'Android')
    if (doSign !== undefined && doSign.response.statusCode === 200) {
      if (doSign.body.code === 0) {
        this._signList.set(uid, true)
        tools.Log(user.nickname, '自动签到', '已签到')
      }
      else tools.Log(user.nickname, '自动签到', doSign.body)
    }
    else tools.Log(user.nickname, '自动签到', '网络错误')
  }
}
/**
 * 签到信息
 *
 * @interface getSignInfo
 */
interface getSignInfo {
  code: number
  message: string
  ttl: number
  data: getSignInfoData
}
interface getSignInfoData {
  is_signed: boolean
  days: number
  sign_days: number
  h5_url: string
  days_award: getSignInfoDataDaysAward[]
  awards: getSignInfoDataAward[]
}
interface getSignInfoDataAward {
  count: number
  text: string
  award: string
  img: getSignInfoDataImg
}
interface getSignInfoDataDaysAward {
  id: number
  award: string
  count: number
  day: number
  text: string
  img: getSignInfoDataImg
}
interface getSignInfoDataImg {
  src: string
  width: number
  height: number
}
/**
 * 签到返回
 *
 * @interface doSign
 */
interface doSign {
  code: number
  msg: string
  ttl: number
  data: signInfoData
}
interface signInfoData {
  text: string
  specialText: string
  allDays: number
  hadSignDays: number
  isBonusDay: number
}

export default new Sign()

import Plugin, { tools, AppClient } from '../../plugin'

class Bag extends Plugin {
  constructor() {
    super()
  }
  public name = '包裹道具'
  public description = '领取直播包裹道具'
  public version = '0.0.2'
  public author = 'lzghzr'
  /**
   * 任务表
   *
   * @private
   * @type {Map<string, boolean>}
   * @memberof Bag
   */
  private _getBagList: Map<string, boolean> = new Map()
  public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
    // 包裹道具
    defaultOptions.newUserData['getBag'] = false
    defaultOptions.info['getBag'] = {
      description: '包裹道具',
      tip: '领取直播包裹道具',
      type: 'boolean'
    }
    whiteList.add('getBag')
    this.loaded = true
  }
  public async start({ users }: { users: Map<string, User> }) {
    this._getBag(users)
  }
  public async loop({ cstMin, cstHour, cstString, users }: { cstMin: number, cstHour: number, cstString: string, users: Map<string, User> }) {
    // 每天 00:10 刷新任务
    if (cstString === '00:10') this._getBagList.clear()
    // 每天 04:30, 12:30, 20:30 做任务
    if (cstMin === 30 && cstHour % 8 === 4) this._getBag(users)
  }
  /**
   * 包裹道具
   *
   * @private
   * @memberof Bag
   */
  private _getBag(users: Map<string, User>) {
    users.forEach(async (user, uid) => {
      if (this._getBagList.get(uid) || !user.userData['getBag']) return
      const getBag: XHRoptions = {
        url: `https://api.live.bilibili.com/gift/v2/live/m_receive_daily_bag?${AppClient.signQueryBase(user.tokenQuery)}`,
        responseType: 'json',
        headers: user.headers
      }
      const getBagGift = await tools.XHR<dailyBag>(getBag, 'Android')
      if (getBagGift !== undefined && getBagGift.response.statusCode === 200) {
        if (getBagGift.body.code === 0) {
          this._getBagList.set(uid, true)
          tools.Log(user.nickname, '包裹道具', '已获取每日包裹道具')
        }
        else tools.Log(user.nickname, '包裹道具', getBagGift.body)
      }
      else tools.Log(user.nickname, '包裹道具', '网络错误')
    })
  }
}
/**
 * 每日包裹礼物
 *
 * @interface dailyBag
 */
interface dailyBag {
  code: number
  msg: string
  message: string
  data: dailyBagDatum[] | []
}
interface dailyBagDatum {
  type: number
  taskimg: string
  gift_list: dailyBagDatumGiftList[]
  bag_name: string
  bag_source: string
  giftTypeName: string
}
interface dailyBagDatumGiftList {
  gift_id: string
  gift_num: number
  expireat: string
  img: string
}

export default new Bag()

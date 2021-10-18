import Plugin, { tools, AppClient } from '../../plugin'

class SendGift extends Plugin {
  constructor() {
    super()
  }
  public name = '自动送礼增强版'
  public description = '自动清空在指定时间内的礼物'
  public version = '0.2.0'
  public author = 'ShmilyChen'
  public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
    // 自动送礼
    defaultOptions.newUserData['sendGift'] = false
    defaultOptions.info['sendGift'] = {
      description: '自动送礼增强',
      tip: '自动送出剩余时间不足24小时的礼物',
      type: 'boolean'
    }
    whiteList.add('sendGift')
    // 自动送礼uid
    defaultOptions.newUserData['sendGiftUids'] = []
    defaultOptions.info['sendGiftUids'] = {
      description: '自动送礼uid',
      tip: '要自动送出礼物的主播uid,多个请用以\",\"间隔分割',
      type: 'numberArray'
    }
    whiteList.add('sendGiftUids')
    // 自动送礼时间限制
    defaultOptions.newUserData['sendGiftDay'] = 1
    defaultOptions.info['sendGiftDay'] = {
      description: '自动送礼多少天内的礼物',
      tip: '自动送出礼物在多少天内过期的礼物',
      type: 'number'
    }
    whiteList.add('sendGiftDay')
    // 自动送礼房间
    defaultOptions.newUserData['sendGiftRoom'] = 0
    defaultOptions.info['sendGiftRoom'] = {
      description: '自动送礼房间',
      tip: '要自动送出礼物的房间号',
      type: 'number'
    }
    whiteList.add('sendGiftRoom')
    // 是否养20级勋章
    defaultOptions.newUserData['sendGiftBy20'] = true
    defaultOptions.info['sendGiftBy20'] = {
      description: '是否养20级勋章',
      tip: '自动是否养20级勋章',
      type: 'boolean'
    }
    whiteList.add('sendGiftBy20')
    this.loaded = true
  }
  public async start({ users }: { users: Map<string, User> }) {
    setTimeout(() => {
      this._sendGift(users)
    }, 30 * 1000)
  }
  public async loop({ cstMin, cstHour, cstString, users }: { cstMin: number, cstHour: number, cstString: string, users: Map<string, User> }) {
    // 每天04:30, 12:30, 13:55, 20:30, 23:55自动送礼
    if (cstMin === 30 && cstHour % 8 === 4 || cstString === '13:55' || cstString === '23:55') this._sendGift(users)
  }
  /**
   * 自动送礼
   *
   * @private
   * @memberof SendGift
   */
  private _sendGift(users: Map<string, User>) {
    users.forEach(async user => {
      if (!user.userData['sendGift']) return
      // 获取包裹列表
      const bagList = await this.getBagInfo(user)
      // 剩余礼物赠送勋章列表
      await this.sendGiftByMedal(user, bagList)
      if (user.userData['sendGiftRoom'] === 0) return
      const roomID = user.userData.sendGiftRoom
      // 获取房间信息
      const room: XHRoptions = {
        url: `https://api.live.bilibili.com/room/v1/Room/mobileRoomInit?id=${roomID}}`,
        responseType: 'json'
      }
      const roomInit = await tools.XHR<roomInit>(room, 'Android')
      if (roomInit !== undefined && roomInit.response.statusCode === 200) {
        if (roomInit.body.code === 0) {
          // masterID
          const { uid, room_id } = roomInit.body.data
          // 获取包裹信息
          for (const giftData of bagList) {
            if (giftData.expireat > 0 && giftData.expireat < 24 * 60 * 60 && giftData.gift_num > 0) {
              // expireat单位为分钟, 永久礼物值为0
              const flog = await this.sendGift(uid, giftData.gift_id, giftData.gift_num, giftData.id, room_id, user)
              if (flog === -1) return
            }
          }
        }
        else tools.Log(user.nickname, '自动送礼', '房间信息', roomInit.body)
      }
      else tools.Log(user.nickname, '自动送礼', '房间信息', '网络错误')
    })
  }
  /**
   * 赠送礼物
   * @param mid 主播uid
   * @param gift_id 礼物id
   * @param gift_num 礼物数量
   * @param bag_id 包裹id
   * @param room_id 房间号（长号）
   * @param user 用户
   */
  private async sendGift(mid: string | number, gift_id: number, gift_num: number, bag_id: number, room_id: number, user: User) {
    if (mid === user.biliUID) return false
    const send: XHRoptions = {
      method: 'POST',
      url: `https://api.live.bilibili.com/gift/v2/live/bag_send?${AppClient.signQueryBase(user.tokenQuery)}`,
      body: `uid=${user.uid}&ruid=${mid}&gift_id=${gift_id}&gift_num=${gift_num}&bag_id=${bag_id}&biz_id=${room_id}&rnd=${AppClient.RND}&biz_code=live&jumpFrom=21002`,
      responseType: 'json',
      headers: user.headers
    }
    const sendBag = await tools.XHR<sendBag>(send, 'Android')
    if (sendBag !== undefined && sendBag.response.statusCode === 200) {
      if (sendBag.body.code === 0) {
        const sendBagData = sendBag.body.data
        tools.Log(user.nickname, '自动送礼', `向房间 ${room_id} 赠送 ${sendBagData.gift_num} 个${sendBagData.gift_name}`)
        return true
      } else if (sendBag.body.code === 200030) {
        tools.Log(user.nickname, '自动送礼', sendBag.body.message)
        return -1
      }
      else tools.Log(user.nickname, '自动送礼', sendBag.body)
    }
    else tools.Log(user.nickname, '自动送礼', '网络错误')
    await tools.Sleep(3000)
    return false
  }
  private async getBagInfo(user: User): Promise<bagInfoData[]> {
    const bag: XHRoptions = {
      url: `https://api.live.bilibili.com/gift/v2/gift/m_bag_list?${AppClient.signQueryBase(user.tokenQuery)}`,
      responseType: 'json',
      headers: user.headers
    }
    const bagInfo = await tools.XHR<bagInfo>(bag, 'Android')
    if (bagInfo !== undefined && bagInfo.response.statusCode === 200) {
      if (bagInfo.body.code === 0) {
        return bagInfo.body.data
      } else {
        tools.Log(user.nickname, '自动送礼', '包裹信息', bagInfo.body)
      }
    }
    return new Array<bagInfoData>()
  }
  /**
   * 获取粉丝勋章列表，并处理数据
   * @param user 
   * 
   */
  private async getMedalList(user: User): Promise<medalInfo[]> {
    let fansMedalList = new Array<FansMedalList>()
    let list = new Array<medalInfo>()
    for (let i = 1; i <= 1000 / 10; i++) {
      const medalList: XHRoptions = {
        url: `https://api.live.bilibili.com/i/api/medal?page=${i}&pageSize=10`,
        responseType: 'json',
        cookieJar: user.jar,
        headers: user.headers,
      }
      const medalListInfo = await tools.XHR<bilibiliXHR<medelData>>(medalList)
      if (medalListInfo !== undefined && medalListInfo.response.statusCode === 200) {
        if (medalListInfo.body.code === 0) {
          fansMedalList = fansMedalList.concat(medalListInfo.body.data.fansMedalList.filter(medal => medal.level <= 20))
          if (medalListInfo.body.data.pageinfo.totalpages <= i) break
          await tools.Sleep(3 * 1000)
        } else {
          tools.Log(user.nickname, '勋章信息', medalListInfo.body)
          i-- && await tools.Sleep(3 * 1000)
        }
      }
    }
    const uids = <Array<number>>user.userData['sendGiftUids']
    uids.forEach((uid) => {
      fansMedalList
        .sort((a, b) => a.level - b.level)
        .forEach((fansMedal) => {
          if (fansMedal.level % 20 === 0 && !user.userData['sendGiftBy20']) return
          if (uid === fansMedal.target_id) {
            if (fansMedal.status === 1) {
              list.unshift({
                feedNum: fansMedal.day_limit - fansMedal.today_feed,
                mid: fansMedal.target_id,
                roomid: fansMedal.roomid
              })
            } else {
              list.push({
                feedNum: fansMedal.day_limit - fansMedal.today_feed,
                mid: fansMedal.target_id,
                roomid: fansMedal.roomid
              })
            }
          }
        })
    })
    // 将未插入队列的勋章插入队列，如果有佩戴勋章，进入队列顶部
    fansMedalList.forEach((fansMedal) => {
      if (uids.indexOf(fansMedal.target_id) < 0)
        if (fansMedal.status === 1) {
          list.unshift({
            feedNum: fansMedal.day_limit - fansMedal.today_feed,
            mid: fansMedal.target_id,
            roomid: fansMedal.roomid
          })
        } else {
          list.push({
            feedNum: fansMedal.day_limit - fansMedal.today_feed,
            mid: fansMedal.target_id,
            roomid: fansMedal.roomid
          })
        }
    })
    return list
  }
  private async sendGiftByMedal(user: User, bagList: bagInfoData[]) {
    const medalInfo = await this.getMedalList(user)
    for (const medal of medalInfo) {
      if (medal.mid === user.biliUID) continue
      if (medal.feedNum === 0) continue
      for (const bag of bagList) {
        if (bag.gift_num === 0) continue
        if (bag.expireat <= 0 || bag.expireat > <number>user.userData['sendGiftDay'] * 24 * 60 * 60) break
        let gift_value
        switch (bag.gift_id) {
          case 1:
            // 辣条
            gift_value = 1
            break
          case 6:
            // 亿圆
            gift_value = 10
            break
          case 30607:
            // 小心心
            gift_value = 50
            break
          default: continue
        }
        let send_num = Math.floor(medal.feedNum / gift_value)
        if (send_num >= bag.gift_num) send_num = bag.gift_num
        if (send_num > 0) {
          const flog = await this.sendGift(medal.mid, bag.gift_id, send_num, bag.id, medal.roomid, user)
          if (flog === -1) return
          if (flog) {
            bag.gift_num -= send_num
            medal.feedNum -= send_num * gift_value
          }
        }
      }
    }
    tools.Log(user.nickname, '刷粉丝榜', '已完成')
  }
}

/**
 * 房间信息
 *
 * @interface roomInit
 */
interface roomInit {
  code: number
  msg: string
  message: string
  data: roomInitDataData
}
interface roomInitDataData {
  room_id: number
  short_id: number
  uid: number
  need_p2p: number
  is_hidden: boolean
  is_locked: boolean
  is_portrait: boolean
  live_status: number
  hidden_till: number
  lock_till: number
  encrypted: boolean
  pwd_verified: boolean
}
/**
 * 包裹信息
 *
 * @interface bagInfo
 */
interface bagInfo {
  code: number
  msg: string
  message: string
  data: bagInfoData[]
}
interface bagInfoData {
  id: number
  uid: number
  gift_id: number
  gift_num: number
  expireat: number
  gift_type: number
  gift_name: string
  gift_price: string
  img: string
  count_set: string
  combo_num: number
  super_num: number
}
/**
 * 赠送包裹礼物
 *
 * @interface sendBag
 */
interface sendBag {
  code: number
  msg: string
  message: string
  data: sendBagData
}
interface sendBagData {
  tid: string
  uid: number
  uname: string
  ruid: number
  rcost: number
  gift_id: number
  gift_type: number
  gift_name: string
  gift_num: number
  gift_action: string
  gift_price: number
  coin_type: string
  total_coin: number
  metadata: string
  rnd: string
}

interface medelData {
  medalCount: number
  count: number
  fansMedalList: FansMedalList[]
  name: string
  pageinfo: Pageinfo
}

interface FansMedalList {
  uid: number
  target_id: number
  medal_id: number
  score: number
  level: number
  intimacy: number
  status: number
  source: number
  receive_channel: number
  is_receive: number
  master_status: number
  receive_time: string
  today_intimacy: number
  last_wear_time: number
  is_lighted: number
  medal_level: number
  next_intimacy: number
  day_limit: number
  medal_name: string
  master_available: number
  guard_type: number
  lpl_status: number
  can_delete: boolean
  target_name: string
  target_face: string
  live_stream_status: number
  icon_code: number
  icon_text: string
  rank: string
  medal_color: number
  medal_color_start: number
  medal_color_end: number
  guard_level: number
  medal_color_border: number
  today_feed: number
  todayFeed: number
  dayLimit: number
  uname: string
  color: number
  medalName: string
  guard_medal_title: string
  roomid: number
}

interface Pageinfo {
  totalpages: number
  curPage: number
}

interface medalInfo {
  /**
   * 需要投喂的亲密度
   */
  feedNum: number
  /**
   * 房间号
   */
  roomid: number
  /**
   * 主播uid
   */
  mid: number
}

export default new SendGift()
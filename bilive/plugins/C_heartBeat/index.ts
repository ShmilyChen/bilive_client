import Plugin, { tools, AppClient } from '../../plugin'

class roomHeartBeat extends Plugin {
  constructor() {
    super()
  }
  public name = '模拟心跳'
  public description = '模拟直播间心跳, 可获取小心心和观看时长'
  public version = '0.0.2'
  public author = 'lzghzr'
  public async load({ defaultOptions, whiteList, version }: { defaultOptions: options, whiteList: Set<string>, version: version }) {
    if (version === undefined || version.major !== 3) {
      tools.Log('模拟心跳', '主程序版本不兼容', '需要3.0.0以上')
      this.loaded = false
    }
    else {
      // 是否模拟心跳
      defaultOptions.newUserData['roomHeartBeat'] = false
      defaultOptions.info['roomHeartBeat'] = {
        description: '模拟心跳',
        tip: '是否模拟心跳',
        type: 'boolean'
      }
      whiteList.add('roomHeartBeat')
      // 模拟心跳的房间
      defaultOptions.newUserData['roomHeartBeatRoomID'] = 3
      defaultOptions.info['roomHeartBeatRoomID'] = {
        description: '模拟心跳的房间',
        tip: '模拟心跳的房间, 默认为3(官方音乐台)',
        type: 'number'
      }
      whiteList.add('roomHeartBeatRoomID')
      this.loaded = true
    }
  }
  public async start({ users }: { users: Map<string, User> }) {
    users.forEach(user => {
      if (user.userData['roomHeartBeat']) {
        this._heartBeat(user)
      }
    })
  }
  /**
   * 计算client_sign
   *
   * @private
   * @param {Record<string, string>} postJSON
   * @returns
   * @memberof roomHeartBeat
   */
  private _sign(postJSON: Record<string, string>, secretRule: number[]) {
    let sign = JSON.stringify(postJSON)
    for (const i of secretRule) {
      switch (i) {
        case 1:
          sign = tools.Hash('SHA256', sign)
          break
        case 2:
          sign = tools.Hash('SHA384', sign)
          break
        case 3:
          sign = tools.Hash('SHA512', sign)
          break
        case 4:
          sign = tools.Hash('SHA3-224', sign)
          break
        case 5:
          sign = tools.Hash('SHA3-256', sign)
          break
        case 6:
          sign = tools.Hash('SHA3-384', sign)
          break
        case 7:
          sign = tools.Hash('SHA3-512', sign)
          break
        case 8:
          sign = tools.Hash('BLAKE2b512', sign)
          break
        case 9:
          sign = tools.Hash('BLAKE2s256', sign)
          break
        case 10:
          sign = tools.Hash('RIPEMD160', sign)
          break
        case 11:
          sign = tools.Hash('whirlpool', sign)
          break
        default:
          sign = tools.Hash('SHA224', sign)
          break
      }
    }
    return sign
  }
  /**
   * 指定房间模拟心跳
   *
   * @private
   * @param {User} user
   * @memberof roomHeartBeat
   */
  private async _heartBeat(user: User) {
    if (!user.userData['status'] || !user.userData['roomHeartBeat'] || !user.userData['roomHeartBeatRoomID']) return
    const roomID = user.userData['roomHeartBeatRoomID']
    // 获取播放器信息
    const roomPlayInfoXHRoptions: XHRoptions = {
      url: `https://api.live.bilibili.com/xlive/app-room/v1/roomPlay/getRoomPlayInfo?${AppClient.signBaseQuery(`${user.tokenQuery}&https_url_req=1&play_url=0&ptype=0&qn=0&room_id=${roomID}`)}`,
      responseType: 'json',
      headers: user.headers
    }
    const getRoomPlayInfo = await tools.XHR<roomPlayInfo>(roomPlayInfoXHRoptions, 'Android')
    if (getRoomPlayInfo !== undefined && getRoomPlayInfo.response.statusCode === 200 && getRoomPlayInfo.body.code === 0) {
      // 获取房间信息
      const roomInfoXHRoptions: XHRoptions = {
        url: `https://api.live.bilibili.com/xlive/app-room/v1/index/getInfoByRoom?${AppClient.signBaseQuery(`${user.tokenQuery}&room_id=${roomID}`)}`,
        responseType: 'json',
        headers: user.headers
      }
      const getRoomInfo = await tools.XHR<roomInfo>(roomInfoXHRoptions, 'Android')
      if (getRoomInfo !== undefined && getRoomInfo.response.statusCode === 200 && getRoomInfo.body.code === 0) {
        const roomPlayInfoData = getRoomPlayInfo.body.data
        const roomInfoData = getRoomInfo.body.data
        const postJSON = {
          platform: user.platform,
          uuid: AppClient.UUID,
          buvid: user.build,
          seq_id: '1',
          room_id: roomInfoData.room_info.room_id.toString(),
          parent_id: roomInfoData.room_info.parent_area_id.toString(),
          area_id: roomInfoData.room_info.area_id.toString(),
          timestamp: '',
          secret_key: '',
          watch_time: '',
          up_id: roomInfoData.room_info.uid.toString(),
          up_level: roomInfoData.anchor_info.live_info.level.toString(),
          jump_from: '30000',
          gu_id: AppClient.RandomHex(43),
          play_type: '0',
          play_url: roomPlayInfoData.play_url || '',
          s_time: '0',
          data_behavior_id: '',
          data_source_id: '',
          up_session: roomInfoData.room_info.up_session,
          visit_id: AppClient.RandomHex(32),
          watch_status: encodeURIComponent('{"pk_id":0,"screen_status":1}'),
          click_id: '',
          session_id: '-99998',
          player_type: '0',
          client_ts: ''
        }
        this._postMobileEntry(user, postJSON)
      }
      else {
        await tools.Sleep(10 * 1000)
        this._heartBeat(user)
      }
    }
    else {
      await tools.Sleep(10 * 1000)
      this._heartBeat(user)
    }
  }
  /**
   * 初始化心跳参数
   *
   * @private
   * @param {User} user
   * @param {Record<string, string>} postJSON
   * @memberof roomHeartBeat
   */
  private async _postMobileEntry(user: User, postJSON: Record<string, string>) {
    if (!user.userData['status'] || !user.userData['roomHeartBeat'] || !user.userData['roomHeartBeatRoomID']) return
    const mobileEntryXHRoptions: XHRoptions = {
      method: 'POST',
      url: 'https://live-trace.bilibili.com/xlive/data-interface/v1/heartbeat/mobileEntry',
      body: AppClient.signBaseQuery(`${user.tokenQuery}&area_id=${postJSON.area_id}&buvid=${user.buvid}&client_ts=${AppClient.TS}&heart_beat=${encodeURIComponent('[]')}&is_patch=0&parent_id=${postJSON.parent_id}&room_id=${postJSON.room_id}&seq_id=${postJSON.seq_id}&uuid=${postJSON.uuid}`),
      responseType: 'json',
      headers: user.headers
    }
    const postMobileEntry = await tools.XHR<mobileHeartBeat>(mobileEntryXHRoptions, 'Android')
    if (postMobileEntry !== undefined && postMobileEntry.response.statusCode === 200 && postMobileEntry.body.code === 0) {
      const postMobileEntryData = postMobileEntry.body.data
      postJSON.secret_key = postMobileEntryData.secret_key
      postJSON.timestamp = postMobileEntryData.timestamp.toString()
      postJSON.watch_time = postMobileEntryData.heartbeat_interval.toString()
      await tools.Sleep(postMobileEntryData.heartbeat_interval * 1000)
      this._postHearBeat(user, postJSON, postMobileEntryData.secret_rule)
    }
    else {
      await tools.Sleep(10 * 1000)
      this._heartBeat(user)
    }
  }
  /**
   * 发送心跳
   *
   * @private
   * @param {User} user
   * @param {Record<string, string>} postJSON
   * @param {number[]} secretRule
   * @memberof roomHeartBeat
   */
  private async _postHearBeat(user: User, postJSON: Record<string, string>, secretRule: number[]) {
    if (!user.userData['status'] || !user.userData['roomHeartBeat'] || !user.userData['roomHeartBeatRoomID']) return
    postJSON.client_ts = AppClient.TS.toString()
    const clientSign = this._sign(postJSON, secretRule)
    let postData = ''
    for (const i in postJSON) postData += `${i}=${encodeURIComponent(postJSON[i])}&`
    postData += `client_sign=${clientSign}`
    const mobileHeartBeatXHRoptions: XHRoptions = {
      method: 'POST',
      url: 'https://live-trace.bilibili.com/xlive/data-interface/v1/heartbeat/mobileHeartBeat',
      body: user.signQuery(`${user.tokenQuery}&${postData}`),
      responseType: 'json',
      headers: user.headers
    }
    const postMobileHeartBeat = await tools.XHR<mobileHeartBeat>(mobileHeartBeatXHRoptions, 'Android')
    if (postMobileHeartBeat !== undefined && postMobileHeartBeat.response.statusCode === 200 && postMobileHeartBeat.body.code === 0) {
      const postMobileHeartBeatData = postMobileHeartBeat.body.data
      postJSON.secret_key = postMobileHeartBeatData.secret_key
      postJSON.timestamp = postMobileHeartBeatData.timestamp.toString()
      postJSON.watch_time = postMobileHeartBeatData.heartbeat_interval.toString()
      await tools.Sleep(postMobileHeartBeatData.heartbeat_interval * 1000)
      this._postHearBeat(user, postJSON, postMobileHeartBeatData.secret_rule)
    }
    else {
      await tools.Sleep(10 * 1000)
      this._heartBeat(user)
    }
  }
}

export default new roomHeartBeat()

/**
 * 房间信息
 *
 * @interface roomInfo
 */
interface roomInfo {
  code: number
  message: string
  ttl: number
  data: roomInfoData
}
interface roomInfoData {
  room_info: roomInfoDataRoomInfo
  anchor_info: roomInfoDataAnchorInfo
}
interface roomInfoDataAnchorInfo {
  live_info: roomInfoDataAnchorInfoLiveInfo
}
interface roomInfoDataAnchorInfoLiveInfo {
  level: number
  level_color: number
}
interface roomInfoDataRoomInfo {
  uid: number
  room_id: number
  short_id: number
  title: string
  cover: string
  tags: string
  background: string
  description: string
  online: number
  live_status: number
  live_start_time: number
  live_screen_type: number
  lock_status: number
  lock_time: number
  hidden_status: number
  hidden_time: number
  area_id: number
  area_name: string
  parent_area_id: number
  parent_area_name: string
  keyframe: string
  special_type: number
  up_session: string
  pk_status: number
  on_voice_join: number
  tv_screen_on: number
}
/**
 * 房间播放器
 *
 * @interface roomPlayInfo
 */
interface roomPlayInfo {
  code: number
  message: string
  ttl: number
  data: roomPlayInfoData
}
interface roomPlayInfoData {
  room_id: number
  short_id: number
  uid: number
  is_portrait: boolean
  live_status: number
  live_time: number
  special_type: number
  play_url: null
}
/**
 * 心跳
 *
 * @interface mobileHeartBeat
 */
interface mobileHeartBeat {
  code: number
  message: string
  ttl: number
  data: mobileHeartBeatData
}
interface mobileHeartBeatData {
  heartbeat_interval: number
  patch_status: number
  secret_key: string
  secret_rule: number[]
  timestamp: number
}

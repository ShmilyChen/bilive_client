/*******************
 ****** index ******
 *******************/
/**
 * 应用设置
 *
 * @interface options
 */
interface options {
  [index: string]: any
  server: server
  config: config
  advConfig: advConfig
  user: userCollection
  util: utilCollection
  newUserData: userData
  info: optionsInfo
  roomList: [number, number][]
}
interface server {
  [index: string]: number | string
  path: string
  hostname: string
  port: number
  protocol: string
  netkey: string
}
interface config {
  [index: string]: boolean | number | number[] | string | string[]
  localListener: boolean
}

interface advConfig {
  [index: string]: boolean | number | string | number[] | string[]
  defaultUserID: number
  serverURL: string
  bakServerURL: string
  eventRooms: number[]
}
interface userCollection {
  [index: string]: userData
}
interface userData {
  [index: string]: boolean | number | number[] | string | string[]
  nickname: string
  userName: string
  passWord: string
  biliUID: number
  accessToken: string
  refreshToken: string
  cookie: string
  status: boolean
}
interface utilCollection {
  [index: string]: utilData
}
interface utilData {
  [index: string]: utilDataItem
}
interface utilDataItem {
  value: string | boolean | number
  list?: string[]
  info: configInfoData
}
interface optionsInfo {
  [index: string]: configInfoData
  localListener: configInfoData
  defaultUserID: configInfoData
  serverURL: configInfoData
  eventRooms: configInfoData
  adminServerChan: configInfoData
  nickname: configInfoData
  userName: configInfoData
  passWord: configInfoData
  biliUID: configInfoData
  accessToken: configInfoData
  refreshToken: configInfoData
  cookie: configInfoData
  status: configInfoData
}
interface configInfoData {
  description: string
  tip: string
  type: string
  cognate?: string
}
/*******************
 ****** User ******
 *******************/
type User = import('../online').default
/*******************
 **** dm_client ****
 *******************/
declare enum dmErrorStatus {
  'client' = 0,
  'danmaku' = 1,
  'timeout' = 2
}
interface DMclientOptions {
  roomID?: number
  userID?: number
  protocol?: DMclientProtocol
  key?: string
}
type DMclientProtocol = 'socket' | 'flash' | 'ws' | 'wss'
type DMerror = DMclientError | DMdanmakuError
interface DMclientError {
  status: dmErrorStatus.client | dmErrorStatus.timeout
  error: Error
}
interface DMdanmakuError {
  status: dmErrorStatus.danmaku
  error: TypeError
  data: Buffer
}
// 弹幕服务器
interface danmuInfo {
  code: number
  message: string
  ttl: number
  data: danmuInfoData
}
interface danmuInfoData {
  refresh_row_factor: number
  refresh_rate: number
  max_delay: number
  token: string
  host_list: danmuInfoDataHostList[]
  ip_list: danmuInfoDataIPList[]
}
interface danmuInfoDataHostList {
  host: string
  port: number
  wss_port: number
  ws_port: number
}
interface danmuInfoDataIPList {
  host: string
  port: number
}
/*******************
 *** app_client ****
 *******************/
declare enum appStatus {
  'success' = 0,
  'captcha' = 1,
  'error' = 2,
  'httpError' = 3
}
/**
 * 公钥返回
 *
 * @interface getKeyResponse
 */
interface getKeyResponse {
  ts: number
  code: number
  data: getKeyResponseData
}
interface getKeyResponseData {
  hash: string
  key: string
}
/**
 * 验证返回
 *
 * @interface authResponse
 */
interface authResponse {
  ts: number
  code: number
  data: authResponseData
}
interface authResponseData {
  status: number
  token_info: authResponseTokeninfo
  cookie_info: authResponseCookieinfo
  sso: string[]
}
interface authResponseCookieinfo {
  cookies: authResponseCookieinfoCooky[]
  domains: string[]
}
interface authResponseCookieinfoCooky {
  name: string
  value: string
  http_only: number
  expires: number
}
interface authResponseTokeninfo {
  mid: number
  access_token: string
  refresh_token: string
  expires_in: number
}
/**
 * 注销返回
 *
 * @interface revokeResponse
 */
interface revokeResponse {
  message: string
  ts: number
  code: number
}
/**
 * 登录返回信息
 */
type loginResponse = loginResponseSuccess | loginResponseCaptcha | loginResponseError | loginResponseHttp
interface loginResponseSuccess {
  status: appStatus.success
  data: authResponse
}
interface loginResponseCaptcha {
  status: appStatus.captcha
  data: authResponse
}
interface loginResponseError {
  status: appStatus.error
  data: authResponse
}
interface loginResponseHttp {
  status: appStatus.httpError
  data: XHRresponse<getKeyResponse> | XHRresponse<authResponse> | undefined
}
/**
 * 登出返回信息
 */
type logoutResponse = revokeResponseSuccess | revokeResponseError | revokeResponseHttp
interface revokeResponseSuccess {
  status: appStatus.success
  data: revokeResponse
}
interface revokeResponseError {
  status: appStatus.error
  data: revokeResponse
}
interface revokeResponseHttp {
  status: appStatus.httpError
  data: XHRresponse<revokeResponse> | undefined
}
/**
 * 验证码返回信息
 */
type captchaResponse = captchaResponseSuccess | captchaResponseError
interface captchaResponseSuccess {
  status: appStatus.success
  data: Buffer
}
interface captchaResponseError {
  status: appStatus.error
  data: XHRresponse<Buffer> | undefined
}
/*******************
 ****** tools ******
 *******************/
/**
 * XHR设置
 * 因为request已经为Deprecated状态, 为了兼容把设置项缩小, 可以会影响一些插件
 *
 * @interface XHRoptions
 */
interface XHRoptions {
  /** @deprecated 为了兼容request, 现在可以使用url */
  uri?: string | URL
  url?: string | URL
  // OutgoingHttpHeaders包含number, 导致无法兼容got
  headers?: import('http').IncomingHttpHeaders
  method?: import('got').Method
  body?: string | Buffer
  /** @deprecated 为了兼容request, 现在可以使用cookieJar */
  jar?: import('tough-cookie').CookieJar
  cookieJar?: import('tough-cookie').CookieJar
  /** 为了兼容request, 保留null */
  encoding?: BufferEncoding | null
  /** @deprecated 为了兼容request, 现在可以使用responseType */
  json?: boolean
  responseType?: 'json' | 'buffer' | 'text'
}
/**
 * XHR返回
 *
 * @interface response
 * @template T
 */
interface XHRresponse<T> {
  response: import('got').Response
  body: T
}
/**
 * 客户端消息
 *
 * @interface systemMSG
 */
interface systemMSG {
  message: string
  options: options
  user?: User
}
/*******************
 ** bilive_client **
 *******************/
/**
 * 消息格式
 *
 * @interface raffleMessage
 */
interface raffleMessage {
  cmd: 'raffle'
  roomID: number
  id: number
  type: string
  title: string
  time: number
  max_time: number
  time_wait: number
}
/**
 * 消息格式
 *
 * @interface lotteryMessage
 */
interface lotteryMessage {
  cmd: 'lottery' | 'pklottery'
  roomID: number
  id: number
  type: string
  title: string
  time: number
}
/**
 * 消息格式
 *
 * @interface beatStormMessage
 */
interface beatStormMessage {
  cmd: 'beatStorm'
  roomID: number
  id: number
  num: number
  type: string
  title: string
  time: number
}
/**
 * 消息格式
 *
 * @interface systemMessage
 */
interface systemMessage {
  cmd: 'sysmsg'
  msg: string
}
type message = raffleMessage | lotteryMessage | beatStormMessage | systemMessage
/*******************
 **** listener *****
 *******************/
/**
 * 获取直播列表
 *
 * @interface getAllList
 */
interface getAllList {
  code: number
  msg: string
  message: string
  data: getAllListData
}
interface getAllListData {
  interval: number
  module_list: getAllListDataList[]
}
type getAllListDataList = getAllListDataModules | getAllListDataRooms
interface getAllListDataModules {
  module_info: getAllListDataModuleInfo
  list: getAllListDataModuleList[]
}
interface getAllListDataRooms {
  module_info: getAllListDataRoomInfo
  list: getAllListDataRoomList[]
}
interface getAllListDataBaseInfo {
  id: number
  type: number
  pic: string
  title: string
  link: string
}
interface getAllListDataModuleInfo extends getAllListDataBaseInfo {
  count?: number
}
interface getAllListDataRoomInfo extends getAllListDataBaseInfo {
  type: 6 | 9
}
interface getAllListDataModuleList {
  id: number
  pic: string
  link: string
  title: string
}
interface getAllListDataRoomList {
  roomid: number
  title: string
  uname: string
  online: number
  cover: string
  link: string
  face: string
  area_v2_parent_id: number
  area_v2_parent_name: string
  area_v2_id: number
  area_v2_name: string
  play_url: string
  current_quality: number
  accept_quality: number[]
  broadcast_type: number
  pendent_ld: string
  pendent_ru: string
  rec_type: number
  pk_id: number
}
/**
 * 搜索总督房间
 *
 * @interface searchID
 */
interface searchID {
  code: number
  data: searchID_Data
  message: string
  ttl: number
}
interface searchID_Data {
  result: searchID_Data_Result
}
interface searchID_Data_Result {
  live_user: searchID_Data_Result_User[]
}
interface searchID_Data_Result_User {
  roomid: number
  mid: number
}
/**
 * 统一抽奖信息
 *
 * @interface lotteryInfo
 */
interface lotteryInfo {
  code: number
  ttl: number
  data: lotteryInfoData
}
interface lotteryInfoData {
  activity_box: null
  bls_box: null
  gift_list: lotteryInfoDataGiftList[]
  guard: lotteryInfoDataGuard[]
  pk: lotteryInfoDataPk[]
  slive_box: lotteryInfoDataSilverBox
  storm: lotteryInfoDataStorm
}

interface lotteryInfoDataGiftList {
  raffleId: number
  title: string
  type: string
  payflow_id: number
  from_user: lotteryInfoDataGiftListFromUser
  time_wait: number
  time: number
  max_time: number
  status: number
  asset_animation_pic: string
  asset_tips_pic: string
  sender_type: number
}
interface lotteryInfoDataGiftListFromUser {
  uname: string
  face: string
}
interface lotteryInfoDataGuard {
  id: number
  sender: lotteryInfoDataGuardSender
  keyword: string
  privilege_type: number
  time: number
  status: number
  payflow_id: string
}
interface lotteryInfoDataGuardSender {
  uid: number
  uname: string
  face: string
}
interface lotteryInfoDataPk {
  id: number
  pk_id: number
  room_id: number
  time: number
  status: number
  asset_icon: string
  asset_animation_pic: string
  title: string
  max_time: number
}
interface lotteryInfoDataSilverBox {
  minute: number
  silver: number
  time_end: number
  time_start: number
  times: number
  max_times: number
  status: number
}
interface lotteryInfoDataStorm {
  id: number
  num: number
  time: number
  content: string
  hadJoin: number
  storm_gif: string
}
interface lotteryInfoDataPk {
  id: number
  pk_id: number
  room_id: number
  time: number
  status: number
  asset_icon: string
  asset_animation_pic: string
  title: string
  max_time: number
}
interface lotteryInfoDataSilverBox {
  minute: number
  silver: number
  time_end: number
  time_start: number
  times: number
  max_times: number
  status: number
}
interface lotteryInfoDataStorm {
  id: number
  num: number
  time: number
  content: string
  hadJoin: number
  storm_gif: string
}
/*******************
 ***** online ******
 *******************/
/**
 * 在线心跳返回
 *
 * @interface userOnlineHeart
 */
interface userOnlineHeart {
  code: number
  msg: string
  message: string
  data: userOnlineHeartData
}
interface userOnlineHeartData {
  giftlist: any[]
}
/*******************
 ***** options *****
 *******************/
type Options = import('../options').__Options
/*******************
 ****** plugin *****
 *******************/
type EPlugin = import('events')
interface IPlugin extends EPlugin {
  name: string
  description: string
  version: string
  author: string
  loaded: boolean
  load?({ defaultOptions, whiteList, plugins }: {
    defaultOptions: options,
    whiteList: Set<string>,
    plugins: string[]
  }): Promise<void>
  options?({ options }: {
    options: options
  }): Promise<void>
  start?({ options, users }: {
    options: options,
    users: Map<string, User>
  }, newUser: boolean): Promise<void>
  loop?({ cst, cstMin, cstHour, cstString, options, users }: {
    cst: Date,
    cstMin: number,
    cstHour: number,
    cstString: string,
    options: options,
    users: Map<string, User>
  }): Promise<void>
  msg?({ message, options, users }: {
    message: raffleMessage | lotteryMessage | beatStormMessage,
    options: options,
    users: Map<string, User>
  }): Promise<void>
  notify?({ msg, options, users }: {
    msg: pluginNotify,
    options: options,
    users: Map<string, User>
  }): Promise<void>
  interact?({ msg, options, users }: {
    msg: utilMSG,
    options: options,
    users: Map<string, User>
  }): Promise<void>
}
interface pluginNotify {
  cmd: string
  data: any
}
interface utilMSG {
  cmd: string
  msg: string
  ts: string
  utilID: string
  data: utilData
}

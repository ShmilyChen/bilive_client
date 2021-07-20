/*******************
 ****** index ******
 *******************/
/**
 * 应用设置
 *
 * @interface options
 */
interface options {
  server: server
  config: config
  user: userCollection
  newUserData: userData
  info: optionsInfo
  roomList: [number, number][]
}
interface server {
  path: string
  hostname: string
  port: number
  protocol: string
}
interface config {
  [x: string]: boolean | number | number[] | string | string[]
  serverURL: string
}
type userCollection = Record<string, userData>
interface userData {
  [x: string]: boolean | number | number[] | string | string[]
  nickname: string
  userName: string
  passWord: string
  biliUID: number
  accessToken: string
  refreshToken: string
  cookie: string
  deviceInfo: string
  status: boolean
}
type optionsInfo = {
  [x in keyof (config & userData)]: configInfoData
}
interface configInfoData {
  description: string
  tip: string
  type: string
  cognate?: string
  password?: boolean
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
  'timeout' = 2,
  'http' = 3,
  'auth' = 4,
}
interface DMclientOptions {
  roomID?: number
  protocol?: DMclientProtocol
  userID?: number
  token?: string
}
type DMclientProtocol = 'socket' | 'flash' | 'ws' | 'wss'
type DMerror = DMclientError | DMdanmakuError
interface DMclientError {
  status: dmErrorStatus.client | dmErrorStatus.timeout | dmErrorStatus.http | dmErrorStatus.auth
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
  'error' = 1,
  'httpError' = 2,
  'validate' = 3,
  'authcode' = 4,
}
/**
 * 注册返回
 *
 * @interface regResponse
 */
interface regResponse {
  code: number
  data: regResponseData
  message: number
  ttl: number
}
interface regResponseData {
  guest_id: number
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
  data: authResponseData & authResponseTokeninfo
}
interface authResponseData {
  url: string
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
type loginResponse = loginResponseSuccess | loginResponseValidate | loginResponseError | loginResponseHttp
interface loginResponseSuccess {
  status: appStatus.success
  data: authResponse
}
interface loginResponseValidate {
  status: appStatus.validate | appStatus.authcode
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
 * 二维码返回
 *
 * @interface authcodeResponse
 */
interface authcodeResponse {
  code: number
  message: string
  ttl: number
  data: authcodeResponseData
}
interface authcodeResponseData {
  auth_code: string
  url: string
}
/**
 * 二维码返回信息
 */
type qrcodeResponse = qrcodeResponseSuccess | qrcodeResponseError | qrcodeResponseHttp
interface qrcodeResponseSuccess {
  status: appStatus.success
  data: authcodeResponse
}
interface qrcodeResponseError {
  status: appStatus.error
  data: authcodeResponse
}
interface qrcodeResponseHttp {
  status: appStatus.httpError
  data: XHRresponse<authcodeResponse> | undefined
}
/**
 * 设备信息
 */
interface deviceInfo {
  vendor: {
    brand: string
    buildhost: string
    cpuVendor: string
    date: string
    device: string
    fingerprint: string
    id: string
    incremental: string
    kernel: string
    manufacturer: string
    marketname: string
    model: string
    modem: string
    name: string
    platform: string
    release: string
    sdk: string
    tags: string
    type: string
    utc: string
  }
  adid: string
  deviceID: string
  fts: string
  guestID: string
  guid: string
  uid: string
}
/*******************
 ****** tools ******
 *******************/
/**
 * XHR设置
 *
 * @interface XHRoptions
 */
type XHRoptions = import('got').Options & { responseType?: 'json' | 'buffer' | 'text' }
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
  raw: '' | TV_START | RAFFLE_START
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
  raw: '' | LOTTERY_START | PK_LOTTERY_START
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
  type: string
  title: string
  time: number
  raw: '' | SPECIAL_GIFT
}
/**
 * 消息格式
 *
 * @interface anchorLotMessage
 */
interface anchorLotMessage {
  cmd: 'anchorLot'
  roomID: number
  id: number
  title: string
  raw: '' | ANCHOR_LOT_START
}
/**
 * 消息格式
 *
 * @interface boxActivityMessage
 */
interface boxActivityMessage {
  cmd: 'boxActivity'
  roomID: number
  id: number
  title: string
  raw: '' | BOX_ACTIVITY_START
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
type message = raffleMessage | lotteryMessage | beatStormMessage | anchorLotMessage | boxActivityMessage | systemMessage
/*******************
 **** listener *****
 *******************/
/**
 * 统一抽奖信息
 *
 * @interface lotteryInfo
 */
interface lotteryInfo {
  code: number
  message: string
  ttl: number
  data: lotteryInfoData
}
interface lotteryInfoData {
  activity_box: null
  bls_box: null
  gift_list: lotteryInfoDataGiftList[]
  guard: lotteryInfoDataGuard[]
  pk: lotteryInfoDataPk[]
  slive_box: lotteryInfoDataSliveBox
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
interface lotteryInfoDataSliveBox {
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
/*******************
 ***** options *****
 *******************/
type Options = import('../options').__Options
/*******************
 ****** plugin *****
 *******************/
interface IPlugin {
  name: string
  description: string
  version: string
  author: string
  loaded: boolean
  load?({ defaultOptions, whiteList, plugins, version }: {
    defaultOptions: options,
    whiteList: Set<string>,
    plugins: string[],
    version: version
  }): Promise<void>
  options?({ options }: {
    options: options
  }): Promise<void>
  start?({ options, users }: {
    options: options,
    users: Map<string, User>
  }): Promise<void>
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
}
interface version {
  /** 主版本号 */
  major: number
  /** 次版本号 */
  minor: number
  /** 修订号 */
  patch: number
  /** 语义化版本 */
  semver: string
}
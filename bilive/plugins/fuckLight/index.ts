import Plugin, { tools, AppClient } from '../../plugin'

class FuckLight extends Plugin {
    constructor() {
        super()
    }
    public name = '自动点亮勋章'
    public description = '自动点亮灰色勋章'
    public version = '0.0.2'
    public author = 'ShmilyChen'
    public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
        defaultOptions.newUserData['fuckLight'] = false
        defaultOptions.info['fuckLight'] = {
            description: '自动点亮勋章',
            tip: '自动点亮灰色勋章',
            type: 'boolean'
        }
        whiteList.add('fuckLight')
        defaultOptions.newUserData['autoSendDM'] = true
        defaultOptions.info['autoSendDM'] = {
            description: '自动发送弹幕',
            tip: '自动发送弹幕，获取亲密度',
            type: 'boolean'
        }
        whiteList.add('autoSendDM')
        defaultOptions.newUserData['fuckLightLimt'] = 0
        defaultOptions.info['fuckLightLimt'] = {
            description: '点亮等级',
            tip: '限制点亮勋章的等级，大于该等级才会点亮',
            type: 'number'
        }
        whiteList.add('fuckLightLimt')
        this.loaded = true
    }

    // 发送弹幕消息
    private msg = ["(⌒▽⌒)", "（￣▽￣）", "(=・ω・=)", "(〜￣△￣)〜", "(･∀･)", "╮(￣▽￣)╭", "_(:3」∠)_", '("▔□▔)/', "(^・ω・^ )", "(｡･ω･｡)", "⁄(⁄ ⁄•⁄ω⁄•⁄ ⁄)⁄"]

    private sendStatus: any = {}

    public async start({ users }: { users: Map<string, User> }) {
        this.fuckLight(users)
    }
    public async loop({ cstMin, cstHour, users }: { cstMin: number, cstHour: number, cstString: string, options: options, users: Map<string, User> }) {
        // 每天 0:30 8:30 16:20 检查勋章
        if (cstMin === 30 && cstHour % 8 === 0) {
            this.fuckLight(users)
        }
        if (cstMin === 10 && cstHour === 0) this.sendStatus = {}
    }

    private async fuckLight(users: Map<string, User>) {
        for (const { 0: uid, 1: user } of users) {
            if (user.userData['fuckLight']) {
                const fansMedalList = await this.getFansMedalList(user)
                if (user.userData['autoSendDM']) {
                    for (const fansMeda of fansMedalList) {
                        if (fansMeda.target_id === 10854565) continue
                        if (this.sendStatus[uid] === undefined) this.sendStatus[uid] = {}
                        if (this.sendStatus[uid][fansMeda.roomid] === true) continue
                        const flag = await this.sendDM(user, fansMeda.roomid)
                        this.sendStatus[uid][fansMeda.roomid] = flag
                        await tools.Sleep(30 * 1000)
                    }
                }
                // 获取没有亮的勋章列表
                const notLightList = await this.getNotLightList(user, await this.getFansMedalList(user))
                if (notLightList.length > 0) {
                    tools.Log(user.nickname, '点亮勋章', `有${notLightList.length}个熄灭勋章`)
                    // 获取背包中的小心心礼物
                    const bagList = await this.getBagInfo(user)
                    await tools.Sleep(2 * 1000)
                    for (const notLigh of notLightList) {
                        let flog: number = 0
                        for (const i in bagList) {
                            if (bagList[i].gift_num <= 0) continue
                            flog = await this.sendGift(notLigh.target_id, bagList[i].gift_id, 1, bagList[i].id, notLigh.roomid, notLigh.target_name, user)
                            if (flog === -1) break
                            if (flog === 1) {
                                bagList[i].gift_num--
                                break
                            }
                        }
                    }
                }
            }
        }
    }
    private async sendDM(user: User, roomId: number) {
        let flag: boolean = true
        const csrf_token = tools.getCookie(user.jar, 'bili_jct')
        const msg = this.msg[tools.random(0, this.msg.length - 1)]
        const actAPISend: XHRoptions = {
            method: 'POST',
            url: `https://api.live.bilibili.com/msg/send`,
            body: `color=16777215&fontsize=25&mode=1&msg=${encodeURI(msg)}&rnd=${Math.round(Date.now() / 1000)}&roomid=${roomId}&bubble=0&csrf_token=${csrf_token}&csrf=${csrf_token}`,
            cookieJar: user.jar,
            responseType: 'json'
        }
        const sendInfo = await tools.XHR<bilibiliXHR<[]>>(actAPISend)
        if (sendInfo !== undefined && sendInfo.response.statusCode === 200 && sendInfo.body.code === 0 && sendInfo.body.msg === '') {
            tools.Log(user.nickname, '点亮勋章', `房间${roomId}弹幕发送成功`)
        } else {
            tools.Log(user.nickname, '点亮勋章', `房间${roomId}弹幕发送失败`)
            flag = false
        }
        return flag
    }


    /**
     * 
     * @param user 获取粉丝列表
     */
    private async getFansMedalList(user: User): Promise<FansMedalList[]> {
        let fansMedalList = new Array<FansMedalList>()
        for (let i = 1; i <= 1000 / 25; i++) {
            const medalList: XHRoptions = {
                url: `https://api.live.bilibili.com/i/api/medal?page=${i}&pageSize=25`,
                responseType: 'json',
                cookieJar: user.jar,
                headers: user.headers,
            }
            const medalListInfo = await tools.XHR<bilibiliXHR<medelData>>(medalList)
            if (medalListInfo !== undefined && medalListInfo.response.statusCode === 200) {
                if (medalListInfo.body.code === 0) {
                    fansMedalList = fansMedalList.concat(medalListInfo.body.data.fansMedalList)
                    if (medalListInfo.body.data.pageinfo.totalpages <= i) break
                    await tools.Sleep(3 * 1000)
                } else {
                    i-- && await tools.Sleep(3 * 1000)
                }
            }
        }
        return fansMedalList
    }
    /**
     * 获取没有点亮勋章的列表
     * @param user 
     */
    private async getNotLightList(user: User, fansMedalList: FansMedalList[]): Promise<FansMedalList[]> {
        return fansMedalList.filter(medal => medal.is_lighted === 0 && medal.level >= (user.userData['fuckLightLimt'] || 0) && medal.target_id !== user.biliUID)
    }

    private async getBagInfo(user: User): Promise<bagInfoData[]> {
        const bag: XHRoptions = {
            url: `https://api.live.bilibili.com/gift/v2/gift/m_bag_list?${AppClient.signQueryBase(user.tokenQuery)}`,
            responseType: 'json',
            headers: user.headers
        }
        const bagInfo = await tools.XHR<bilibiliXHR<bagInfoData[]>>(bag, 'Android')
        if (bagInfo !== undefined && bagInfo.response.statusCode === 200) {
            if (bagInfo.body.code === 0) {
                return bagInfo.body.data.filter(bag => bag.gift_id === 30607)
            }
        }
        return new Array<bagInfoData>()
    }

    /**
     * 赠送礼物 
     * @return 0 赠送失败
     * @return 1 赠送成功
     * @return -1 封禁或其他原因
     * @param mid 主播uid
     * @param gift_id 礼物id
     * @param gift_num 礼物数量
     * @param bag_id 包裹id
     * @param room_id 房间号（长号）
     * @param user 用户
     */
    private async sendGift(mid: string | number, gift_id: number, gift_num: number = 0, bag_id: number, room_id: number, target_name: string, user: User) {
        if (mid === user.biliUID) return 0
        const send: XHRoptions = {
            method: 'POST',
            url: `https://api.live.bilibili.com/gift/v2/live/bag_send?${AppClient.signQueryBase(user.tokenQuery)}`,
            body: `uid=${user.biliUID}&ruid=${mid}&send_ruid=0&gift_id=${gift_id}&gift_num=${gift_num}&bag_id=${bag_id}&biz_id=${room_id}&rnd=${AppClient.RND}&biz_code=live&data_behavior_id=&data_source_id=&jumpfrom=21001&click_id=&session_id=`,
            responseType: 'json',
            headers: user.headers
        }
        const sendBag = await tools.XHR<bilibiliXHR<sendBagData>>(send, 'Android')
        if (sendBag !== undefined && sendBag.response.statusCode === 200) {
            if (sendBag.body.code === 0) {
                tools.Log(user.nickname, '点亮勋章', `成功点亮房间${room_id}的 ${target_name} 勋章`)
                await tools.Sleep(3000)
                return 1
            } else if (sendBag.body.code === 200030 || sendBag.body.code === 200028) {
                tools.Log(user.nickname, '点亮勋章', sendBag.body.message)
                return -1
            }
            else tools.Log(user.nickname, '点亮勋章', sendBag.body)
        }
        else tools.Log(user.nickname, '点亮勋章', '网络错误')
        await tools.Sleep(3000)
        return 0
    }
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

export default new FuckLight()
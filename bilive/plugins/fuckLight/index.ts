import Plugin, { tools, AppClient } from '../../plugin'

class FuckLight extends Plugin {
    constructor() {
        super()
    }
    public name = '自动点亮勋章'
    public description = '自动点亮灰色勋章'
    public version = '0.0.1'
    public author = 'ShmilyChen'
    public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
        defaultOptions.config['fuckLight'] = false
        defaultOptions.info['fuckLight'] = {
            description: '自动点亮勋章',
            tip: '自动点亮灰色勋章',
            type: 'boolean'
        }
        whiteList.add('fuckLight')
        // defaultOptions.config['fuckLightPriority'] = []
        // defaultOptions.info['fuckLightPriority'] = {
        //     description: '点亮优先uid',
        //     tip: '优先点亮点亮灰色勋章的uid',
        //     type: 'numberArray'
        // }
        // whiteList.add('fuckLightPriority')
        this.loaded = true
    }

    public async start({ users }: { users: Map<string, User> }) {
        this.fuckLight(users)
    }
    public async loop({ cstMin, cstHour, users }: { cstMin: number, cstHour: number, cstString: string, options: options, users: Map<string, User> }) {
        // 每天 0:30 8:30 16:20 检查勋章
        if (cstMin === 30 && cstHour % 8 === 0) {
            this.fuckLight(users)
        }
    }

    private async fuckLight(users: Map<string, User>) {
        for (const { 1: user } of users) {
            if (!user.userData['fuckLight']) continue
            // 获取没有亮的勋章列表
            const notLightList = await this.getNotLightList(user)
            if (notLightList.length === 0) return
            tools.Log(user.nickname, '点亮勋章', `有${notLightList.length}个熄灭勋章`)
            // 获取背包中的小心心礼物
            const bagList = await this.getBagInfo(user)
            await tools.Sleep(2 * 1000)
            for (const notLigh of notLightList) {
                let flog: number = 0
                for (const i in bagList) {
                    if (bagList[i].gift_num <=0 ) continue
                    flog = await this.sendGift(notLigh.target_id, bagList[i].gift_id, 1, bagList[i].id, notLigh.room_id, notLigh.target_name, user)
                    if (flog === 1) {
                        bagList[i].gift_num--
                        break
                    }
                }
                if (flog === -1) break
            }
        }
    }
    /**
     * 获取没有点亮勋章的列表
     * @param user 
     */
    private async getNotLightList(user: User) {
        const medals: XHRoptions = {
            method: 'POST',
            url: `https://api.live.bilibili.com/fans_medal/v2/HighQps/received_medals?${AppClient.signQueryBase(user.tokenQuery)}`,
            json: true,
            headers: user.headers
        }
        const list = await tools.XHR<bilibiliXHR<medalsData>>(medals, 'Android')
        let notLightList = new Array<medalsDataList>()
        if (list !== undefined && list.response.statusCode === 200 && list.body.code === 0) {
            notLightList = list.body.data.list.filter(medal => medal.is_lighted === 0)
        }
        return notLightList
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
            body: `uid=${user.uid}&ruid=${mid}&gift_id=${gift_id}&gift_num=${gift_num}&bag_id=${bag_id}&biz_id=${room_id}&rnd=${AppClient.RND}&biz_code=live&jumpFrom=21002`,
            responseType: 'json',
            headers: user.headers
        }
        const sendBag = await tools.XHR<bilibiliXHR<sendBagData>>(send, 'Android')
        if (sendBag !== undefined && sendBag.response.statusCode === 200) {
            if (sendBag.body.code === 0) {
                tools.Log(user.nickname, '点亮勋章', `成功点亮房间${room_id}的 ${target_name} 勋章`)
                await tools.Sleep(3000)
                return 1
            } else if (sendBag.body.code === 200030) {
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

interface medalsData {
    max: number
    cnt: number
    list: medalsDataList[]
}

interface medalsDataList {
    buff_msg: string
    day_limit: number
    guard_level: number
    guard_type: number
    icon_code: number
    icon_text: string
    intimacy: number
    is_lighted: number
    is_receive: number
    last_wear_time: number
    level: number
    live_stream_status: 0 | 1
    lpl_status: number
    master_available: number
    master_status: number
    medal_color: number
    medal_color_border: number
    medal_color_end: number
    medal_color_start: number
    medal_id: number
    medal_level: number
    medal_name: string
    next_intimacy: number
    rank: string
    receive_channel: number
    receive_time: string
    room_id: number
    score: number
    source: number
    status: number
    sup_code: number
    sup_text: string
    target_face: string
    target_id: number
    target_name: string
    today_feed: number
    today_intimacy: number
    uid: number
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
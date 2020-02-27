import Plugin, { tools } from '../../plugin'
import Options from '../../options'
import { Options as requestOptions } from 'request'

class Manager extends Plugin {
    constructor() {
        super()
    }
    public name = '代挂用户管理'
    public description = '自动化管理代挂用户'
    public version = '0.0.1'
    public author = 'ShmilyChen'
    public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
        defaultOptions.newUserData['managerStatus'] = false
        defaultOptions.info['managerStatus'] = {
            description: '代挂用户管理',
            tip: '自动管理代挂用户',
            type: 'boolean'
        }
        whiteList.add('managerStatus')

        defaultOptions.newUserData['managerEndTime'] = ''
        defaultOptions.info['managerEndTime'] = {
            description: '代挂结束时间',
            tip: '自动停止挂机时间',
            type: 'string'
        }
        whiteList.add('managerEndTime')

        defaultOptions.advConfig['managerKEY'] = ''
        whiteList.add('managerKEY')

        defaultOptions.advConfig['managerSendStatus'] = false
        defaultOptions.info['managerSendStatus'] = {
            description: '代挂管理通知',
            tip: '自动发送管理消息',
            type: 'boolean'
        }
        whiteList.add('managerSendStatus')

        defaultOptions.advConfig['managerTitle'] = '辣条姬'
        defaultOptions.info['managerTitle'] = {
            description: '私信通知标题',
            tip: '建议不要出现QQ等字眼，可能会被屏蔽',
            type: 'string'
        }
        whiteList.add('managerTitle')

        defaultOptions.advConfig['managerMessage'] = ''
        defaultOptions.info['managerMessage'] = {
            description: '私信通知附加信息',
            tip: '建议不要出现QQ等字眼，可能会被屏蔽',
            type: 'string'
        }
        whiteList.add('managerMessage')

        defaultOptions.util['manager'] = {
            info: {
                value: "私信通知",
                info: {
                    description: "插件名",
                    tip: "到期提醒用户续费",
                    type: "string"
                }
            },
            users: {
                value: "",
                list: [],
                info: {
                    description: "用户列表",
                    tip: "选择用户发送私信",
                    type: "user"
                }
            }
        }
        this.loaded = true
    }
    private _user!: User
    private dev_id: string = this.getGUID()
    public async start({ options, users }: { options: options, users: Map<string, User> }) {
        await this.loadUserList(options, users)
        const user = users.get(<string>options.advConfig['managerKEY'])
        if (user !== undefined) {
            this._user = user
        }
    }
    public async loop({ cstMin, cstHour, users }: { cstMin: number, cstHour: number, users: Map<string, User> }) {
        if (cstMin === 0 && cstHour === 10) {
            const user = users.get(<string>Options._.advConfig['managerKEY'])
            if (user !== undefined) {
                this._user = user
            }
            this.checkTime(users)
        } else if (cstMin == 0 && cstHour === 9 && this._user === undefined && Options._.advConfig['managerSendStatus']) {
            tools.emit('SCMSG', <systemMSG>{
                message: '私信通知发送者设置已失效',
                options: Options._
            })
        }
    }
    private msg?: utilMSG
    public async interact({ msg }: { msg: utilMSG }) {
        this.msg = msg
        this.setManagerKEY(msg)
    }
    private setManagerKEY(msg: utilMSG) {
        const data = msg.data
        let key: string = ''
        let userNickname: string = ''
        let userBiliUID: string = ''
        if (data['users'].value === '') key = <string>data.uid.value
        else {
            const userStr = <string>data['users'].value
            const arr = userStr.match(/(?<userNickname>.*)\((?<userBiliUID>.*)\)\((?<key>.*)\)/)
            if (arr === null) return
            const arrGroups = <{ userNickname: string, userBiliUID: string, key: string }>arr.groups
            key = arrGroups.key
            userNickname = arrGroups.userNickname
            userBiliUID = arrGroups.userBiliUID
        }
        Options._.advConfig['managerKEY'] = key
        Options.save()
        const message = `设置${userNickname}(${userBiliUID})为发送者成功`
        tools.Log(message)
        this.utilCallback(message)
    }
    private utilCallback(msg: string) {
        this.emit('interact', {
            cmd: (<utilMSG>this.msg).cmd,
            ts: (<utilMSG>this.msg).ts,
            utilID: (<utilMSG>this.msg).utilID,
            msg
        })
    }
    private async loadUserList(options: options, users: Map<string, User>) {
        users.forEach(async (user, key) => {
            if (user.userData.status) {
                const userNickname = user.userData.nickname
                const userBiliUID = user.userData.biliUID
                const userListItem: string = `${userNickname}(${userBiliUID})(${key})`;
                (<string[]>options.util['manager']['users'].list).push(userListItem)
            }
        })
    }
    private checkTime(users: Map<string, User>) {
        const time: number = Date.now()
        users.forEach((user) => {
            if (!user.userData['managerStatus']) return
            if (!user.userData.status) return
            const endTime: number = new Date(<string>user.userData['managerEndTime']).getTime()
            if (endTime <= time) {
                user.Stop()
                tools.Log(`用户${user.nickname}已到期，已自动停止挂机`)
                const msg: msgContent = {
                    text: `您的辣条黑科技已到期\n已自动停止操作\n`,
                    jump_text: '',
                    jump_uri: ''
                }
                this.sendMsg(msg, user)
            } else if (endTime - time <= 7 * 24 * 60 * 60 * 1000 && endTime - time >= 6 * 24 * 60 * 60 * 1000) {
                tools.Log(`用户${user.nickname}还有${this.getTimeDifference(endTime)}到期，请注意续费`)
                const msg: msgContent = {
                    text: `您的辣条黑科技还有${this.getTimeDifference(endTime, time)}到期\n请注意续费\n`,
                    jump_text: '',
                    jump_uri: ''
                }
                this.sendMsg(msg, user)
            }
        })
    }
    private async sendMsg(msg: msgContent, receiver: User) {
        if (this._user === undefined) return
        if (!Options._.advConfig['managerSendStatus']) return
        msg.text += Options._.advConfig['managerMessage']
        msg['title'] = <string>Options._.advConfig['managerTitle']
        const reward: requestOptions = {
            method: 'POST',
            uri: `https://api.vc.bilibili.com/web_im/v1/web_im/send_msg`,
            body: `msg[sender_uid]=${this._user.biliUID}&msg[receiver_id]=${receiver.biliUID}&msg[receiver_type]=1&msg[msg_type]=10&msg[content]=${encodeURIComponent(JSON.stringify(msg))}&msg[timestamp]=${Date.now()}&msg[dev_id]=${this.dev_id}&csrf_token=${tools.getCookie(this._user.jar, 'bili_jct')}`,
            jar: this._user.jar,
            json: true,
            headers: this._user.headers
        }
        tools.XHR<msgResponse>(reward).then(msgReward => {
            if (msgReward !== undefined && msgReward.response.statusCode === 200 && msgReward.body.code === 0) {
                tools.Log(`提醒${receiver.nickname}成功`)
            } else {
                tools.Log(`提醒${receiver.nickname}失败，请检查程序`)
            }
        })
    }
    private getTimeDifference(endTime: string | number, startTime: string | number = Date.now()) {
        const stime = new Date(startTime).getTime()
        const etime = new Date(endTime).getTime()
        // 两个时间戳相差的毫秒数
        const usedTime = etime - stime
        return `${Math.floor(usedTime / (24 * 3600 * 1000))}天`
    }
    private getGUID() {
        let guid = '';
        for (var i = 1; i <= 32; i++) {
            var n = Math.floor(Math.random() * 16.0).toString(16);
            guid += n;
            if ((i == 8) || (i == 12) || (i == 16) || (i == 20))
                guid += '-'
        }
        return guid.toUpperCase()
    }
}
interface msgResponse {
    code: number
    msg: string
    message: string
    data: msgData
}
interface msgData {
    msg_key: number
    _gt_: number
}
interface msgContent {
    title?: string
    text: string
    jump_text: string
    jump_uri: string
}
export default new Manager()
import Lottery from './raffle'
import Plugin, { tools } from '../../plugin'
import Options from '../../options'

class Raffle extends Plugin {
  constructor() {
    super()
  }
  public name = '抽奖插件'
  public description = '自动参与抽奖'
  public version = '0.0.4'
  public author = 'Vector000'
  public loaded = false
  // 是否开启抽奖
  private _raffle = true
  // 普通/风暴封禁列表
  private _raffleBanList: Map<string, boolean> = new Map()
  private _stormBanList: Map<string, boolean> = new Map()
  // 风暴限制列表
  private _stormEarn: any = {}
  public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
    // 抽奖暂停
    defaultOptions.config['rafflePause'] = []
    defaultOptions.info['rafflePause'] = {
      description: '抽奖暂停',
      tip: '在此时间段内不参与抽奖, 24时制, 以\",\"分隔, 只有一个时间时不启用',
      type: 'numberArray'
    }
    whiteList.add('rafflePause')
    // 节奏发包次数
    defaultOptions.advConfig['stormSetting'] = [1000, 5]
    defaultOptions.info['stormSetting'] = {
      description: '节奏设置',
      tip: '节奏风暴的相关设置，以\",\"分隔，第一个参数为发包间隔(ms)，第二个参数为发包次数',
      type: 'numberArray'
    }
    whiteList.add('stormSetting')
    // 节奏并发用户数现在
    defaultOptions.advConfig['stormUserLimit'] = 3
    defaultOptions.info['stormUserLimit'] = {
      description: '节奏用户限制',
      tip: '同一时间允许参与节奏风暴抽奖的用户数量限制',
      type: 'number'
    }
    whiteList.add('stormUserLimit')
    // 非beatStorm类抽奖的全局延迟
    defaultOptions.advConfig['raffleDelay'] = 3000
    defaultOptions.info['raffleDelay'] = {
      description: 'raffle延迟',
      tip: '非节奏风暴抽奖的全局延迟，单位为毫秒(ms)，默认为3000',
      type: 'number'
    }
    whiteList.add('raffleDelay')
    // beatStorm类抽奖的全局延迟
    defaultOptions.advConfig['beatStormDelay'] = 20
    defaultOptions.info['beatStormDelay'] = {
      description: 'beatStorm延迟',
      tip: '节奏风暴抽奖的全局延迟，单位为毫秒(ms)，默认为20',
      type: 'number'
    }
    whiteList.add('beatStormDelay')
    // smallTV/raffle/lottery丢弃概率
    defaultOptions.advConfig['raffleDrop'] = 0
    defaultOptions.info['raffleDrop'] = {
      description: '抽奖丢弃',
      tip: '非节奏风暴抽奖的丢弃概率，0-100(百分比)',
      type: 'number'
    }
    whiteList.add('raffleDrop')
    // beatStorm丢弃概率
    defaultOptions.advConfig['beatStormDrop'] = 0
    defaultOptions.info['beatStormDrop'] = {
      description: '风暴丢弃',
      tip: '节奏风暴抽奖的丢弃概率，0-100(百分比)',
      type: 'number'
    }
    whiteList.add('beatStormDrop')
    // raffle类抽奖
    defaultOptions.newUserData['raffle'] = false
    defaultOptions.info['raffle'] = {
      description: '活动抽奖',
      tip: '自动参与活动抽奖',
      type: 'boolean'
    }
    whiteList.add('raffle')
    // lottery类抽奖
    defaultOptions.newUserData['lottery'] = false
    defaultOptions.info['lottery'] = {
      description: '舰队抽奖',
      tip: '自动参与lottery类抽奖',
      type: 'boolean'
    }
    whiteList.add('lottery')
    // pklottery类抽奖
    defaultOptions.newUserData['pklottery'] = false
    defaultOptions.info['pklottery'] = {
      description: '大乱斗抽奖',
      tip: '自动参与pklottery类抽奖',
      type: 'boolean'
    }
    whiteList.add('pklottery')
    // beatStorm类抽奖
    defaultOptions.newUserData['beatStorm'] = false
    defaultOptions.info['beatStorm'] = {
      description: '节奏风暴',
      tip: '自动参与节奏风暴',
      type: 'boolean'
    }
    whiteList.add('beatStorm')
    // beatStorm限制
    defaultOptions.newUserData['beatStormLimit'] = 50
    defaultOptions.info['beatStormLimit'] = {
      description: '风暴限制',
      tip: '每日领取节奏风暴类抽奖奖励的限制',
      type: 'number'
    }
    whiteList.add('beatStormLimit')
    // beatStorm优先级
    defaultOptions.newUserData['beatStormPriority'] = 0
    defaultOptions.info['beatStormPriority'] = {
      description: '风暴优先级',
      tip: '各用户领取风暴的优先级，优先级较低的用户会受并发控制而不参与抽奖',
      type: 'number'
    }
    whiteList.add('beatStormPriority')
    // beatStorm领取量
    defaultOptions.newUserData['beatStormTaken'] = 0
    whiteList.add('beatStormTaken')
    // beatStorm刷新时间
    defaultOptions.advConfig['beatStormRefresh'] = Date.now()
    whiteList.add('beatStormRefresh')
    /**
     * 抽奖api
     */
    defaultOptions.advConfig['raffleAPI'] = 'https://api.live.bilibili.com/gift/v4/smalltv'
    defaultOptions.info['raffleAPI'] = {
      description: 'raffleAPI',
      tip: 'raffle类抽奖API',
      type: 'string'
    }
    whiteList.add('raffleAPI')
    defaultOptions.advConfig['lotteryAPI'] = 'https://api.live.bilibili.com/xlive/lottery-interface/v2/Lottery'
    defaultOptions.info['lotteryAPI'] = {
      description: 'lotteryAPI',
      tip: 'lottery类抽奖API',
      type: 'string'
    }
    whiteList.add('lotteryAPI')
    defaultOptions.advConfig['pklotteryAPI'] = 'https://api.live.bilibili.com/xlive/lottery-interface/v1/pk'
    defaultOptions.info['pklotteryAPI'] = {
      description: 'pklotteryAPI',
      tip: 'pklottery类抽奖API',
      type: 'string'
    }
    whiteList.add('pklotteryAPI')
    defaultOptions.advConfig['beatStormAPI'] = 'https://api.live.bilibili.com/lottery/v1/Storm'
    defaultOptions.info['beatStormAPI'] = {
      description: 'beatStormAPI',
      tip: 'beatStorm类抽奖API',
      type: 'string'
    }
    whiteList.add('beatStormAPI')

    this._lotteryTimer = setInterval(() => this._Lottery(), this.lotteryShiftTime)

    this.loaded = true
  }
  /**
   * 领取数量清零
   * 
   * @param users 
   * @private
   */
  private async _refreshCount(users: Map<string, User>) {
    users.forEach(user => this._stormEarn[user.uid] = 0)
  }
  /**
   * 加载领取数量
   * 
   * @param options 
   * @param users 
   * @private
   */
  private async _loadCount(options: options, users: Map<string, User>) {
    const cst = new Date(Date.now() + 8 * 60 * 60 * 1000)
    const cstHour = cst.getUTCHours()
    const cstMin = cst.getUTCMinutes()
    const cstSec = cst.getUTCSeconds()
    const todaySecondsPassed = cstHour * 3600 + cstMin * 60 + cstSec
    if (Date.now() - <number>options.advConfig['beatStormRefresh'] < todaySecondsPassed * 1000)
      users.forEach(async (user, uid) => this._stormEarn[uid] = user.userData['beatStormTaken'])
  }
  /**
   * 计算优先级，确定用户是否允许抽奖
   * 
   * @param users 
   * @private
   * @returns {number}
   */
  private async _getPriorityLimit(options: options, users: Map<string, User>) {
    let userPriority: Array<number> = new Array()
    users.forEach(async (user, uid) => {
      if (this._raffleBanList.get(uid) || this._stormBanList.get(uid)) return
      if (!user.userData['beatStorm']) return
      if (this._stormEarn[uid] !== undefined && this._stormEarn[uid] >= <number>user.userData['beatStormLimit']) return
      userPriority.push(<number>user.userData['beatStormPriority'])
    })
    let priorityAsc = userPriority.sort(function (a, b) { return a - b })
    let order = priorityAsc.length - <number>options.advConfig['stormUserLimit']
    if (order < 0) order = 0
    let priority = priorityAsc[order]
    return priority
  }
  public async start({ options, users }: { options: options, users: Map<string, User> }) {
    this._refreshCount(users)
    this._loadCount(options, users)
  }
  public async loop({ cstMin, cstHour, cstString, options, users }: { cstMin: number, cstHour: number, cstString: string, options: options, users: Map<string, User> }) {
    // 抽奖暂停
    const rafflePause = <number[]>options.config['rafflePause']
    if (rafflePause.length > 1) {
      const start = rafflePause[0]
      const end = rafflePause[1]
      if (start > end && (cstHour >= start || cstHour < end) || (cstHour >= start && cstHour < end)) this._raffle = false
      else this._raffle = true
    }
    else this._raffle = true
    if (cstMin === 0 && cstHour % 2 === 0) {
      this._raffleBanList.clear()
      this._stormBanList.clear()
    }
    if (cstString === '00:00') this._refreshCount(users)
    //当队列长度大于等于50的时候将频率改成500ms一次
    const time = (this._lotteryQueue.lottery.length + this._lotteryQueue.pklottery.length >= 50 ? 1000 : 300) * users.size
    if (this.lotteryShiftTime !== time && !this.lottery) {
      clearInterval(this._lotteryTimer)
      this.lotteryShiftTime = time
      this._lotteryTimer = setInterval(() => this._Lottery(), this.lotteryShiftTime)
    }
    if (cstHour === 23 && cstMin > 50) {
      clearInterval(this._lotteryTimer)
      this.lottery = false
    } else {
      if (!this.lottery) {
        this.lottery = true
        clearInterval(this._lotteryTimer)
        this._lotteryTimer = setInterval(() => this._Lottery(), this.lotteryShiftTime)
      }
    }
    // 当天数据写入JSON
    users.forEach(async (user, uid) => user.userData['beatStormTaken'] = this._stormEarn[uid])
    options.advConfig['beatStormRefresh'] = Date.now()
    Options.save()
  }
  public async msg({ message, options, users }: { message: raffleMessage | lotteryMessage | beatStormMessage, options: options, users: Map<string, User> }) {
    if (this._raffle) await this._preRaffle({ message, options, users })
  }
  // 抽奖缓存，应对大量抽奖
  private raffleSet: Set<number> = new Set()
  private raffleTime: number = Date.now()

  // private _lotteryQueue: Array<{ message: lotteryMessage, options: options, users: Map<string, User> }> = new Array()
  private _lotteryQueue = {
    lottery: new Array<{ message: lotteryMessage, options: options, users: Map<string, User> }>(),
    pklottery: new Array<{ message: lotteryMessage, options: options, users: Map<string, User> }>()
  }

  private lotteryShiftTime: number = 2000

  private lottery: boolean = false

  private _lotteryTimer!: NodeJS.Timeout

  private _Lottery() {
    const queue = this._lotteryQueue.pklottery.length > 0 ? this._lotteryQueue.pklottery.shift() : this._lotteryQueue.lottery.shift()
    if (queue !== undefined) {
      if (queue.message.timeout - Date.now() <= 3000) {
        this._Lottery()
      } else {
        this._doRaffle(queue)
      }
    }
  }
  /**
   * 抽奖缓冲，应对大量抽奖
   * 
   */
  private async _preRaffle({ message, options, users }: { message: raffleMessage | lotteryMessage | beatStormMessage, options: options, users: Map<string, User> }) {
    const raffleID = message.id
    if (message.cmd === 'beatStorm') this._doStorm({ message, options, users })
    else {
      if (message.timeout === undefined) {
        message['timeout'] = Date.now() + message.time * 1000
      }
      // 将舰队放入队列进行抽取
      if (message.cmd === 'lottery' || message.cmd === 'pklottery') {
        this._lotteryQueue[message.cmd].push({ message, options, users })
        console.log('队列长度', this._lotteryQueue.lottery.length + this._lotteryQueue.pklottery.length)
      } else if (message.cmd === 'raffle') {
        message['timeout'] = Date.now() + message.time_wait * 1000
        if (Date.now() - this.raffleTime < 400) {
          this.raffleTime = Date.now()
          this.raffleSet.add(raffleID)
          await tools.Sleep(400 * this.raffleSet.size)
          this._doRaffle({ message, options, users })
        }
        else {
          this.raffleTime = Date.now()
          this.raffleSet.clear()
          this._doRaffle({ message, options, users })
        }
      }
      // 据说一秒发12包会被gank，所以根据用户数量动态设定延迟
      // const time = message.cmd === 'lottery' ? 1000 * Math.floor(users.size / 15) : 400
      // if (Date.now() - this.raffleTime < time) {
      //   this.raffleTime = Date.now()
      //   this.raffleSet.add(raffleID)
      //   await tools.Sleep(time * this.raffleSet.size)
      //   this._doRaffle({ message, options, users })
      // }
      // else {
      //   this.raffleTime = Date.now()
      //   // this.raffleSet.clear()
      //   this._doRaffle({ message, options, users })
      // }
    }
  }
  /**
   * 进行非beatStorm类抽奖
   * 
   * @param {message, options, users}
   * @private
   */
  private async _doRaffle({ message, options, users }: { message: raffleMessage | lotteryMessage, options: options, users: Map<string, User> }) {
    const delay = <number>options.advConfig['raffleDelay']
    if ((message.timeout - (Date.now() + delay)) <= 3000) return tools.Log(message.title, message.id, '抽奖已结束取消抽奖')
    if (delay !== 0) await tools.Sleep(delay)
    for (let [uid, user] of users) {
      if (user.captchaJPEG !== '' || !user.userData[message.cmd]) continue
      if (this._raffleBanList.get(uid)) continue
      const droprate = <number>options.advConfig['raffleDrop']
      if (droprate !== 0 && Math.random() < droprate / 100) {
        tools.Log(user.nickname, '丢弃抽奖', message.id)
        continue
      }
      else {
        const lottery = new Lottery(message, user, options)
        lottery
          .on('msg', (msg: pluginNotify) => {
            if (msg.cmd === 'ban') this._raffleBanList.set(msg.data.uid, true)
            this.emit('msg', msg)
          })
          .Start()
        this.raffleSet.delete(message.id)
      }
      await tools.Sleep(200)
    }
  }
  /**
   * 进行beatStorm类抽奖
   * 
   * @param {message, options, users}
   * @private
   */
  private async _doStorm({ message, options, users }: { message: beatStormMessage, options: options, users: Map<string, User> }) {
    const stormPriorityTheshold = await this._getPriorityLimit(options, users)
    users.forEach(async (user, uid) => {
      if (user.captchaJPEG !== '' || !user.userData['beatStorm']) return
      if (this._raffleBanList.get(uid) || this._stormBanList.get(uid)) return
      if (this._stormEarn[uid] !== undefined && this._stormEarn[uid] >= <number>user.userData['beatStormLimit']) return
      if (<number>user.userData['beatStormPriority'] < stormPriorityTheshold) return
      const droprate = <number>options.advConfig['beatStormDrop']
      if (droprate !== 0 && Math.random() < droprate / 100) tools.Log(user.nickname, '丢弃抽奖', message.id)
      else {
        const delay = <number>options.advConfig['beatStormDelay']
        if (delay !== 0) await tools.Sleep(delay)
        const lottery = new Lottery(message, user, options)
        lottery
          .on('msg', (msg: pluginNotify) => {
            if (msg.cmd === 'ban') this._stormBanList.set(msg.data.uid, true)
            if (msg.cmd === 'earn') this._stormEarn[uid]++
            this.emit('msg', msg)
          })
          .Start()
      }
    })
  }
}

export default new Raffle()

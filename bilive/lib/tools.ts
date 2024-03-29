import util from 'util'
import crypto from 'crypto'
import got from 'got'
import { CookieJar } from 'tough-cookie'
import { EventEmitter } from 'events'
import { IncomingHttpHeaders } from 'http'

/**
 * 一些工具, 供全局调用
 *
 * @class Tools
 * @extends {EventEmitter}
 */
class Tools extends EventEmitter {
  constructor() {
    super()
    this.on('systemMSG', (data: systemMSG) => this.Log(data.message))
  }
  /**
   * 请求头
   *
   * @param {string} platform
   * @returns {request.Headers}
   * @memberof tools
   */
  public getHeaders(platform: string): IncomingHttpHeaders {
    switch (platform) {
      case 'Android':
        return {
          'Connection': 'Keep-Alive',
          'env': 'prod',
          'User-Agent': 'Mozilla/5.0 BiliDroid/6.33.0 (bbcallen@gmail.com) os/android model/XQ-BC72 mobi_app/android build/6330300 channel/master innerVer/6330300 osVer/10 network/1'
        }
      case 'WebView':
        return {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
          'Connection': 'keep-alive',
          'Origin': 'https://live.bilibili.com',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 11; XQ-BC72 Build/61.0.A.10.1; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.120 Mobile Safari/537.36 os/android model/XQ-BC72 build/6330300 osVer/11 sdkInt/30 network/1 BiliApp/6330300 mobi_app/android channel/master innerVer/6330300 c_locale/zh-Hans_CN s_locale/zh-Hans_CN',
          'X-Requested-With': 'tv.danmaku.bili'
        }
      default:
        return {
          'Accept': 'application/json, text/javascript, */*',
          'Accept-Language': 'zh-CN,zh-TW;q=0.9,zh;q=0.8,en-US;q=0.7,en;q=0.6',
          'Connection': 'keep-alive',
          'DNT': '1',
          'Origin': 'https://live.bilibili.com',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    }
  }
  /**
   * 添加request头信息
   *
   * @template T
   * @param {XHRoptions} options
   * @param {('PC' | 'Android' | 'WebView')} [platform='PC']
   * @returns {(Promise<XHRresponse<T> | undefined>)}
   * @memberof tools
   */
  public async XHR<T>(options: XHRoptions, platform: 'PC' | 'Android' | 'WebView' = 'PC'): Promise<XHRresponse<T> | undefined> {
    // @ts-ignore 判断是否被风控
    const url = new URL(options.url)
    const baseUrl = url.hostname + url.pathname
    // @ts-ignore    
    if (this.ban[baseUrl]) return
    const headers = this.getHeaders(platform)
    // 添加头信息    
    options.headers = options.headers === undefined ? headers : Object.assign(headers, options.headers)
    if (this.isInDomains(url.hostname)) {
      const cdn = this.getHost(url.hostname)
      if (cdn !== undefined) {
        options.url = options.url?.toString().replace(url.hostname, cdn)
        options.headers["Host"] = url.hostname
        if (options.cookieJar !== undefined) {
          options.cookieJar = this.toDomainCookie(<CookieJar>options.cookieJar, cdn, url.hostname)
        }
      }
    }
    if (options.method !== undefined && options.method.toUpperCase() === 'POST' && options.headers['Content-Type'] === undefined)
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
    // got把参数分的太细了, 导致responseType没法确定
    const gotResponse = await got<T>(<import('got').OptionsOfJSONResponseBody>options).catch(error => {
      try {
        // this.Log(options)
        // this.ErrorLog('error', options.url)
        this.ErrorLog('error', options.url, error, error.response.body)
      } catch {
        this.ErrorLog('error', options.url, error.code)
        return
      }
      if (error.response.statusCode === 412) {
        // @ts-ignore
        this.ban[baseUrl] = true
        this.Log('接口风控', baseUrl)
        // @ts-ignore
        setTimeout(() => this.ban[baseUrl] = false, 10 * 60 * 1000)
        this.ErrorLog(this.ban)
      }
    })
    if (gotResponse === undefined) return undefined
    else return { response: gotResponse, body: gotResponse.body }
  }
  private ban = {}
  /**
   * 获取cookie值
   *
   * @param {CookieJar} jar
   * @param {string} key
   * @param {*} [url=apiLiveOrigin]
   * @returns {string}
   * @memberof tools
   */
  public getCookie(cookieJar: CookieJar, key: string, url = 'https://api.live.bilibili.com'): string {
    const cookies = cookieJar.getCookiesSync(url)
    const cookieFind = cookies.find(cookie => cookie.key === key)
    return cookieFind === undefined ? '' : cookieFind.value
  }
  /**
   * 设置cookie
   *
   * @param {string} cookieString
   * @returns {CookieJar}
   * @memberof tools
   */
  public setCookie(cookieString: string): CookieJar {
    const jar = new CookieJar()
    if (cookieString !== '') cookieString.split(';').forEach(cookie => jar.setCookieSync(`${cookie}; Domain=bilibili.com; Path=/`, 'https://bilibili.com'))
    return jar
  }
  /**
   * 格式化JSON
   *
   * @template T
   * @param {string} text
   * @param {((key: any, value: any) => any)} [reviver]
   * @returns {(Promise<T | undefined>)}
   * @memberof tools
   */
  public JSONparse<T>(text: string, reviver?: ((key: any, value: any) => any)): Promise<T | undefined> {
    return new Promise<T | undefined>(resolve => {
      try {
        const obj = JSON.parse(text, reviver)
        return resolve(obj)
      }
      catch (error) {
        this.ErrorLog('JSONparse', error)
        return resolve(undefined)
      }
    })
  }
  /**
   * Hash
   *
   * @param {string} algorithm
   * @param {(string | Buffer)} data
   * @returns {string}
   * @memberof tools
   */
  public Hash(algorithm: string, data: string | Buffer): string {
    return crypto.createHash(algorithm).update(data).digest('hex')
  }
  /**
   * 当前系统时间
   *
   * @returns {string}
   * @memberof Tools
   */
  public Date(): string {
    return new Date().toString().slice(4, 24)
  }
  /**
   * 格式化日期输出
   * @param format 格式化字符串
   * @param date 时间
   */
  public format = (format: string, date: Date = new Date()) => {
    /*
     * eg:format="yyyy-MM-dd hh:mm:ss";
     */
    let o: { [index: string]: number | string } = {
      "M+": date.getMonth() + 1, // month
      "d+": date.getDate(), // day
      "h+": date.getHours(), // hour
      "m+": date.getMinutes(), // minute
      "s+": date.getSeconds(), // second
      "q+": Math.floor((date.getMonth() + 3) / 3), // quarter
      "S+": date.getMilliseconds()
      // millisecond
    }

    if (/(y+)/.test(format)) {
      format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4
        - RegExp.$1.length));
    }

    for (let k in o) {
      if (new RegExp("(" + k + ")").test(format)) {
        let formatStr = "";
        for (let i = 1; i <= RegExp.$1.length; i++) {
          formatStr += "0";
        }

        let replaceStr = "";
        if (RegExp.$1.length == 1) {
          replaceStr = o[k].toString();
        } else {
          formatStr = formatStr + o[k];
          let index = ("" + o[k]).length;
          formatStr = formatStr.substr(index);
          replaceStr = formatStr;
        }
        format = format.replace(RegExp.$1, replaceStr);
      }
    }
    return format;
  }
  /**
   * 格式化输出, 配合PM2凑合用
   *
   * @param {...any[]} message
   * @memberof tools
   */
  public Log(...message: any[]) {
    const log = util.format(`${this.format("yyyy-MM-dd hh:mm:ss:SSS")} :`, ...message)
    if (this.logs.length > 500) this.logs.shift()
    this.emit('log', log)
    this.logs.push(log)
    console.log(log)
  }
  public logs: string[] = []
  /**
   * 格式化输出, 配合PM2凑合用
   *
   * @param {...any[]} message
   * @memberof tools
   */
  public ErrorLog(...message: any[]) {
    console.error(`${this.format("yyyy-MM-dd hh:mm:ss:SSS")} :`, ...message)
  }
  /**
   * sleep
   *
   * @param {number} ms
   * @returns {Promise<'sleep'>}
   * @memberof tools
   */
  public Sleep(ms: number): Promise<'sleep'> {
    return new Promise<'sleep'>(resolve => setTimeout(() => resolve('sleep'), ms < 0 ? 0 : ms))
  }
  /**
   * 极验验证码识别
   *
   * @param {string} ValidateURL
   * @returns {Promise<string>}
   * @memberof tools
   */
  public Validate!: (ValidateURL: string) => Promise<string>
  /**
   * 为了兼容旧版
   *
   * @param {string} message
   * @returns {void}
   * @memberof Tools
   */
  public sendSCMSG!: (message: string) => void
  /**
   * 生成指定范围内的随机数
   * @param lower 最小范围
   * @param upper 最大范围
   */
  public random(lower: number = 0, upper: number = 10) {
    return Math.floor(Math.random() * (upper - lower + 1)) + lower
  }
  public getTime() {
    return Math.floor(Date.now() / 1000)
  }

  public isToday(date: string | number) {
    if (typeof date === 'number' && date.toString().length === 10) {
      date = date * 1000
    }
    return new Date(date).toString().slice(0, 15) === new Date().toString().slice(0, 15)
  }

  private getHost(domain: string) {
    const Options = require('../options').default
    const host = Options._.hosts[domain]
    if (host !== undefined) {
      return host[this.random(0, host.length)]
    }
    return undefined
  }

  private isInDomains(domain: string): boolean {
    const Options = require('../options').default
    return Object.keys(Options._.hosts).includes(domain)
  }

  private toDomainCookie(cookieJar: CookieJar, domain: string, old_domain: string) {
    const jar = new CookieJar()
    const url = `https://${old_domain}`
    const cookies = cookieJar.getCookiesSync(url)
    for (const iterator of cookies) {
      jar.setCookieSync(`${iterator}; Domain=${domain}; Path=/`, `https://${domain}`)
    }
    // cookies.forEach(
    //   cookie => jar.setCookieSync(`${cookie}; Domain=${domain}; Path=/`,`https://${domain}`)
    // )
    return jar
  }
}
export default new Tools()
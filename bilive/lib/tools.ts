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
          'User-Agent': 'Mozilla/5.0 BiliDroid/6.0.0 (bbcallen@gmail.com) os/android model/xiaomi 6 mobi_app/android build/6000200 channel/master innerVer/6000200 osVer/5.1.1 network/2'
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
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; J9110 Build/55.1.A.3.107; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/80.0.3987.162 Mobile Safari/537.36 BiliApp/5570300',
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36'
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
    // 为了兼容已有插件
    if (options.url === undefined && options.uri !== undefined) {
      options.url = options.uri
      delete options.uri
    }
    if (options.cookieJar === undefined && options.jar !== undefined) {
      options.cookieJar = options.jar
      delete options.jar
    }
    if (options.encoding === null) {
      options.responseType = 'buffer'
      delete options.encoding
    }
    if (options.json === true) {
      options.responseType = 'json'
      delete options.json
    }
    // @ts-ignore 判断是否被风控
    if (this.ban[options.url]) return
    // 添加头信息
    const headers = this.getHeaders(platform)
    options.headers = options.headers === undefined ? headers : Object.assign(headers, options.headers)
    if (options.method?.toLocaleUpperCase() === 'POST' && options.headers['Content-Type'] === undefined)
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
    // @ts-ignore got把参数分的太细了, 导致responseType没法确定
    const gotResponse = await got<T>(options).catch(error => {
      this.ErrorLog(options.url, error.response.body)
      if (error.response.statusCode === 412) {
        // @ts-ignore
        this.ban[options.url] = true
        this.Log('接口风控', options.url)
        // @ts-ignore
        setTimeout(() => this.ban[options.url] = false, 10 * 60 * 1000)
        this.Log(this.ban)
      }
    })
    if (gotResponse === undefined) return
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
  public getCookie(jar: CookieJar, key: string, url = 'https://api.live.bilibili.com'): string {
    const cookies = jar.getCookiesSync(url)
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
        return resolve()
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

  public format = (fmt: string, date: Date = new Date()) => {
    let o: any = {
      "Y+": date.getFullYear().toString(),        // 年
      "y+": date.getFullYear().toString(),        // 年
      "m+": (date.getMonth() + 1).toString(),     // 月
      "d+": date.getDate().toString(),            // 日
      "H+": date.getHours().toString(),           // 时
      "M+": date.getMinutes().toString(),         // 分
      "S+": date.getSeconds().toString()          // 秒
    }

    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length))
    }
    for (let k in o) {
      if (new RegExp("(" + k + ")").test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)))
      }
    }
    return fmt
  }
  /**
   * 格式化输出, 配合PM2凑合用
   *
   * @param {...any[]} message
   * @memberof tools
   */
  public Log(...message: any[]) {
    const log = util.format(`${this.format("yyyy-mm-dd HH:MM:SS")} :`, ...message)
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
    console.error(`${this.Date()} :`, ...message)
  }
  /**
   * sleep
   *
   * @param {number} ms
   * @returns {Promise<'sleep'>}
   * @memberof tools
   */
  public Sleep(ms: number): Promise<'sleep'> {
    return new Promise<'sleep'>(resolve => setTimeout(() => resolve('sleep'), ms))
  }
  /**
   * 为了兼容旧版
   *
   * @param {string} message
   * @returns {void}
   * @memberof Tools
   */
  public sendSCMSG!: (message: string) => void
  /**
   * 异或加密
   *
   * @param {string} key
   * @param {string} input
   * @returns {string}
   */
  public static xorStrings(key: string, input: string): string {
    let output: string = ''
    for (let i = 0, len = input.length; i < len; i++) {
      output += String.fromCharCode(
        input.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      )
    }
    return output
  }
  public B64XorCipher = {
    encode(key: string, data: string): string {
      return (data && data !== '' && key !== '') ? Buffer.from(Tools.xorStrings(key, data), 'utf8').toString('base64') : data
    },
    decode(key: string, data: string): string {
      return (data && data !== '' && key !== '') ? Tools.xorStrings(key, Buffer.from(data, 'base64').toString('utf8')) : data
    }
  }
  /**
   * 生成指定范围内的随机数
   * @param lower 最小范围
   * @param upper 最大范围
   */
  public random(lower: number = 0, upper: number = 10) {
    return Math.floor(Math.random() * (upper - lower + 1)) + lower
  }
}

export default new Tools()

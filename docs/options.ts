/**
 * 与服务器进行通信并返回结果
 * 
 * @class Options
 */
class Options {
  constructor() {
    // 关闭窗口时断开连接
    window.onunload = () => { options.close() }
  }
  /**
   * 回调函数
   * 
   * @private
   * @memberof Options
   */
  private __callback: { [ts: string]: (message: any) => void } = {}
  /**
   * 加密相关
   *
   * @private
   * @type {boolean}
   * @memberof Options
   */
  private __crypto: boolean = false
  private __algorithm!: string
  private __sharedSecret!: CryptoKey
  private __sharedSecretHex!: string
  /**
   * WebSocket客户端
   * 
   * @protected
   * @type {WebSocket}
   * @memberof Options
   */
  protected _ws!: WebSocket
  /**
   * 随机16进制数
   * 
   * @readonly
   * @protected
   * @type {string}
   * @memberof Options
   */
  protected get _ts(): string {
    const bufArray = <Uint32Array>window.crypto.getRandomValues(new Uint32Array(5))
    let random = ''
    bufArray.forEach(value => { random += value.toString(16) })
    return random.slice(0, 32)
  }
  /**
   * 连接到服务器
   * 
   * @param {string} path 
   * @param {string[]} protocols
   * @returns {Promise<boolean>} 
   * @memberof Options
   */
  public connect(path: string, protocols: string[]): Promise<boolean> {
    return new Promise(resolve => {
      try {
        const ws = new WebSocket(path, protocols)
        const removeEvent = () => {
          this.__crypto = false
          // @ts-ignore
          delete ws.onopen
          // @ts-ignore
          delete ws.onerror
        }
        ws.onopen = async () => {
          removeEvent()
          this._ws = ws
          this._init()
          if (window.crypto.subtle !== undefined) {
            const clientKey = await window.crypto.subtle.generateKey(
              {
                name: 'ECDH',
                namedCurve: 'P-521'
              },
              false,
              ['deriveKey', 'deriveBits']
            )
            const clientPublicKeyExported = await window.crypto.subtle.exportKey(
              'raw', clientKey.publicKey
            )
            const clientPublicKeyHex = ECDH.buf2hex(new Uint8Array(clientPublicKeyExported))
            const type = 'ECDH-AES-256-GCM'
            const server = await this._send<message>({ cmd: 'hello', msg: type, data: clientPublicKeyHex })
            if (server.msg === type) {
              const serverPublicKeyHex = <string>server.data
              const serverPublicKey = ECDH.hex2buf(serverPublicKeyHex)
              const serverKeyImported = await window.crypto.subtle.importKey(
                'raw',
                serverPublicKey,
                {
                  name: 'ECDH',
                  namedCurve: 'P-521'
                },
                false,
                []
              )
              const sharedSecret = await window.crypto.subtle.deriveKey(
                {
                  name: 'ECDH',
                  public: serverKeyImported
                },
                clientKey.privateKey,
                {
                  name: 'AES-GCM',
                  length: 256
                },
                false,
                ['encrypt', 'decrypt']
              )
              this.__crypto = true
              this.__algorithm = type
              this.__sharedSecret = sharedSecret
            }
          }
          else {
            const clientKey = ECDH.createECDH('secp521r1')
            clientKey.generateKeys()
            const clientPublicKeyHex = clientKey.getPublicKey()
            const type = 'ECDH-AES-256-CBC'
            const server = await this._send<message>({ cmd: 'hello', msg: type, data: clientPublicKeyHex })
            if (server.msg === type) {
              const serverPublicKeyHex = <string>server.data
              const sharedSecretHex = clientKey.computeSecret(serverPublicKeyHex).slice(0, 64)
              this.__crypto = true
              this.__algorithm = type
              this.__sharedSecretHex = CryptoJS.enc.Hex.parse(sharedSecretHex)
            }
          }
          resolve(true)
        }
        ws.onerror = error => {
          removeEvent()
          console.error(error)
          resolve(false)
        }
      }
      catch (error) {
        console.error(error)
        resolve(false)
      }
    })
  }
  /**
   * 添加各种EventListener
   * 
   * @protected
   * @memberof Options
   */
  protected _init() {
    this._ws.onerror = data => {
      this.close()
      if (typeof this.onwserror === 'function') this.onwserror(data)
      else console.error(data)
    }
    this._ws.onclose = data => {
      this.close()
      if (typeof this.onwsclose === 'function') this.onwsclose(data)
      else console.error(data)
    }
    this._ws.onmessage = async data => {
      const Data: string | Blob | ArrayBuffer = data.data
      let message: message
      if (typeof Data === 'string') message = JSON.parse(Data)
      else {
        const msg = new Blob([Data])
        if (this.__crypto) {
          switch (this.__algorithm) {
            case 'ECDH-AES-256-GCM': {
              const aesdata = new Uint8Array(await msg.arrayBuffer())
              const iv = aesdata.slice(0, 12)
              const encrypted = aesdata.slice(12)
              const decrypted = await window.crypto.subtle.decrypt(
                {
                  name: "AES-GCM",
                  iv: iv
                },
                this.__sharedSecret,
                encrypted
              )
              const decoder = new Blob([decrypted])
              const decoded = await decoder.text()
              message = JSON.parse(decoded)
            }
              break
            case 'ECDH-AES-256-CBC': {
              const aesdata = new Uint8Array(await msg.arrayBuffer())
              const ivHex = CryptoJS.enc.Hex.parse(ECDH.buf2hex(aesdata.slice(0, 16)))
              const encryptedHex = CryptoJS.enc.Hex.parse(ECDH.buf2hex(aesdata.slice(16)))
              const encryptedBase64 = CryptoJS.enc.Base64.stringify(encryptedHex)
              const decrypted = CryptoJS.AES.decrypt(encryptedBase64, this.__sharedSecretHex, {
                iv: ivHex
              })
              const decoded = decrypted.toString(CryptoJS.enc.Utf8)
              message = JSON.parse(decoded)
            }
              break
            default:
              message = { cmd: 'log', ts: 'log', msg: '未知加密格式' }
              break
          }
        }
        else message = JSON.parse(await msg.text())
      }

      const ts = message.ts
      if (ts != null && typeof this.__callback[ts] === 'function') {
        delete message.ts
        this.__callback[ts](message)
        delete this.__callback[ts]
      }
      else if (message.cmd === 'log' && typeof this.onlog === 'function') this.onlog(<string>message.msg)
      else if (typeof this.onerror === 'function') this.onerror(data)
      else console.error(data)
    }
  }
  /**
   * 向服务器发送消息
   * 
   * @protected
   * @template T 
   * @param {message} message 
   * @returns {Promise<T>} 
   * @memberof Options
   */
  protected _send<T>(message: message): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject('timeout')
      }, 30 * 1000) // 30秒
      const ts = this._ts
      message.ts = ts
      this.__callback[ts] = (msg: T) => {
        clearTimeout(timeout)
        resolve(msg)
      }
      const msg = JSON.stringify(message)
      if (this._ws.readyState === WebSocket.OPEN) {
        if (this.__crypto) {
          switch (this.__algorithm) {
            case 'ECDH-AES-256-GCM': {
              const iv = window.crypto.getRandomValues(new Uint8Array(12))
              const encoder = new Blob([msg])
              const encoded = await encoder.arrayBuffer()
              const encrypted = await window.crypto.subtle.encrypt(
                {
                  name: "AES-GCM",
                  iv: iv
                },
                this.__sharedSecret,
                encoded
              )
              const aesdata = new Uint8Array([...iv, ...new Uint8Array(encrypted)])
              this._ws.send(aesdata)
            }
              break
            case 'ECDH-AES-256-CBC': {
              const ivHex = CryptoJS.enc.Hex.parse(ECDH.randomBytes(16))
              const encrypted = CryptoJS.AES.encrypt(msg, this.__sharedSecretHex, {
                iv: ivHex
              })
              const aesdataHex = ivHex + encrypted.ciphertext
              const aesdata = ECDH.hex2buf(aesdataHex)
              this._ws.send(aesdata)
            }
              break
            default:
              break
          }
        }
        else this._ws.send(msg)
      }
      else reject('closed')
    })
  }
  /**
   * 服务器返回消息错误
   * 
   * @memberof Options
   */
  public onerror!: (this: Options, data: MessageEvent) => void
  /**
   * 服务器log
   * 
   * @memberof Options
   */
  public onlog!: (this: Options, data: string) => void
  /**
   * WebSocket错误消息
   * 
   * @memberof Options
   */
  public onwserror!: (this: Options, data: Event) => void
  /**
   * WebSocket断开消息
   * 
   * @memberof Options
   */
  public onwsclose!: (this: Options, data: CloseEvent) => void
  /**
   * 关闭连接
   * 
   * @memberof Options
   */
  public close() {
    this._ws.close()
    this.__callback = {}
  }
  /**
   * 获取Log
   * 
   * @returns {Promise<logMSG>} 
   * @memberof Options
   */
  public getLog(): Promise<logMSG> {
    const message = { cmd: 'getLog' }
    return this._send<logMSG>(message)
  }
  /**
   * 获取设置
   * 
   * @returns {Promise<configMSG>} 
   * @memberof Options
   */
  public getConfig(): Promise<configMSG> {
    const message = { cmd: 'getConfig' }
    return this._send<configMSG>(message)
  }
  /**
   * 保存设置
   * 
   * @param {config} data 
   * @returns {Promise<configMSG>} 
   * @memberof Options
   */
  public setConfig(data: config): Promise<configMSG> {
    const message = { cmd: 'setConfig', data }
    return this._send<configMSG>(message)
  }
  /**
   * 获取设置描述
   * 
   * @returns {Promise<infoMSG>} 
   * @memberof Options
   */
  public getInfo(): Promise<infoMSG> {
    const message = { cmd: 'getInfo' }
    return this._send<infoMSG>(message)
  }
  /**
   * 获取uid
   * 
   * @returns {Promise<userMSG>} 
   * @memberof Options
   */
  public getAllUID(): Promise<userMSG> {
    const message = { cmd: 'getAllUID' }
    return this._send<userMSG>(message)
  }
  /**
   * 获取用户设置
   * 
   * @param {string} uid 
   * @returns {Promise<userDataMSG>} 
   * @memberof Options
   */
  public getUserData(uid: string): Promise<userDataMSG> {
    const message = { cmd: 'getUserData', uid }
    return this._send<userDataMSG>(message)
  }
  /**
   * 保存用户设置
   *
   * @param {string} uid
   * @param {userData} data
   * @param {string} [validate]
   * @param {string} [authcode]
   * @returns {Promise<userDataMSG>}
   * @memberof Options
   */
  public setUserData(uid: string, data: userData, validate?: string, authcode?: string): Promise<userDataMSG> {
    const message: userDataMSG = { cmd: 'setUserData', uid, data }
    if (validate !== undefined) message.validate = validate
    else if (authcode !== undefined) message.authcode = authcode
    return this._send<userDataMSG>(message)
  }
  /**
   * 删除用户
   * 
   * @param {string} uid 
   * @returns {Promise<userDataMSG>} 
   * @memberof Options
   */
  public delUserData(uid: string): Promise<userDataMSG> {
    const message = { cmd: 'delUserData', uid }
    return this._send<userDataMSG>(message)
  }
  /**
   * 设置新用户
   * 
   * @returns {Promise<userDataMSG>} 
   * @memberof Options
   */
  public newUserData(): Promise<userDataMSG> {
    const message = { cmd: 'newUserData' }
    return this._send<userDataMSG>(message)
  }
}
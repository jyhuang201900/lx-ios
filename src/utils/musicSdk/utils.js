import { stringMd5 } from 'react-native-quick-md5'
import { decodeName } from '../index'
import { httpFetch } from '../../request'
import { requestMsg } from '../message'
import { timeout as defaultTimeout } from './options'

/**
 * 获取音乐音质
 * @param {*} info
 * @param {*} type
 */

export const QUALITYS = ['flac24bit', 'flac', 'wav', 'ape', '320k', '192k', '128k']
export const getMusicType = (info, type) => {
  const list = global.lx.qualityList[info.source]
  if (!list) return '128k'
  if (!list.includes(type)) type = list[list.length - 1]
  const rangeType = QUALITYS.slice(QUALITYS.indexOf(type))
  for (const type of rangeType) {
    if (info._types[type]) return type
  }
  return '128k'
}

export const toMD5 = str => stringMd5(str)


/**
 * 格式化歌手
 * @param singers 歌手数组
 * @param nameKey 歌手名键值
 * @param join 歌手分割字符
 */
export const formatSingerName = (singers, nameKey = 'name', join = '、') => {
  if (Array.isArray(singers)) {
    const singer = []
    singers.forEach(item => {
      let name = item[nameKey]
      if (!name) return
      singer.push(name)
    })
    return decodeName(singer.join(join))
  }
  return decodeName(String(singers ?? ''))
}


/**
 * 请求层统一出口
 *
 * 为什么放在这里：音源子目录（kw/kg/tx/wy/mg）里有上百处直接调用 request.js 的
 * `httpFetch`，超时、错误形状、取消三件事各写各的；把统一入口放在音源共用的
 * utils 模块，音源只要把 `import { httpFetch } from '../../request'` 换成
 * `import { request } from '../utils'`，就同时拿到三件事，且函数参数位置不变。
 */

// 统一的错误码。上层只判 code，不再摸 err.response / err.message 猜原因。
// NO_API / SOURCE_UNAVAILABLE 不是网络错误，但共用同一形状，省掉调用方的分支判断。
export const REQUEST_ERROR_CODES = {
  TIMEOUT: 'TIMEOUT',
  NETWORK: 'NETWORK',
  HTTP: 'HTTP',
  SCHEMA: 'SCHEMA',
  CANCELED: 'CANCELED',
  UNKNOWN: 'UNKNOWN',
  NO_API: 'NO_API',
  SOURCE_UNAVAILABLE: 'SOURCE_UNAVAILABLE',
}

/**
 * 归一化后的请求错误。形状固定为 { code, message, source }，
 * 继承 Error 是为了让仍然按 Error 处理的旧代码不炸。
 */
export class RequestError extends Error {
  constructor({ code, message, source = '', status, url, cause }) {
    super(message)
    this.name = 'RequestError'
    this.code = code
    this.source = source
    if (status != null) this.status = status
    if (url) this.url = url
    if (cause !== undefined) this.cause = cause
  }
}

export const isRequestError = err => err instanceof RequestError

export const createCanceledError = (source = '', url = '') => new RequestError({
  code: REQUEST_ERROR_CODES.CANCELED,
  message: requestMsg.cancelRequest,
  source,
  url,
})

// request.js 会把 AbortController 的取消与超时映射成同一条文案，
// 所以「调用方主动取消」只能靠 request() 里的标记区分，剩下的超时特征归 TIMEOUT。
const TIMEOUT_RXP = /超时|timeout/i
const ABORT_RXP = /^abort(ed)?$/i
const NETWORK_RXP = /network request failed|socket hang up|failed to fetch|network error|无法连接|接口无法访问|无法连接到服务器/i
// 中文说明说明已被 request.js 本地化过，直接沿用；英文原文再替换成用户能读的文案。
const CHINESE_RXP = /[\u4e00-\u9fa5]/

const toLocalized = (message, fallback) => CHINESE_RXP.test(message) ? message : fallback

/**
 * 把任意来源的错误收敛成固定形状。
 * @param {*} err 原始错误
 * @param {{ source?: string, url?: string, canceled?: boolean }} ctx 上下文
 */
export const normalizeError = (err, { source = '', url = '', canceled = false } = {}) => {
  if (isRequestError(err)) {
    // 为什么：错误跨层传递时补齐缺的 source / url，调用方拿到的永远是完整形状
    if (!err.source) err.source = source
    if (!err.url && url) err.url = url
    return err
  }
  const message = err && typeof err.message === 'string' ? err.message : String(err ?? requestMsg.fail)
  if (canceled) return new RequestError({ code: REQUEST_ERROR_CODES.CANCELED, message: requestMsg.cancelRequest, source, url, cause: err })
  if (TIMEOUT_RXP.test(message) || ABORT_RXP.test(message)) {
    return new RequestError({ code: REQUEST_ERROR_CODES.TIMEOUT, message: requestMsg.timeout, source, url, cause: err })
  }
  if (NETWORK_RXP.test(message)) {
    return new RequestError({
      code: REQUEST_ERROR_CODES.NETWORK,
      message: toLocalized(message, requestMsg.notConnectNetwork),
      source,
      url,
      cause: err,
    })
  }
  return new RequestError({ code: REQUEST_ERROR_CODES.UNKNOWN, message, source, url, cause: err })
}

/**
 * 结构校验：响应体必须已经被 request.js 解析成对象。
 * request.js 解析失败时会把字符串原样留下，这里把它判成 SCHEMA。
 */
export const expectJsonBody = resp => {
  const body = resp ? resp.body : null
  if (body != null && typeof body === 'object') return true
  return '响应体不是可解析的 JSON 对象'
}

const createAbortWaiter = (signal, source = '') => {
  let onAbort
  const promise = new Promise((resolve, reject) => {
    onAbort = () => reject(createCanceledError(source))
    if (typeof signal.addEventListener === 'function') signal.addEventListener('abort', onAbort)
    else signal.onabort = onAbort
  })
  return {
    promise,
    cleanup() {
      // 为什么：监听必须能摘掉，否则已完成的等待器会一直被 abort 事件触发
      if (typeof signal.removeEventListener === 'function') signal.removeEventListener('abort', onAbort)
      else if (signal.onabort === onAbort) signal.onabort = null
    },
  }
}

/**
 * 统一出站请求。
 *
 * 返回 `{ promise, cancelHttp }`，与 request.js 的 httpFetch 形状一致，迁移只改导入。
 * promise 成功时原样返回 `{ headers, body, statusCode, statusMessage, url, ok }`；
 * 失败时 reject 归一化后的 RequestError（超时 / 网络 / HTTP 非 2xx / 结构不符 / 取消）。
 *
 * @param {string} url 地址
 * @param {object} [options] 透传给 request.js 的请求选项（method/headers/body/form/binary/cache/timeout）
 * @param {object} [config] 本层选项
 * @param {string} [config.source] 音源 id，错误里回填
 * @param {number} [config.timeout] 超时毫秒，默认取 options.timeout，再退回 options.js 的 timeout
 * @param {AbortSignal} [config.signal] 可选取消信号；不传时行为与直接调 httpFetch 相同
 * @param {(resp?: object) => boolean|string} [config.validate] 结构校验，返回 false 或字符串即判 SCHEMA
 * @param {boolean} [config.expectOk=true] 是否把 HTTP 非 2xx 当错误；需要自己看 3xx/4xx 的调用方传 false
 */
export const request = (url, options, config = {}) => {
  const fetchOptions = options || {}
  const {
    source = '',
    timeout = fetchOptions.timeout ?? defaultTimeout,
    signal,
    validate,
    expectOk = true,
  } = config
  const requestOptions = { ...fetchOptions, timeout }

  let canceled = false
  let requestObj = null

  const promise = new Promise((resolve, reject) => {
    if (signal && signal.aborted) {
      // 为什么：外部信号已取消时不该再发一次真实网络请求
      canceled = true
      reject(createCanceledError(source, url))
      return
    }
    requestObj = httpFetch(url, requestOptions)

    let cleanup = () => {}
    if (signal) {
      const onAbort = () => {
        canceled = true
        requestObj.cancelHttp()
      }
      if (typeof signal.addEventListener === 'function') signal.addEventListener('abort', onAbort)
      else signal.onabort = onAbort
      cleanup = () => {
        if (typeof signal.removeEventListener === 'function') signal.removeEventListener('abort', onAbort)
        else if (signal.onabort === onAbort) signal.onabort = null
      }
    }

    requestObj.promise.then(resp => {
      cleanup()
      if (!expectOk) return resolve(resp)
      if (resp.statusCode < 200 || resp.statusCode >= 300) {
        return reject(new RequestError({
          code: REQUEST_ERROR_CODES.HTTP,
          message: `HTTP ${resp.statusCode}`,
          source,
          url,
          status: resp.statusCode,
        }))
      }
      if (validate) {
        let problem = null
        try {
          const result = validate(resp)
          if (result === false) problem = '响应结构与预期不符'
          else if (typeof result === 'string') problem = result
        } catch (err) {
          problem = err && err.message ? err.message : '响应结构校验失败'
        }
        if (problem) {
          return reject(new RequestError({
            code: REQUEST_ERROR_CODES.SCHEMA,
            message: problem,
            source,
            url,
          }))
        }
      }
      resolve(resp)
    }).catch(err => {
      cleanup()
      reject(normalizeError(err, { source, url, canceled }))
    })
  })

  return {
    promise,
    cancelHttp() {
      canceled = true
      if (requestObj) requestObj.cancelHttp()
    },
  }
}

/**
 * `request` 的 JSON 便捷版：额外要求响应体是已解析的对象。
 */
export const requestJson = (url, options, config = {}) => {
  return request(url, options, { ...config, validate: config.validate || expectJsonBody })
}

/**
 * 让一个「已经在跑的聚合 Promise」响应取消信号。
 * 只停止等待，不撤销聚合内部各源已发出的请求——那些请求要各自传 signal 才能真撤。
 * @param {Promise} promise 聚合结果
 * @param {AbortSignal} signal 可选信号，不传则原样返回 promise
 * @param {string} [source] 回填到错误里的来源
 */
export const raceWithSignal = (promise, signal, source = '') => {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(createCanceledError(source))
  const waiter = createAbortWaiter(signal, source)
  return Promise.race([promise, waiter.promise]).finally(() => {
    waiter.cleanup()
  })
}

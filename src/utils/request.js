// import needle from 'needle'
// import progress from 'request-progress'
import BackgroundTimer from 'react-native-background-timer'
import { requestMsg } from './message'
import { bHh } from './musicSdk/options'
import { deflateRaw } from 'pako'

const defaultHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
}
// var proxyUrl = "http://" + user + ":" + password + "@" + host + ":" + port;
// var proxiedRequest = request.defaults({'proxy': proxyUrl});


/**
 * 请求超时自动重试
 * @param {*} url
 * @param {*} options
 */
export const httpFetch = (url, options = { method: 'get' }) => {
  const requestObj = fetchData(url, options)
  return {
    promise: requestObj.request.catch(err => {
      console.log('出错', err.message)
      switch (err.message) {
        case 'socket hang up':
          return Promise.reject(new Error(requestMsg.unachievable))
        case 'Aborted':
          return Promise.reject(new Error(requestMsg.timeout))
        case 'Network request failed':
          return Promise.reject(new Error(requestMsg.notConnectNetwork))
        default:
          return Promise.reject(err)
      }
    }),
    cancelHttp() {
      requestObj.abort()
    },
  }
}

/**
 * http get 请求
 * @param {*} url 地址
 * @param {*} options 选项
 * @param {*} callback 回调
 * @return {Number} index 用于取消请求
 */
export const httpGet = (url, options, callback) => {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }
  const requestObj = fetchData(url, { ...options, method: 'get' })
  requestObj.request.then(resp => {
    callback(null, resp, resp.body)
  }).catch(err => {
    // debugRequest && console.log(JSON.stringify(err))
    callback(err, null, null)
  })

  return () => {
    requestObj.abort()
  }
}

/*
const fetchWithTimeout = (resource, options) => {
  const { timeout = 8000 } = options

  const controller = new global.AbortController()
  const id = BackgroundTimer.setTimeout(() => controller.abort(), timeout)

  return {
    request: global.fetch(resource, {
      ...options,
      signal: controller.signal,
    }).then(response => {
      BackgroundTimer.clearTimeout(id)
      return response
    }),
    abort() {
      controller.abort()
    },
  }
} */


const handleDeflateRaw = data => new Promise((resolve, reject) => {
  resolve(Buffer.from(deflateRaw(data)))
  // deflateRaw(data, (err, buf) => {
  //   if (err) return reject(err)
  //   resolve(buf)
  // })
})

const regx = /(?:\d\w)+/g

const handleRequestData = async(url, {
  method = 'get',
  headers = {},
  format = 'json',
  cache = 'no-store',
  ...options
}) => {
  // console.log(url, options)
  headers = Object.assign({
    Accept: 'application/json',
  }, headers)
  options.cache = cache
  if (method.toLocaleLowerCase() === 'post' && !headers['Content-Type']) {
    if (options.form) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      const formBody = []
      for (let [key, value] of Object.entries(options.form)) {
        let encodedKey = encodeURIComponent(key)
        let encodedValue = encodeURIComponent(value)
        formBody.push(`${encodedKey}=${encodedValue}`)
      }
      options.body = formBody.join('&')
      delete options.form
    } else if (options.formData) {
      headers['Content-Type'] = 'multipart/form-data'
      const formBody = []
      for (let [key, value] of Object.entries(options.form)) {
        let encodedKey = encodeURIComponent(key)
        let encodedValue = encodeURIComponent(value)
        formBody.push(`${encodedKey}=${encodedValue}`)
      }
      options.body = options.formData
      delete options.formData
    } else {
      headers['Content-Type'] = 'application/json'
    }
  }
  if (headers['Content-Type'] === 'application/json' && options.body) {
    options.body = JSON.stringify(options.body)
  }
  if (headers[bHh]) {
    let s = Buffer.from(bHh, 'hex').toString()
    s = s.replace(s.substr(-1), '')
    s = Buffer.from(s, 'base64').toString()
    const v = process.versions.app.split('-')[0].split('.').map(n => n.length < 3 ? n.padStart(3, '0') : n).join('')
    const v2 = process.versions.app.split('-')[1] || ''
    headers[s] = !s || `${(await handleDeflateRaw(Buffer.from(JSON.stringify(`${url}${v}`.match(regx), null, 1).concat(v)).toString('base64'))).toString('hex')}&${parseInt(v)}${v2}`
    delete headers[bHh]
  }

  return {
    ...options,
    method,
    headers: Object.assign({}, defaultHeaders, headers),
  }
}

// https://stackoverflow.com/a/64945178
const blobToBuffer = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new global.FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const data = reader.result.slice(reader.result.indexOf('base64,') + 7)
      resolve(Buffer.from(data, 'base64'))
    }
    reader.readAsDataURL(blob)
  })
}

const fetchData = (url, { timeout = 15000, ...options }) => {
  console.log('---start---', url)

  const controller = new global.AbortController()
  let id = BackgroundTimer.setTimeout(() => {
    id = null
    controller.abort()
  }, timeout)

  return {
    request: handleRequestData(url, options).then(options => {
      return global.fetch(url, {
        ...options,
        signal: controller.signal,
      }).then(resp => (options.binary ? resp.blob() : resp.text()).then(text => {
        // console.log(options, headers, text)
        // log.error('请求完成', options, text)
        // log.error('text result:', typeof text, text ? text.slice(0, 100) : text)
        return {
          headers: resp.headers.map,
          body: text,
          statusCode: resp.status,
          statusMessage: resp.statusText,
          url: resp.url,
          ok: resp.ok,
        }
      })).then(resp => {
        if (options.binary) {
          return blobToBuffer(resp.body).then(buffer => {
            resp.body = buffer
            return resp
          })
        } else {
          try {
            resp.body = JSON.parse(resp.body)
          } catch {}
          return resp
        }
      }).catch(err => {
        // console.log(err, err.code, err.message)
        return Promise.reject(err)
      }).finally(() => {
        if (id == null) return
        BackgroundTimer.clearTimeout(id)
      })
    }),
    abort() {
      controller.abort()
    },
  }
}

export const checkUrl = async(url, options = {}) => {
  return fetchData(url, { method: 'head', ...options }).request.then(resp => {
    if (resp.statusCode === 200) {
      return Promise.resolve()
    } else {
      throw new Error(resp.statusCode)
    }
  })
}

/**
 * 用 HEAD 拿音频文件的实际字节数。
 *
 * 播放地址的响应头里带 content-length，这是唯一对「所有音质都成立」的体积来源：
 * 搜索结果里的 `meta._qualitys[quality].size` 只覆盖内置音源解析得出的档位，
 * 自定义音源的 hires / atmos / master 不在其中，那几档就永远读不到体积。
 *
 * 返回 null 表示拿不到（服务器不返回该头、跨域限制、或请求失败），
 * 调用方应当把它当作「没有这个读数」而不是 0。
 */
/**
 * 探测一条音频流的真实元信息：字节数与容器格式。
 *
 * 用途是**核实**：自定义音源脚本只会返回一个 URL 字符串，协议里没有字段
 * 说明它实际给的是哪一档音质（见 userApiFallback 的 normalizeRequestSuccess，
 * 那里强制 response 必须是字符串）。客户端原本把「请求时传的音质」当成
 * 「拿到的音质」回填，于是选了 master、后端实际给 flac 时，界面照样显示
 * master，体积也和 flac 一模一样。
 *
 * 这里从响应本身取两个客观事实：
 * - content-length：字节数
 * - content-type / 扩展名：容器格式
 *
 * 拿不到就返回 null，调用方据此保持原判，不臆测。
 */
export const probeAudioStream = async(url, options = {}) => {
  try {
    const resp = await fetchData(url, { method: 'head', ...options }).request
    if (resp.statusCode !== 200) return null
    const headers = resp.headers ?? {}
    // whatwg-fetch 的 Headers.map 是小写 key 的普通对象
    const rawSize = headers['content-length'] ?? headers['Content-Length']
    const size = Number(rawSize)
    const contentType = headers['content-type'] ?? headers['Content-Type'] ?? ''
    // HEAD 不一定给 content-type（很多 CDN 只给 content-length），
    // 此时退回 URL 路径里的扩展名
    const ext = /\.([a-z0-9]{2,5})(?:$|[?#])/i.exec(url)?.[1]?.toLowerCase() ?? ''
    return {
      size: Number.isFinite(size) && size > 0 ? size : null,
      contentType: String(contentType).toLowerCase(),
      ext,
    }
  } catch {
    return null
  }
}

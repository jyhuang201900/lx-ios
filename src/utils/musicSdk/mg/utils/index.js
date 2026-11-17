import { request } from '../../utils'

/**
 * 创建一个适用于MG的Http请求
 * @param {*} url
 * @param {*} options
 * @param {*} retryNum
 */
export const createHttpFetch = async(url, options, retryNum = 0) => {
  if (retryNum > 2) throw new Error('try max num')
  let result
  try {
    // 下面按 statusCode 判成功并重试，关掉 expectOk 才保留原来的重试路径
    result = await request(url, options, { source: 'mg', expectOk: false }).promise
  } catch (err) {
    console.log(err)
    return createHttpFetch(url, options, ++retryNum)
  }
  if (result.statusCode !== 200 ||
    (
      (result.body.code !== undefined
        ? result.body.code
        : result.body.returnCode !== undefined
          ? result.body.returnCode
          : result.body.code
      ) !== '000000')
  ) return createHttpFetch(url, options, ++retryNum)
  if (result.body.data) return result.body.data
  return result.body
}

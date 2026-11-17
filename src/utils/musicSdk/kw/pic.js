import { request } from '../utils'

export default {
  getPic({ songmid }) {
    // 响应体是纯文本（一个 URL），非 2xx 时下面要回 null，所以不交给统一层判状态码
    const requestObj = request(`http://artistpicserver.kuwo.cn/pic.web?corp=kuwo&type=rid_pic&pictype=500&size=500&rid=${songmid}`, {}, { source: 'kw', expectOk: false })
    requestObj.promise = requestObj.promise.then(({ body }) => /^http/.test(body) ? body : null)
    return requestObj.promise
  },
}

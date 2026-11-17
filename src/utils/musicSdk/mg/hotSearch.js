import { request } from '../utils'

export default {
  _requestObj: null,
  async getList(retryNum = 0) {
    if (this._requestObj) this._requestObj.cancelHttp()
    if (retryNum > 2) return Promise.reject(new Error('try max num'))

    // 下面自己按 statusCode 判成功，关掉 expectOk 才读得到非 2xx 的响应
    const _requestObj = request('http://jadeite.migu.cn:7090/music_search/v3/search/hotword', {}, { source: 'mg', expectOk: false })
    const { body, statusCode } = await _requestObj.promise
    if (statusCode != 200 || body.code !== '000000') throw new Error('获取热搜词失败')
    // console.log(body, statusCode)
    return { source: 'mg', list: this.filterList(body.data.hotwords[0].hotwordList) }
  },
  filterList(rawList) {
    return rawList.filter(item => item.resourceType == 'song').map(item => item.word)
  },
}

import { request } from '../utils'
// import { decodeName, formatPlayTime, sizeFormate } from '../../index'
// import { signatureParams } from './util'
import { getMusicInfosByList } from './musicInfo'

export default {
  filterAlbum(rawList) {
    let returnList = []
    rawList.forEach((albumInfo) => {
      returnList.push({
        name: albumInfo.albumname,
        author: albumInfo.singername,
        // 原来写的是 albumInfo.replaceAll(...)，但 albumInfo 是对象不是字符串，补上返回值后这里会立刻 TypeError；
        // kg 的图片地址在 imgurl 字段（同文件 getSingerInfo 也这样取），只有带 {size} 占位符时才替换
        img: albumInfo.imgurl && albumInfo.imgurl.replace('{size}', '480'),
        album_id: albumInfo.albumid,
      })
    })
    // 之前这里没有 return，函数恒返回 undefined，getSingerAlbumList 的 albums 永远是 undefined
    return returnList
  },
  async getSingerInfo(singerid) {
    if (singerid == 0) throw new Error('歌手不存在') // kg源某些歌曲在歌手没被kg收录时返回的歌手id为0
    // 这里要自己看状态码：下面按 statusCode 判断失败，4xx 的 body 也要能读到
    const requestObj = request(`http://mobiles.kugou.com/api/v5/singer/info?singerid=${singerid}`, {}, { source: 'kg', expectOk: false })
    let { body, statusCode } = await requestObj.promise
    if (statusCode !== 200) throw new Error('获取歌手信息失败')
    return {
      source: 'kg',
      singerid,
      info: {
        name: body.data.singername,
        desc: body.data.intro,
        img: body.data.imgurl.replace('{size}', '480'),
      },
    }
  },
  async getSingerSongList(singerid, page, limit) {
    if (singerid == 0) throw new Error('歌手不存在') // kg源某些歌曲在歌手没被kg收录时返回的歌手id为0
    // 这里要自己看状态码：下面按 statusCode 判断失败，4xx 的 body 也要能读到
    const requestObj = request(`http://mobiles.kugou.com/api/v5/singer/song?singerid=${singerid}&page=${page}&pagesize=${limit}`, {}, { source: 'kg', expectOk: false })
    let { body, statusCode } = await requestObj.promise
    if (statusCode !== 200) throw new Error('获取歌手歌曲列表失败')
    let listData = await getMusicInfosByList(body.data.info)
    return {
      source: 'kg',
      list: listData,
      id: `kg__singer_${singerid}`,
      singerid,
      total: body.data.total,
      allPage: Math.ceil(body.data.total / limit),
    }
  },
  async getSingerAlbumList(singerid, page, limit) {
    if (singerid == 0) throw new Error('歌手不存在') // kg源某些歌曲在歌手没被kg收录时返回的歌手id为0
    // 原来这里打的是 singer/song（歌曲接口），返回的是歌曲对象（hash/filename/album_name），
    // 再交给 filterAlbum 按专辑字段（albumname/singername/imgurl/albumid）读，只能读到 undefined，
    // 专辑列表于是成为"有长度、没内容"的空壳。实测 singer/album 才是专辑列表接口：
    // data.total 为专辑总数，data.info[] 每项带 albumid/albumname/singername/imgurl({size} 占位)/songcount
    // 这里要自己看状态码：下面按 statusCode 与 body.status 判断失败，4xx 的 body 也要能读到
    const requestObj = request(`http://mobilecdn.kugou.com/api/v3/singer/album?singerid=${singerid}&page=${page}&pagesize=${limit}&plat=0&version=8000`, {}, { source: 'kg', expectOk: false })
    let { body, statusCode } = await requestObj.promise
    // status 由酷狗自己给（1 为成功），接口 200 但 status 不是 1 时同样是无效数据，不能静默返回空列表
    if (statusCode !== 200 || !body || body.status !== 1) throw new Error('获取歌手专辑列表失败')
    return {
      source: 'kg',
      albums: this.filterAlbum(body.data.info),
      singerid,
    }
  },
}

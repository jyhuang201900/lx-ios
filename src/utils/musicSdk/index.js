import kw from './kw'
import kg from './kg'
import tx from './tx'
import wy from './wy'
import mg from './mg'
// import bd from './bd'
import xm from './xm'
import { supportQuality } from './api-source'
import { normalizeError, raceWithSignal } from './utils'


const sources = {
  sources: [
    {
      name: '酷我音乐',
      id: 'kw',
    },
    {
      name: '酷狗音乐',
      id: 'kg',
    },
    {
      name: 'QQ音乐',
      id: 'tx',
    },
    {
      name: '网易音乐',
      id: 'wy',
    },
    {
      name: '咪咕音乐',
      id: 'mg',
    },
    // {
    //   name: '百度音乐',
    //   id: 'bd',
    // },
  ],
  kw,
  kg,
  tx,
  wy,
  mg,
  // bd,
  xm,
}
export default {
  ...sources,
  supportQuality,
}

export const init = () => {
  const tasks = []
  for (let source of sources.sources) {
    let sm = sources[source.id]
    sm && sm.init && tasks.push(sm.init())
  }
  return Promise.all(tasks)
}


/**
 * 多源搜索汇总。
 * @param {{ name: string, singer?: string, source?: string, limit?: number }} props 搜索条件（参数位置不变）
 * @param {{ signal?: AbortSignal, onSourceError?: (err: import('./utils').RequestError) => void }} [requestOptions]
 *   可选：signal 让本次汇总响应取消；onSourceError 逐个交出归一化后的源错误（不传时行为与旧版一致）
 */
export const searchMusic = async({ name, singer, source: s, limit = 25 }, requestOptions = {}) => {
  const { signal, onSourceError } = requestOptions
  const trimStr = str => typeof str == 'string' ? str.trim() : str
  const musicName = trimStr(name)
  const tasks = []
  const excludeSource = ['xm']
  for (const source of sources.sources) {
    if (!sources[source.id].musicSearch || source.id == s || excludeSource.includes(source.id)) continue
    tasks.push(sources[source.id].musicSearch.search(`${musicName} ${singer || ''}`.trim(), 1, limit).catch(err => {
      // 为什么：旧代码把源错误一律吞成 null，界面分不出是超时、断网还是接口挂了；
      // 这里保留「吞错继续搜」的默认行为，只把归一化错误经可选回调交出去
      if (onSourceError) {
        try {
          onSourceError(normalizeError(err, { source: source.id }))
        } catch {}
      }
      return null
    }))
  }
  const resultTask = Promise.all(tasks).then(list => list.filter(s => s))
  // 为什么：不传 signal 时直接返回，取消逻辑完全不参与，保证旧调用方行为不变
  return raceWithSignal(resultTask, signal, 'all')
}

/**
 * @param {object} musicInfo 歌曲信息（参数位置不变）
 * @param {{ signal?: AbortSignal, onSourceError?: Function }} [requestOptions] 透传给 searchMusic
 */
export const findMusic = async(musicInfo, requestOptions = {}) => {
  const { name, singer, albumName, interval, source: s } = musicInfo

  const lists = await searchMusic({ name, singer, source: s, limit: 25 }, requestOptions)

  const singersRxp = /、|&|;|；|\/|,|，|\|/
  const sortSingle = singer => singersRxp.test(singer)
    ? singer.split(singersRxp).sort((a, b) => a.localeCompare(b)).join('、')
    : (singer || '')
  const sortMusic = (arr, callback) => {
    const tempResult = []
    for (let i = arr.length - 1; i > -1; i--) {
      const item = arr[i]
      if (callback(item)) {
        delete item.fSinger
        delete item.fMusicName
        delete item.fAlbumName
        delete item.fInterval
        tempResult.push(item)
        arr.splice(i, 1)
      }
    }
    tempResult.reverse()
    return tempResult
  }
  const getIntv = (interval) => {
    if (!interval) return 0
    // if (musicInfo._interval) return musicInfo._interval
    let intvArr = interval.split(':')
    let intv = 0
    let unit = 1
    while (intvArr.length) {
      intv += parseInt(intvArr.pop()) * unit
      unit *= 60
    }
    return intv
  }
  const trimStr = str => typeof str == 'string' ? str.trim() : (str || '')
  const filterStr = str => typeof str == 'string' ? str.replace(/\s|'|\.|,|，|&|"|、|\(|\)|（|）|`|~|-|<|>|\||\/|\]|\[|!|！/g, '') : String(str || '')
  const fMusicName = filterStr(name).toLowerCase()
  const fSinger = filterStr(sortSingle(singer)).toLowerCase()
  const fAlbumName = filterStr(albumName).toLowerCase()
  const fInterval = getIntv(interval)
  const isEqualsInterval = (intv) => Math.abs((fInterval || intv) - (intv || fInterval)) < 5
  const isIncludesName = (name) => (fMusicName.includes(name) || name.includes(fMusicName))
  const isIncludesSinger = (singer) => fSinger ? (fSinger.includes(singer) || singer.includes(fSinger)) : true
  const isEqualsAlbum = (album) => fAlbumName ? fAlbumName == album : true

  const result = lists.map(source => {
    for (const item of source.list) {
      item.name = trimStr(item.name)
      item.singer = trimStr(item.singer)
      item.fSinger = filterStr(sortSingle(item.singer).toLowerCase())
      item.fMusicName = filterStr(String(item.name ?? '').toLowerCase())
      item.fAlbumName = filterStr(String(item.albumName ?? '').toLowerCase())
      item.fInterval = getIntv(item.interval)
      // console.log(fMusicName, item.fMusicName, item.source)
      if (!isEqualsInterval(item.fInterval)) {
        item.name = null
        continue
      }
      if (item.fMusicName == fMusicName && isIncludesSinger(item.fSinger)) return item
    }
    for (const item of source.list) {
      if (item.name == null) continue
      if (item.fSinger == fSinger && isIncludesName(item.fMusicName)) return item
    }
    for (const item of source.list) {
      if (item.name == null) continue
      if (isEqualsAlbum(item.fAlbumName) && isIncludesSinger(item.fSinger) && isIncludesName(item.fMusicName)) return item
    }
    return null
  }).filter(s => s)
  const newResult = []
  if (result.length) {
    newResult.push(...sortMusic(result, item => item.fSinger == fSinger && item.fMusicName == fMusicName && item.interval == interval))
    newResult.push(...sortMusic(result, item => item.fMusicName == fMusicName && item.fSinger == fSinger && item.fAlbumName == fAlbumName))
    newResult.push(...sortMusic(result, item => item.fSinger == fSinger && item.fMusicName == fMusicName))
    newResult.push(...sortMusic(result, item => item.fMusicName == fMusicName && item.interval == interval))
    newResult.push(...sortMusic(result, item => item.fSinger == fSinger && item.interval == interval))
    newResult.push(...sortMusic(result, item => item.interval == interval))
    newResult.push(...sortMusic(result, item => item.fMusicName == fMusicName))
    newResult.push(...sortMusic(result, item => item.fSinger == fSinger))
    newResult.push(...sortMusic(result, item => item.fAlbumName == fAlbumName))
    for (const item of result) {
      delete item.fSinger
      delete item.fMusicName
      delete item.fAlbumName
      delete item.fInterval
    }
    newResult.push(...result)
  }
  // console.log(newResult)
  return newResult
}

// 为什么：错误工具从聚合入口再导出一次，界面层判一个 code 不必深入 utils 模块
export { REQUEST_ERROR_CODES, RequestError, isRequestError, normalizeError } from './utils'

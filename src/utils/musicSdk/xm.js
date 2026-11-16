import { REQUEST_ERROR_CODES, RequestError } from './utils'

// 为什么：虾米源已停用，但上层统一按 { code, message, source } 判错误，
// 这里不再抛裸 Error('fail')，换成同一形状的 RequestError（仍是 instanceof Error）
const sourceGoneError = () => new RequestError({
  code: REQUEST_ERROR_CODES.SOURCE_UNAVAILABLE,
  message: '虾米音源已停用',
  source: 'xm',
})

const xm = {
  // songList,
  // musicSearch,
  // leaderboard,
  // hotSearch,
  // closeVerifyModal,
  comment: {
    getComment() {
      return Promise.reject(sourceGoneError())
    },
    getHotComment() {
      return Promise.reject(sourceGoneError())
    },
  },
  getMusicUrl(songInfo, type) {
    return {
      promise: Promise.reject(sourceGoneError()),
    }
    // return apis('xm').getMusicUrl(songInfo, type)
  },
  getLyric(songInfo) {
    return {
      promise: Promise.reject(sourceGoneError()),
    }
    // return lyric.getLyric(songInfo)
  },
  getPic(songInfo) {
    return Promise.reject(sourceGoneError())
    // return pic.getPic(songInfo)
  },
  // getMusicDetailPageUrl(songInfo) {
  //   if (songInfo.songStringId) return `https://www.xiami.com/song/${songInfo.songStringId}`

  //   musicInfo.getMusicInfo(songInfo).then(({ data }) => {
  //     songInfo.songStringId = data.songStringId
  //   })
  //   return `https://www.xiami.com/song/${songInfo.songmid}`
  // },
  // init() {
  //   getToken()
  // },
}

export default xm

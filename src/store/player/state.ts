export interface InitState {
  playMusicInfo: {
    /**
     * 当前播放歌曲的列表 id
     */
    musicInfo: LX.Player.PlayMusicInfo['musicInfo'] | null
    /**
     * 当前播放歌曲的列表 id
     */
    listId: LX.Player.PlayMusicInfo['listId'] | null
    /**
     * 是否属于 “稍后播放”
     */
    isTempPlay: boolean
  }
  playInfo: LX.Player.PlayInfo
  musicInfo: LX.Player.MusicInfo

  isPlay: boolean
  volume: number
  playRate: number
  statusText: string
  streamInfo: {
    source: LX.Source | null
    quality: LX.Quality | null
    /**
     * 当前这条流实际有多少字节。
     *
     * 之前体积是从搜索结果的 `meta._qualitys[quality].size` 里读的，那个表
     * 只覆盖内置音源能解析出来的档位（最高到 flac24bit）；自定义音源的
     * hires / atmos / master 并不在搜索结果里，于是这几档永远读不到体积，
     * 界面就把「体积」整列去掉了。
     *
     * 改为记录播放地址的真实大小（HTTP 响应头），任何音质、任何音源都有值。
     */
    size: number | null
  }

  playedList: LX.Player.PlayMusicInfo[]
  tempPlayList: LX.Player.PlayMusicInfo[]

  loadErrorPicUrl: string


  progress: {
    nowPlayTime: number
    maxPlayTime: number
    progress: number
    nowPlayTimeStr: string
    maxPlayTimeStr: string
  }

  lastLyric: string | undefined
}

const state: InitState = {
  playInfo: {
    playIndex: -1,
    playerListId: null,
    playerPlayIndex: -1,
  },
  playMusicInfo: {
    listId: null,
    musicInfo: null,
    isTempPlay: false,
  },
  musicInfo: {
    id: null,
    pic: null,
    lrc: null,
    tlrc: null,
    rlrc: null,
    lxlrc: null,
    rawlrc: null,
    // url: null,
    name: '',
    singer: '',
    album: '',
  },

  isPlay: false,
  volume: 1,
  playRate: 1,
  statusText: '',
  streamInfo: {
    source: null,
    quality: null,
    size: null,
  },
  loadErrorPicUrl: '',

  playedList: [],
  tempPlayList: [],

  progress: {
    nowPlayTime: 0,
    maxPlayTime: 0,
    progress: 0,
    nowPlayTimeStr: '00:00',
    maxPlayTimeStr: '00:00',
  },

  lastLyric: undefined,
}


export default state

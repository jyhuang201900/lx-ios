import { isInitialized, initial as playerInitial, isEmpty, setPause, setPlay, setResource, setStop, initTrackInfo, getPosition } from '@/plugins/player'
import {
  setStatusText,
} from '@/core/player/playStatus'
import { setProgress as updatePlayProgress } from '@/core/player/progress'
import playerState from '@/store/player/state'
import playerActions from '@/store/player/action'
import settingState from '@/store/setting/state'
import {
  getList,
  setPlayMusicInfo,
  setMusicInfo,
  setPlayListId,
} from '@/core/player/playInfo'
import {
  clearPlayedList,
  addPlayedList,
  removePlayedList,
} from '@/core/player/playedList'
import {
  clearTempPlayeList,
  removeTempPlayList,
} from '@/core/player/tempPlayList'
import { getMusicUrlInfo, getPicPath, getLyricInfo } from '@/core/music'
import { getPlayQuality } from '@/core/music/utils'
import { requestMsg } from '@/utils/message'
import { checkUrl, probeAudioStream } from '@/utils/request'
import { inferQualityFromStream } from '@/utils/quality'
import { getRandom } from '@/utils/common'
import { filterList } from './utils'
import BackgroundTimer from 'react-native-background-timer'
import { checkIgnoringBatteryOptimization, checkNotificationPermission, debounceBackgroundTimer } from '@/utils/tools'
import { LIST_IDS } from '@/config/constant'
import { addListMusics, removeListMusics } from '@/core/list'
import { addDislikeInfo } from '@/core/dislikeList'
import { markTimeoutExitInteraction } from './timeoutExit'
import { isUrlExpiredError, MAX_CONSECUTIVE_FAILURES, recordPlaybackFailure, tryAcquireUrlRetry } from './recovery'
import { createQualityAttempt, getAvailableQualities, MAX_QUALITY_DOWNGRADES, resetQualityAttempt } from './quality'

// import { checkMusicFileAvailable } from '@renderer/utils/music'

const createDelayNextTimeout = (delay: number) => {
  let timeout: number | null
  const clearDelayNextTimeout = () => {
    // console.log(this.timeout)
    if (timeout) {
      BackgroundTimer.clearTimeout(timeout)
      timeout = null
    }
  }

  const addDelayNextTimeout = () => {
    clearDelayNextTimeout()
    timeout = BackgroundTimer.setTimeout(() => {
      timeout = null
      if (global.lx.isPlayedStop) return
      void playNext(true)
    }, delay)
  }

  return {
    clearDelayNextTimeout,
    addDelayNextTimeout,
  }
}
const { addDelayNextTimeout, clearDelayNextTimeout } = createDelayNextTimeout(5000)
// 取流超时 30s：超过后自动切下一首，避免长时间卡在“正在获取播放链接”
const { addDelayNextTimeout: addLoadTimeout, clearDelayNextTimeout: clearLoadTimeout } = createDelayNextTimeout(30000)

const createGettingUrlId = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem) => {
  const tInfo = 'progress' in musicInfo ? musicInfo.metadata.musicInfo.meta.toggleMusicInfo : musicInfo.meta.toggleMusicInfo
  return `${musicInfo.id}_${tInfo?.id ?? ''}`
}

interface PlayUrlInfo {
  url: string
  quality: LX.Quality | null
  source: LX.Source
}
const currentStreamInfo = {
  musicId: null as string | null,
  url: '',
  quality: null as LX.Quality | null,
  source: null as LX.Source | null,
}
// 取 URL 请求序号：每次发起 +1。异步回调回来时用它判断自己是不是已经过期的那一次
// —— 快速切歌/换音质会叠出多个并发取流请求，晚到的旧结果不许写进当前状态。
let urlRequestSeq = 0
/**
 * 检查音乐信息是否已更改
 */
const diffCurrentMusicInfo = (curMusicInfo: LX.Music.MusicInfo | LX.Download.ListItem, allowCurrentPlayback = false): boolean => {
  // return curMusicInfo !== playerState.playMusicInfo.musicInfo || playerState.isPlay
  return createGettingUrlId(curMusicInfo) != global.lx.gettingUrlId || curMusicInfo.id != playerState.playMusicInfo.musicInfo?.id || (!allowCurrentPlayback && playerState.isPlay)
}

let cancelDelayRetry: (() => void) | null = null
const getMusicSource = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem): LX.Source => 'progress' in musicInfo ? musicInfo.metadata.musicInfo.source : musicInfo.source
const getMusicDisplayName = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem): string => {
  const info = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
  return `${info.name} - ${info.singer}`
}

/**
 * 给降级链定位起点：显式传入的音质优先，否则用与 `core/music/online.ts` 同一条规则
 * （getPlayQuality：用户偏好档位作上限，再按歌曲声明可用档位取）。
 *
 * 只用于算「从哪一档往下退」，第一次请求仍然不带显式音质，交给 core/music 自己决定
 * ——这样缓存命中、isRefresh 这些既有语义一点没动。本地歌曲没有档位概念，返回 null。
 */
const resolveRequestedQuality = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem): LX.Quality | null => {
  const info = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
  if (info.source === 'local') return null
  return getPlayQuality(settingState.setting['player.playQuality'], info)
}

// 播放成功（app_event.play）时清空这首歌的降级链。resetPlaybackFailure 在同一事件里调用
// （core/init/player 的 setPlayStatus），这里订阅同一个事件，保证两者同一时机触发。
// app_event 由 config/globalData 在 core/init 之前创建，模块顶层订阅是安全的。
global.app_event.on('play', () => {
  const musicInfo = playerState.playMusicInfo.musicInfo
  if (!musicInfo) return
  resetQualityAttempt(getMusicSource(musicInfo), musicInfo.id)
})

const delayRetry = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, isRefresh = false, quality?: LX.Quality, allowCurrentPlayback = false): Promise<PlayUrlInfo | null> => {
  // if (cancelDelayRetry) cancelDelayRetry()
  return new Promise<PlayUrlInfo | null>((resolve, reject) => {
    const time = getRandom(2, 6)
    setStatusText(global.i18n.t('player__getting_url_delay_retry', { time }))
    const tiemout = setTimeout(() => {
      getMusicPlayUrl(musicInfo, isRefresh, true, quality, allowCurrentPlayback).then((result) => {
        cancelDelayRetry = null
        resolve(result)
      }).catch(async(err: any) => {
        cancelDelayRetry = null
        reject(err)
      })
    }, time * 1000)
    cancelDelayRetry = () => {
      clearTimeout(tiemout)
      cancelDelayRetry = null
      resolve(null)
    }
  })
}
/**
 * 按**单一档位**取一次播放地址（含原有的同档位重取一次）。
 * 失败时抛错，由 getMusicPlayUrl 决定要不要降档重取。
 */
const fetchMusicPlayUrl = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, isRefresh = false, isRetryed = false, quality?: LX.Quality, allowCurrentPlayback = false): Promise<PlayUrlInfo | null> => {
  // this.musicInfo.url = await getMusicPlayUrl(targetSong, type)
  setStatusText(global.i18n.t('player__getting_url'))
  addLoadTimeout()

  // const type = getPlayType(settingState.setting['player.isPlayHighQuality'], musicInfo)
  let toggleMusicInfo = ('progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo).meta.toggleMusicInfo
  let source = toggleMusicInfo?.source ?? getMusicSource(musicInfo)
  const onToggleSource = (targetMusicInfo?: LX.Music.MusicInfoOnline) => {
    if (targetMusicInfo) source = targetMusicInfo.source
    if (diffCurrentMusicInfo(musicInfo, allowCurrentPlayback)) return
    setStatusText(global.i18n.t('toggle_source_try'))
  }

  return (toggleMusicInfo ? getMusicUrlInfo({
    musicInfo: toggleMusicInfo,
    isRefresh,
    quality,
    allowToggleSource: false,
  }) : Promise.reject(new Error('not found'))).catch(async() => {
    return getMusicUrlInfo({
      musicInfo,
      isRefresh,
      quality,
      onToggleSource,
    })
  }).then(url => {
    if (global.lx.isPlayedStop || diffCurrentMusicInfo(musicInfo, allowCurrentPlayback)) return null

    return { ...url, source }
  }).catch(async err => {
    // console.log('err', err.message)
    if (global.lx.isPlayedStop ||
      diffCurrentMusicInfo(musicInfo, allowCurrentPlayback) ||
      err.message == requestMsg.cancelRequest) return null

    if (err.message == requestMsg.tooManyRequests) return delayRetry(musicInfo, isRefresh, quality, allowCurrentPlayback)

    if (!isRetryed) return fetchMusicPlayUrl(musicInfo, isRefresh, true, quality, allowCurrentPlayback)

    throw err
  })
}

/**
 * 取播放地址的主入口：先按当前档位取，取不到地址就沿 QUALITY_LADDER 逐档降级重取。
 *
 * 只对「这个档位取不到地址」生效（与 recovery.ts 的「地址过期重取」是两件事）；
 * 每档仍然保留原有的同档位重取一次。降到底仍失败时把最后一个错误原样抛出，
 * 交给 setMusicUrl 的 catch → app_event.error → recoverFromPlaybackError 接手，
 * 这里不吞错、也不替产品决定跳下一首。
 */
const getMusicPlayUrl = async(musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, isRefresh = false, isRetryed = false, quality?: LX.Quality, allowCurrentPlayback = false): Promise<PlayUrlInfo | null> => {
  const attempt = createQualityAttempt(getMusicSource(musicInfo), musicInfo.id)
  const available = getAvailableQualities(musicInfo)
  const initialQuality = quality ?? resolveRequestedQuality(musicInfo)
  let requestedQuality = initialQuality
  let result: PlayUrlInfo | null = null
  let failed = false
  let lastError: unknown = null

  try {
    result = await fetchMusicPlayUrl(musicInfo, isRefresh, isRetryed, quality, allowCurrentPlayback)
  } catch (err) {
    failed = true
    lastError = err
  }

  if (failed) {
    for (let index = 0; index < MAX_QUALITY_DOWNGRADES; index++) {
      // 每次退让之间都在等一次网络往返：期间切歌/停止/取消，降级已经没有意义
      if (global.lx.isPlayedStop ||
        diffCurrentMusicInfo(musicInfo, allowCurrentPlayback) ||
        (lastError instanceof Error && lastError.message == requestMsg.cancelRequest)) return null
      const next = attempt.tryNext(requestedQuality, available)
      // 没有更低的可用档，或已经降满 MAX_QUALITY_DOWNGRADES 档
      if (next == null) break
      console.log(`[player-quality] 取地址失败，降级重试: ${musicInfo.id} ${getMusicDisplayName(musicInfo)} ${requestedQuality ?? 'unknown'} -> ${next}`)
      requestedQuality = next
      try {
        result = await fetchMusicPlayUrl(musicInfo, isRefresh, isRetryed, next, allowCurrentPlayback)
        failed = false
        break
      } catch (err) {
        lastError = err
      }
    }
    // 降到底仍失败：原样抛回给上游，由 recovery 那套失败计数/过期重取收尾
    if (failed) throw lastError as Error
  }

  if (result == null) return null

  if (requestedQuality != null && requestedQuality !== initialQuality) {
    // result.quality 就是 SDK 回给我们的档位，setMusicUrl 会把它写进 currentStreamInfo /
    // playerActions.setStreamInfo，随后再由流码率反推纠正成实际档位
    console.log(`[player-quality] 降级成功，实际播放音质: ${musicInfo.id} ${getMusicDisplayName(musicInfo)} ${initialQuality ?? 'unknown'} -> ${requestedQuality}`)
  }
  return result
}

export const setMusicUrl = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem, isRefresh?: boolean, quality?: LX.Quality, allowCurrentPlayback = false) => {
  // addLoadTimeout()
  if (!allowCurrentPlayback && !diffCurrentMusicInfo(musicInfo)) return
  if (cancelDelayRetry) cancelDelayRetry()
  global.lx.gettingUrlId = createGettingUrlId(musicInfo)
  // 本次取流的凭据：回调里只要发现序号已被更晚的请求顶掉，就整段丢弃
  const requestSeq = ++urlRequestSeq
  const currentTimePromise = isRefresh
    ? getPosition().catch(() => playerState.progress.nowPlayTime)
    : Promise.resolve(playerState.progress.nowPlayTime)
  void getMusicPlayUrl(musicInfo, isRefresh, false, quality, allowCurrentPlayback).then(async(result) => {
    if (!result) return
    const currentTime = await currentTimePromise
    // 等 getPosition 的这段时间里可能已经切歌/换音质：序号变了就丢弃，
    // 否则会把上一首（或上一个音质）的地址写进当前这首歌的状态
    if (requestSeq !== urlRequestSeq) return
    currentStreamInfo.musicId = musicInfo.id
    currentStreamInfo.url = result.url
    currentStreamInfo.quality = result.quality
    currentStreamInfo.source = result.source
    playerActions.setStreamInfo({ source: result.source, quality: result.quality, size: null })
    setResource(musicInfo, result.url, currentTime, result.quality)

    /**
     * 一次 HEAD 同时办两件事：拿真实体积、核实真实音质。
     *
     * 放在 setResource 之后、不 await——播放不该为了读数等一次网络往返。
     * 拿到后核对仍是同一首歌、同一个地址，避免快速切歌时把上一首的结果
     * 写到当前这首上。
     *
     * 为什么要核实音质：自定义音源脚本只返回一个 URL 字符串，协议里没有
     * 字段说明它实际给的是哪一档（userApiFallback 的 normalizeRequestSuccess
     * 强制 response 必须是字符串）。`result.quality` 是**请求值**——请求
     * master、后端实际回 flac 时它依然是 master，界面就显示成 master，
     * 体积也和 flac 一样。用流的真实字节数和歌曲时长反推码率，才能得到
     * 实际拿到的是哪一档。
     */
    const probeMusicId = musicInfo.id
    const probeUrl = result.url
    const requestedQuality = result.quality
    void probeAudioStream(result.url).then(probe => {
      if (!probe) return
      if (currentStreamInfo.musicId != probeMusicId || currentStreamInfo.url != probeUrl) return
      // 请求档位得不到实测码率支撑时，纠正为实际档位；判断不了就保持原判
      // 下载项（ListItem）没有 interval 字段，此时无法反推码率，保持原判
      const interval = 'progress' in musicInfo ? musicInfo.metadata.musicInfo.interval : musicInfo.interval
      const actualQuality = requestedQuality
        ? (inferQualityFromStream(requestedQuality, probe.size, interval) ?? requestedQuality)
        : requestedQuality
      currentStreamInfo.quality = actualQuality
      playerActions.setStreamInfo({ source: result.source, quality: actualQuality, size: probe.size })
    })
  }).catch((err: any) => {
    setStatusText(err.message as string)
    global.app_event.error()
    addDelayNextTimeout()
  }).finally(() => {
    // 序号变了说明有更新的取流请求接手了，gettingUrlId 和取流超时归它管，
    // 这次旧请求不能把它们清掉
    if (requestSeq === urlRequestSeq && musicInfo === playerState.playMusicInfo.musicInfo) {
      global.lx.gettingUrlId = ''
      clearLoadTimeout()
    }
  })
}

/**
 * 播放报错后的恢复入口（由 `app_event.error` 转过来）。
 *
 * 只处理“播放地址失效”这一种：先用 HEAD 核实当前这条流确实回了 403/404/410，
 * 核实成立才用同一首歌重取一次地址——重取能不能救，靠核实而不是靠猜，
 * 解码失败之类的重取也没用，只会多卡一次。
 *
 * 同一首歌连续失败满 MAX_CONSECUTIVE_FAILURES 次就停在错误态并留日志，
 * 不再重取、也不替产品决定要不要跳下一首。
 *
 * @returns 是否已发起重取，调用方据此决定要不要做别的兜底
 */
export const recoverFromPlaybackError = async(): Promise<boolean> => {
  const musicInfo = playerState.playMusicInfo.musicInfo
  if (!musicInfo || global.lx.isPlayedStop) return false

  const failureCount = recordPlaybackFailure(musicInfo.id)
  if (failureCount >= MAX_CONSECUTIVE_FAILURES) {
    // 下载项（ListItem）和在线歌曲的 name 不在同一个位置，按已有约定取值
    const minfo = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
    console.warn(`[player-recovery] 同一首歌连续失败 ${failureCount} 次，停止重试: ${musicInfo.id} ${minfo.name}`)
    // 这条路径不会自动跳下一首（和 player__error 的“5 秒后切换”不是一回事），所以单独用一条文案
    setStatusText(global.i18n.t('player__error_stopped'))
    return false
  }

  // 没记到当前这首歌的流地址，就无从判断它是否过期
  if (currentStreamInfo.musicId !== musicInfo.id || !currentStreamInfo.url) return false

  const streamUrl = currentStreamInfo.url
  const expired = await checkUrl(streamUrl).then(() => false).catch((err: unknown) => isUrlExpiredError(err))
  // HEAD 也是异步的：回来时已经切歌（或这首歌已被别处刷新），这次恢复就不该再动手
  if (playerState.playMusicInfo.musicInfo !== musicInfo) return false

  if (!expired) {
    console.log(`[player-recovery] 地址仍可用，不重取: ${musicInfo.id}`)
    return false
  }
  // 本轮那唯一一次名额已被用掉：说明重取过一次还是坏，交给连续失败上限收尾
  if (!tryAcquireUrlRetry(musicInfo.id)) {
    console.warn(`[player-recovery] 本轮已重取过一次，不再重取: ${musicInfo.id}`)
    return false
  }

  setStatusText(global.i18n.t('player__refresh_url'))
  // allowCurrentPlayback=true：报错时播放态已被置为暂停，这里要跳过“是否仍在播”的前置判断，
  // 否则这次恢复会被直接短路掉
  setMusicUrl(musicInfo, true, undefined, true)
  return true
}

/** Re-fetch the current track at the selected quality without losing its playback position. */
export const changeCurrentMusicQuality = (quality: LX.Quality) => {
  const musicInfo = playerState.playMusicInfo.musicInfo
  if (!musicInfo) return
  setMusicUrl(musicInfo, true, quality, true)
}

// 恢复上次播放的状态
const handleRestorePlay = async(restorePlayInfo: LX.Player.SavedPlayInfo) => {
  const musicInfo = playerState.playMusicInfo.musicInfo
  if (!musicInfo) return

  // Avoid seeking the 2-second placeholder track during startup restore.
  const restoreTime = settingState.setting['player.isSavePlayTime'] ? restorePlayInfo.time : 0
  updatePlayProgress(restoreTime, restorePlayInfo.maxTime)
  global.app_event.seekLyric(restoreTime)

  const playMusicInfo = playerState.playMusicInfo
  // setPlayMusicInfo 会整体替换 playMusicInfo 对象，拿对象快照比对永远相等（等于没比对）；
  // 记下恢复开始时的歌曲 id，回调回来时和“当前”的 id 比，切歌后的旧回调才丢得掉
  const restoreMusicId = musicInfo.id

  void initTrackInfo(musicInfo, playerState.musicInfo)

  void getPicPath({ musicInfo, listId: playMusicInfo.listId }).then((url: string) => {
    if (
      restoreMusicId != playerState.playMusicInfo.musicInfo?.id ||
      playerState.musicInfo.pic == url ||
      playerState.loadErrorPicUrl == url
    ) return
    setMusicInfo({ pic: url })
    global.app_event.picUpdated()
  })

  void getLyricInfo({ musicInfo }).then((lyricInfo) => {
    if (restoreMusicId != playerState.playMusicInfo.musicInfo?.id) return
    setMusicInfo({
      lrc: lyricInfo.lyric,
      tlrc: lyricInfo.tlyric,
      lxlrc: lyricInfo.lxlyric,
      rlrc: lyricInfo.rlyric,
      rawlrc: lyricInfo.rawlrcInfo.lyric,
    })
    global.app_event.lyricUpdated()
  }).catch((err) => {
    console.log(err)
    if (restoreMusicId != playerState.playMusicInfo.musicInfo?.id) return
    setStatusText(global.i18n.t('lyric__load_error'))
  })

  if (settingState.setting['player.togglePlayMethod'] == 'random' && !playMusicInfo.isTempPlay) addPlayedList(playMusicInfo as LX.Player.PlayMusicInfo)
}


const debouncePlay = debounceBackgroundTimer((musicInfo: LX.Player.PlayMusic) => {
  setMusicUrl(musicInfo)

  void getPicPath({ musicInfo, listId: playerState.playMusicInfo.listId }).then((url: string) => {
    if (
      musicInfo.id != playerState.playMusicInfo.musicInfo?.id ||
      playerState.musicInfo.pic == url ||
      playerState.loadErrorPicUrl == url) return
    setMusicInfo({ pic: url })
    global.app_event.picUpdated()
  })

  void getLyricInfo({ musicInfo }).then((lyricInfo) => {
    if (musicInfo.id != playerState.playMusicInfo.musicInfo?.id) return
    setMusicInfo({
      lrc: lyricInfo.lyric,
      tlrc: lyricInfo.tlyric,
      lxlrc: lyricInfo.lxlyric,
      rlrc: lyricInfo.rlyric,
      rawlrc: lyricInfo.rawlrcInfo.lyric,
    })
    global.app_event.lyricUpdated()
  }).catch((err) => {
    console.log(err)
    if (musicInfo.id != playerState.playMusicInfo.musicInfo?.id) return
    setStatusText(global.i18n.t('lyric__load_error'))
  })
}, 200)

// 处理音乐播放
const handlePlay = async() => {
  if (!isInitialized()) {
    await checkNotificationPermission()
    void checkIgnoringBatteryOptimization()
    await playerInitial({
      volume: settingState.setting['player.volume'],
      playRate: settingState.setting['player.playbackRate'],
      cacheSize: settingState.setting['player.cacheSize'] ? parseInt(settingState.setting['player.cacheSize']) : 0,
      isHandleAudioFocus: settingState.setting['player.isHandleAudioFocus'],
      isEnableAudioOffload: settingState.setting['player.isEnableAudioOffload'],
    })
  }

  global.lx.isPlayedStop &&= false
  resetRandomNextMusicInfo()

  if (global.lx.restorePlayInfo) {
    void handleRestorePlay(global.lx.restorePlayInfo)
    global.lx.restorePlayInfo = null
    return
  }

  const playMusicInfo = playerState.playMusicInfo
  const musicInfo = playMusicInfo.musicInfo

  if (!musicInfo) return

  await setStop()
  global.app_event.pause()

  clearDelayNextTimeout()
  clearLoadTimeout()

  // await setStop() 期间可能又切了一次歌：这次 handlePlay 已经过期，让后来者接管。
  // 少了这道判断，连着切歌时 debounce 会以旧歌的参数收尾，把上一首又摆回当前状态
  if (playerState.playMusicInfo.musicInfo !== musicInfo) return


  if (settingState.setting['player.togglePlayMethod'] == 'random' && !playMusicInfo.isTempPlay) addPlayedList(playMusicInfo as LX.Player.PlayMusicInfo)

  debouncePlay(musicInfo)
}

/**
 * 播放列表内歌曲
 * @param listId 列表id
 * @param id 歌曲id
 */
export const playListById = async(listId: string, id: string) => {
  const prevListId = playerState.playInfo.playerListId
  setPlayListId(listId)
  const musicInfo = getList(listId).find(m => m.id == id)
  if (!musicInfo) return
  setPlayMusicInfo(listId, musicInfo)
  if (settingState.setting['player.isAutoCleanPlayedList'] || prevListId != listId) clearPlayedList()
  clearTempPlayeList()
  await handlePlay()
}

/**
 * 播放列表内歌曲
 * @param listId 列表id
 * @param index 播放的歌曲位置
 */
export const playList = async(listId: string, index: number) => {
  const prevListId = playerState.playInfo.playerListId
  setPlayListId(listId)
  setPlayMusicInfo(listId, getList(listId)[index])
  if (settingState.setting['player.isAutoCleanPlayedList'] || prevListId != listId) clearPlayedList()
  clearTempPlayeList()
  await handlePlay()
}

const handleToggleStop = async() => {
  await stop()
  setTimeout(() => {
    setPlayMusicInfo(null, null)
  })
}


const randomNextMusicInfo = {
  info: null as LX.Player.PlayMusicInfo | null,
  // index: -1,
}
export const resetRandomNextMusicInfo = () => {
  if (randomNextMusicInfo.info) {
    randomNextMusicInfo.info = null
    // randomNextMusicInfo.index = -1
  }
}

export const getNextPlayMusicInfo = async(): Promise<LX.Player.PlayMusicInfo | null> => {
  if (playerState.tempPlayList.length) { // 如果稍后播放列表存在歌曲则直接播放改列表的歌曲
    const playMusicInfo = playerState.tempPlayList[0]
    return playMusicInfo
  }

  if (playerState.playMusicInfo.musicInfo == null) return null

  if (randomNextMusicInfo.info) return randomNextMusicInfo.info

  const playMusicInfo = playerState.playMusicInfo
  const playInfo = playerState.playInfo
  // console.log(playInfo.playerListId)
  const currentListId = playInfo.playerListId
  if (!currentListId) return null
  const currentList = getList(currentListId)

  const playedList = playerState.playedList
  if (playedList.length) { // 移除已播放列表内不存在原列表的歌曲
    let currentId: string
    if (playMusicInfo.isTempPlay) {
      const musicInfo = currentList[playInfo.playerPlayIndex]
      if (musicInfo) currentId = musicInfo.id
    } else {
      currentId = playMusicInfo.musicInfo!.id
    }
    // 从已播放列表移除播放列表已删除的歌曲
    let index
    for (index = playedList.findIndex(m => m.musicInfo.id === currentId) + 1; index < playedList.length; index++) {
      const playMusicInfo = playedList[index]
      const currentId = playMusicInfo.musicInfo.id
      if (playMusicInfo.listId == currentListId && !currentList.some(m => m.id === currentId)) {
        removePlayedList(index)
        continue
      }
      break
    }

    if (index < playedList.length) return playedList[index]
  }
  // const isCheckFile = findNum > 2 // 针对下载列表，如果超过两次都碰到无效歌曲，则过滤整个列表内的无效歌曲
  let { filteredList, playerIndex } = await filterList({ // 过滤已播放歌曲
    listId: currentListId,
    list: currentList,
    playedList,
    playerMusicInfo: currentList[playInfo.playerPlayIndex],
    isNext: true,
  })

  if (!filteredList.length) return null
  // let currentIndex: number = filteredList.indexOf(currentList[playInfo.playerPlayIndex])
  if (playerIndex == -1 && filteredList.length) playerIndex = 0
  let nextIndex = playerIndex

  let togglePlayMethod = settingState.setting['player.togglePlayMethod']
  switch (togglePlayMethod) {
    case 'listLoop':
      nextIndex = playerIndex === filteredList.length - 1 ? 0 : playerIndex + 1
      break
    case 'random':
      nextIndex = getRandom(0, filteredList.length)
      break
    case 'list':
      nextIndex = playerIndex === filteredList.length - 1 ? -1 : playerIndex + 1
      break
    case 'singleLoop':
      break
    default:
      return null
  }
  if (nextIndex < 0) return null

  const nextPlayMusicInfo = {
    musicInfo: filteredList[nextIndex],
    listId: currentListId,
    isTempPlay: false,
  }

  if (togglePlayMethod == 'random') {
    randomNextMusicInfo.info = nextPlayMusicInfo
    // randomNextMusicInfo.index = nextIndex
  }
  return nextPlayMusicInfo
}

const handlePlayNext = async(playMusicInfo: LX.Player.PlayMusicInfo) => {
  setPlayMusicInfo(playMusicInfo.listId, playMusicInfo.musicInfo, playMusicInfo.isTempPlay)
  await handlePlay()
}
/**
 * 下一曲
 * @param isAutoToggle 是否自动切换
 * @returns
 */
export const playNext = async(isAutoToggle = false): Promise<void> => {
  if (!isAutoToggle) markTimeoutExitInteraction()
  if (playerState.tempPlayList.length) { // 如果稍后播放列表存在歌曲则直接播放改列表的歌曲
    const playMusicInfo = playerState.tempPlayList[0]
    removeTempPlayList(0)
    await handlePlayNext(playMusicInfo)
    return
  }

  const playMusicInfo = playerState.playMusicInfo
  const playInfo = playerState.playInfo
  if (playMusicInfo.musicInfo == null) return handleToggleStop()

  // console.log(playInfo.playerListId)
  const currentListId = playInfo.playerListId
  if (!currentListId) return handleToggleStop()
  const currentList = getList(currentListId)

  const playedList = playerState.playedList

  if (playedList.length) { // 移除已播放列表内不存在原列表的歌曲
    let currentId: string
    if (playMusicInfo.isTempPlay) {
      const musicInfo = currentList[playInfo.playerPlayIndex]
      if (musicInfo) currentId = musicInfo.id
    } else {
      currentId = playMusicInfo.musicInfo.id
    }
    // 从已播放列表移除播放列表已删除的歌曲
    let index
    for (index = playedList.findIndex(m => m.musicInfo.id === currentId) + 1; index < playedList.length; index++) {
      const playMusicInfo = playedList[index]
      const currentId = playMusicInfo.musicInfo.id
      if (playMusicInfo.listId == currentListId && !currentList.some(m => m.id === currentId)) {
        removePlayedList(index)
        continue
      }
      break
    }

    if (index < playedList.length) {
      await handlePlayNext(playedList[index])
      return
    }
  }
  if (randomNextMusicInfo.info) {
    await handlePlayNext(randomNextMusicInfo.info)
    return
  }
  // const isCheckFile = findNum > 2 // 针对下载列表，如果超过两次都碰到无效歌曲，则过滤整个列表内的无效歌曲
  let { filteredList, playerIndex } = await filterList({ // 过滤已播放歌曲
    listId: currentListId,
    list: currentList,
    playedList,
    playerMusicInfo: currentList[playInfo.playerPlayIndex],
    isNext: true,
  })

  if (!filteredList.length) return handleToggleStop()
  // let currentIndex: number = filteredList.indexOf(currentList[playInfo.playerPlayIndex])
  if (playerIndex == -1 && filteredList.length) playerIndex = 0
  let nextIndex = playerIndex

  let togglePlayMethod = settingState.setting['player.togglePlayMethod']
  if (!isAutoToggle) {
    switch (togglePlayMethod) {
      case 'list':
      case 'singleLoop':
      case 'none':
        togglePlayMethod = 'listLoop'
    }
  }
  switch (togglePlayMethod) {
    case 'listLoop':
      nextIndex = playerIndex === filteredList.length - 1 ? 0 : playerIndex + 1
      break
    case 'random':
      nextIndex = getRandom(0, filteredList.length)
      break
    case 'list':
      nextIndex = playerIndex === filteredList.length - 1 ? -1 : playerIndex + 1
      break
    case 'singleLoop':
      break
    default:
      nextIndex = -1
      return
  }
  if (nextIndex < 0) return

  await handlePlayNext({
    musicInfo: filteredList[nextIndex],
    listId: currentListId,
    isTempPlay: false,
  })
}

/**
 * 播放“稍后播放”队列中的指定歌曲
 * @param index 队列位置
 */
export const playTempPlayListItem = async(index: number): Promise<void> => {
  const playMusicInfo = playerState.tempPlayList[index]
  if (!playMusicInfo) return
  removeTempPlayList(index)
  await handlePlayNext(playMusicInfo)
}

/**
 * 上一曲
 */
export const playPrev = async(isAutoToggle = false): Promise<void> => {
  if (!isAutoToggle) markTimeoutExitInteraction()
  const playMusicInfo = playerState.playMusicInfo
  if (playMusicInfo.musicInfo == null) return handleToggleStop()
  const playInfo = playerState.playInfo

  const currentListId = playInfo.playerListId
  if (!currentListId) return handleToggleStop()
  const currentList = getList(currentListId)

  const playedList = playerState.playedList
  if (playedList.length) {
    let currentId: string
    if (playMusicInfo.isTempPlay) {
      const musicInfo = currentList[playInfo.playerPlayIndex]
      if (musicInfo) currentId = musicInfo.id
    } else {
      currentId = playMusicInfo.musicInfo.id
    }
    // 从已播放列表移除播放列表已删除的歌曲
    let index
    for (index = playedList.findIndex(m => m.musicInfo.id === currentId) - 1; index > -1; index--) {
      const playMusicInfo = playedList[index]
      const currentId = playMusicInfo.musicInfo.id
      if (playMusicInfo.listId == currentListId && !currentList.some(m => m.id === currentId)) {
        removePlayedList(index)
        continue
      }
      break
    }

    if (index > -1) {
      await handlePlayNext(playedList[index])
      return
    }
  }

  // const isCheckFile = findNum > 2
  let { filteredList, playerIndex } = await filterList({ // 过滤已播放歌曲
    listId: currentListId,
    list: currentList,
    playedList,
    playerMusicInfo: currentList[playInfo.playerPlayIndex],
    isNext: false,
  })
  if (!filteredList.length) return handleToggleStop()

  // let currentIndex = filteredList.indexOf(currentList[playInfo.playerPlayIndex])
  if (playerIndex == -1 && filteredList.length) playerIndex = 0
  let nextIndex = playerIndex
  if (!playMusicInfo.isTempPlay) {
    let togglePlayMethod = settingState.setting['player.togglePlayMethod']
    if (!isAutoToggle) {
      switch (togglePlayMethod) {
        case 'list':
        case 'singleLoop':
        case 'none':
          togglePlayMethod = 'listLoop'
      }
    }
    switch (togglePlayMethod) {
      case 'random':
        nextIndex = getRandom(0, filteredList.length)
        break
      case 'listLoop':
      case 'list':
        nextIndex = playerIndex === 0 ? filteredList.length - 1 : playerIndex - 1
        break
      case 'singleLoop':
        break
      default:
        nextIndex = -1
        return
    }
    if (nextIndex < 0) return
  }


  await handlePlayNext({
    musicInfo: filteredList[nextIndex],
    listId: currentListId,
    isTempPlay: false,
  })
}

/**
 * 恢复播放
 */
export const play = () => {
  if (playerState.playMusicInfo.musicInfo == null) return
  if (isEmpty()) {
    if (createGettingUrlId(playerState.playMusicInfo.musicInfo) != global.lx.gettingUrlId) setMusicUrl(playerState.playMusicInfo.musicInfo)
    return
  }
  void setPlay()
}

/**
 * 暂停播放
 */
export const pause = async() => {
  await setPause()
}

/**
 * 停止播放
 */
export const stop = async() => {
  await setStop()
  setTimeout(() => {
    global.app_event.stop()
  })
}

/**
 * 播放、暂停播放切换
 */
export const togglePlay = () => {
  markTimeoutExitInteraction()
  global.lx.isPlayedStop &&= false
  if (playerState.isPlay) {
    void pause()
  } else {
    play()
  }
}

/**
 * 收藏当前播放的歌曲
 */
export const collectMusic = () => {
  if (!playerState.playMusicInfo.musicInfo) return
  void addListMusics(LIST_IDS.LOVE, [
    'progress' in playerState.playMusicInfo.musicInfo
      ? playerState.playMusicInfo.musicInfo.metadata.musicInfo
      : playerState.playMusicInfo.musicInfo,
  ], settingState.setting['list.addMusicLocationType'])
}

/**
 * 取消收藏当前播放的歌曲
 */
export const uncollectMusic = () => {
  if (!playerState.playMusicInfo.musicInfo) return
  void removeListMusics(LIST_IDS.LOVE, [
    'progress' in playerState.playMusicInfo.musicInfo
      ? playerState.playMusicInfo.musicInfo.metadata.musicInfo.id
      : playerState.playMusicInfo.musicInfo.id,
  ])
}

/**
 * 不喜欢当前播放的歌曲
 */
export const dislikeMusic = async() => {
  if (!playerState.playMusicInfo.musicInfo) return
  const minfo = 'progress' in playerState.playMusicInfo.musicInfo ? playerState.playMusicInfo.musicInfo.metadata.musicInfo : playerState.playMusicInfo.musicInfo
  await addDislikeInfo([{ name: minfo.name, singer: minfo.singer }])
  await playNext(true)
}

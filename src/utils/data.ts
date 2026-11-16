// 原始 AsyncStorage 包装只在本文件的加固层里使用，业务代码一律走下面同名的加固版本
import {
  getData as rawGetData,
  saveData as rawSaveData,
  getAllKeys as rawGetAllKeys,
  removeDataMultiple as rawRemoveDataMultiple,
  saveDataMultiple as rawSaveDataMultiple,
  removeData as rawRemoveData,
  getDataMultiple as rawGetDataMultiple,
} from '@/plugins/storage'
import { DEFAULT_SETTING, LIST_IDS, storageDataPrefix, type NAV_ID_Type } from '@/config/constant'
import { log } from '@/utils/log'
import { throttle } from './common'

// ---------------------------------------------------------------------------
// 存储层加固（storage-guard）
// 下面几个函数刻意与 @/plugins/storage 的导出同名，用来就地覆盖导入，
// 这样本文件所有既有调用点不用改一行就自动获得：超时保护 + 失败降级 + 写重试。
// ---------------------------------------------------------------------------
/** 单个存储操作超过 3 秒即视为读/写失败：iOS 上 AsyncStorage 偶发不回调，原实现会永久挂起启动流程 */
const STORAGE_TIMEOUT = 3000
/** 写类操作的总尝试次数（首次 + 重试一次）；第二次仍失败只记日志，不再上抛 */
const STORAGE_WRITE_ATTEMPTS = 2

/** 统一把 unknown 异常转成可日志化的字符串 */
const storageErrorMessage = (err: unknown) => err instanceof Error ? err.message : String(err)

/**
 * 给存储 Promise 加超时，超时按失败处理（reject）。
 * 用 Promise.race 而非直接 await，是为了让"原生层无响应"和"正常失败"走同一条降级路径；
 * 结束时清掉定时器，否则每次存储操作都会留下一个 3 秒的悬挂定时器。
 */
const withStorageTimeout = async<T>(task: Promise<T>, key: string, action: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeoutTask = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`storage ${action} timeout(${STORAGE_TIMEOUT}ms)`))
    }, STORAGE_TIMEOUT)
  })
  return Promise.race([task, timeoutTask]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

/**
 * 读 + 反序列化。JSON.parse 发生在 @/plugins/storage 内部，内容损坏时它会抛 SyntaxError，
 * 这里连同超时、原生读写异常一起吃掉：只记一条错误日志并返回调用方给的默认值，
 * 不让一条脏数据把启动流程打断。
 */
const getData = async<T = unknown>(key: string, fallback: T | null = null): Promise<T | null> => {
  try {
    const value = await withStorageTimeout(rawGetData<T>(key), key, 'read')
    return value ?? fallback
  } catch (err) {
    log.error('storage error[getData fail]:', key, storageErrorMessage(err))
    return fallback
  }
}

/**
 * 写类操作统一入口：超时 + 重试一次，第二次仍失败只记错误日志后返回。
 * 不抛出的原因：本文件大量 `void saveData(...)` 调用，抛错会变成未捕获的 promise rejection。
 */
const runStorageWrite = async(key: string, action: string, task: () => Promise<unknown>): Promise<void> => {
  for (let attempt = 1; attempt <= STORAGE_WRITE_ATTEMPTS; attempt++) {
    try {
      await withStorageTimeout(task(), key, action)
      return
    } catch (err) {
      const msg = storageErrorMessage(err)
      if (attempt >= STORAGE_WRITE_ATTEMPTS) {
        log.error(`storage error[${action} fail]:`, key, msg)
        return
      }
      // 首次失败大概率是瞬时状态（存储繁忙/分片写入被打断），重试一次再决定是否放弃
      log.warn(`storage warn[${action} retry]:`, key, msg)
    }
  }
}

const saveData = async(key: string, value: unknown): Promise<void> => {
  await runStorageWrite(key, 'save', async() => rawSaveData(key, value))
}

const saveDataMultiple = async(datas: Array<[string, unknown]>): Promise<void> => {
  await runStorageWrite('multi', 'save-multi', async() => rawSaveDataMultiple(datas))
}

// 删除按写失败处理：删不掉不影响内存数据，下次写入会覆盖，所以同样只记日志不抛
const removeData = async(key: string): Promise<void> => {
  await runStorageWrite(key, 'remove', async() => rawRemoveData(key))
}

const removeDataMultiple = async(keys: string[]): Promise<void> => {
  await runStorageWrite('multi', 'remove-multi', async() => rawRemoveDataMultiple(keys))
}

/** key 列表读失败降级为 []：清理类调用（清缓存、meta 汇总）拿到空列表即什么都不做，不影响主流程 */
const getAllKeys = async(): Promise<string[]> => {
  try {
    return [...(await withStorageTimeout(rawGetAllKeys(), '', 'keys'))]
  } catch (err) {
    log.error('storage error[getAllKeys fail]:', storageErrorMessage(err))
    return []
  }
}

/**
 * 批量读。失败时伪造与请求 key 一一对应的 [key, null] 占位，
 * 保持返回结构不变，调用方（如歌词读取）按"取不到值"分支处理即可。
 */
const getDataMultiple = async<T extends readonly string[]>(keys: T): Promise<{ [K in keyof T]: [T[K], unknown] }> => {
  type RawData = { [K in keyof T]: [T[K], unknown] }
  try {
    return await withStorageTimeout(rawGetDataMultiple(keys), keys.join(','), 'read-multi')
  } catch (err) {
    log.error('storage error[getDataMultiple fail]:', keys.join(','), storageErrorMessage(err))
    return keys.map(key => [key, null]) as unknown as RawData
  }
}

// import { gzip, ungzip } from '@/utils/nativeModules/gzip'
// import { readFile, writeFile, temporaryDirectoryPath, unlink } from '@/utils/fs'
// import { isNotificationsEnabled, openNotificationPermissionActivity, shareText } from '@/utils/nativeModules/utils'
// import { i18n } from '@/plugins/i18n'
// import musicSdk from '@/utils/musicSdk'

const fontSizeKey = storageDataPrefix.fontSize
const themeKey = storageDataPrefix.theme
const playInfoStorageKey = storageDataPrefix.playInfo
const userListKey = storageDataPrefix.userList
const viewPrevStateKey = storageDataPrefix.viewPrevState
const listScrollPositionKey = storageDataPrefix.listScrollPosition
const listUpdateInfoKey = storageDataPrefix.listUpdateInfo
const ignoreVersionKey = storageDataPrefix.ignoreVersion
const ignoreVersionFailTipTimeKey = storageDataPrefix.ignoreVersionFailTipTimeKey
const searchSettingKey = storageDataPrefix.searchSetting
const searchHistoryListKey = storageDataPrefix.searchHistoryList
const songListSettingKey = storageDataPrefix.songListSetting
const leaderboardSettingKey = storageDataPrefix.leaderboardSetting
const listPrevSelectIdKey = storageDataPrefix.listPrevSelectId
const syncAuthKeyPrefix = storageDataPrefix.syncAuthKey
const syncHostPrefix = storageDataPrefix.syncHost
const syncHostHistoryPrefix = storageDataPrefix.syncHostHistory
const listPrefix = storageDataPrefix.list
const dislikeListPrefix = storageDataPrefix.dislikeList
const userApiPrefix = storageDataPrefix.userApi
const openStoragePathPrefix = storageDataPrefix.openStoragePath
const selectedManagedFolderPrefix = storageDataPrefix.selectedManagedFolder

// const defaultListKey = listPrefix + 'default'
// const loveListKey = listPrefix + 'love'

let listPosition: LX.List.ListPositionInfo
let listPrevSelectId: string
let listUpdateInfo: LX.List.ListUpdateInfo

let searchSetting: typeof DEFAULT_SETTING['search']
let songListSetting: typeof DEFAULT_SETTING['songList']
let leaderboardSetting: typeof DEFAULT_SETTING['leaderboard']
let searchHistoryList: string[]

const saveListPositionThrottle = throttle(() => {
  void saveData(listScrollPositionKey, listPosition)
}, 1000)
const saveSearchSettingThrottle = throttle(() => {
  void saveData(searchSettingKey, searchSetting)
}, 1000)
const saveSearchHistoryThrottle = throttle(() => {
  void saveData(searchHistoryListKey, searchHistoryList)
}, 1000)
const saveSongListSettingThrottle = throttle(() => {
  void saveData(songListSettingKey, songListSetting)
}, 1000)
const saveLeaderboardSettingThrottle = throttle(() => {
  void saveData(leaderboardSettingKey, leaderboardSetting)
}, 1000)
const saveViewPrevStateThrottle = throttle((state) => {
  void saveData(viewPrevStateKey, state)
}, 1000)

export const getFontSize = async() => (await getData<number>(fontSizeKey) ?? 1)
export const saveFontSize = async(size: number) => {
  await saveData(fontSizeKey, size)
}

export const getUserTheme = async() => (await getData<LX.Theme[]>(themeKey) ?? [])
export const saveUserTheme = async(themes: LX.Theme[]) => {
  await saveData(themeKey, themes)
}


const initPosition = async() => {
  // eslint-disable-next-line require-atomic-updates
  listPosition ??= await getData(listScrollPositionKey) ?? {}
}
export const getListPosition = async(id: string): Promise<number> => {
  await initPosition()
  return listPosition[id] ?? 0
}
export const saveListPosition = async(id: string, position?: number) => {
  await initPosition()
  listPosition[id] = position ?? 0
  saveListPositionThrottle()
}
export const removeListPosition = async(id: string) => {
  await initPosition()
  delete listPosition[id]
  saveListPositionThrottle()
}
export const overwriteListPosition = async(ids: string[]) => {
  await initPosition()
  const removedIds = []
  for (const id of Object.keys(listPosition)) {
    if (ids.includes(id)) continue
    removedIds.push(id)
  }
  for (const id of removedIds) delete listPosition[id]
  saveListPositionThrottle()
}

const saveListPrevSelectIdThrottle = throttle(() => {
  void saveData(listPrevSelectIdKey, listPrevSelectId)
}, 200)
export const getListPrevSelectId = async() => {
  // eslint-disable-next-line require-atomic-updates
  listPrevSelectId ??= await getData(listPrevSelectIdKey) ?? LIST_IDS.DEFAULT
  return listPrevSelectId || LIST_IDS.DEFAULT
}
export const saveListPrevSelectId = (id: string) => {
  listPrevSelectId = id
  saveListPrevSelectIdThrottle()
}

const saveListUpdateInfoThrottle = throttle(() => {
  void saveData(listUpdateInfoKey, listUpdateInfo)
}, 1000)

const initListUpdateInfo = async() => {
  // eslint-disable-next-line require-atomic-updates
  listUpdateInfo ??= await getData(listUpdateInfoKey) ?? {}
}
export const getListUpdateInfo = async() => {
  await initListUpdateInfo()
  return listUpdateInfo
}
export const saveListUpdateInfo = async(info: LX.List.ListUpdateInfo) => {
  await initListUpdateInfo()
  listUpdateInfo = info
  saveListUpdateInfoThrottle()
}
export const setListAutoUpdate = async(id: string, enable: boolean) => {
  await initListUpdateInfo()
  const targetInfo = listUpdateInfo[id] ?? { updateTime: 0, isAutoUpdate: false }
  targetInfo.isAutoUpdate = enable
  listUpdateInfo[id] = targetInfo
  saveListUpdateInfoThrottle()
}
export const setListUpdateTime = async(id: string, time: number) => {
  await initListUpdateInfo()
  const targetInfo = listUpdateInfo[id] ?? { updateTime: 0, isAutoUpdate: false }
  targetInfo.updateTime = time
  listUpdateInfo[id] = targetInfo
  saveListUpdateInfoThrottle()
}
// export const setListUpdateInfo = (id, { updateTime, isAutoUpdate }) => {
//   listUpdateInfo[id] = { updateTime, isAutoUpdate }
//   saveListUpdateInfo()
// }
export const removeListUpdateInfo = async(id: string) => {
  await initListUpdateInfo()
  delete listUpdateInfo[id]
  saveListUpdateInfoThrottle()
}
export const overwriteListUpdateInfo = async(ids: string[]) => {
  await initListUpdateInfo()
  const removedIds = []
  for (const id of Object.keys(listUpdateInfo)) {
    if (ids.includes(id)) continue
    removedIds.push(id)
  }
  for (const id of removedIds) delete listUpdateInfo[id]
  saveListUpdateInfoThrottle()
}

let ignoreVersion: string | null
export const saveIgnoreVersion = (version: string | null) => {
  ignoreVersion = version
  if (version == null) {
    void removeData(ignoreVersionKey)
  } else {
    void saveData(ignoreVersionKey, version)
  }
}
// 获取忽略更新的版本号
export const getIgnoreVersion = async() => {
  // eslint-disable-next-line require-atomic-updates
  if (ignoreVersion === undefined) ignoreVersion = (await getData<string | null>(ignoreVersionKey)) ?? null
  return ignoreVersion
}

let ignoreVersionFailTipTime: number | null
export const saveIgnoreVersionFailTipTime = (time: number | null) => {
  ignoreVersionFailTipTime = time
  if (time == null) {
    void removeData(ignoreVersionFailTipTimeKey)
  } else {
    void saveData(ignoreVersionFailTipTimeKey, time)
  }
}
// 获取忽略更新的版本号
export const getIgnoreVersionFailTipTime = async() => {
  // eslint-disable-next-line require-atomic-updates
  if (ignoreVersionFailTipTime === undefined) ignoreVersionFailTipTime = (await getData<number | null>(ignoreVersionFailTipTimeKey))
  return ignoreVersionFailTipTime ?? 0
}

let openStoragePath: string | null = ''
export const saveOpenStoragePath = async(path: string) => {
  if (path) {
    openStoragePath = path
    await saveData(openStoragePathPrefix, path)
  } else {
    if (!openStoragePath) return
    openStoragePath = null
    await removeData(openStoragePathPrefix)
  }
}
// 获取上次打开的存储路径
export const getOpenStoragePath = async() => {
  if (openStoragePath === '') {
    // eslint-disable-next-line require-atomic-updates
    openStoragePath = await getData<string | null>(openStoragePathPrefix)
  }
  return openStoragePath
}

export const getSearchSetting = async() => {
  // eslint-disable-next-line require-atomic-updates
  searchSetting ??= await getData(searchSettingKey) ?? { ...DEFAULT_SETTING.search }
  return { ...searchSetting }
}
export const saveSearchSetting = async(setting: Partial<typeof DEFAULT_SETTING['search']>) => {
  if (!searchSetting) await getSearchSetting()
  let requiredSave = false
  if (setting.source && searchSetting.source != setting.source) requiredSave = true
  if (setting.type && searchSetting.type != setting.type) requiredSave = true
  if (setting.temp_source && searchSetting.temp_source != setting.temp_source) requiredSave = true

  if (!requiredSave) return
  searchSetting = Object.assign(searchSetting, setting)
  saveSearchSettingThrottle()
}

export const getSearchHistory = async() => {
  // eslint-disable-next-line require-atomic-updates
  searchHistoryList ??= await getData(searchHistoryListKey) ?? []
  return [...searchHistoryList]
}
export const saveSearchHistory = async(historyList: typeof searchHistoryList) => {
  // if (!searchHistoryList) await getSearchHistory()
  searchHistoryList = historyList
  saveSearchHistoryThrottle()
}

export const getSongListSetting = async() => {
  // eslint-disable-next-line require-atomic-updates
  songListSetting ??= await getData(songListSettingKey) ?? { ...DEFAULT_SETTING.songList }
  return { ...songListSetting }
}
export const saveSongListSetting = async(setting: Partial<typeof DEFAULT_SETTING['songList']>) => {
  if (!songListSetting) await getSongListSetting()
  songListSetting = Object.assign(songListSetting, setting)
  saveSongListSettingThrottle()
}

export const getLeaderboardSetting = async() => {
  // eslint-disable-next-line require-atomic-updates
  leaderboardSetting ??= await getData(leaderboardSettingKey) ?? { ...DEFAULT_SETTING.leaderboard }
  return { ...leaderboardSetting }
}
export const saveLeaderboardSetting = async(setting: Partial<typeof DEFAULT_SETTING['leaderboard']>) => {
  if (!leaderboardSetting) await getLeaderboardSetting()
  leaderboardSetting = Object.assign(leaderboardSetting, setting)
  saveLeaderboardSettingThrottle()
}

export const getViewPrevState = async() => {
  return (await getData<{ id: NAV_ID_Type }>(viewPrevStateKey)) ?? { ...DEFAULT_SETTING.viewPrevState }
}
export const saveViewPrevState = (state: { id: NAV_ID_Type }) => {
  saveViewPrevStateThrottle(state)
}


const idFixRxp = /\.0$/
/**
 * 获取用户列表
 */
export const getUserLists = async(): Promise<LX.List.UserListInfo[]> => {
  const list = await getData<LX.List.UserListInfo[]>(userListKey) ?? []
  for (const info of list) {
    // 兼容v2.3.0之前版本PC端插入数字类型的ID导致其意外在末尾追加 .0 的问题
    if (info.sourceListId?.endsWith?.('.0')) {
      info.sourceListId = info.sourceListId.replace(idFixRxp, '')
    }
  }
  return list
}

/**
 * 保存用户列表
 * @param listInfo
 */
export const saveUserList = async(listInfo: LX.List.UserListInfo[]) => {
  await saveData(userListKey, listInfo)
}

/**
 * 获取列表内歌曲
 * @param listId 列表id
 * @returns
 */
export const getListMusics = async(listId: string): Promise<LX.Music.MusicInfo[]> => {
  const list = await getData<LX.Music.MusicInfo[]>(listPrefix + listId)
  return list ?? []
}

/**
 * 保存列表内歌曲
 * @param listData 列表数据
 */
export const saveListMusics = async(listData: Array<{ id: string, musics: LX.Music.MusicInfo[] }>) => {
  if (listData.length > 1) {
    await saveDataMultiple(listData.map(list => ([listPrefix + list.id, list.musics])))
  } else {
    const list = listData[0]
    await saveData(listPrefix + list.id, list.musics)
  }
}

/**
 * 移除歌曲列表
 * @param ids
 */
export const removeListMusics = async(ids: string[]): Promise<void> => {
  if (ids.length > 1) {
    await removeDataMultiple(ids.map(id => {
      // delete global.lx.listScrollPosition[id]
      // delete global.lx.listSort[id]
      return listPrefix + id
    }))
  } else {
    await removeData(listPrefix + ids[0])
  }
  // await saveData(listSortPrefix, global.lx.listSort)
  // delaySaveListScrollPosition(global.lx.listScrollPosition)
}


export const getMusicUrl = async(musicInfo: LX.Music.MusicInfo, type: LX.Quality) => getData<string>(`${storageDataPrefix.musicUrl}${musicInfo.id}_${type}`).then((url) => url ?? '')
export const saveMusicUrl = async(musicInfo: LX.Music.MusicInfo, type: LX.Quality, url: string) => saveData(`${storageDataPrefix.musicUrl}${musicInfo.id}_${type}`, url)
export const clearMusicUrl = async(keys?: string[]) => {
  if (!keys) keys = (await getAllKeys()).filter(key => key.startsWith(storageDataPrefix.musicUrl))
  await removeDataMultiple(keys)
}

export const getLyric = async(musicInfo: LX.Music.MusicInfo) => getData<LX.Music.LyricInfo>(`${storageDataPrefix.lyric}${musicInfo.id}`).then(lrcInfo => lrcInfo ?? { lyric: '' })
export const saveLyric = async(musicInfo: LX.Music.MusicInfo, lyricInfo: LX.Music.LyricInfo) => saveData(`${storageDataPrefix.lyric}${musicInfo.id}`, lyricInfo)
export const clearLyric = async(keys?: string[]) => {
  if (!keys) keys = (await getAllKeys()).filter(key => key.startsWith(storageDataPrefix.lyric))
  await removeDataMultiple(keys)
}
export const saveEditedLyric = async(musicInfo: LX.Music.MusicInfo, lyricInfo: LX.Music.LyricInfo) => saveData(`${storageDataPrefix.lyric}${musicInfo.id}_edited`, lyricInfo)
export const clearEditedLyric = async() => {
  let keys = (await getAllKeys()).filter(key => key.startsWith(storageDataPrefix.lyric) && key.endsWith('_edited'))
  await removeDataMultiple(keys)
}
export const getPlayerLyric = async(musicInfo: LX.Music.MusicInfo): Promise<LX.Player.LyricInfo> => {
  return getDataMultiple([
    `${storageDataPrefix.lyric}${musicInfo.id}`,
    `${storageDataPrefix.lyric}${musicInfo.id}_edited`,
  ]).then(([lrcInfo, lrcInfo_edited]) => {
    const lyricInfo: LX.Music.LyricInfo = lrcInfo_edited[1] as LX.Music.LyricInfo | null ?? {
      lyric: '',
    }
    let rawLyricInfo: LX.Music.LyricInfo = lrcInfo[1] as LX.Music.LyricInfo | null ?? {
      lyric: '',
    }
    return lyricInfo.lyric ? {
      ...lyricInfo,
      rawlrcInfo: rawLyricInfo,
    } : {
      ...rawLyricInfo,
      rawlrcInfo: rawLyricInfo,
    }
  })
}

export const getOtherSource = async(id: string) => getData<LX.Music.MusicInfoOnline[]>(`${storageDataPrefix.musicOtherSource}${id}`).then((url) => url ?? [])
export const saveOtherSource = async(id: string, sourceInfo: LX.Music.MusicInfoOnline[]) => saveData(`${storageDataPrefix.musicOtherSource}${id}`, sourceInfo)
export const clearOtherSource = async(keys?: string[]) => {
  if (!keys) keys = (await getAllKeys()).filter(key => key.startsWith(storageDataPrefix.musicOtherSource))
  await removeDataMultiple(keys)
}

/**
 * 获取不喜欢列表信息
 * @returns 不喜欢列表信息
 */
export const getDislikeListRules = async() => {
  return await getData<string>(dislikeListPrefix) ?? ''
}
/**
 * 保存列表信息
 * @param rules 规则信息
 */
export const saveDislikeListRules = async(rules: string) => {
  await saveData(dislikeListPrefix, rules)
}

// export const clearMusicUrlAndLyric = async() => {
//   let keys = (await getAllKeys()).filter(key => key.startsWith(storageDataPrefix.musicUrl) || key.startsWith(storageDataPrefix.lyric))
//   await removeDataMultiple(keys)
// }

export const getMetaCache = async() => {
  const keys = await getAllKeys()
  const info = {
    otherSourceKeys: [] as string[],
    // musicUrlKeys: [] as string[],
    lyricKeys: [] as string[],
  }

  for (const key of keys) {
    if (key.startsWith(storageDataPrefix.musicOtherSource)) info.otherSourceKeys.push(key)
    else if (key.startsWith(storageDataPrefix.lyric)) info.lyricKeys.push(key)
  }

  return info
}

export const savePlayInfo = async(playInfo: LX.Player.SavedPlayInfo) => {
  return saveData(playInfoStorageKey, playInfo)
}
// 获取上次关闭时的当前歌曲播放信息
export const getPlayInfo = async() => {
  return getData<LX.Player.SavedPlayInfo | null>(playInfoStorageKey)
}

let selectedManagedFolder: string | null = ''
export const setSelectedManagedFolder = async(uri: string) => {
  selectedManagedFolder = uri
  return saveData(selectedManagedFolderPrefix, uri)
}
export const getSelectedManagedFolder = async() => {
  if (selectedManagedFolder != '') return selectedManagedFolder
  let uri = await getData<string>(selectedManagedFolderPrefix)
  if (selectedManagedFolder != uri) selectedManagedFolder = uri
  return selectedManagedFolder
}

export const getSyncAuthKey = async(serverId: string) => {
  const keys = await getData<Record<string, LX.Sync.KeyInfo>>(syncAuthKeyPrefix)
  if (!keys) return null
  return keys[serverId] ?? null
}
export const setSyncAuthKey = async(serverId: string, info: LX.Sync.KeyInfo) => {
  let keys = await getData<Record<string, LX.Sync.KeyInfo>>(syncAuthKeyPrefix) ?? {}
  keys[serverId] = info
  await saveData(syncAuthKeyPrefix, keys)
}

let syncHostInfo: string
export const getSyncHost = async() => {
  if (syncHostInfo === undefined) {
    // eslint-disable-next-line require-atomic-updates
    syncHostInfo = await getData(syncHostPrefix) ?? ''

    // 清空1.0.0之前版本的同步主机
    if (typeof syncHostInfo == 'object') syncHostInfo = ''
  }
  return syncHostInfo
}
export const setSyncHost = async(host: string) => {
  // let hostInfo = await getData(syncHostPrefix) || {}
  // hostInfo.host = host
  // hostInfo.port = port
  syncHostInfo = host
  await saveData(syncHostPrefix, syncHostInfo)
}
let syncHostHistory: string[]
export const getSyncHostHistory = async() => {
  if (syncHostHistory === undefined) {
    // eslint-disable-next-line require-atomic-updates
    syncHostHistory = await getData(syncHostHistoryPrefix) ?? []

    // 清空1.0.0之前版本的同步历史
    if (syncHostHistory.length && typeof syncHostHistory[0] !== 'string') syncHostHistory = []
  }
  return syncHostHistory
}
export const addSyncHostHistory = async(host: string) => {
  let syncHostHistory = await getSyncHostHistory()
  if (syncHostHistory.some(h => h == host)) return
  syncHostHistory.unshift(host)
  if (syncHostHistory.length > 20) syncHostHistory = syncHostHistory.slice(0, 20) // 最多存储20个
  await saveData(syncHostHistoryPrefix, syncHostHistory)
}
export const removeSyncHostHistory = async(index: number) => {
  syncHostHistory.splice(index, 1)
  await saveData(syncHostHistoryPrefix, syncHostHistory)
}

let userApis: LX.UserApi.UserApiInfo[] = []
export const getUserApiList = async(): Promise<LX.UserApi.UserApiInfo[]> => {
  userApis = await getData<LX.UserApi.UserApiInfo[]>(userApiPrefix) ?? []

  // 移除 1.7.1 及之前版本的脚本数据被意外存储到列表中的问题
  let updated = false
  for (const info of userApis) {
    if ((info as LX.UserApi.UserApiInfo & { script?: string }).script != null) {
      delete (info as LX.UserApi.UserApiInfo & { script?: string }).script
      updated = true
    }
  }
  if (updated) void saveData(userApiPrefix, userApis)

  return [...userApis]
}
export const getUserApiScript = async(id: string): Promise<string> => {
  const script = await getData<string>(`${userApiPrefix}${id}`) ?? ''
  return script
}

const INFO_NAMES = {
  name: 24,
  description: 36,
  author: 56,
  homepage: 1024,
  version: 36,
} as const
type INFO_NAMES_Type = typeof INFO_NAMES
const matchInfo = (scriptInfo: string) => {
  const infoArr = scriptInfo.split(/\r?\n/)
  const rxp = /^\s?\*\s?@(\w+)\s(.+)$/
  const infos: Partial<Record<keyof typeof INFO_NAMES, string>> = {}
  for (const info of infoArr) {
    const result = rxp.exec(info)
    if (!result) continue
    const key = result[1] as keyof typeof INFO_NAMES
    if (INFO_NAMES[key] == null) continue
    infos[key] = result[2].trim()
  }

  for (const [key, len] of Object.entries(INFO_NAMES) as Array<{ [K in keyof INFO_NAMES_Type]: [K, INFO_NAMES_Type[K]] }[keyof INFO_NAMES_Type]>) {
    infos[key] ||= ''
    if (infos[key] == null) infos[key] = ''
    else if (infos[key].length > len) infos[key] = infos[key].substring(0, len) + '...'
  }

  return infos as Record<keyof typeof INFO_NAMES, string>
}
export const addUserApi = async(script: string): Promise<LX.UserApi.UserApiInfo> => {
  const result = /^\/\*[\S|\s]+?\*\//.exec(script)
  if (!result) throw new Error(global.i18n.t('user_api_add_failed_tip'))

  let scriptInfo = matchInfo(result[0])

  scriptInfo.name ||= `user_api_${new Date().toLocaleString()}`
  const apiInfo: LX.UserApi.UserApiInfo = {
    id: `user_api_${Math.random().toString().substring(2, 5)}_${Date.now()}`,
    ...scriptInfo,
    allowShowUpdateAlert: true,
  }
  userApis.push(apiInfo)
  await saveDataMultiple([
    [userApiPrefix, userApis],
    [`${userApiPrefix}${apiInfo.id}`, script],
  ])
  return apiInfo
}
export const removeUserApi = async(ids: string[]) => {
  if (!userApis) return []
  const _ids: string[] = []
  for (let index = userApis.length - 1; index > -1; index--) {
    if (ids.includes(userApis[index].id)) {
      _ids.push(`${userApiPrefix}${userApis[index].id}`)
      userApis.splice(index, 1)
      ids.splice(index, 1)
    }
  }
  await saveData(userApiPrefix, userApis)
  if (_ids.length) await removeDataMultiple(_ids)
  return [...userApis]
}
export const setUserApiAllowShowUpdateAlert = async(id: string, enable: boolean) => {
  const targetApi = userApis?.find(api => api.id == id)
  if (!targetApi) return
  targetApi.allowShowUpdateAlert = enable
  await saveData(userApiPrefix, userApis)
}

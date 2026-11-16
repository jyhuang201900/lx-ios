import {
  getUserLists as getUserListsFromStore,
  getListMusics as getListMusicsFromStore,
  // saveListMusics as saveListMusicsFromStore,
  // removeListMusics as removeListMusicsFromStore,
  overwriteListPosition,
  overwriteListUpdateInfo,
  removeListPosition,
  removeListUpdateInfo,
} from '@/utils/data'
import { arrPush, arrPushByPosition, arrUnshift } from '@/utils/common'
import { LIST_IDS } from '@/config/constant'

export const userLists: LX.List.UserListInfo[] = []
export const allMusicList = new Map<string, LX.Music.MusicInfo[]>()

export const setUserLists = (lists: LX.List.UserListInfo[]) => {
  userLists.splice(0, userLists.length, ...lists)
  return userLists
}

export const setMusicList = (listId: string, musicList: LX.Music.MusicInfo[]): LX.Music.MusicInfo[] => {
  allMusicList.set(listId, musicList)
  return musicList
}
export const removeMusicList = (id: string) => {
  allMusicList.delete(id)
}

// 列表内歌曲的 id → 下标索引。
// 为什么：列表超过 1000 首后，每次增删都现扫数组（findIndex / includes）会让连续操作退化成 O(n²)，
// 这里按「数组引用」缓存一份索引，首次 O(n)，之后查找 O(1)。setMusicList 整体换数组时缓存自然失效。
// 注意：外部若绕过本文件直接原地「同长度纯换序」，需要调用 invalidateMusicIndex(list) 让缓存重建。
interface MusicIndexCache {
  map: Map<string, number>
  length: number
}

const musicIndexCache = new WeakMap<LX.Music.MusicInfo[], MusicIndexCache>()

const buildMusicIndex = (list: LX.Music.MusicInfo[]): MusicIndexCache => {
  const cache: MusicIndexCache = { map: new Map(), length: list.length }
  for (let i = 0; i < list.length; i++) {
    // 为什么：历史数据可能有重复 id，索引取最后一次出现的位置，真正的去重由 dedupeMusicListInPlace 负责
    cache.map.set(list[i].id, i)
  }
  musicIndexCache.set(list, cache)
  return cache
}

const getMusicIndexCache = (list: LX.Music.MusicInfo[]): MusicIndexCache => {
  const cache = musicIndexCache.get(list)
  // 为什么：长度变了说明数组被原地增删过，索引已错位，必须重建
  if (!cache || cache.length !== list.length) return buildMusicIndex(list)
  return cache
}

const invalidateMusicIndex = (list: LX.Music.MusicInfo[]) => {
  musicIndexCache.delete(list)
}

/**
 * 取歌曲在「已加载列表」中的下标，列表未加载或歌曲不存在返回 -1。
 * 为什么暴露：UI 里逐行判断“是否已在列表”（useMusicExistsList）时可以用它做 O(1) 查找，不必逐个 await 存储。
 */
export const getMusicIndexInList = (listId: string, musicId: string): number => {
  const list = allMusicList.get(listId)
  if (!list?.length) return -1
  return getMusicIndexCache(list).map.get(musicId) ?? -1
}

/**
 * 原地去掉重复 id（保留第一次出现的位置，顺序不变），返回是否发生过改动。
 * 为什么：只有“新增时查重”挡不住历史数据/同步/备份里已有的重复项，列表装载与覆盖写入时顺手自愈一次。
 */
export const dedupeMusicListInPlace = (list: LX.Music.MusicInfo[]): boolean => {
  if (list.length < 2) return false
  const seen = new Set<string>()
  let write = 0
  let changed = false
  for (let read = 0; read < list.length; read++) {
    const item = list[read]
    if (seen.has(item.id)) {
      changed = true
      continue
    }
    seen.add(item.id)
    list[write++] = item
  }
  if (!changed) return false
  list.length = write
  invalidateMusicIndex(list)
  return true
}


const createUserList = ({
  name,
  id,
  source,
  sourceListId,
  locationUpdateTime,
}: LX.List.UserListInfo, position: number) => {
  if (position < 0 || position >= userLists.length) {
    userLists.push({
      name,
      id,
      source,
      sourceListId,
      locationUpdateTime,
    })
  } else {
    userLists.splice(position, 0, {
      name,
      id,
      source,
      sourceListId,
      locationUpdateTime,
    })
  }
}

const updateList = ({
  name,
  id,
  source,
  sourceListId,
  // meta,
  locationUpdateTime,
}: LX.List.UserListInfo & { meta?: { id?: string } }) => {
  let index
  switch (id) {
    case LIST_IDS.DEFAULT:
    case LIST_IDS.LOVE:
      break
    case LIST_IDS.TEMP:
    //   tempList.meta = meta ?? {}
      // break
    default:
      index = userLists.findIndex(l => l.id == id)
      if (index < 0) return
      userLists.splice(index, 1, { ...userLists[index], name, source, sourceListId, locationUpdateTime })
      break
  }
}

const removeUserList = (id: string) => {
  const index = userLists.findIndex(l => l.id == id)
  if (index < 0) return
  userLists.splice(index, 1)
  // removeMusicList(id)
}

const overwriteUserList = (lists: LX.List.UserListInfo[]) => {
  userLists.splice(0, userLists.length, ...lists)
}


// const sendMyListUpdateEvent = (ids: string[]) => {
//   window.app_event.myListUpdate(ids)
// }

/**
 * 获取用户列表
 * @returns 所有用户列表
 */
export const getUserLists = async() => {
  const lists = await getUserListsFromStore()
  return setUserLists(lists)
}


export const listDataOverwrite = ({ defaultList, loveList, userList, tempList }: MakeOptional<LX.List.ListDataFull, 'tempList'>): string[] => {
  const updatedListIds: string[] = []
  const newUserIds: string[] = []
  const newUserListInfos = userList.map(({ list, ...listInfo }) => {
    // 为什么：整份数据覆盖（同步/恢复/备份导入）是重复项最容易混进来的入口，落库前先自愈；
    // 自愈过就一定要进 updatedListIds，否则清掉的重复项不会写回存储
    const deduped = dedupeMusicListInPlace(list)
    if (deduped || allMusicList.has(listInfo.id)) updatedListIds.push(listInfo.id)
    newUserIds.push(listInfo.id)
    setMusicList(listInfo.id, list)
    return listInfo
  })
  for (const list of userLists) {
    if (!allMusicList.has(list.id) || newUserIds.includes(list.id)) continue
    removeMusicList(list.id)
    updatedListIds.push(list.id)
  }
  overwriteUserList(newUserListInfos)

  if (dedupeMusicListInPlace(defaultList) || allMusicList.has(LIST_IDS.DEFAULT)) updatedListIds.push(LIST_IDS.DEFAULT)
  setMusicList(LIST_IDS.DEFAULT, defaultList)
  // 为什么：收藏列表一直会被写回，重复项顺手清掉
  dedupeMusicListInPlace(loveList)
  setMusicList(LIST_IDS.LOVE, loveList)
  updatedListIds.push(LIST_IDS.LOVE)

  if (tempList && allMusicList.has(LIST_IDS.TEMP)) {
    dedupeMusicListInPlace(tempList)
    setMusicList(LIST_IDS.TEMP, tempList)
    updatedListIds.push(LIST_IDS.TEMP)
  }
  const newIds = [LIST_IDS.DEFAULT, LIST_IDS.LOVE, ...userList.map(l => l.id)]
  if (tempList) newIds.push(LIST_IDS.TEMP)
  void overwriteListPosition(newIds)
  void overwriteListUpdateInfo(newIds)
  return updatedListIds
}

export const userListCreate = ({ name, id, source, sourceListId, position, locationUpdateTime }: {
  name: string
  id: string
  source?: LX.OnlineSource
  sourceListId?: string
  position: number
  locationUpdateTime: number | null
}) => {
  if (userLists.some(item => item.id == id)) return
  const newList: LX.List.UserListInfo = {
    name,
    id,
    source,
    sourceListId,
    locationUpdateTime,
  }
  createUserList(newList, position)
}

export const userListsRemove = (ids: string[]) => {
  const changedIds = []
  for (const id of ids) {
    removeUserList(id)
    if (!allMusicList.has(id)) continue
    removeMusicList(id)
    void removeListPosition(id)
    void removeListUpdateInfo(id)
    changedIds.push(id)
  }

  return changedIds
}

export const userListsUpdate = (listInfos: LX.List.UserListInfo[]) => {
  for (const info of listInfos) {
    updateList(info)
  }
}

export const userListsUpdatePosition = (position: number, ids: string[]) => {
  const newUserLists = [...userLists]

  // console.log(position, ids)

  const updateLists: LX.List.UserListInfo[] = []

  // const targetItem = list[position]
  const map = new Map<string, LX.List.UserListInfo>()
  for (const item of newUserLists) map.set(item.id, item)
  for (const id of ids) {
    const listInfo = map.get(id)!
    listInfo.locationUpdateTime = Date.now()
    updateLists.push(listInfo)
    map.delete(id)
  }
  newUserLists.splice(0, newUserLists.length, ...newUserLists.filter(mInfo => map.has(mInfo.id)))
  newUserLists.splice(Math.min(position, newUserLists.length), 0, ...updateLists)

  setUserLists(newUserLists)
}

export const getListMusicSync = (id: string | null) => {
  return id ? allMusicList.get(id) ?? [] : []
}

/**
 * 获取列表内的歌曲
 * @param listId
 */
export const getListMusics = async(listId: string): Promise<LX.Music.MusicInfo[]> => {
  if (!listId) return []
  if (allMusicList.has(listId)) return allMusicList.get(listId)!
  const list = await getListMusicsFromStore(listId)
  return setMusicList(listId, list)
}

export const listMusicOverwrite = async(listId: string, musicInfos: LX.Music.MusicInfo[]): Promise<string[]> => {
  // 为什么：同步/备份/外部导入过来的整份列表也可能自带重复 id，写入前自愈一次
  dedupeMusicListInPlace(musicInfos)
  setMusicList(listId, musicInfos)
  return [listId]
}

export const listMusicAdd = async(id: string, musicInfos: LX.Music.MusicInfo[], addMusicLocationType: LX.AddMusicLocationType): Promise<string[]> => {
  const targetList = await getListMusics(id)

  // 为什么：先自愈历史重复项，否则下面的“按 id 覆盖”只会命中第一处，剩下的重复仍然留在列表里
  dedupeMusicListInPlace(targetList)

  const indexCache = getMusicIndexCache(targetList)
  const appendList: LX.Music.MusicInfo[] = []
  const appendIndex = new Map<string, number>()
  for (const musicInfo of musicInfos) {
    const index = indexCache.map.get(musicInfo.id) ?? -1
    if (index > -1) {
      // 为什么：同一首歌再次添加时原地覆盖信息（位置不变、长度不变），而不是再追加一条重复项；
      // 被替换项的 id 与 musicInfo.id 相同，所以索引缓存依然有效
      targetList.splice(index, 1, musicInfo)
      continue
    }
    const pendingIndex = appendIndex.get(musicInfo.id)
    if (pendingIndex != null) {
      // 为什么：同一批入参里也可能重复，后出现的信息覆盖先前排队待插入的那条，保证入参自身也不产生重复
      appendList[pendingIndex] = musicInfo
      continue
    }
    appendIndex.set(musicInfo.id, appendList.length)
    appendList.push(musicInfo)
  }

  if (appendList.length) {
    switch (addMusicLocationType) {
      case 'top':
        arrUnshift(targetList, appendList)
        break
      case 'bottom':
      default:
        arrPush(targetList, appendList)
        break
    }
    // 为什么：插入改变了下标，索引缓存必须重建
    invalidateMusicIndex(targetList)
  }

  setMusicList(id, targetList)

  return [id]
}

export const listMusicRemove = async(listId: string, ids: string[]): Promise<string[]> => {
  const targetList = await getListMusics(listId)
  if (!targetList.length || !ids.length) return [listId]

  const removeSet = new Set(ids)
  // 为什么：一次原地压缩即可，既不新建数组也不全量回写；没删掉任何歌时直接返回，避免无意义的保存事件
  let write = 0
  let removed = false
  for (let read = 0; read < targetList.length; read++) {
    const item = targetList[read]
    if (removeSet.has(item.id)) {
      removed = true
      continue
    }
    targetList[write++] = item
  }
  if (!removed) return [listId]
  targetList.length = write
  invalidateMusicIndex(targetList)

  return [listId]
}

export const listMusicMove = async(fromId: string, toId: string, musicInfos: LX.Music.MusicInfo[], addMusicLocationType: LX.AddMusicLocationType): Promise<string[]> => {
  return [
    ...await listMusicRemove(fromId, musicInfos.map(musicInfo => musicInfo.id)),
    ...await listMusicAdd(toId, musicInfos, addMusicLocationType),
  ]
}

export const listMusicUpdateInfo = async(musicInfos: LX.List.ListActionMusicUpdate): Promise<string[]> => {
  const updateListIds = new Set<string>()
  for (const { id, musicInfo } of musicInfos) {
    const targetList = await getListMusics(id)
    if (!targetList.length) continue
    // 为什么：用索引缓存代替 findIndex，批量更新 1000 首时不会退化成 O(n²)
    const index = getMusicIndexCache(targetList).map.get(musicInfo.id) ?? -1
    if (index < 0) continue
    const info: LX.Music.MusicInfo = { ...targetList[index] }
    Object.assign(info, {
      name: musicInfo.name,
      singer: musicInfo.singer,
      source: musicInfo.source,
      interval: musicInfo.interval,
      meta: musicInfo.meta,
    })
    targetList.splice(index, 1, info)
    updateListIds.add(id)
  }
  return Array.from(updateListIds)
}


export const listMusicUpdatePosition = async(listId: string, position: number, ids: string[]): Promise<string[]> => {
  const targetList = await getListMusics(listId)
  if (!targetList.length || !ids.length) return [listId]

  // 为什么：用索引缓存取歌曲，避免再建一份 id→对象 的 Map；同时跳过不存在的 id，
  // 原实现会把 undefined 塞进列表，导致后续渲染读到空歌曲直接崩
  const indexCache = getMusicIndexCache(targetList)
  const infos: LX.Music.MusicInfo[] = []
  const movingIds = new Set<string>()
  for (const id of ids) {
    const index = indexCache.map.get(id) ?? -1
    if (index < 0) continue
    // 为什么：同一 id 重复传入时只移动一次，否则会在目标位置插入两条相同歌曲
    if (movingIds.has(id)) continue
    movingIds.add(id)
    infos.push(targetList[index])
  }
  if (!infos.length) return [listId]

  const list = targetList.filter(mInfo => !movingIds.has(mInfo.id))
  arrPushByPosition(list, infos, Math.min(position, list.length))

  targetList.splice(0, targetList.length)
  arrPush(targetList, list)
  // 为什么：顺序已变，索引缓存必须重建
  invalidateMusicIndex(targetList)

  return [listId]
}


export const listMusicClear = async(ids: string[]): Promise<string[]> => {
  const changedIds: string[] = []
  for (const id of ids) {
    const list = await getListMusics(id)
    if (!list.length) continue
    setMusicList(id, [])
    changedIds.push(id)
  }
  return changedIds
}

// ---------------------------------------------------------------------------
// 删除歌曲后的播放索引修正
//
// 本仓库的 `playInfo.index` 实际字段是 `playerState.playInfo.playIndex`
// （src/store/player/state.ts），由 src/core/player/playInfo.ts 的
// getPlayIndex / updatePlayIndex 与 src/core/init/player/watchList.ts 维护。
// 那几个文件不在本次可改范围，所以这里只提供纯函数；接入点见 fixPlayIndexAfterRemove 的说明。
// ---------------------------------------------------------------------------

/**
 * 取出被删除歌曲在原列表中的下标（升序、去重）。用于计算删除后的下标位移。
 * @param musicList 删除**之前**的列表（顺序即界面顺序）
 * @param ids 要删除的歌曲 id
 */
export const getRemovedMusicIndexes = (musicList: LX.Music.MusicInfo[], ids: string[]): number[] => {
  if (!musicList.length || !ids.length) return []
  const idSet = new Set(ids)
  const indexes: number[] = []
  for (let i = 0; i < musicList.length; i++) {
    if (idSet.has(musicList[i].id)) indexes.push(i)
  }
  return indexes
}

/**
 * 计算删除若干首歌之后，当前播放索引应该落在哪。
 *
 * 规则：
 * - 列表删空 → 0（没有“当前播放”，也不能留越界下标）
 * - 当前索引为 -1（本来就没在播）且列表非空 → 保持 -1，删除不该凭空开始播放
 * - 删的不是当前项 → 下标按“前面删掉了几首”前移
 * - 删的正是当前项 → 落在同一个下标上，也就是“下一首”；删的是末尾则退到新的末尾
 *
 * @param playIndex 删除前的播放索引（playerState.playInfo.playIndex）
 * @param removedIndexes 被删项在原列表中的下标，见 getRemovedMusicIndexes
 * @param remainingLength 删除后的列表长度
 */
export const calcPlayIndexAfterRemove = (playIndex: number, removedIndexes: number[], remainingLength: number): number => {
  // 为什么：列表空了就统一落 0，避免调用方拿着负数或旧下标去读 list[0]
  if (remainingLength <= 0) return 0
  if (playIndex < 0) return -1

  let removedBefore = 0
  for (const index of removedIndexes) {
    if (index < playIndex) removedBefore++
  }
  const nextIndex = playIndex - removedBefore
  // 为什么：没删当前项时这是“前移后的自身”，删了当前项时同一位置恰好装着下一首；
  // 两种情形若新下标已越过新末尾（删的是最后一首 / 旧索引本身已过期），统一退到新的末尾
  return nextIndex < remainingLength ? nextIndex : remainingLength - 1
}

/**
 * 一步算出删除后的播放索引。
 *
 * 调用方接入说明（这些文件不在本次写域，需另行修改）：
 * 1. `src/event/listEvent.ts` 的 `list_music_remove`：删除**之前**先取
 *    `playerState.playInfo.playIndex` 与 `getListMusicSync(listId)`，删除后调用本函数，
 *    再用 `playerActions.updatePlayIndex(newIndex, newIndex)` 写回（playerPlayIndex 同步修正）。
 * 2. `src/core/init/player/watchList.ts`：现在靠 `updatePlayIndex()` 返回 -1 才 `playNext(true)`，
 *    可以用本函数算出“下一首”的下标直接续播，避免删除末尾时被当成“歌曲被移除”而停下。
 * 3. `src/core/player/playInfo.ts` 的 `getPlayIndex`：可用本函数校正在列表里找不到当前歌的情况。
 *
 * @param musicList 删除**之前**的列表
 * @param ids 本次要删除的歌曲 id
 * @param playIndex 删除前的播放索引
 */
export const fixPlayIndexAfterRemove = (musicList: LX.Music.MusicInfo[], ids: string[], playIndex: number): number => {
  const removedIndexes = getRemovedMusicIndexes(musicList, ids)
  return calcPlayIndexAfterRemove(playIndex, removedIndexes, Math.max(0, musicList.length - removedIndexes.length))
}

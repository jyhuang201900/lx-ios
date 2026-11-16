// import { getPlayInfo } from '@/utils/data'
import { log } from '@/utils/log'
import { init as musicSdkInit } from '@/utils/musicSdk'
import { getUserLists, setUserList } from '@/core/list'
import { setNavActiveId } from '../common'
import { getViewPrevState } from '@/utils/data'
import { bootLog } from '@/utils/bootLog'
import { getDislikeInfo, setDislikeInfo } from '@/core/dislikeList'
import { unlink } from '@/utils/fs'
import { TEMP_FILE_PATH } from '@/utils/tools'
// import { play, playList } from '../player/player'

// const initPrevPlayInfo = async(appSetting: LX.AppSetting) => {
//   const info = await getPlayInfo()
//   global.lx.restorePlayInfo = null
//   if (!info?.listId || info.index < 0) return
//   const list = await getListMusics(info.listId)
//   if (!list[info.index]) return
//   global.lx.restorePlayInfo = info
//   await playList(info.listId, info.index)

//   if (appSetting['player.startupAutoPlay']) setTimeout(play)
// }

export default async(appSetting: LX.AppSetting) => {
  // await Promise.all([
  //   initUserApi(), // 自定义API
  // ]).catch(err => log.error(err))
  void musicSdkInit() // 初始化音乐sdk
  bootLog('User list init...')
  // 存储读取本身已带超时与降级，这里再逐步兜一层：
  // 任何一步失败都只记日志，不中断后面的初始化（用户列表/不喜欢列表/导航记忆互不依赖）
  try {
    setUserList(await getUserLists()) // 获取用户列表
  } catch (err) {
    log.error('dataInit error[userList]:', err instanceof Error ? err.message : String(err))
  }
  try {
    setDislikeInfo(await getDislikeInfo()) // 获取不喜欢列表
  } catch (err) {
    log.error('dataInit error[dislikeInfo]:', err instanceof Error ? err.message : String(err))
  }
  bootLog('User list inited.')
  try {
    setNavActiveId((await getViewPrevState()).id)
  } catch (err) {
    log.error('dataInit error[viewPrevState]:', err instanceof Error ? err.message : String(err))
  }
  // unlink 失败会变成未捕获的 promise rejection，这里显式吞掉并记录
  void unlink(TEMP_FILE_PATH).catch((err: unknown) => {
    log.error('dataInit error[unlink temp]:', err instanceof Error ? err.message : String(err))
  })
  // await initPrevPlayInfo(appSetting).catch(err => log.error(err)) // 初始化上次的歌曲播放信息
}

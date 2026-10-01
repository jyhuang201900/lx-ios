import { isActive } from '@/utils/tools'
import { useEffect, useState } from 'react'
import state, { type InitState } from './state'
import { getListMusicSync } from '@/utils/listManage'

export const usePlayerMusicInfo = () => {
  const [value, update] = useState(state.musicInfo)

  useEffect(() => {
    global.state_event.on('playerMusicInfoChanged', update)
    return () => {
      global.state_event.off('playerMusicInfoChanged', update)
    }
  }, [])

  return value
}

export const usePlayMusicInfo = () => {
  const [value, update] = useState(state.playMusicInfo)

  useEffect(() => {
    global.state_event.on('playMusicInfoChanged', update)
    return () => {
      global.state_event.off('playMusicInfoChanged', update)
    }
  }, [])

  return value
}

export const usePlayInfo = () => {
  const [value, update] = useState(state.playInfo)

  useEffect(() => {
    global.state_event.on('playInfoChanged', update)
    return () => {
      global.state_event.off('playInfoChanged', update)
    }
  }, [])

  return value
}

export const useStatusText = () => {
  const [value, update] = useState(state.statusText)

  useEffect(() => {
    global.state_event.on('playStateTextChanged', update)
    return () => {
      global.state_event.off('playStateTextChanged', update)
    }
  }, [])

  return value
}

export const useStreamInfo = () => {
  const [value, update] = useState(state.streamInfo)

  useEffect(() => {
    global.state_event.on('playStreamInfoChanged', update)
    return () => {
      global.state_event.off('playStreamInfoChanged', update)
    }
  }, [])

  return value
}

export const useIsPlay = () => {
  const [value, update] = useState(state.isPlay)

  useEffect(() => {
    global.state_event.on('playStateChanged', update)
    return () => {
      global.state_event.off('playStateChanged', update)
    }
  }, [])

  return value
}

/**
 * 当前播放列表（正在播放的那一串歌）。
 *
 * 之前没有任何组件能读到它：`playInfo.playerListId` 只存在 store 里，
 * 而播放详情页那个「播放队列」弹层读的是 `useTempPlayList`——那是「稍后播放」
 * 的待播队列，和「播放全部」写入的播放列表是两回事。于是点了播放全部之后，
 * 弹层里空空如也，看起来就像歌根本没加进去。
 *
 * 这里订阅三件事，任一变化都重算：
 * - playInfoChanged：切换了播放列表（playerListId 变了）
 * - playMusicInfoChanged：切歌，用来更新「正在播放」标记
 * - myListMusicUpdate：列表内容被覆盖（「播放全部」先放首页、随后补全全量）
 */
export const usePlayingList = () => {
  const [list, setList] = useState<LX.Music.MusicInfo[]>([])
  const [listId, setListId] = useState<string | null>(state.playInfo.playerListId)

  useEffect(() => {
    const sync = () => {
      const id = state.playInfo.playerListId
      setListId(id)
      setList(id ? getListMusicSync(id) : [])
    }
    sync()
    const handleListId = () => { sync() }
    const handleMusicUpdate = (ids: string[]) => {
      // 只关心当前正在播的那个列表
      if (!ids.includes(state.playInfo.playerListId ?? '')) return
      sync()
    }
    global.state_event.on('playInfoChanged', handleListId)
    global.state_event.on('playMusicInfoChanged', handleListId)
    global.app_event.on('myListMusicUpdate', handleMusicUpdate)
    return () => {
      global.state_event.off('playInfoChanged', handleListId)
      global.state_event.off('playMusicInfoChanged', handleListId)
      global.app_event.off('myListMusicUpdate', handleMusicUpdate)
    }
  }, [])

  return { list, listId }
}

export const useTempPlayList = () => {
  const [value, update] = useState(state.tempPlayList)

  useEffect(() => {
    const handleUpdate = (tempPlayList: InitState['tempPlayList']) => {
      update(tempPlayList)
    }

    global.state_event.on('playTempPlayListChanged', handleUpdate)
    return () => {
      global.state_event.off('playTempPlayListChanged', handleUpdate)
    }
  }, [])

  return value
}

export const useProgress = (autoUpdate = true) => {
  const [value, update] = useState(state.progress)

  useEffect(() => {
    if (!autoUpdate) return
    const handleUpdate = (progress: InitState['progress']) => {
      if (isActive()) update(progress)
    }
    update(state.progress)
    global.state_event.on('playProgressChanged', handleUpdate)
    return () => {
      global.state_event.off('playProgressChanged', handleUpdate)
    }
  }, [autoUpdate])

  return value
}

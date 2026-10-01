import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import OnlineList, { type OnlineListType, type OnlineListProps } from '@/components/OnlineList'
import { search } from '@/core/search/music'
import searchMusicState, { type Source } from '@/store/search/music/state'
import { setTempList } from '@/core/list'
import { playList } from '@/core/player/player'
import { LIST_IDS } from '@/config/constant'
import { toast } from '@/utils/tools'
import { hapticFeedback } from '@/utils/nativeModules/utils'

// export type MusicListProps = Pick<OnlineListProps,
// 'onLoadMore'
// | 'onPlayList'
// | 'onRefresh'
// >

/** 搜索结果在播放器里的来源标识 */
const SEARCH_LIST_ID = 'search__result'

export interface MusicListType {
  loadList: (text: string, source: Source) => void
  playAll: () => void
}

export default forwardRef<MusicListType, {}>((props, ref) => {
  const listRef = useRef<OnlineListType>(null)
  const searchInfoRef = useRef<{ text: string, source: Source }>({ text: '', source: 'kw' })
  const isUnmountedRef = useRef(false)
  const requestIdRef = useRef(0)
  useImperativeHandle(ref, () => ({
    async loadList(text, source) {
      // const listDetailInfo = searchMusicState.listDetailInfo
      listRef.current?.setList([], false, source == 'all')
      if (searchMusicState.searchText == text && searchMusicState.source == source && searchMusicState.listInfos[searchMusicState.source]!.list.length) {
        requestAnimationFrame(() => {
          listRef.current?.setList(searchMusicState.listInfos[searchMusicState.source]!.list, false, source == 'all')
        })
      } else {
        listRef.current?.setStatus('loading')
        const page = 1
        const requestId = ++requestIdRef.current
        searchInfoRef.current.text = text
        searchInfoRef.current.source = source
        return search(text, page, source).then((list) => {
          // const result = setListInfo(listDetail, id, page)
          if (isUnmountedRef.current || requestId != requestIdRef.current) return
          requestAnimationFrame(() => {
            listRef.current?.setList(list, false, source == 'all')
            listRef.current?.setStatus(searchMusicState.listInfos[searchMusicState.source]!.maxPage <= page ? 'end' : 'idle')
          })
        }).catch(() => {
          if (isUnmountedRef.current || requestId != requestIdRef.current) return
          listRef.current?.setStatus('error')
        })
      }
    },
    playAll() {
      const list = listRef.current?.getList() ?? []
      if (!list.length) {
        toast(global.i18n.t('no_item'))
        return
      }
      /**
       * 原来是把这些歌塞进「稍后播放」队列再 playNext——那不是播放列表：
       * 队列播完就空，点下一首也没有上下文，打开播放队列也看不到它们。
       * 改为把搜索结果建成播放列表，从第一首开始播，与其他页面一致。
       */
      void setTempList(SEARCH_LIST_ID, [...list]).then(() => {
        void playList(LIST_IDS.TEMP, 0)
      })
    },
  }), [])

  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])


  const handleRefresh = useCallback<OnlineListProps['onRefresh']>(() => {
    const page = 1
    const requestId = ++requestIdRef.current
    const text = searchInfoRef.current.text
    const source = searchInfoRef.current.source
    listRef.current?.setStatus('refreshing')
    search(text, page, source).then((list) => {
      // const result = setListInfo(listDetail, searchMusicState.listDetailInfo.id, page)
      if (isUnmountedRef.current || requestId != requestIdRef.current) return
      listRef.current?.setList(list, false, source == 'all')
      listRef.current?.setStatus(searchMusicState.listInfos[source]!.maxPage <= page ? 'end' : 'idle')
    }).catch(() => {
      if (isUnmountedRef.current || requestId != requestIdRef.current) return
      listRef.current?.setStatus('error')
    })
  }, [])
  const handleLoadMore = useCallback<OnlineListProps['onLoadMore']>(() => {
    const requestId = ++requestIdRef.current
    const text = searchInfoRef.current.text
    const source = searchInfoRef.current.source
    listRef.current?.setStatus('loading')
    const info = searchMusicState.listInfos[source]!
    const page = info?.list.length ? info.page + 1 : 1
    hapticFeedback('light')
    search(text, page, source).then((list) => {
      // const result = setListInfo(listDetail, searchMusicState.listDetailInfo.id, page)
      if (isUnmountedRef.current || requestId != requestIdRef.current) return
      listRef.current?.setList(list, true, source == 'all')
      listRef.current?.setStatus(info.maxPage <= page ? 'end' : 'idle')
    }).catch(() => {
      if (isUnmountedRef.current || requestId != requestIdRef.current) return
      listRef.current?.setStatus('error')
    })
  }, [])

  return <OnlineList
    ref={listRef}
    onRefresh={handleRefresh}
    onLoadMore={handleLoadMore}
    checkHomePagerIdle
  />
})

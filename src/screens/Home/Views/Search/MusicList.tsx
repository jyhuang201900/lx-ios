import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import OnlineList, { type OnlineListType, type OnlineListProps } from '@/components/OnlineList'
import { search } from '@/core/search/music'
import searchMusicState, { type Source } from '@/store/search/music/state'
import { addTempPlayList } from '@/core/player/tempPlayList'
import { playNext } from '@/core/player/player'
import { toast } from '@/utils/tools'
import { Platform } from 'react-native'

// export type MusicListProps = Pick<OnlineListProps,
// 'onLoadMore'
// | 'onPlayList'
// | 'onRefresh'
// >

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
      addTempPlayList(list.map(item => ({
        listId: '',
        musicInfo: item,
        isTop: true,
      })))
      void playNext()
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
    // Haptic feedback on load more trigger
    if (Platform.OS === 'ios') {
      try {
        const { HapticFeedback } = require('react-native')
        if (HapticFeedback && HapticFeedback.impactAsync) {
          HapticFeedback.impactAsync('light')
        }
      } catch (e) {
        // Silently ignore if haptic feedback is not available
      }
    }
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

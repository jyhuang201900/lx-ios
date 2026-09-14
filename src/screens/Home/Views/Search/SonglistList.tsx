import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import { search } from '@/core/search/songlist'
import Songlist, { type SonglistProps, type SonglistType } from '@/screens/Home/Views/SongList/components/Songlist'
import searchSonglistState, { type Source } from '@/store/search/songlist/state'

// export type MusicListProps = Pick<OnlineListProps,
// 'onLoadMore'
// | 'onPlayList'
// | 'onRefresh'
// >

export interface MusicListType {
  loadList: (text: string, source: Source) => void
}

export default forwardRef<MusicListType, {}>((props, ref) => {
  const listRef = useRef<SonglistType>(null)
  const searchInfoRef = useRef<{ text: string, source: Source }>({ text: '', source: 'kw' })
  const isUnmountedRef = useRef(false)
  const requestIdRef = useRef(0)
  useImperativeHandle(ref, () => ({
    async loadList(text, source) {
      // const listDetailInfo = searchSonglistState.listDetailInfo
      listRef.current?.setList([], source == 'all')
      if (searchSonglistState.searchText == text && searchSonglistState.source == source && searchSonglistState.listInfos[searchSonglistState.source]!.list.length) {
        requestAnimationFrame(() => {
          listRef.current?.setList(searchSonglistState.listInfos[searchSonglistState.source]!.list, source == 'all')
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
            listRef.current?.setList(list, source == 'all')
            listRef.current?.setStatus(searchSonglistState.maxPages[searchSonglistState.source] == page ? 'end' : 'idle')
          })
        }).catch(() => {
          if (isUnmountedRef.current || requestId != requestIdRef.current) return
          listRef.current?.setStatus('error')
        })
      }
    },
  }), [])

  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])


  const handleRefresh: SonglistProps['onRefresh'] = () => {
    const page = 1
    const requestId = ++requestIdRef.current
    const text = searchInfoRef.current.text
    const source = searchInfoRef.current.source
    listRef.current?.setStatus('refreshing')
    search(text, page, source).then((list) => {
      // const result = setListInfo(listDetail, searchSonglistState.listDetailInfo.id, page)
      if (isUnmountedRef.current || requestId != requestIdRef.current) return
      listRef.current?.setList(list, source == 'all')
      listRef.current?.setStatus(searchSonglistState.maxPages[source] == page ? 'end' : 'idle')
    }).catch(() => {
      if (isUnmountedRef.current || requestId != requestIdRef.current) return
      listRef.current?.setStatus('error')
    })
  }
  const handleLoadMore: SonglistProps['onLoadMore'] = () => {
    const requestId = ++requestIdRef.current
    const text = searchInfoRef.current.text
    const source = searchInfoRef.current.source
    listRef.current?.setStatus('loading')
    const info = searchSonglistState.listInfos[source]!
    const page = info.list.length ? info.page + 1 : 1
    search(text, page, source).then((list) => {
      // const result = setListInfo(listDetail, searchSonglistState.listDetailInfo.id, page)
      if (isUnmountedRef.current || requestId != requestIdRef.current) return
      listRef.current?.setList(list, source == 'all')
      listRef.current?.setStatus(searchSonglistState.maxPages[source] == page ? 'end' : 'idle')
    }).catch(() => {
      if (isUnmountedRef.current || requestId != requestIdRef.current) return
      listRef.current?.setStatus('error')
    })
  }

  return <Songlist
    ref={listRef}
    onRefresh={handleRefresh}
    onLoadMore={handleLoadMore}
  />
})

import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { createStyle } from '@/utils/tools'

import MusicList, { type MusicListType } from '../MusicList'
import { getLeaderboardSetting, saveLeaderboardSetting } from '@/utils/data'
import HeaderBar, { type HeaderBarType, type HeaderBarProps } from './HeaderBar'
import { getBoardsList } from '@/core/leaderboard'
import { type BoardItem } from '@/store/leaderboard/state'

export default () => {
  const musicListRef = useRef<MusicListType>(null)
  const headerBarRef = useRef<HeaderBarType>(null)
  const boundInfo = useRef<{ source: LX.OnlineSource, id: string | null }>({ source: 'kw', id: null })
  // const [width, setWidth] = useState(0)

  const handleBoundChange = (source: LX.OnlineSource, id: string) => {
    musicListRef.current?.loadList(source, id)
    void saveLeaderboardSetting({
      source,
      boardId: id,
    })
  }
  const resolveBoardId = (list: BoardItem[], boardId: string | null) => {
    if (!list.length) return null
    return list.some((item: { id: string }) => item.id == boardId) ? boardId : list[0].id
  }
  const onBoundChange = (id: string) => {
    boundInfo.current.id = id
    handleBoundChange(boundInfo.current.source, id)
  }
  const onSourceChange: HeaderBarProps['onSourceChange'] = (source) => {
    boundInfo.current.source = source
    void getBoardsList(source).then(list => {
      if (boundInfo.current.source != source) return
      const id = resolveBoardId(list, null)
      if (!id) return
      boundInfo.current.id = id
      requestAnimationFrame(() => {
        if (boundInfo.current.source != source) return
        headerBarRef.current?.setBoards(source, list, id)
        requestAnimationFrame(() => {
          if (boundInfo.current.source != source || boundInfo.current.id != id) return
          handleBoundChange(source, id)
        })
      })
    })
  }

  useEffect(() => {
    void getLeaderboardSetting().then(({ source, boardId }) => {
      boundInfo.current.source = source
      void getBoardsList(source).then(list => {
        if (boundInfo.current.source != source) return
        const resolvedId = resolveBoardId(list, boardId)
        if (!resolvedId) return
        boundInfo.current.id = resolvedId
        headerBarRef.current?.setBoards(source, list, resolvedId)
        if (resolvedId != boardId) {
          void saveLeaderboardSetting({
            source,
            boardId: resolvedId,
          })
        }
        musicListRef.current?.loadList(source, resolvedId)
      })
    })

  }, [])


  return (
    <View style={styles.container}>
      <HeaderBar ref={headerBarRef} onSourceChange={onSourceChange} onBoardChange={onBoundChange} />
      <MusicList ref={musicListRef} />
    </View>
  )
}

const styles = createStyle({
  container: {
    width: '100%',
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
    // borderTopWidth: BorderWidths.normal,
  },
  // content: {
  //   flex: 1,
  // },
})

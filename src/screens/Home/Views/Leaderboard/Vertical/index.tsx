import { useEffect, useRef, useState } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { createStyle } from '@/utils/tools'

import MusicList, { type MusicListType } from '../MusicList'
import { getLeaderboardSetting, saveLeaderboardSetting } from '@/utils/data'
import HeaderBar, { type HeaderBarType, type HeaderBarProps } from './HeaderBar'
import { getBoardsList } from '@/core/leaderboard'
import { type BoardItem } from '@/store/leaderboard/state'
import boardState from '@/store/leaderboard/state'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'

export default () => {
  const musicListRef = useRef<MusicListType>(null)
  const headerBarRef = useRef<HeaderBarType>(null)
  const boundInfo = useRef<{ source: LX.OnlineSource, id: string | null }>({ source: 'kw', id: null })
  const [boardsFailed, setBoardsFailed] = useState(false)
  const t = useI18n()
  const theme = useTheme()
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
  const handlePlayAll = () => {
    const info = boardState.listDetailInfo
    if (info.id) void musicListRef.current?.playAll()
  }
  const loadBoards = (source: LX.OnlineSource, boardId: string | null) => {
    setBoardsFailed(false)
    void getBoardsList(source).then(list => {
      if (boundInfo.current.source != source) return
      const id = resolveBoardId(list, boardId)
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
    }).catch(() => {
      if (boundInfo.current.source != source) return
      setBoardsFailed(true)
    })
  }
  const onSourceChange: HeaderBarProps['onSourceChange'] = (source) => {
    boundInfo.current.source = source
    loadBoards(source, null)
  }
  const initBoards = () => {
    void getLeaderboardSetting().then(({ source, boardId }) => {
      boundInfo.current.source = source
      loadBoards(source, boardId)
    })
  }

  useEffect(() => {
    initBoards()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  return (
    <View style={styles.container}>
      {
        boardsFailed
          ? (
              <View style={styles.errorView}>
                <Text size={13} color={theme['c-font-label']}>{t('list_error')}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('retry_button_text')}
                  style={{ ...styles.retryBtn, borderColor: theme['c-border-background'] }}
                  onPress={initBoards}
                >
                  <Text size={12} color={theme['c-font-label']}>{t('retry_button_text')}</Text>
                </TouchableOpacity>
              </View>
            )
          : (
              <>
                <HeaderBar ref={headerBarRef} onSourceChange={onSourceChange} onBoardChange={onBoundChange} onPlayAll={handlePlayAll} />
                <MusicList ref={musicListRef} />
              </>
            )
      }
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
  errorView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 30,
  },
  retryBtn: {
    minHeight: 34,
    paddingHorizontal: 18,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // content: {
  //   flex: 1,
  // },
})

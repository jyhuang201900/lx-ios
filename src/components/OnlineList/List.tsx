import { useCallback, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { FlatList, type FlatListProps, RefreshControl, View } from 'react-native'

// import { useMusicList } from '@/store/list/hook'
import ListItem, { ITEM_HEIGHT } from './ListItem'
import { createStyle, getRowInfo, type RowInfoType } from '@/utils/tools'
import type { Position } from './ListMenu'
import type { SelectMode } from './MultipleModeBar'
import { useTheme } from '@/store/theme/hook'
import settingState from '@/store/setting/state'
import { MULTI_SELECT_BAR_HEIGHT } from './MultipleModeBar'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import Loading from '@/components/common/Loading'
import { Icon } from '@/components/common/Icon'
import RetryButton from '@/components/common/RetryButton'
import { handlePlay } from './listAction'
import { useSettingValue } from '@/store/setting/hook'
import { hapticFeedback } from '@/utils/nativeModules/utils'
import { Gap } from '@/theme/layout'

type FlatListType = FlatListProps<LX.Music.MusicInfoOnline>

export type {
  RowInfoType,
}

export interface ListProps {
  onShowMenu: (musicInfo: LX.Music.MusicInfoOnline, index: number, position: Position) => void
  onMuiltSelectMode: () => void
  onSelectAll: (isAll: boolean) => void
  onRefresh: () => void
  onLoadMore: () => void
  onPlayList?: (index: number) => void
  progressViewOffset?: number
  ListHeaderComponent?: FlatListType['ListEmptyComponent']
  checkHomePagerIdle: boolean
  rowType?: RowInfoType
}
export interface ListType {
  setList: (list: LX.Music.MusicInfoOnline[], isAppend: boolean, showSource: boolean) => void
  setIsMultiSelectMode: (isMultiSelectMode: boolean) => void
  setSelectMode: (mode: SelectMode) => void
  selectAll: (isAll: boolean) => void
  getSelectedList: () => LX.Music.MusicInfoOnline[]
  getList: () => LX.Music.MusicInfoOnline[]
  setStatus: (val: Status) => void
}
export type Status = 'loading' | 'refreshing' | 'end' | 'error' | 'idle'


const List = forwardRef<ListType, ListProps>(({
  onShowMenu,
  onMuiltSelectMode,
  onSelectAll,
  onRefresh,
  onLoadMore,
  onPlayList,
  progressViewOffset,
  ListHeaderComponent,
  checkHomePagerIdle,
  rowType,
}, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const flatListRef = useRef<FlatList>(null)
  const [currentList, setList] = useState<LX.Music.MusicInfoOnline[]>([])
  const [showSource, setShowSource] = useState(false)
  const isMultiSelectModeRef = useRef(false)
  const selectModeRef = useRef<SelectMode>('single')
  const prevSelectIndexRef = useRef(-1)
  const [selectedList, setSelectedList] = useState<LX.Music.MusicInfoOnline[]>([])
  const selectedListRef = useRef<LX.Music.MusicInfoOnline[]>([])
  const selectedIds = useMemo(() => new Set(selectedList.map(item => item.id)), [selectedList])
  const [visibleMultiSelect, setVisibleMultiSelect] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const rowInfo = useRef(getRowInfo(rowType))
  const isShowAlbumName = useSettingValue('list.isShowAlbumName')
  const isShowInterval = useSettingValue('list.isShowInterval')
  // const currentListIdRef = useRef('')
  // console.log('render music list')

  useImperativeHandle(ref, () => ({
    setList(list, isAppend, showSource) {
      setList(list)
      setShowSource(showSource)
      if (!isAppend && selectedListRef.current.length) setSelectedList(selectedListRef.current = [])
    },
    setIsMultiSelectMode(isMultiSelectMode) {
      isMultiSelectModeRef.current = isMultiSelectMode
      if (!isMultiSelectMode) {
        prevSelectIndexRef.current = -1
        handleUpdateSelectedList([])
      }
      setVisibleMultiSelect(isMultiSelectMode)
    },
    setSelectMode(mode) {
      selectModeRef.current = mode
    },
    selectAll(isAll) {
      let list: LX.Music.MusicInfoOnline[]
      if (isAll) {
        list = [...currentList]
      } else {
        list = []
      }
      selectedListRef.current = list
      setSelectedList(list)
    },
    getSelectedList() {
      return selectedListRef.current
    },
    getList() {
      return currentList
    },
    setStatus(val) {
      setStatus(val)
    },
  }))


  const handleUpdateSelectedList = (newList: LX.Music.MusicInfoOnline[]) => {
    if (selectedListRef.current.length && newList.length == currentList.length) onSelectAll(true)
    else if (selectedListRef.current.length == currentList.length) onSelectAll(false)
    selectedListRef.current = newList
    setSelectedList(newList)
  }
  const handleSelect = useCallback((item: LX.Music.MusicInfoOnline, pressIndex: number) => {
    let newList: LX.Music.MusicInfoOnline[]
    if (selectModeRef.current == 'single') {
      prevSelectIndexRef.current = pressIndex
      const index = selectedListRef.current.indexOf(item)
      if (index < 0) {
        newList = [...selectedListRef.current, item]
      } else {
        newList = [...selectedListRef.current]
        newList.splice(index, 1)
      }
    } else {
      if (selectedListRef.current.length) {
        const prevIndex = prevSelectIndexRef.current
        const currentIndex = pressIndex
        if (prevIndex == currentIndex) {
          newList = []
        } else if (currentIndex > prevIndex) {
          newList = currentList.slice(prevIndex, currentIndex + 1)
        } else {
          newList = currentList.slice(currentIndex, prevIndex + 1)
          newList.reverse()
        }
      } else {
        newList = [item]
        prevSelectIndexRef.current = pressIndex
      }
    }

    handleUpdateSelectedList(newList)
  }, [currentList, onSelectAll])

  const handlePress = useCallback((item: LX.Music.MusicInfoOnline, index: number) => {
    requestAnimationFrame(() => {
      if (checkHomePagerIdle && !global.lx.homePagerIdle) return
      if (isMultiSelectModeRef.current) {
        handleSelect(item, index)
      } else {
        if (settingState.setting['list.isClickPlayList'] && onPlayList != null) {
          onPlayList(index)
        } else {
          // console.log(currentList[index])
          handlePlay(currentList[index])
        }
      }
    })
  }, [checkHomePagerIdle, currentList, onPlayList, handleSelect])

  const handleLongPress = useCallback((item: LX.Music.MusicInfoOnline, index: number) => {
    if (isMultiSelectModeRef.current) return
    prevSelectIndexRef.current = index
    handleUpdateSelectedList([item])
    onMuiltSelectMode()
  }, [currentList, onMuiltSelectMode, handleSelect])

  const handleLoadMore = useCallback(() => {
    if (status != 'idle') return
    hapticFeedback('light')
    onLoadMore()
  }, [status, onLoadMore])


  const renderItem = useCallback<NonNullable<FlatListType['renderItem']>>(({ item, index }) => (
    <ListItem
      item={item}
      index={index}
      showSource={showSource}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onShowMenu={onShowMenu}
      selectedIds={selectedIds}
      rowInfo={rowInfo.current}
      isShowAlbumName={isShowAlbumName}
      isShowInterval={isShowInterval}
    />
  ), [showSource, handlePress, handleLongPress, onShowMenu, selectedList, isShowAlbumName, isShowInterval])
  const getkey = useCallback<NonNullable<FlatListType['keyExtractor']>>(item => item.id, [])
  const getItemLayout = useCallback<NonNullable<FlatListType['getItemLayout']>>((data, index) => {
    return { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
  }, [])
  const refreshControl = useMemo(() => (
    <RefreshControl
      colors={[theme['c-primary']]}
      progressBackgroundColor={theme['c-primary-input-background']}
      refreshing={status == 'refreshing'}
      onRefresh={onRefresh}
      progressViewOffset={20}
      tintColor={theme['c-primary']}
      title={t('pull_to_refresh')}
      titleColor={theme['c-font-label']} />
  ), [status, onRefresh, theme, t])
  const footerComponent = useMemo(() => {
    // 空列表时由空状态区负责反馈，避免空列表顶部出现游离的“加载中/到底啦”小字
    if (!currentList.length) return null
    let label: FooterLabel
    switch (status) {
      case 'refreshing': return null
      case 'loading':
        label = 'list_loading'
        break
      case 'end':
        label = 'list_end'
        break
      case 'error':
        label = 'list_error'
        break
      case 'idle':
        label = null
        break
    }
    return (
      <View style={{ width: '100%', paddingBottom: visibleMultiSelect ? MULTI_SELECT_BAR_HEIGHT : 0 }} >
        <Footer label={label} onLoadMore={onLoadMore} />
      </View>
    )
  }, [onLoadMore, status, visibleMultiSelect, currentList.length])

  const emptyComponent = useMemo(() => {
    if (currentList.length) return null
    switch (status) {
      case 'loading':
      case 'refreshing':
        return (
          <View style={styles.empty}>
            <Loading size={18} label={t('list_loading')} />
          </View>
        )
      case 'error':
        return (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle} size={14} color={theme['c-font-label']}>{t('list_error')}</Text>
            <RetryButton label={t('retry_button_text')} onPress={onLoadMore} />
          </View>
        )
      case 'end':
        return (
          <View style={styles.empty}>
            <Icon name="album" size={28} color={theme['c-font-label']} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle} size={14} color={theme['c-font-label']}>{t('no_item')}</Text>
          </View>
        )
      default: return null
    }
  }, [currentList.length, status, t, theme, onLoadMore])

  return (
    <FlatList
      ref={flatListRef}
      style={styles.list}
      data={currentList}
      numColumns={rowInfo.current.rowNum}
      horizontal={false}
      maxToRenderPerBatch={4}
      // updateCellsBatchingPeriod={80}
      windowSize={8}
      removeClippedSubviews={true}
      initialNumToRender={12}
      renderItem={renderItem}
      keyExtractor={getkey}
      getItemLayout={getItemLayout}
      // onRefresh={onRefresh}
      // refreshing={refreshing}
      onEndReachedThreshold={0.75}
      onEndReached={handleLoadMore}
      progressViewOffset={progressViewOffset}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={emptyComponent}
      contentContainerStyle={styles.content}
      refreshControl={refreshControl}
      ListFooterComponent={footerComponent}
    />
  )
})

type FooterLabel = 'list_loading' | 'list_end' | 'list_error' | null
const Footer = ({ label, onLoadMore }: {
  label: FooterLabel
  onLoadMore: () => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  if (!label) return null
  if (label == 'list_loading') {
    return (
      <View style={styles.footerLoading}>
        <Loading size={15} label={t('list_loading')} />
      </View>
    )
  }
  if (label == 'list_error') {
    return (
      <View style={styles.footerError}>
        <Text style={styles.footerErrorText} size={13} color={theme['c-font-label']}>{t('list_error')}</Text>
        <RetryButton label={t('retry_button_text')} onPress={onLoadMore} />
      </View>
    )
  }
  return (
    <View>
      <Text style={styles.footer} size={12} color={theme['c-font-label']}>{t(label)}</Text>
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
    flexShrink: 1,
  },
  // 行内容的水平内缩放在这里，行本身才能用满 100% 宽度而不溢出
  content: {
    paddingHorizontal: 10,
    // 底部留白，避免最后一行被迷你播放条压住
    paddingBottom: Gap.page,
  },
  footer: {
    textAlign: 'center',
    padding: 10,
  },
  footerError: {
    paddingTop: 8,
    paddingBottom: 14,
    alignItems: 'center',
    gap: 10,
  },
  footerErrorText: {
    textAlign: 'center',
  },
  footerLoading: {
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoadingText: {
    fontSize: 11,
    color: 'transparent',
  },
  footerEnd: {
    paddingTop: 8,
    paddingBottom: 14,
    alignItems: 'center',
    gap: 10,
  },
  footerEndText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.9,
  },
  empty: {
    flexGrow: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 30,
  },
  emptyIcon: {
    opacity: 0.5,
  },
  emptyTitle: {
    opacity: 0.9,
  },
})

export default List

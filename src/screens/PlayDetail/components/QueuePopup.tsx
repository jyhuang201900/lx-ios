import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import { FlatList, StyleSheet, TouchableOpacity, View, type FlatListProps } from 'react-native'

import Popup, { type PopupType } from '@/components/common/Popup'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { usePlayingList, useTempPlayList, usePlayMusicInfo, useStreamInfo } from '@/store/player/hook'
import { clearTempPlayeList, removeTempPlayList } from '@/core/player/tempPlayList'
import { playListById, playTempPlayListItem } from '@/core/player/player'
import { confirmDialog, createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { IconSize, Radius, Typography } from '@/theme/layout'

type QueueItem = LX.Player.PlayMusicInfo

const getMusicInfo = (item: QueueItem) => 'progress' in item.musicInfo
  ? item.musicInfo.metadata.musicInfo
  : item.musicInfo

const getPlayMusicInfo = (musicInfo: LX.Player.PlayMusic) => 'progress' in musicInfo
  ? musicInfo.metadata.musicInfo
  : musicInfo

const getSourceLabel = (source?: string | null) => {
  // 队列条目理论上都带来源，但缺字段时不应让整个弹层崩掉
  if (!source) return ''
  const key = `source_real_${source}` as Parameters<typeof global.i18n.t>[0]
  const label = global.i18n.t(key)
  return label === key ? source.toUpperCase() : label
}

export interface QueuePopupType {
  open: () => void
}

export default forwardRef<QueuePopupType>((_, ref) => {
  const theme = useTheme()
  /**
   * 这个弹层原来只读 useTempPlayList——那是「稍后播放」的待播队列。
   * 而「播放全部」写入的是**播放列表**（临时列表），两者是不同的东西：
   * 队列里只有手动「稍后播放」的歌，所以点完播放全部打开它还是空的，
   * 看起来就像歌没加进去。
   *
   * 现在同时展示两份数据，各自分组、各自可操作：
   * - 正在播放的列表：播放全部/点单曲播放写入的那一串
   * - 待播队列：手动加入的「稍后播放」
   */
  const { list: playingList, listId: playingListId } = usePlayingList()
  const queue = useTempPlayList()
  const playMusicInfo = usePlayMusicInfo()
  const streamInfo = useStreamInfo()
  const popupRef = useRef<PopupType>(null)

  useImperativeHandle(ref, () => ({
    open() {
      popupRef.current?.setVisible(true)
    },
  }), [])

  /** 点播放列表里的某一首：切到那一首，保持整份列表继续可播 */
  const handlePlayListIndex = (musicInfo: LX.Music.MusicInfo) => {
    if (!playingListId) return
    void playListById(playingListId, musicInfo.id)
    popupRef.current?.setVisible(false)
  }

  const handlePlayQueueItem = (index: number) => {
    void playTempPlayListItem(index)
    popupRef.current?.setVisible(false)
  }

  const handleRemoveQueueItem = (index: number) => {
    removeTempPlayList(index)
  }

  const handleClearQueue = async() => {
    if (queue.length > 1) {
      const confirmed = await confirmDialog({
        message: global.i18n.t('play_queue_clear_confirm'),
      })
      if (!confirmed) return
    }
    clearTempPlayeList()
    popupRef.current?.setVisible(false)
  }

  const nowPlaying = playMusicInfo.musicInfo != null
    ? getPlayMusicInfo(playMusicInfo.musicInfo)
    : null
  const nowPlayingSource = streamInfo.source ?? nowPlaying?.source ?? null
  const nowPlayingId = nowPlaying?.id

  const renderPlayingItem: NonNullable<FlatListProps<LX.Music.MusicInfo>['renderItem']> = ({ item, index }) => {
    const isPlaying = nowPlayingId != null && nowPlayingId == item.id
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${item.name} ${item.singer}`}
        accessibilityState={{ selected: isPlaying }}
        style={{ ...styles.item, backgroundColor: isPlaying ? theme['c-primary-light-200-alpha-100'] : theme['c-primary-input-background'] }}
        onPress={() => { handlePlayListIndex(item) }}
      >
        <Text style={styles.order} size={11} color={isPlaying ? theme['c-primary-font'] : theme['c-font-label']}>{String(index + 1).padStart(2, '0')}</Text>
        <View style={styles.itemCopy}>
          <Text size={Typography.body} numberOfLines={1} color={isPlaying ? theme['c-primary-font'] : undefined}>{item.name}</Text>
          <View style={styles.itemMeta}>
            <Text size={Typography.sub} color={theme['c-font-label']} numberOfLines={1}>{item.singer}</Text>
            <Text style={styles.sourceBadge} size={Typography.caption} color={theme['c-font-label']} numberOfLines={1}>{getSourceLabel(item.source)}</Text>
          </View>
        </View>
        {isPlaying ? <Icon name="volume-medium" size={14} color={theme['c-primary-font']} /> : null}
      </TouchableOpacity>
    )
  }

  // 必须是 useCallback：useMemo 会在渲染时立即无参调用工厂函数，
  // 参数解构 { item } 会从 undefined 取值并抛错
  const renderQueueItem = useCallback<NonNullable<FlatListProps<QueueItem>['renderItem']>>(({ item, index }) => {
    const musicInfo = getMusicInfo(item)
    const sourceLabel = getSourceLabel(musicInfo.source)
    const isPlaying = nowPlayingId != null && nowPlayingId == musicInfo.id
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${musicInfo.name} ${musicInfo.singer}`}
        style={{ ...styles.item, backgroundColor: isPlaying ? theme['c-primary-light-200-alpha-100'] : theme['c-primary-input-background'] }}
        onPress={() => { handlePlayQueueItem(index) }}
      >
        <Text style={styles.order} size={11} color={isPlaying ? theme['c-primary-font'] : theme['c-font-label']}>{String(index + 1).padStart(2, '0')}</Text>
        <View style={styles.itemCopy}>
          <Text size={Typography.body} numberOfLines={1} color={isPlaying ? theme['c-primary-font'] : undefined}>{musicInfo.name}</Text>
          <View style={styles.itemMeta}>
            <Text size={Typography.sub} color={theme['c-font-label']} numberOfLines={1}>{musicInfo.singer}</Text>
            <Text style={styles.sourceBadge} size={Typography.caption} color={theme['c-font-label']} numberOfLines={1}>{sourceLabel}</Text>
          </View>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${global.i18n.t('delete')} ${musicInfo.name}`}
          style={styles.removeButton}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          onPress={() => { handleRemoveQueueItem(index) }}
        >
          <Icon name="close" size={IconSize.affordance} color={theme['c-font-label']} />
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }, [theme, nowPlayingId])

  return (
    <Popup
      ref={popupRef}
      title={global.i18n.t('play_queue_title')}
      position="bottom"
    >
      {nowPlaying ? (
        <View style={{ ...styles.nowPlaying, backgroundColor: theme['c-primary-light-300-alpha-800'] }}>
          <Text style={styles.nowPlayingLabel} size={Typography.caption} color={theme['c-primary-font']}>{global.i18n.t('play_queue_now_playing')}</Text>
          <View style={styles.nowPlayingInfo}>
            <Text size={Typography.body} numberOfLines={1}>{nowPlaying.name}</Text>
            <Text size={11} color={theme['c-font-label']} numberOfLines={1}>
              {nowPlaying.singer}{nowPlayingSource ? ` · ${getSourceLabel(nowPlayingSource)}` : ''}
            </Text>
          </View>
          <Icon name="volume-medium" size={13} color={theme['c-primary-font']} />
        </View>
      ) : null}

      <FlatList
        data={playingList}
        keyExtractor={(item, index) => `playing_${index}_${item.id ?? 'unknown'}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={playingList.length ? (
          <View style={styles.sectionHeader}>
            <Text size={11} color={theme['c-font-label']}>{global.i18n.t('play_queue_playing_list', { num: playingList.length })}</Text>
          </View>
        ) : null}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Icon name="list-order" size={28} color={theme['c-font-label']} />
            <Text style={styles.emptyTitle} size={14}>{global.i18n.t('play_queue_empty')}</Text>
          </View>
        )}
        renderItem={renderPlayingItem}
      />

      {queue.length ? (
        <>
          <View style={styles.actions}>
            <Text size={11} color={theme['c-font-label']}>{global.i18n.t('play_queue_count', { num: queue.length })}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={global.i18n.t('play_queue_clear')}
              style={{ ...styles.clearButton, borderColor: theme['c-border-background'] }}
              onPress={() => { void handleClearQueue() }}
            >
              <Text size={11} color={theme['c-font-label']}>{global.i18n.t('play_queue_clear')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={queue}
            keyExtractor={(item, index) => `queue_${index}_${getMusicInfo(item).id ?? 'unknown'}`}
            contentContainerStyle={styles.list}
            renderItem={renderQueueItem}
          />
        </>
      ) : null}
    </Popup>
  )
})

const styles = createStyle({
  nowPlaying: {
    marginHorizontal: 16,
    marginBottom: 8,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nowPlayingLabel: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  nowPlayingInfo: {
    flex: 1,
    gap: 2,
  },
  actions: {
    minHeight: 34,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearButton: {
    minHeight: 30,
    paddingHorizontal: 11,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    minHeight: 30,
    justifyContent: 'center',
  },
  item: {
    minHeight: 60,
    marginBottom: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.control,
    flexDirection: 'row',
    alignItems: 'center',
  },
  order: {
    width: 24,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  itemCopy: {
    flex: 1,
    paddingHorizontal: 10,
    gap: 3,
    justifyContent: 'center',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceBadge: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(128,128,128,0.16)',
  },
  removeButton: {
    width: 32,
    height: 32,
    marginLeft: 4,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  emptyTitle: {
    opacity: 0.9,
  },
})

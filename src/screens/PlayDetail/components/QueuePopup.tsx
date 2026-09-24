import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import { FlatList, StyleSheet, TouchableOpacity, View, type FlatListProps } from 'react-native'

import Popup, { type PopupType } from '@/components/common/Popup'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useTempPlayList, usePlayMusicInfo, useStreamInfo } from '@/store/player/hook'
import { clearTempPlayeList, removeTempPlayList } from '@/core/player/tempPlayList'
import { playTempPlayListItem } from '@/core/player/player'
import { confirmDialog, createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'

type QueueItem = LX.Player.PlayMusicInfo

const getMusicInfo = (item: QueueItem) => 'progress' in item.musicInfo
  ? item.musicInfo.metadata.musicInfo
  : item.musicInfo

const getPlayMusicInfo = (musicInfo: LX.Player.PlayMusic) => 'progress' in musicInfo
  ? musicInfo.metadata.musicInfo
  : musicInfo

const getSourceLabel = (source: string) => {
  const key = `source_real_${source}` as any
  const label = global.i18n.t(key)
  return label === key ? source.toUpperCase() : label
}

export interface QueuePopupType {
  open: () => void
}

export default forwardRef<QueuePopupType>((_, ref) => {
  const theme = useTheme()
  const queue = useTempPlayList()
  const playMusicInfo = usePlayMusicInfo()
  const streamInfo = useStreamInfo()
  const popupRef = useRef<PopupType>(null)

  useImperativeHandle(ref, () => ({
    open() {
      popupRef.current?.setVisible(true)
    },
  }), [])

  const handlePlayItem = (index: number) => {
    void playTempPlayListItem(index)
    popupRef.current?.setVisible(false)
  }

  const handleRemoveItem = (index: number) => {
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

  // 必须是 useCallback：useMemo 会在渲染时立即无参调用工厂函数，
  // 参数解构 { item } 会从 undefined 取值并抛错
  const renderItem = useCallback<FlatListProps<QueueItem>['renderItem']>(({ item, index }) => {
    const musicInfo = getMusicInfo(item)
    const sourceLabel = getSourceLabel(musicInfo.source)
    const isPlaying = playMusicInfo.musicInfo != null && getPlayMusicInfo(playMusicInfo.musicInfo).id == musicInfo.id
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${musicInfo.name} ${musicInfo.singer}`}
        style={{ ...styles.item, backgroundColor: isPlaying ? theme['c-primary-light-200-alpha-100'] : theme['c-primary-input-background'] }}
        onPress={() => handlePlayItem(index)}
      >
        <Text style={styles.order} size={11} color={isPlaying ? theme['c-primary-dark-100'] : theme['c-300']}>{String(index + 1).padStart(2, '0')}</Text>
        <View style={styles.itemCopy}>
          <Text size={13} numberOfLines={1} color={isPlaying ? theme['c-primary-dark-100'] : undefined}>{musicInfo.name}</Text>
          <View style={styles.itemMeta}>
            <Text size={11} color={theme['c-font-label']} numberOfLines={1}>{musicInfo.singer}</Text>
            <Text style={styles.sourceBadge} size={10} color={theme['c-font-label']} numberOfLines={1}>{sourceLabel}</Text>
          </View>
        </View>
        {
          isPlaying
            ? <Icon name="play" size={13} color={theme['c-primary-dark-100']} />
            : <Icon name="play-outline" size={13} color={theme['c-font-label']} />
        }
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${global.i18n.t('delete')} ${musicInfo.name}`}
          style={styles.removeButton}
          onPress={() => handleRemoveItem(index)}
        >
          <Icon name="close" size={11} color={theme['c-font-label']} />
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }, [theme, playMusicInfo])

  const nowPlaying = playMusicInfo.musicInfo != null
    ? getPlayMusicInfo(playMusicInfo.musicInfo)
    : null
  const nowPlayingSource = streamInfo.source ?? nowPlaying?.source ?? null

  return (
    <Popup
      ref={popupRef}
      title={global.i18n.t('play_queue_title')}
      position="bottom"
    >
      {nowPlaying ? (
        <View style={{ ...styles.nowPlaying, backgroundColor: theme['c-primary-light-100-alpha-200'] }}>
          <Text style={styles.nowPlayingLabel} size={10} color={theme['c-primary-dark-100']}>{global.i18n.t('play_queue_now_playing')}</Text>
          <View style={styles.nowPlayingInfo}>
            <Text size={13} numberOfLines={1}>{nowPlaying.name}</Text>
            <Text size={11} color={theme['c-font-label']} numberOfLines={1}>
              {nowPlaying.singer}{nowPlayingSource ? ` · ${getSourceLabel(nowPlayingSource)}` : ''}
            </Text>
          </View>
          <Icon name="volume-medium" size={13} color={theme['c-primary-dark-100']} />
        </View>
      ) : null}
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
            keyExtractor={(item, index) => `${index}_${getMusicInfo(item).id ?? 'unknown'}`}
            contentContainerStyle={styles.list}
            renderItem={renderItem}
          />
        </>
      ) : (
        <View style={styles.empty}>
          <Icon name="list-order" size={28} color={theme['c-font-label']} />
          <Text style={styles.emptyTitle} size={14}>{global.i18n.t('play_queue_empty')}</Text>
        </View>
      )}
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
    borderRadius: 14,
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
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  item: {
    minHeight: 60,
    marginBottom: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  order: {
    width: 24,
    textAlign: 'center',
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
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.16)',
  },
  removeButton: {
    width: 32,
    height: 32,
    marginLeft: 4,
    borderRadius: 12,
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

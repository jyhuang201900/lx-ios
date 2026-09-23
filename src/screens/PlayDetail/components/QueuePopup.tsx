import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { FlatList, StyleSheet, TouchableOpacity, View, type FlatListProps } from 'react-native'

import Popup, { type PopupType } from '@/components/common/Popup'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useTempPlayList } from '@/store/player/hook'
import { clearTempPlayeList, removeTempPlayList } from '@/core/player/tempPlayList'
import { playTempPlayListItem } from '@/core/player/player'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'

type QueueItem = LX.Player.PlayMusicInfo

const getMusicInfo = (item: QueueItem) => 'progress' in item.musicInfo
  ? item.musicInfo.metadata.musicInfo
  : item.musicInfo

export interface QueuePopupType {
  open: () => void
}

export default forwardRef<QueuePopupType>((_, ref) => {
  const theme = useTheme()
  const queue = useTempPlayList()
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

  const handleClearQueue = () => {
    clearTempPlayeList()
    popupRef.current?.setVisible(false)
  }

  const renderItem = useMemo<FlatListProps<QueueItem>['renderItem']>(({ item, index }) => {
    const musicInfo = getMusicInfo(item)
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${musicInfo.name} ${musicInfo.singer}`}
        style={{ ...styles.item, backgroundColor: theme['c-primary-input-background'] }}
        onPress={() => handlePlayItem(index)}
      >
        <Text style={styles.order} size={11} color={theme['c-300']}>{String(index + 1).padStart(2, '0')}</Text>
        <View style={styles.itemCopy}>
          <Text size={13} numberOfLines={1}>{musicInfo.name}</Text>
          <Text size={11} color={theme['c-font-label']} numberOfLines={1}>{musicInfo.singer}</Text>
        </View>
        <Icon name="play-outline" size={13} color={theme['c-font-label']} />
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
  }, [theme])

  return (
    <Popup
      ref={popupRef}
      title={global.i18n.t('play_queue_title')}
      position="bottom"
    >
      {queue.length ? (
        <>
          <View style={styles.actions}>
            <Text size={11} color={theme['c-font-label']}>{global.i18n.t('play_queue_count', { num: queue.length })}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={global.i18n.t('play_queue_clear')}
              style={{ ...styles.clearButton, borderColor: theme['c-border-background'] }}
              onPress={handleClearQueue}
            >
              <Text size={11} color={theme['c-font-label']}>{global.i18n.t('play_queue_clear')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={queue}
            keyExtractor={(item, index) => item.musicInfo.id ?? String(index)}
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

import { memo, useRef } from 'react'
import { View, TouchableOpacity, FlatList, type FlatListProps, StyleSheet } from 'react-native'

import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { useActiveListId, useListFetching, useMyList } from '@/store/list/hook'
import { createStyle } from '@/utils/tools'
import { setActiveList } from '@/core/list'
import Text from '@/components/common/Text'
import { type Position } from './ListMenu'
import { scaleSizeH, scaleSizeW } from '@/utils/pixelRatio'
import Loading from '@/components/common/Loading'
import listState from '@/store/list/state'
import { LIST_IDS } from '@/config/constant'

type FlatListType = FlatListProps<LX.List.MyListInfo>
const getListKind = (id: string) => {
  if (id === LIST_IDS.LOVE) return global.i18n.t('list_name_love')
  if (id === LIST_IDS.DEFAULT) return global.i18n.t('list_name_default')
  if (id === LIST_IDS.TEMP) return global.i18n.t('list_name_temp')
  return global.i18n.t('list_create')
}

const ListItem = memo(({ item, index, activeId, onPress, onShowMenu }: {
  onPress: (item: LX.List.MyListInfo) => void
  index: number
  activeId: string
  item: LX.List.MyListInfo
  onShowMenu: (item: LX.List.MyListInfo, index: number, position: Position) => void
}) => {
  const theme = useTheme()
  const moreButtonRef = useRef<TouchableOpacity>(null)
  const fetching = useListFetching(item.id)
  const active = activeId === item.id
  const count = listState.allMusicList.get(item.id)?.length

  const handleShowMenu = () => {
    moreButtonRef.current?.measure?.((fx, fy, width, height, px, py) => {
      onShowMenu(item, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
    })
  }

  return (
    <View style={{ ...styles.card, backgroundColor: active ? theme['c-primary-background-hover'] : theme['c-primary-input-background'], borderColor: active ? theme['c-primary'] : theme['c-border-background'] }}>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: active }} style={styles.cardMain} onPress={() => onPress(item)}>
        <View style={{ ...styles.cardIcon, backgroundColor: active ? theme['c-primary'] : theme['c-primary-background-active'] }}>
          <Icon name={item.id === LIST_IDS.LOVE ? 'love' : item.id === LIST_IDS.DEFAULT ? 'play-outline' : 'album'} size={17} color={active ? theme['c-font'] : theme['c-font-label']} />
        </View>
        <View style={styles.cardCopy}>
          <Text numberOfLines={2} ellipsizeMode="tail" size={14} color={theme['c-font']}>{item.name}</Text>
          <Text numberOfLines={1} size={11} color={active ? theme['c-font'] : theme['c-font-label']}>{getListKind(item.id)}{count == null ? '' : ` · ${global.i18n.t('list_song_count', { num: count })}`}</Text>
        </View>
        {fetching ? <Loading color={active ? theme['c-font'] : theme['c-font-label']} /> : null}
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${item.name} menu`} ref={moreButtonRef} onPress={handleShowMenu} style={styles.moreButton}>
        <Icon name="dots-vertical" color={active ? theme['c-font'] : theme['c-350']} size={15} />
      </TouchableOpacity>
    </View>
  )
}, (prevProps, nextProps) => prevProps.item === nextProps.item && prevProps.activeId === nextProps.activeId)

export default ({ onShowMenu, onCreate }: {
  onShowMenu: (info: { listInfo: LX.List.MyListInfo, index: number }, position: Position) => void
  onCreate?: () => void
}) => {
  const theme = useTheme()
  const allList = useMyList()
  const activeListId = useActiveListId()

  const renderItem: FlatListType['renderItem'] = ({ item, index }) => (
    <ListItem
      item={item}
      index={index}
      activeId={activeListId}
      onPress={selected => { if (selected.id !== activeListId) setActiveList(selected.id) }}
      onShowMenu={(info, itemIndex, position) => onShowMenu({ listInfo: info, index: itemIndex }, position)}
    />
  )

  return (
    <View style={{ ...styles.library, borderBottomColor: theme['c-border-background'] }}>
      <View style={styles.libraryHeader}>
        <Text size={11} color={theme['c-font-label']}>{global.i18n.t('list_total', { num: allList.length })}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={onCreate} style={{ ...styles.createButton, backgroundColor: theme['c-primary'] }}>
          <Icon name="add-music" color={theme['c-primary-button-font']} size={15} />
          <Text size={12} color={theme['c-primary-button-font']}>{global.i18n.t('list_create')}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        data={allList}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        extraData={activeListId}
      />
    </View>
  )
}

const styles = createStyle({
  library: { flexGrow: 0, flexShrink: 0, paddingTop: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  libraryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 10 },
  createButton: { minHeight: 40, paddingHorizontal: 13, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  rail: { paddingHorizontal: 12, gap: 10 },
  card: { width: scaleSizeW(180), height: scaleSizeH(82), borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, flexDirection: 'row', overflow: 'hidden' },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 11 },
  cardIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1, paddingLeft: 9, paddingRight: 4, justifyContent: 'center', gap: 4 },
  moreButton: { width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' },
})

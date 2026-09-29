import { memo, useRef } from 'react'
import { View, TouchableOpacity, FlatList, type FlatListProps, StyleSheet } from 'react-native'

import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { useActiveListId, useListFetching, useMyList } from '@/store/list/hook'
import { createStyle } from '@/utils/tools'
import { setActiveList } from '@/core/list'
import { playList } from '@/core/player/player'
import Text from '@/components/common/Text'
import { type Position } from './ListMenu'
import { scaleSizeH, scaleSizeW } from '@/utils/pixelRatio'
import Loading from '@/components/common/Loading'
import listState from '@/store/list/state'
import { LIST_IDS } from '@/config/constant'
import { ListMetrics, PageMetrics, Radius, Typography, createContentSurface, glassCardShadow, neonGlow } from '@/theme/layout'
import PageToolbar from '@/components/common/PageToolbar'

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
      <View style={{ ...styles.cardShell, backgroundColor: active ? theme['c-primary-background-hover'] : theme['c-control-surface'], ...(active ? neonGlow(theme, { radius: 12, opacity: 0.32 }) : glassCardShadow) }}>
      <View style={{ ...styles.card, ...createContentSurface(theme, { radius: Radius.card }), ...(active ? { borderColor: theme['c-primary'], borderTopColor: theme['c-primary'] } : null) }}>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: active }} style={styles.cardMain} onPress={() => { onPress(item) }}>
        <View style={{ ...styles.cardIcon, backgroundColor: active ? theme['c-primary-dark-500'] : theme['c-primary-background-active'] }}>
            {/* 选中态的图标底是 c-primary-dark-500，图标必须用配合深底的 c-000；
                同一文件里另外三处 `active ? c-font : c-font-label` 都在卡片表面上，
                不要一起改——那里的 c-font 是对的。 */}
            <Icon name={item.id === LIST_IDS.LOVE ? 'love' : item.id === LIST_IDS.DEFAULT ? 'play-outline' : 'album'} size={17} color={active ? theme['c-on-solid'] : theme['c-font-label']} />
        </View>
        <View style={styles.cardCopy}>
          <Text numberOfLines={2} ellipsizeMode="tail" size={Typography.body} color={theme['c-font']}>{item.name}</Text>
          <Text numberOfLines={1} size={Typography.sub} color={active ? theme['c-font'] : theme['c-font-label']}>{getListKind(item.id)}{count == null ? '' : ` · ${global.i18n.t('list_song_count', { num: count })}`}</Text>
        </View>
        {fetching ? <Loading color={active ? theme['c-font'] : theme['c-font-label']} /> : null}
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${item.name} ${global.i18n.t('list_more')}`}
        activeOpacity={0.65}
        ref={moreButtonRef}
        onPress={handleShowMenu}
        style={styles.moreButton}
      >
        <Icon name="dots-vertical" color={active ? theme['c-font'] : theme['c-font-label']} size={15} />
      </TouchableOpacity>
      </View>
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
      onShowMenu={(info, itemIndex, position) => { onShowMenu({ listInfo: info, index: itemIndex }, position) }}
    />
  )

  return (
    <View style={styles.library}>
      <PageToolbar>
        <Text size={11} color={theme['c-font-label']}>{global.i18n.t('list_total', { num: allList.length })}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={global.i18n.t('play_all')}
            onPress={() => { void playList(activeListId, 0) }}
            style={{ ...styles.playAllButton, backgroundColor: theme['c-primary-solid'] }}
          >
            <Icon name="play" color={theme['c-on-solid']} size={15} />
            <Text size={12} color={theme['c-on-solid']}>{global.i18n.t('play_all')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={global.i18n.t('list_create')}
            onPress={onCreate}
            style={{ ...styles.createButton, ...createContentSurface(theme, { radius: Radius.pill }) }}
          >
            <Icon name="add-music" color={theme['c-primary-font-active']} size={15} />
            <Text size={12} color={theme['c-primary-font-active']}>{global.i18n.t('list_create')}</Text>
          </TouchableOpacity>
        </View>
      </PageToolbar>
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
  library: { flexGrow: 0, flexShrink: 0 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playAllButton: { minHeight: 40, paddingHorizontal: 12, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 6 },
  createButton: { minHeight: 40, paddingHorizontal: 13, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 6 },
  // 与 libraryHeader 的 16 对齐，避免同一页出现两条左边缘
  rail: { paddingHorizontal: PageMetrics.gutter, gap: 10 },
  // 外层不裁剪，让 glassCardShadow 在 iOS 上可以显示
  cardShell: { width: scaleSizeW(180), height: scaleSizeH(82), borderRadius: Radius.card },
  card: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.card, flexDirection: 'row', overflow: 'hidden' },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: ListMetrics.thumbSize / 4 },
  cardIcon: { width: ListMetrics.thumbSize - 4, height: ListMetrics.thumbSize - 4, borderRadius: ListMetrics.thumbRadius, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1, paddingLeft: 8, paddingRight: 4, justifyContent: 'center', gap: 4 },
  moreButton: { width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' },
})

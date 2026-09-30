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
import { PageMetrics, Radius, Typography, createContentSurface, glassCardShadow, neonGlow } from '@/theme/layout'
import PageToolbar from '@/components/common/PageToolbar'

type FlatListType = FlatListProps<LX.List.MyListInfo>

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
      <View style={{ ...styles.cardShell, backgroundColor: active ? theme['c-primary-background-hover'] : theme['c-control-surface'], ...(active ? neonGlow(theme, { radius: 10, opacity: 0.32 }) : glassCardShadow) }}>
      <View style={{ ...styles.card, ...createContentSurface(theme, { radius: Radius.control }), ...(active ? { borderColor: theme['c-primary'], borderTopColor: theme['c-primary'] } : null) }}>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: active }} style={styles.cardMain} onPress={() => { onPress(item) }}>
        <View style={{ ...styles.cardIcon, backgroundColor: active ? theme['c-primary-dark-500'] : theme['c-primary-background-active'] }}>
            {/* 选中态的图标底是 c-primary-dark-500，图标必须用配合深底的 c-000；
                同一文件里另外三处 `active ? c-font : c-font-label` 都在卡片表面上，
                不要一起改——那里的 c-font 是对的。 */}
            <Icon name={item.id === LIST_IDS.LOVE ? 'love' : item.id === LIST_IDS.DEFAULT ? 'play-outline' : 'album'} size={15} color={active ? theme['c-on-solid'] : theme['c-font-label']} />
        </View>
        {/*
          原本这里是两行：歌单名 + 类别名。内置歌单的名称和类别本来就是同一句话
          （「我的收藏」/「我的收藏」），等于把同一个词写了两遍；自定义歌单那一行
          显示的又是「新建列表」——一个动作文案，不是类别。整行去掉，
          只留歌单名和数量。
        */}
        <View style={styles.cardCopy}>
          <Text numberOfLines={1} ellipsizeMode="tail" size={Typography.compact} color={theme['c-font']} style={styles.cardName}>{item.name}</Text>
          {count == null ? null : <Text numberOfLines={1} size={Typography.caption} color={theme['c-font-label']}>{global.i18n.t('list_song_count', { num: count })}</Text>}
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
        <Icon name="dots-vertical" color={active ? theme['c-font'] : theme['c-font-label']} size={16} />
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
        {/*
          这里原本在最左侧渲染「N 个歌单」。列表本身就在下面一条条列着，
          数量对用户没有决策价值，却占掉了工具栏最显眼的位置。
          工具栏改为右侧对齐两个操作，和其余页面「标题在左、操作在右」的规律一致。
        */}
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
  headerActions: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  playAllButton: { minHeight: 40, paddingHorizontal: 12, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 6 },
  createButton: { minHeight: 40, paddingHorizontal: 13, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 6 },
  // 与 libraryHeader 的 16 对齐，避免同一页出现两条左边缘
  rail: { paddingHorizontal: PageMetrics.gutter, gap: 10 },
  // 外层不裁剪，让 glassCardShadow 在 iOS 上可以显示
  /**
   * 卡片原本是 180×82，两行文字，横向只能露出两张半。
   * 它承载的只是一次选择，不需要这么大的面积；压到单行 46pt 高、
   * 一屏能看见更多歌单，横向滚动也不再是主要交互。
   */
  cardShell: { width: scaleSizeW(168), height: scaleSizeH(46), borderRadius: Radius.control },
  card: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.control, flexDirection: 'row', overflow: 'hidden' },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 8 },
  cardIcon: { width: 28, height: 28, borderRadius: Radius.control, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 2, gap: 4 },
  cardName: { flexShrink: 1 },
  moreButton: { width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' },
})

import { memo, useRef, useState } from 'react'
import { View, TouchableOpacity, FlatList, type FlatListProps, StyleSheet } from 'react-native'

import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { useActiveListId, useListFetching, useMyList } from '@/store/list/hook'
import { createStyle, toast } from '@/utils/tools'
import { getListMusics, setActiveList } from '@/core/list'
import { playList } from '@/core/player/player'
import Text from '@/components/common/Text'
import { type Position } from './ListMenu'
import { scaleSizeH, scaleSizeW } from '@/utils/pixelRatio'
import Loading from '@/components/common/Loading'
import listState from '@/store/list/state'
import { LIST_IDS } from '@/config/constant'
import { PageMetrics, Radius, Typography, createContentSurface, glassCardShadow, neonGlow } from '@/theme/layout'
import PageToolbar from '@/components/common/PageToolbar'
import Input from '@/components/common/Input'

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

export default ({ onShowMenu, onCreate, onSearch }: {
  onShowMenu: (info: { listInfo: LX.List.MyListInfo, index: number }, position: Position) => void
  onCreate?: () => void
  /** 工具栏搜索框的输入回调，由外层接到当前歌单的歌曲搜索 */
  onSearch: (keyword: string) => void
}) => {
  const theme = useTheme()
  const allList = useMyList()
  const activeListId = useActiveListId()
  const [keyword, setKeyword] = useState('')

  /**
   * 工具栏上的搜索框只负责收字：歌单内的歌曲数据在 MusicList 手里，
   * 所以这里把每次输入都交给它去过滤并展示结果。
   */
  const handleChangeKeyword = (text: string) => {
    setKeyword(text)
    onSearch(text)
  }

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
      {/*
        工具栏从左到右：播放全部 / 新建列表 / 搜索框。
        搜索框原来是挂在「当前歌单」那张卡片右侧的放大镜，占掉了歌单名和
        歌曲数最需要的横向空间；上移到工具栏后，下面那行只留歌单本身。
      */}
      <PageToolbar>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={global.i18n.t('play_all')}
          onPress={() => {
            /**
             * 先确保这份列表已经进缓存，再开播。
             *
             * playList 内部用 getListMusicSync 读缓存；如果用户还没进过
             * 「我的列表」的歌曲区，缓存里可能还没有这份列表，直接播会
             * 取到空列表。getListMusics 会按需从存储读入并写回缓存。
             */
            void getListMusics(activeListId).then(list => {
              if (!list.length) {
                toast(global.i18n.t('no_item'))
                return
              }
              void playList(activeListId, 0)
            })
          }}
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
        <View style={{ ...styles.searchCard, ...createContentSurface(theme, { radius: Radius.control }) }}>
          <Icon name="search-2" size={15} color={theme['c-font-label']} />
          <Input
            value={keyword}
            onChangeText={handleChangeKeyword}
            onClearText={() => { handleChangeKeyword('') }}
            clearBtn
            placeholder={global.i18n.t('search_input_placeholder')}
            returnKeyType="search"
            enterKeyHint="search"
            autoCorrect={false}
            spellCheck={false}
            style={styles.searchInput}
            size={13}
          />
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
  playAllButton: { minHeight: 40, paddingHorizontal: 12, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 6, flexShrink: 0 },
  searchCard: { flex: 1, minWidth: 0, height: 40, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  searchInput: { height: 36, paddingLeft: 0, fontSize: 13 },
  createButton: { minHeight: 40, paddingHorizontal: 13, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 6, flexShrink: 0 },
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

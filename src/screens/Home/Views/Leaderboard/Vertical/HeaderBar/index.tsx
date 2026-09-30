import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { ScrollView, View, TouchableOpacity } from 'react-native'

// import { useGetter, useDispatch } from '@/store'
// import Tag from './Tag'
// import OpenList from './OpenList'
import { createStyle } from '@/utils/tools'
import SourceSelector, {
  type SourceSelectorType,
} from './SourceSelector'
import { useTheme } from '@/store/theme/hook'
import DorpDownMenu from '@/components/common/DorpDownMenu'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { type BoardItem } from '@/store/leaderboard/state'
import { Gap, PageMetrics, Radius, createContentSurface } from '@/theme/layout'

export interface HeaderBarProps {
  onSourceChange: (source: LX.OnlineSource) => void
  onBoardChange: (id: string) => void
  onPlayAll: () => void
}

export interface HeaderBarType {
  setBoards: (source: LX.OnlineSource, list: BoardItem[], activeId: string) => void
}


export default forwardRef<HeaderBarType, HeaderBarProps>(({ onSourceChange, onBoardChange, onPlayAll }, ref) => {
  const sourceSelectorRef = useRef<SourceSelectorType>(null)
  const theme = useTheme()
  const [boards, setBoards] = useState<BoardItem[]>([])
  const [activeId, setActiveId] = useState('')
  const menus = useMemo(() => boards.map(board => ({ action: board.id, label: board.name })), [boards])
  const activeBoard = useMemo(() => boards.find(board => board.id == activeId), [activeId, boards])

  useImperativeHandle(ref, () => ({
    setBoards(source, list, id) {
      sourceSelectorRef.current?.setSource(source)
      setBoards(list)
      setActiveId(id)
    },
  }), [])

  const handleBoardChange = ({ action }: typeof menus[number]) => {
    if (action == activeId) return
    setActiveId(action)
    onBoardChange(action)
  }


  return (
    /**
     * 与歌单页顶栏同理：这里是三个控件（音源 / 榜单 / 播放全部）。
     * 榜单名长度由数据决定，长榜单名（如「KTV 男生必点」）加上固定的 116pt
     * 宽度会被截断，而播放全部一旦被顶出去就点不到了。
     * 整条改为横向滚动，三者按顺序紧挨着排，窄屏下可横向滚动。
     */
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      style={styles.toolbar}
      contentContainerStyle={styles.toolbarContent}
    >
      <View style={{ ...styles.source, ...createContentSurface(theme, { radius: Radius.control }) }}>
        <SourceSelector ref={sourceSelectorRef} onSourceChange={onSourceChange} />
      </View>
      <DorpDownMenu
        menus={menus}
        onPress={handleBoardChange}
        activeId={activeId}
        height={PageMetrics.controlHeight}
        btnStyle={{ ...styles.boardSelector, ...createContentSurface(theme, { radius: Radius.control }) }}
      >
        <View style={styles.boardSelectorContent}>
          <Text style={styles.boardSelectorText} numberOfLines={1} color={theme['c-font']}>
            {activeBoard?.name ?? ''}
          </Text>
          <Icon name="chevron-right" size={12} color={theme['c-font-label']} />
        </View>
      </DorpDownMenu>
      <TouchableOpacity accessibilityRole="button" onPress={onPlayAll} style={{ ...styles.playAllButton, backgroundColor: theme['c-primary-dark-500'] }}>
        <Icon name="play" size={15} color={theme['c-on-solid']} />
        <Text size={12} color={theme['c-on-solid']}>{global.i18n.t('play_all')}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
})

const styles = createStyle({
  toolbar: {
    flexGrow: 0,
    flexShrink: 0,
    height: PageMetrics.toolbarHeight,
    marginTop: PageMetrics.toolbarMargin,
    marginBottom: PageMetrics.toolbarMargin,
    zIndex: 2,
  },
  toolbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Gap.inline,
    paddingHorizontal: PageMetrics.gutter,
  },
  source: { height: PageMetrics.controlHeight, flexGrow: 0, flexShrink: 0, borderRadius: Radius.control },
  boardSelector: { minWidth: 116, maxWidth: 220, flexShrink: 0, height: PageMetrics.controlHeight, borderRadius: Radius.control, justifyContent: 'flex-start' },
  boardSelectorContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 10 },
  boardSelectorText: { textAlign: 'left', textAlignVertical: 'center', paddingRight: 6 },
  playAllButton: { minHeight: PageMetrics.controlHeight, paddingHorizontal: 10, borderRadius: Radius.pill, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'flex-start' },
})

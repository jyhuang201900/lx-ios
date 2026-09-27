import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { View, TouchableOpacity } from 'react-native'

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
import { PageMetrics, Radius } from '@/theme/layout'
import PageToolbar from '@/components/common/PageToolbar'

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
    <PageToolbar>
      <View style={{ ...styles.source, backgroundColor: theme['c-primary-input-background'] }}>
        <SourceSelector ref={sourceSelectorRef} style={styles.source} onSourceChange={onSourceChange} />
      </View>
      <DorpDownMenu
        menus={menus}
        onPress={handleBoardChange}
        activeId={activeId}
        height={PageMetrics.controlHeight}
        btnStyle={{ ...styles.boardSelector, backgroundColor: theme['c-primary-input-background'] }}
      >
        <View style={styles.boardSelectorContent}>
          <Text style={styles.boardSelectorText} numberOfLines={1} color={theme['c-font']}>
            {activeBoard?.name ?? ''}
          </Text>
          <Icon name="chevron-right" size={12} color={theme['c-font-label']} />
        </View>
      </DorpDownMenu>
      <TouchableOpacity accessibilityRole="button" onPress={onPlayAll} style={{ ...styles.playAllButton, backgroundColor: theme['c-primary'] }}>
        <Icon name="play" size={15} color={theme['c-primary-button-font']} />
        <Text size={12} color={theme['c-primary-button-font']}>{global.i18n.t('play_all')}</Text>
      </TouchableOpacity>
    </PageToolbar>
  )
})

const styles = createStyle({
  source: { height: PageMetrics.controlHeight, flexGrow: 0, flexShrink: 0, borderRadius: Radius.control },
  boardSelector: { width: 116, flexShrink: 1, height: PageMetrics.controlHeight, borderRadius: Radius.control, justifyContent: 'flex-start' },
  boardSelectorContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 10 },
  boardSelectorText: { flex: 1, textAlign: 'left', textAlignVertical: 'center', paddingRight: 6 },
  playAllButton: { minHeight: PageMetrics.controlHeight, paddingHorizontal: 10, borderRadius: Radius.pill, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'flex-start' },
})

import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { View, TouchableOpacity } from 'react-native'

// import { useGetter, useDispatch } from '@/store'
// import Tag from './Tag'
// import OpenList from './OpenList'
import { createStyle } from '@/utils/tools'
// import { BorderWidths } from '@/theme'
import SourceSelector, {
  type SourceSelectorType,
} from './SourceSelector'
import { useTheme } from '@/store/theme/hook'
// import { BorderWidths } from '@/theme'
import { BorderRadius, BorderWidths } from '@/theme'
import DorpDownMenu from '@/components/common/DorpDownMenu'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { type BoardItem } from '@/store/leaderboard/state'

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
    <View style={{ ...styles.currentList, backgroundColor: theme['c-primary-input-background'], borderColor: theme['c-border-background'] }}>
      <View style={styles.segment}><SourceSelector ref={sourceSelectorRef} style={styles.sourceSelector} onSourceChange={onSourceChange} /></View>
      <DorpDownMenu
        menus={menus}
        onPress={handleBoardChange}
        activeId={activeId}
        center
        height={48}
        btnStyle={styles.boardSelector}
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
    </View>
  )
})

const styles = createStyle({
  currentList: {
    flexDirection: 'row',
    height: 52,
    zIndex: 2,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 9,
    borderWidth: BorderWidths.normal,
    borderRadius: BorderRadius.normal + 8,
  },
  segment: { flex: 1, minWidth: 0, borderRightWidth: BorderWidths.normal, borderRightColor: 'rgba(128,128,128,0.28)' },
  sourceSelector: { flex: 1 },
  boardSelector: { flex: 1, height: '100%', marginHorizontal: 4, borderRadius: 15 },
  boardSelectorContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 },
  boardSelectorText: { flex: 1, textAlign: 'center', textAlignVertical: 'center', paddingRight: 6 },
  playAllButton: { flex: 1, minWidth: 0, margin: 4, borderRadius: 15, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
})

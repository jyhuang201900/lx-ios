import { forwardRef, useImperativeHandle, useState } from 'react'
import { FlatList, type FlatListProps, View } from 'react-native'

import { createStyle } from '@/utils/tools'
import { type Position } from './ListMenu'
import ListItem, { type ListItemProps } from './ListItem'
import { type BoardItem } from '@/store/leaderboard/state'

export interface ListProps {
  onBoundChange: (listId: string) => void
  onShowMenu: (info: { listId: string, name: string, index: number }, position: Position) => void
}
export interface ListType {
  setList: (list: BoardItem[], activeId: string) => void
  hideMenu: () => void
}

type BoardListType = FlatListProps<BoardItem>

export default forwardRef<ListType, ListProps>(({ onBoundChange, onShowMenu }, ref) => {
  const [activeId, setActiveId] = useState('')
  const [longPressIndex, setLongPressIndex] = useState(-1)
  const [list, setList] = useState<BoardItem[]>([])

  useImperativeHandle(ref, () => ({
    setList(list, activeId) {
      setList(list)
      setActiveId(activeId)
    },
    hideMenu() {
      setLongPressIndex(-1)
    },
  }), [])

  const handleBoundChange = (item: BoardItem) => {
    setActiveId(item.id)
    onBoundChange(item.id)
  }

  const handleShowMenu: ListItemProps['onShowMenu'] = (listId, name, index, position) => {
    setLongPressIndex(index)
    onShowMenu({ listId, name, index }, position)
  }

  const renderItem: BoardListType['renderItem'] = ({ item, index }) => (
    <ListItem
      item={item}
      index={index}
      longPressIndex={longPressIndex}
      activeId={activeId}
      onShowMenu={handleShowMenu}
      onBoundChange={handleBoundChange}
    />
  )

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="always"
        data={list}
        renderItem={renderItem}
        keyExtractor={item => item.id}
      />
    </View>
  )
})

const styles = createStyle({
  container: { flexGrow: 0, flexShrink: 0 },
  content: { paddingHorizontal: 10, paddingBottom: 8 },
})

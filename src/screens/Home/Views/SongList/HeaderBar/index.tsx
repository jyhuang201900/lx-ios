import { forwardRef, useImperativeHandle, useRef } from 'react'
import { View } from 'react-native'

// import { useGetter, useDispatch } from '@/store'
import SortTab, { type SortTabProps, type SortTabType } from './SortTab'
// import Tag from './Tag'
// import OpenList from './OpenList'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { BorderWidths } from '@/theme'
// import { BorderWidths } from '@/theme'
import SourceSelector, {
  type SourceSelectorType,
  type SourceSelectorProps,
} from './SourceSelector'
import { type Source } from '@/store/songlist/state'
// import { useTheme } from '@/store/theme/hook'
import Tag, { type TagType, type TagProps } from './Tag'
import OpenList, { type OpenListType } from './OpenList'
// import { BorderWidths } from '@/theme'

export interface HeaderBarProps {
  onSortChange: SortTabProps['onSortChange']
  onTagChange: TagProps['onTagChange']
  onSourceChange: SourceSelectorProps['onSourceChange']
}

export interface HeaderBarType {
  setSource: (source: Source, sortId: string, tagName: string, tagId: string) => void
}


export default forwardRef<HeaderBarType, HeaderBarProps>(({ onSortChange, onTagChange, onSourceChange }, ref) => {
  const sortTabRef = useRef<SortTabType>(null)
  const tagRef = useRef<TagType>(null)
  const openListRef = useRef<OpenListType>(null)
  const sourceSelectorRef = useRef<SourceSelectorType>(null)
  const theme = useTheme()

  useImperativeHandle(ref, () => ({
    setSource(source, sortId, tagName, tagId) {
      sortTabRef.current?.setSource(source, sortId)
      tagRef.current?.setSelectedTagInfo(source, tagName, tagId)
      sourceSelectorRef.current?.setSource(source)
      openListRef.current?.setInfo(source)
    },
  }), [])


  return (
    <View style={{ ...styles.searchBar, backgroundColor: theme['c-primary-input-background'], borderBottomColor: theme['c-border-background'] }}>
      <SortTab ref={sortTabRef} onSortChange={onSortChange} />
      <Tag ref={tagRef} onTagChange={onTagChange} />
      <OpenList ref={openListRef} />
      <SourceSelector ref={sourceSelectorRef} onSourceChange={onSourceChange} />
    </View>
  )
})

const styles = createStyle({
  searchBar: {
    flexDirection: 'row',
    height: 50,
    zIndex: 2,
    borderBottomWidth: BorderWidths.normal,
    paddingLeft: 8,
  },
  selector: {
    width: 86,
  },
})

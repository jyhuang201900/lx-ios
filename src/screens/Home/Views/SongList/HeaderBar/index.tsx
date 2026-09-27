import { forwardRef, useImperativeHandle, useRef } from 'react'
import { View } from 'react-native'

// import { useGetter, useDispatch } from '@/store'
import SortTab, { type SortTabProps, type SortTabType } from './SortTab'
import { createStyle } from '@/utils/tools'
import SourceSelector, {
  type SourceSelectorType,
  type SourceSelectorProps,
} from './SourceSelector'
import { type Source } from '@/store/songlist/state'
import Tag, { type TagType, type TagProps } from './Tag'
import OpenList, { type OpenListType } from './OpenList'
import { PageMetrics } from '@/theme/layout'

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

  useImperativeHandle(ref, () => ({
    setSource(source, sortId, tagName, tagId) {
      sortTabRef.current?.setSource(source, sortId)
      tagRef.current?.setSelectedTagInfo(source, tagName, tagId)
      sourceSelectorRef.current?.setSource(source)
      openListRef.current?.setInfo(source)
    },
  }), [])


  return (
    <View style={styles.searchBar}>
      <View style={styles.source}>
        <SourceSelector ref={sourceSelectorRef} onSourceChange={onSourceChange} />
      </View>
      <SortTab ref={sortTabRef} onSortChange={onSortChange} />
      <Tag ref={tagRef} onTagChange={onTagChange} />
      <OpenList ref={openListRef} />
    </View>
  )
})

const styles = createStyle({
  searchBar: {
    flexDirection: 'row',
    height: PageMetrics.toolbarHeight,
    zIndex: 2,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: PageMetrics.gutter,
    marginTop: PageMetrics.toolbarMargin,
    marginBottom: PageMetrics.toolbarMargin,
  },
  source: {
    height: PageMetrics.controlHeight,
    flexShrink: 0,
  },
})

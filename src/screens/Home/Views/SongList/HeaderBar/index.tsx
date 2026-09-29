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
import { PageMetrics, Radius, createContentSurface } from '@/theme/layout'
import PageToolbar from '@/components/common/PageToolbar'
import { useTheme } from '@/store/theme/hook'

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
    <PageToolbar>
      <View style={{ ...styles.source, ...createContentSurface(theme, { radius: Radius.control }) }}>
        <SourceSelector ref={sourceSelectorRef} onSourceChange={onSourceChange} />
      </View>
      <SortTab ref={sortTabRef} onSortChange={onSortChange} />
      <Tag ref={tagRef} onTagChange={onTagChange} />
      <OpenList ref={openListRef} />
    </PageToolbar>
  )
})

const styles = createStyle({
  source: {
    height: PageMetrics.controlHeight,
    /**
     * 这里原本只有 height + flexShrink: 0，没有任何宽度下限。
     * 内层 DorpDownMenu 的按钮是 flex: 1（flexBasis 0%），在无宽度约束的
     * 父容器里会塌缩到 0 宽，文字也就跟着没有宽度——真机上表现为
     * 顶栏最左侧渲染成一个空白色块，而不是音源名。
     * 搜索页 / 排行榜的同一控件都带 minWidth，这里补齐到同一档。
     */
    minWidth: 64,
    flexShrink: 0,
    // 圆角与描边由 createContentSurface 统一给出
  },
})

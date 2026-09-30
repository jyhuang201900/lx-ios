import { forwardRef, useImperativeHandle, useRef } from 'react'
import { ScrollView, View } from 'react-native'

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
import { Gap, PageMetrics, Radius, ToolbarMetrics, createContentSurface } from '@/theme/layout'
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
    /**
     * 这一行原本是 PageToolbar（不可滚动的 flex row）。
     *
     * 它要装四个控件：音源、排序、标签、打开。以 390pt 宽的机型为例，
     * 音源约 90pt、标签约 98pt、打开约 63pt，加上内边距和间隔已经吃掉约 295pt，
     * 只剩 95pt 给排序。而酷狗自己有五个排序项（推荐 / 最热 / 最新 / 热藏 / 飙升），
     * 需要约 240pt——放不下。
     *
     * 两个选择都不对：让排序条 flexGrow: 1 填满剩余空间，排序按钮挤在左边、
     * 「标签 / 打开」被推到最右，中间空出一大片（用户反馈的就是这个）；
     * 让排序条按内容撑开，则「打开」会被顶出屏幕。
     *
     * 所以整条顶栏改为横向滚动：控件按真实顺序从左到右紧挨着排，
     * 窄屏放不下时可以横向滚动，任何一个都不会被裁掉或推走。
     * 纵向上的高度、间距、内边距与 PageToolbar 保持一致。
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
      <SortTab ref={sortTabRef} onSortChange={onSortChange} />
      <Tag ref={tagRef} onTagChange={onTagChange} />
      <OpenList ref={openListRef} />
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
  source: {
    /**
     * 音源名与同一行的排序 / 标签 / 打开按钮对齐到同一个四字基准宽度。
     * 之前用 minWidth: 64，文字由内容撑开，和旁边的固定宽度控件凑在一起
     * 就参差不齐；同时 flexGrow: 0 让它在横向滚动容器里保持自然宽度。
     */
    width: ToolbarMetrics.chipWidth,
    height: PageMetrics.controlHeight,
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: 'center',
    // 圆角与描边由 createContentSurface 统一给出
  },
})

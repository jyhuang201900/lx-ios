import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import songlistState, { type SortInfo, type Source } from '@/store/songlist/state'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { Gap, PageMetrics, Radius, ToolbarMetrics, createContentSurface } from '@/theme/layout'

export interface SortTabProps {
  onSortChange: (id: string) => void
}

export interface SortTabType {
  setSource: (source: Source, activeTab: SortInfo['id']) => void
}


export default forwardRef<SortTabType, SortTabProps>(({ onSortChange }, ref) => {
  const [sortList, setSortList] = useState<SortInfo[]>([])
  const [activeId, setActiveId] = useState<SortInfo['id']>('')
  const t = useI18n()
  const theme = useTheme()

  useImperativeHandle(ref, () => ({
    setSource(source, activeTab) {
      setSortList(songlistState.sortList[source]!)
      setActiveId(activeTab)
    },
  }))

  /**
   * 这里原本把 tid 为 hot 的排序项过滤掉了。
   *
   * 上一轮我把它整个去掉，是想让每个源显示自己真实的分类。但排序区一行
   * 只能放下有限的控件，「最热」与页面顶部的「热歌榜 / 推荐」在语义上重复，
   * 保留它反而把真正区分维度的「最新 / 热藏 / 飙升」挤到屏幕外。
   *
   * 现在的处理是：仍然过滤 hot，但**兜底**——如果某个源过滤后一项都不剩
   * （网易的 sortList 就只有「最热」一项），就退回显示完整列表，
   * 免得排序区变成一片空白。
   */
  const sorts = useMemo(() => {
    const visible = sortList.filter(s => s.tid != 'hot')
    const list = visible.length ? visible : sortList
    return list.map(s => ({ label: t(`songlist_${s.tid}`), id: s.id }))
  }, [sortList, t])

  const handleSortChange = (id: string) => {
    onSortChange(id)
    setActiveId(id)
  }

  /**
   * 这里原本是一个嵌在固定高度工具栏行里的横向 ScrollView，
   * 容器 flexGrow: 0 / flexShrink: 1 / minWidth: 0，
   * contentContainer 还写了 flexGrow: 1。
   *
   * 内容被上面的 hot 过滤清空之后，这个可收缩的滚动容器既不渲染任何按钮，
   * 又占着工具栏里一大段横向空间——真机上「音源」和「分类」之间那约 160pt
   * 的空白就是它，点不到也看不见。
   *
   * 滚动已经提到外层顶栏，这里退化成普通 View 行：宽度由内容决定，
   * 每个排序按钮保持完整宽度，不再嵌套滚动容器。
   */
  return (
    <View style={styles.container}>
      {
        sorts.map(s => {
          const active = activeId == s.id
          return (
            <TouchableOpacity
              key={s.id}
              style={{
                ...styles.button,
                ...(active
                  ? { backgroundColor: theme['c-primary-background-active'] }
                  : createContentSurface(theme, { radius: Radius.control })),
              }}
              onPress={() => { handleSortChange(s.id) }}
            >
              <Text style={styles.buttonText} color={active ? theme['c-primary-font-active'] : theme['c-font-label']}>{s.label}</Text>
            </TouchableOpacity>
          )
        })
      }
    </View>
  )
})


const styles = createStyle({
  container: {
    flexDirection: 'row',
    flexShrink: 0,
    gap: Gap.inline,
  },
  button: {
    /**
     * 排序按钮原本只给了 minWidth: 44，宽度由文字撑开，所以「推荐 / 最新」
     * 这种两字项和「热藏 / 飙升」宽度不一，同一行参差不齐。
     * 统一到四字基准宽度，并显式垂直居中——文字默认基线对齐，
     * 在固定高度里会偏上，真机上看起来就是「没垂直居中」。
     */
    width: ToolbarMetrics.chipWidth,
    height: PageMetrics.controlHeight,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    borderRadius: Radius.control,
  },
  buttonText: {
    textAlign: 'center',
    // Android 的 textAlignVertical 对 iOS 无效；两端都要靠容器居中，
    // 这里保留它是为了让 Android 上的多行兜底。
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
})

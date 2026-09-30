import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import songlistState, { type SortInfo, type Source } from '@/store/songlist/state'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { Gap, Radius, createContentSurface } from '@/theme/layout'

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
   * 后果是每个源被砍到只剩一项甚至零项：酷我 / 百度 / 企鹅只剩「最新」，
   * 咪咕只剩「推荐」，网易的 sortList 只有「最热」一项，过滤后直接是空的，
   * 整个排序区什么都不显示。排序项是数据源真实提供的分类，不该由界面猜。
   */
  const sorts = useMemo(() => {
    return sortList
      .map(s => ({ label: t(`songlist_${s.tid}`), id: s.id }))
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
    height: 40,
    minWidth: 44,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: Radius.control,
  },
  buttonText: {
    textAlign: 'center',
    textAlignVertical: 'center',
  },
})

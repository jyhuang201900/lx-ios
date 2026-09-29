import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { ScrollView, TouchableOpacity } from 'react-native'
import songlistState, { type SortInfo, type Source } from '@/store/songlist/state'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { Radius, createContentSurface } from '@/theme/layout'

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
  const scrollViewRef = useRef<ScrollView>(null)

  useImperativeHandle(ref, () => ({
    setSource(source, activeTab) {
      scrollViewRef.current?.scrollTo({ x: 0 })
      setSortList(songlistState.sortList[source]!)
      setActiveId(activeTab)
    },
  }))

  const sorts = useMemo(() => {
    return sortList
      .filter(s => s.tid != 'hot')
      .map(s => ({ label: t(`songlist_${s.tid}`), id: s.id }))
  }, [sortList, t])

  const handleSortChange = (id: string) => {
    onSortChange(id)
    setActiveId(id)
  }

  return (
    <ScrollView ref={scrollViewRef} style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps={'always'} horizontal>
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
    </ScrollView>
  )
})


const styles = createStyle({
  container: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  button: {
    height: 40,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    borderRadius: Radius.control,
  },
  buttonText: {
    textAlign: 'left',
    textAlignVertical: 'center',
  },
})

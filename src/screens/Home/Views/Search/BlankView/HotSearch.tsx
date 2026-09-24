import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { type Source, type InitState } from '@/store/hotSearch/state'
import Button from '@/components/common/Button'
import { getList } from '@/core/hotSearch'
import Text from '@/components/common/Text'
import Loading from '@/components/common/Loading'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { Radius } from '@/theme/layout'


interface ListProps {
  onSearch: (keyword: string) => void
}
export interface HotSearchType {
  show: (source: Source) => void
}


export type List = NonNullable<InitState['sourceList'][keyof InitState['sourceList']]>

const ListItem = ({ keyword, onSearch }: {
  keyword: string
  onSearch: (keyword: string) => void
}) => {
  const theme = useTheme()
  return (
    <Button style={{ ...styles.button, backgroundColor: theme['c-primary-input-background'] }} onPress={() => { onSearch(keyword) }}>
      <Text style={styles.buttonText} color={theme['c-button-font']} size={13}>{keyword}</Text>
    </Button>
  )
}

export default forwardRef<HotSearchType, ListProps>((props, ref) => {
  // const [listType, setListType] = useState<SearchState['searchType']>('music')
  // const listRef = useRef<MusicListType>(null)
  const [list, setList] = useState<List>([])
  const [loading, setLoading] = useState(false)
  const t = useI18n()
  // const theme = useTheme()

  const isUnmountedRef = useRef(false)
  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])

  useImperativeHandle(ref, () => ({
    show(source) {
      setLoading(true)
      void getList(source).then((list) => {
        if (isUnmountedRef.current) return
        setList(list)
        setLoading(false)
      }).catch(() => {
        if (isUnmountedRef.current) return
        setLoading(false)
      })
    },
  }), [])

  return (
    list.length
      ? (
          <ScrollView>
            <Text style={styles.title} size={16}>{t('search_hot_search')}</Text>
            <View style={styles.list}>
              {
                list.map(keyword => <ListItem keyword={keyword} key={keyword} onSearch={props.onSearch} />)
              }
            </View>
          </ScrollView>
        )
      : loading
        ? (
            <View style={styles.loading}>
              <Loading size={16} label={t('list_loading')} />
            </View>
          )
        : null
  )
})


const styles = createStyle({
  loading: {
    paddingTop: 20,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    paddingTop: 20,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  button: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    marginRight: 8,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { textAlign: 'center', textAlignVertical: 'center' },
})

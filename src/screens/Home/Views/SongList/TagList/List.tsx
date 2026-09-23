import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { View, ScrollView, TouchableOpacity } from 'react-native'

import { createStyle } from '@/utils/tools'
import TagGroup, { type TagGroupProps } from './TagGroup'
import { useI18n } from '@/lang'
import { type TagInfo, type Source } from '@/store/songlist/state'
import { getTags } from '@/core/songlist'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
// import { BorderWidths } from '@/theme'

export interface ListProps {
  onTagChange: TagGroupProps['onTagChange']
}

export interface ListType {
  loadTag: (source: Source, activeId: string) => void
}

export default forwardRef<ListType, ListProps>(({ onTagChange }, ref) => {
  // const theme = useTheme()
  const theme = useTheme()
  const [activeId, setActiveId] = useState('')
  const [list, setList] = useState<TagInfo['tags']>([])
  const [failedSource, setFailedSource] = useState<Source | null>(null)
  const t = useI18n()
  const prevSource = useRef('')
  const requestIdRef = useRef(0)

  const isUnmountedRef = useRef(false)
  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])

  const loadTags = (source: Source) => {
    setFailedSource(null)
    setList([{ name: '', list: [{ name: t('songlist_tag_default'), id: '', parent_id: '', parent_name: '', source }] }])
    const requestId = ++requestIdRef.current
    void getTags(source).then(tagInfo => {
      if (isUnmountedRef.current || requestId != requestIdRef.current) return
      prevSource.current = source
      setList([
        { name: '', list: [{ name: t('songlist_tag_default'), id: '', parent_id: '', parent_name: '', source }] },
        { name: t('songlist_tag_hot'), list: [...tagInfo.hotTag] },
        ...tagInfo.tags,
      ].filter(t => t.list.length))
    }).catch(() => {
      if (isUnmountedRef.current || requestId != requestIdRef.current) return
      setFailedSource(source)
    })
  }

  useImperativeHandle(ref, () => ({
    loadTag(source, id) {
      if (id != activeId) setActiveId(id)
      if (source != prevSource.current) {
        loadTags(source)
      }
    },
  }))


  return (
    <ScrollView style={{ flexShrink: 1, flexGrow: 0 }} keyboardShouldPersistTaps={'always'}>
      <View style={styles.tagContainer} onStartShouldSetResponder={() => true}>
        {
          list.map((type, index) => (
            <TagGroup
              key={index}
              name={type.name}
              list={type.list}
              activeId={activeId}
              onTagChange={onTagChange}
            />
          ))
        }
        {
          list.length == 1
            ? (
                <View style={styles.blankView}>
                  {
                    failedSource
                      ? (
                          <>
                            <Text size={13} color={theme['c-font-label']}>{t('list_error')}</Text>
                            <TouchableOpacity
                              accessibilityRole="button"
                              accessibilityLabel={t('retry_button_text')}
                              style={{ ...styles.retryBtn, borderColor: theme['c-border-background'] }}
                              onPress={() => { loadTags(failedSource) }}
                            >
                              <Text size={12} color={theme['c-font-label']}>{t('retry_button_text')}</Text>
                            </TouchableOpacity>
                          </>
                        )
                      : <Text>{t('list_loading')}</Text>
                  }
                </View>
              )
            : null
        }
      </View>
    </ScrollView>
  )
})


const styles = createStyle({
  tagContainer: {
    paddingTop: 8,
    paddingHorizontal: 14,
    paddingBottom: 18,
  },
  blankView: {
    paddingTop: '15%',
    paddingBottom: '15%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  retryBtn: {
    minHeight: 34,
    paddingHorizontal: 18,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

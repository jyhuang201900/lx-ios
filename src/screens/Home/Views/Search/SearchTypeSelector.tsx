import { useEffect, useMemo, useState } from 'react'
import { View, TouchableOpacity } from 'react-native'

import { createStyle } from '@/utils/tools'
import { type SearchType } from '@/store/search/state'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { getSearchSetting } from '@/utils/data'

const SEARCH_TYPE_LIST = [
  'music',
  'songlist',
] as const

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const [type, setType] = useState<SearchType>('music')

  useEffect(() => {
    void getSearchSetting().then(info => {
      setType(info.type)
    })
  }, [])

  const list = useMemo(() => {
    return SEARCH_TYPE_LIST.map(type => ({ label: t(`search_type_${type}`), id: type }))
  }, [t])

  const handleTypeChange = (type: SearchType) => {
    setType(type)
    global.app_event.searchTypeChanged(type)
  }

  return (
    <View style={{ ...styles.container, backgroundColor: theme['c-primary-input-background'] }}>
      {
        list.map(t => (
          <TouchableOpacity
            style={{ ...styles.button, backgroundColor: type == t.id ? theme['c-button-background-selected'] : 'transparent' }}
            onPress={() => { handleTypeChange(t.id) }}
            key={t.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: type == t.id }}
          >
            <Text style={styles.buttonText} color={type == t.id ? theme['c-button-font-selected'] : theme['c-font-label']}>{t.label}</Text>
          </TouchableOpacity>
        ))
      }
    </View>
  )
}

const styles = createStyle({
  container: {
    height: 34,
    flexGrow: 0,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: 12,
  },
  button: {
    height: '100%',
    minWidth: 52,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 9,
    borderRadius: 9,
  },
  buttonText: {
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingHorizontal: 2,
  },
})

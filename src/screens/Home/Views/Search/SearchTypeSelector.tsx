import { useEffect, useState } from 'react'
import { View, TouchableOpacity } from 'react-native'

import { createStyle } from '@/utils/tools'
import { type SearchType } from '@/store/search/state'
import { useI18n } from '@/lang'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { getSearchSetting } from '@/utils/data'
import { Radius } from '@/theme/layout'
import { hapticFeedback } from '@/utils/nativeModules/utils'

const SEARCH_TYPE_LIST = [
  { id: 'music', icon: 'play-outline', label: 'search_type_music' },
  { id: 'songlist', icon: 'album', label: 'search_type_songlist' },
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

  const handleTypeChange = (nextType: SearchType) => {
    if (nextType == type) return
    hapticFeedback('light')
    setType(nextType)
    global.app_event.searchTypeChanged(nextType)
  }

  return (
    <View style={{ ...styles.container, backgroundColor: theme['c-primary-input-background'] }}>
      {
        SEARCH_TYPE_LIST.map(item => (
          <TouchableOpacity
            style={{ ...styles.button, backgroundColor: type == item.id ? theme['c-button-background-selected'] : 'transparent' }}
            onPress={() => { handleTypeChange(item.id) }}
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={t(item.label)}
            accessibilityState={{ selected: type == item.id }}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          >
            <Icon
              name={item.icon}
              size={17}
              color={type == item.id ? theme['c-button-font-selected'] : theme['c-font-label']}
            />
          </TouchableOpacity>
        ))
      }
    </View>
  )
}

const styles = createStyle({
  container: {
    height: 38,
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: Radius.pill,
  },
  button: {
    width: 36,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.pill,
  },
})

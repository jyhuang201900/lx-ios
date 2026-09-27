import { memo, useCallback, useState } from 'react'
import { View, TouchableOpacity, ScrollView } from 'react-native'

import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { SETTING_SCREENS, type SettingScreenIds } from '../Main'
import { useI18n } from '@/lang'
import { Radius } from '@/theme/layout'


const ListItem = memo(({ id, activeId, onPress }: {
  onPress: (item: SettingScreenIds) => void
  activeId: string
  id: SettingScreenIds
}) => {
  const theme = useTheme()
  const t = useI18n()

  const active = activeId == id

  const handlePress = () => {
    onPress(id)
  }

  return (
    <View style={{ ...styles.listItem, backgroundColor: active ? theme['c-primary-background-active'] : 'transparent' }}>
      <TouchableOpacity accessibilityRole="button" style={styles.listName} activeOpacity={0.65} onPress={handlePress}>
        <Text style={styles.listNameText} numberOfLines={1} color={active ? theme['c-primary-font'] : theme['c-font']}>{t(`setting_${id}`)}</Text>
      </TouchableOpacity>
    </View>
  )
}, (prevProps, nextProps) => {
  return prevProps.id == nextProps.id &&
    prevProps.activeId == nextProps.activeId &&
    prevProps.onPress == nextProps.onPress
})


export default ({ onChangeId }: {
  onChangeId: (id: SettingScreenIds) => void
}) => {
  const [activeId, setActiveId] = useState(global.lx.settingActiveId)

  const handleChangeId = useCallback((id: SettingScreenIds) => {
    onChangeId(id)
    setActiveId(id)
    global.lx.settingActiveId = id
  }, [onChangeId])

  return (
    <ScrollView horizontal style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps={'always'}>
      {
        SETTING_SCREENS.map(id => <ListItem key={id} id={id} activeId={activeId} onPress={handleChangeId} />)
      }
    </ScrollView>
  )
}


const styles = createStyle({
  container: {
    flex: 1,
    height: '100%',
    flexGrow: 0,
    flexShrink: 0,
  },
  contentContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },
  listItem: {
    height: '100%',
    paddingHorizontal: 10,
    borderRadius: Radius.control,
  },
  listName: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    flex: 1,
  },
  listNameText: { width: '100%', textAlign: 'left', textAlignVertical: 'center' },
})

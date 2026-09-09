import { memo, useCallback, useState } from 'react'
import { View, TouchableOpacity, ScrollView } from 'react-native'

import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { SETTING_SCREENS, type SettingScreenIds } from '../Main'
import { useI18n } from '@/lang'
import { BorderRadius, BorderWidths } from '@/theme'


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
        <Text numberOfLines={1} color={active ? theme['c-primary-font'] : theme['c-font']}>{t(`setting_${id}`)}</Text>
      </TouchableOpacity>
    </View>
  )
}, (prevProps, nextProps) => {
  return !!(prevProps.id === nextProps.id &&
    prevProps.activeId != nextProps.id &&
    nextProps.activeId != nextProps.id
  )
})


export default ({ onChangeId }: {
  onChangeId: (id: SettingScreenIds) => void
}) => {
  const [activeId, setActiveId] = useState(global.lx.settingActiveId)
  const theme = useTheme()

  const handleChangeId = useCallback((id: SettingScreenIds) => {
    onChangeId(id)
    setActiveId(id)
    global.lx.settingActiveId = id
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ScrollView horizontal style={{ ...styles.container, borderBottomColor: theme['c-border-background'] }} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps={'always'}>
      {
        SETTING_SCREENS.map(id => <ListItem key={id} id={id} activeId={activeId} onPress={handleChangeId} />)
      }
    </ScrollView>
  )
}


const styles = createStyle({
  container: {
    height: 56,
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: BorderWidths.normal,
    opacity: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingHorizontal: 10,
    paddingVertical: 8,
    // backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  // listContainer: {
  //   // borderBottomWidth: BorderWidths.normal2,
  // },

  listItem: {
    // width: '33.33%',
    height: 39,
    paddingHorizontal: 14,
    // height: 'auto',
    // flexDirection: 'row',
    // alignItems: 'center',
    paddingHorizontal: 5,
    // paddingVertical: 10,
    borderRadius: BorderRadius.normal + 5,
    marginBottom: 5,
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
  listName: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    // paddingLeft: 5,
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
})

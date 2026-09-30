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
  /**
   * 这里原本同时写了 flex: 1 和 flexGrow: 0 / flexShrink: 0。
   *
   * Yoga 的 resolveFlexBasisPtr 只看 flex 简写：只要 flex 大于 0，
   * flexBasis 就取 0（非 web 默认时），flexGrow / flexShrink 不会覆盖它。
   * 所以 flex: 1 后面跟 flexGrow: 0，得到的是 basis 0 + 不增长，
   * 宽度恒为 0——十个导航项一个都画不出来。真机上设置页顶部那 131pt
   * 空白（状态栏 59 + 空工具栏 68）就是它。
   *
   * 改回 flexGrow: 1 让 ScrollView 占满工具栏宽度，内容超出时自己横向滚动。
   * height: '100%' 保留，让选中胶囊填满工具栏高度。
   */
  container: {
    height: '100%',
    flexGrow: 1,
    flexShrink: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
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

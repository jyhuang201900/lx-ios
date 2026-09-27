import { TouchableOpacity, View } from 'react-native'
import { useNavActiveId, useStatusbarHeight } from '@/store/common/hook'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import StatusBar from '@/components/common/StatusBar'
import { scaleSizeH } from '@/utils/pixelRatio'
import { useTheme } from '@/store/theme/hook'
import { FontWeight, PageMetrics, Radius, Typography } from '@/theme/layout'
import { hapticFeedback } from '@/utils/nativeModules/utils'

const HEADER_HEIGHT = scaleSizeH(48)

export default () => {
  const theme = useTheme()
  const activeId = useNavActiveId()
  const statusBarHeight = useStatusbarHeight()
  const t = useI18n()

  const openNavigation = () => {
    hapticFeedback('light')
    global.app_event.changeMenuVisible(true)
  }

  return (
    <>
      <StatusBar />
      <View
        style={{
          height: HEADER_HEIGHT + statusBarHeight,
          paddingTop: statusBarHeight,
          backgroundColor: 'transparent',
        }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t(activeId)}
          activeOpacity={0.68}
          style={{ ...styles.navRow, backgroundColor: theme['c-primary-input-background'] }}
          onPress={openNavigation}
        >
          <Icon name="chevron-right" size={12} color={theme['c-button-font']} style={styles.icon} />
          <Text
            numberOfLines={1}
            size={Typography.page}
            color={theme['c-button-font']}
            style={styles.title}
          >
            {t(activeId)}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  )
}

const styles = createStyle({
  navRow: {
    height: PageMetrics.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: PageMetrics.gutter,
    marginTop: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.control,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    flex: 1,
    paddingRight: 8,
    fontWeight: FontWeight.semibold,
  },
})

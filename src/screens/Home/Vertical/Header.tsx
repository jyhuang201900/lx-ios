import { TouchableOpacity, View } from 'react-native'
import { useNavActiveId, useStatusbarHeight } from '@/store/common/hook'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import StatusBar from '@/components/common/StatusBar'
import { scaleSizeH } from '@/utils/pixelRatio'
import { setNavActiveId } from '@/core/common'
import commonState from '@/store/common/state'
import { useTheme } from '@/store/theme/hook'
import { FontWeight, PageMetrics, Radius, Typography } from '@/theme/layout'
import { hapticFeedback } from '@/utils/nativeModules/utils'

const HEADER_HEIGHT = scaleSizeH(48)

export default () => {
  const theme = useTheme()
  const activeId = useNavActiveId()
  const statusBarHeight = useStatusbarHeight()
  const t = useI18n()
  const isSetting = activeId == 'nav_setting'

  const openSettings = () => {
    if (isSetting) return
    hapticFeedback('light')
    setNavActiveId('nav_setting')
  }

  const goBack = () => {
    hapticFeedback('light')
    setNavActiveId(commonState.lastNavActiveId)
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
        <View style={styles.row}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isSetting ? global.i18n.t('back') : global.i18n.t('nav_setting')}
            activeOpacity={0.6}
            style={styles.action}
            onPress={isSetting ? goBack : openSettings}
          >
            <Icon
              name={isSetting ? 'chevron-left' : 'setting'}
              size={isSetting ? 21 : 19}
              color={theme['c-primary-font']}
            />
          </TouchableOpacity>
          <Text
            numberOfLines={1}
            size={Typography.page}
            color={theme['c-font']}
            style={styles.title}
          >
            {t(activeId)}
          </Text>
        </View>
      </View>
    </>
  )
}

const styles = createStyle({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PageMetrics.gutter,
  },
  action: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    paddingHorizontal: 4,
    textAlign: 'right',
    fontWeight: FontWeight.semibold,
  },
})

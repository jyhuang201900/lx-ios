import { TouchableOpacity, View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import GlassSheen from '@/components/common/GlassSheen'
import Text from '@/components/common/Text'
import { NAV_MENUS } from '@/config/constant'
import { setNavActiveId } from '@/core/common'
import { useI18n } from '@/lang'
import { useNavActiveId } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { createGlassStyle, createShadow, neonGlow, PageMetrics, Radius } from '@/theme/layout'
import { createStyle } from '@/utils/tools'
import { hapticFeedback } from '@/utils/nativeModules/utils'

export default () => {
  const theme = useTheme()
  const activeId = useNavActiveId()
  const t = useI18n()

  return (
    <View style={styles.host}>
      <View style={{ ...styles.bar, ...createGlassStyle(theme, { level: 'overlay', radius: Radius.card }), ...createShadow({ opacity: 0.1, radius: 14, offsetY: -3, elevation: 5 }) }}>
        <GlassSheen radius={Radius.card} width={110} opacity={0.13} delay={900} duration={2800} />
        {NAV_MENUS.map(menu => {
          const active = activeId == menu.id
          return (
            <TouchableOpacity
              key={menu.id}
              accessibilityRole="tab"
              accessibilityLabel={t(menu.id)}
              accessibilityState={{ selected: active }}
              activeOpacity={0.68}
              style={{
                ...styles.tab,
                backgroundColor: active ? theme['c-primary-background-active'] : 'transparent',
                // 当前页获得"通电"感；未选中项保持完全静止，避免整条栏都在发光
                ...(active ? neonGlow(theme, { radius: 9, opacity: 0.34 }) : null),
              }}
              onPress={() => {
                if (active) return
                hapticFeedback('light')
                setNavActiveId(menu.id)
              }}
            >
              <Icon
                name={menu.icon}
                size={19}
                color={active ? theme['c-primary-font-active'] : theme['c-font-label']}
              />
              <Text
                size={10}
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}
                color={active ? theme['c-primary-font-active'] : theme['c-font-label']}
              >
                {t(menu.id)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = createStyle({
  host: {
    paddingHorizontal: PageMetrics.gutter,
    paddingTop: 2,
    paddingBottom: 2,
  },
  bar: {
    height: PageMetrics.toolbarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    gap: 2,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    height: 46,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
})

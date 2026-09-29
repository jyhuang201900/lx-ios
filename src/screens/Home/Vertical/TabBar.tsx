import { Animated, TouchableOpacity, View, type ViewStyle } from 'react-native'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { NAV_MENUS } from '@/config/constant'
import { setNavActiveId } from '@/core/common'
import { useI18n } from '@/lang'
import { useNavActiveId } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { createGlassStyle, createShadow, neonGlow, Radius, TabBarMetrics } from '@/theme/layout'
import { createStyle } from '@/utils/tools'
import { hapticFeedback } from '@/utils/nativeModules/utils'
import { usePressEmphasis } from '@/theme/press'

/**
 * 单独抽成组件而不是在 map 里内联，因为 usePressEmphasis 是 Hook——
 * 6 个标签需要 6 份按压状态，map 里调用会破坏 Hook 规则。
 */
const TabItem = ({ icon, active, label, onPress }: {
  icon: string
  active: boolean
  label: string
  onPress: () => void
}) => {
  const theme = useTheme()
  // 标签栏的按压响应比播放键更轻：这是高频切换导航，动效抢戏会烦人
  const press = usePressEmphasis({ scale: 0.9, glowBoost: 0.18 })

  const faceStyle = [
    styles.tabFace,
    { backgroundColor: active ? theme['c-primary-background-active'] : 'transparent' },
    press.transformStyle,
  ] as ViewStyle[]
  // 签名元素只花在这一处：当前页的胶囊获得"通电"感，
  // 其余标签完全静止，避免整条栏都在发光
  if (active) {
    faceStyle.push(neonGlow(theme, { radius: 9, opacity: 0.34 }))
    faceStyle.push({ shadowOpacity: Animated.add(press.glowOpacity, 0.34) })
  }

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      activeOpacity={0.68}
      style={styles.tab}
      {...press.handlers}
      onPress={onPress}
    >
      <Animated.View style={faceStyle}>
        <Icon
          name={icon}
          size={TabBarMetrics.iconSize}
          // HIG tab-bars.md：内容层色彩丰富时，标签栏应取单色外观，
          // 避免标签色与内容层底色相近而难以辨识
          color={active ? theme['c-font'] : theme['c-font-label']}
        />
        <Text
          size={TabBarMetrics.labelSize}
          // 字重承担"当前在哪"的主要表达，胶囊与辉光是次要线索
          style={active ? styles.labelActive : undefined}
          numberOfLines={1}
          color={active ? theme['c-font'] : theme['c-font-label']}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  )
}

export default () => {
  const theme = useTheme()
  const activeId = useNavActiveId()
  const t = useI18n()

  return (
    <View style={styles.host}>
      <View style={{ ...styles.bar, ...createGlassStyle(theme, { radius: 0 }), ...createShadow({ opacity: 0.1, radius: 14, offsetY: -3, elevation: 5 }) }}>
        {NAV_MENUS.map(menu => (
          <TabItem
            key={menu.id}
            icon={menu.icon}
            active={activeId == menu.id}
            label={t(menu.id)}
            onPress={() => {
              if (activeId == menu.id) return
              hapticFeedback('light')
              setNavActiveId(menu.id)
            }}
          />
        ))}
      </View>
    </View>
  )
}

const styles = createStyle({
  host: {
    // 不做水平内缩：HIG tab-bars.md 说 iOS 标签栏「floats above content at the
    // bottom of the screen」，形态是通栏贴边。内缩胶囊是 Material 分段控件的语言。
    paddingTop: 2,
    paddingBottom: 2,
  },
  bar: {
    height: TabBarMetrics.height,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    gap: 2,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    // HIG accessibility.md：iOS 控件默认命中区 44x44pt
    height: TabBarMetrics.itemHeight,
    justifyContent: 'center',
  },
  // 视觉面与命中区分离：按压缩放只作用在视觉面上，不改变可点区域
  tabFace: {
    flex: 1,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  labelActive: {
    fontWeight: '600',
  },
})

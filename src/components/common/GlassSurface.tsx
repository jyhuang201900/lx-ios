import { memo } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { useTheme } from '@/store/theme/hook'
import { Glass, glassShadow, Radius } from '@/theme/layout'

interface Props {
  children?: React.ReactNode
  /**
   * 玻璃层级：
   * - surface：卡片、列表容器等贴近内容层的表面
   * - overlay：弹窗、菜单、播放条等浮在内容之上的表面（更实，保证可读性）
   */
  level?: 'surface' | 'overlay'
  /** 圆角，默认取卡片级 */
  radius?: number
  style?: StyleProp<ViewStyle>
  /** 是否显示顶部高光边（玻璃质感的关键细节） */
  highlight?: boolean
}

/**
 * iOS 玻璃质感表面。
 *
 * 受限于当前依赖（无第三方模糊库），玻璃感由三部分构成：
 *   1. 半透明底色 —— 让下层已虚化的背景透出，形成色彩渗透
 *   2. 细描边 —— 模拟玻璃边缘
 *   3. 顶部高光 —— 模拟光线在玻璃上沿的反射
 * 真实背景模糊由 PageContent 的原生 blurRadius 提供。
 */
export default memo(({
  children,
  level = 'surface',
  radius = Radius.card,
  style,
  highlight = true,
}: Props) => {
  const theme = useTheme()

  // 透明度必须作用在背景层而不是容器，否则文字与图标会一起变淡
  const bgOpacity = level === 'overlay'
    ? (theme.isDark ? Glass.overlayOpacity.dark : Glass.overlayOpacity.light)
    : (theme.isDark ? Glass.surfaceOpacity.dark : Glass.surfaceOpacity.light)
  return (
    <View style={[
      { borderRadius: radius },
      // 浮层加柔和阴影形成"悬浮玻璃"的层次；surface 层不加，避免列表里显得脏
      level === 'overlay' ? glassShadow : null,
      style,
    ]}>
      <View style={[{ borderRadius: radius, overflow: 'hidden' }, StyleSheet.absoluteFill]}>
        <View
          pointerEvents="none"
          style={{
            flex: 1,
            backgroundColor: theme['c-primary-input-background'],
            opacity: bgOpacity,
          }}
        />
      </View>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            borderWidth: Glass.borderWidth,
            borderColor: theme['c-border-background'],
          },
        ]}
      />
      {
        highlight
          ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: Glass.borderWidth * 2,
                  right: Glass.borderWidth * 2,
                  top: 0,
                  height: StyleSheet.hairlineWidth,
                  backgroundColor: theme.isDark
                    ? `rgba(255,255,255,${Glass.highlightOpacity.dark})`
                    : `rgba(255,255,255,${Glass.highlightOpacity.light})`,
                }}
              />
            )
          : null
      }
      {children}
    </View>
  )
})

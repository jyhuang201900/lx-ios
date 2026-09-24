import { Platform, type TextStyle, type ViewStyle } from 'react-native'

/**
 * 全局布局度量：所有界面统一使用这里的圆角与间距，避免各处数值漂移。
 *
 * 圆角三级：
 *  - control：输入框、小控件
 *  - card：卡片、列表行、页头操作条
 *  - sheet：底部弹层、菜单等大面板
 *  - pill：胶囊（标签、按钮、分段选择器）
 */
export const Radius = {
  control: 12,
  card: 16,
  sheet: 20,
  pill: 999,
} as const

/** 8pt 栅格间距 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const

/** 内容区统一水平边距 */
export const PagePadding = 16

/**
 * 跨平台阴影：iOS 用 shadow*，Android 用 elevation。
 * iOS 只写了 elevation 是无效的，这里统一补齐。
 */
export const createShadow = ({
  opacity = 0.16,
  radius = 18,
  offsetY = 6,
  elevation = 6,
  color = '#000',
}: {
  opacity?: number
  radius?: number
  offsetY?: number
  elevation?: number
  color?: string
} = {}): ViewStyle => Platform.select({
  ios: {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
  },
  android: { elevation },
  default: {},
}) as ViewStyle

/** 数字等宽，避免时间/计数跳动，提升精密感 */
export const TabularNums: TextStyle = { fontVariant: ['tabular-nums'] }

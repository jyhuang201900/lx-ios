import { Platform, StyleSheet, type TextStyle, type ViewStyle } from 'react-native'

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

/**
 * 字阶：全应用只使用这几级，避免出现 11/12/13/14/15/16 连续 1pt 递增导致层级无法辨认。
 *  - page：页面/顶栏标题
 *  - section：区块标题（配 600 字重）
 *  - body：列表主标题、正文
 *  - sub：次要信息（歌手、专辑、计数）
 *  - caption：标签、徽章、极小注解
 */
export const Typography = {
  page: 17,
  section: 15,
  body: 15,
  sub: 12,
  caption: 10,
} as const

/** 常用字重：仅保留常规与半粗，避免 bold/600/300 混用 */
export const FontWeight = {
  regular: '400',
  semibold: '600',
} as const

/** 玻璃卡片的轻微阴影：让表面在纯色主题下也能"浮"起来 */
export const glassCardShadow = createShadow({ opacity: 0.06, radius: 12, offsetY: 4, elevation: 2 })


/**
 * 玻璃表面样式（科技感核心）。
 *
 * 关键在 borderTopColor：四边同为发丝描边时，单独把上边提亮，
 * 读起来就是"光线从上方打在玻璃上沿"的反射高光——这是玻璃质感
 * 最具识别度的特征，且只需一行样式、不额外增加视图层级。
 *
 * 注意：宿主 View 不可带 overflow: 'hidden'，否则 iOS 上阴影会被裁掉。
 */
export const createGlassStyle = (
  theme: LX.ActiveTheme,
  { level = 'surface', radius = Radius.card }: {
    level?: 'surface' | 'overlay'
    radius?: number
  } = {},
): ViewStyle => ({
  backgroundColor: theme[level === 'overlay' ? 'c-glass-overlay' : 'c-glass-surface'],
  borderRadius: radius,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: theme['c-border-background'],
  // 上沿高光：浅色主题用高亮白，深色主题用低透明度白，避免深色主题下过亮刺眼
  borderTopColor: theme.isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.85)',
})

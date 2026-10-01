import { Platform, type TextStyle, type ViewStyle } from 'react-native'
import { getDisplaySettings } from './accessibility'

/**
 * 全局布局度量：所有界面统一使用这里的圆角与间距，避免各处数值漂移。
 *
 * 圆角标尺。之前这里只有三级，且 pill 写的是 999——任何用了它的控件都会
 * 变成完整胶囊：40pt 高的「播放全部」圆角半径 20、36pt 的图标按钮半径 18。
 * 一个界面里同时出现「完全圆形的按钮」和「12pt 圆角的输入框」，视觉上像两套
 * 设计语言拼在一起。
 *
 * 现在按**控件高度**分档，同一行的控件落在同一档，形状才读得出一致：
 *  - control：小控件、输入框、分段控件（高 32~38）
 *  - button：按钮、胶囊标签、页头操作（高 40~44）
 *  - card：卡片、列表行、面板（高 48+）
 *  - sheet：底部弹层、菜单等大面板
 *  - full：真正需要正圆的圆形图标按钮（宽高相等时用）
 *
 * 关键取舍：按钮不再用「高度的一半」当圆角。iOS 的按钮是圆角矩形，
 * 不是胶囊；把 40pt 的按钮做成半径 20 的胶囊会让它看起来像标签，
 * 和同一行的输入框、卡片都对不上。
 */
export const Radius = {
  control: 8,
  button: 10,
  card: 12,
  sheet: 16,
  /** 仅用于宽高相等的圆形按钮（如悬浮播放键） */
  full: 999,
  /**
   * 兼容旧写法。pill 曾经是「无限圆」的别名，现在指向 button——
   * 保留这个 key 是为了不一次性改动 39 个调用点，但它的语义已经变了：
   * 用了 pill 的地方会得到和普通按钮一致的圆角。
   */
  pill: 10,
} as const

/** 列表内容统一规格：缩略图、行高和圆角在各内容页保持一致。 */
export const ListMetrics = {
  rowHeight: 64,
  thumbSize: 40,
  thumbRadius: Radius.control,
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

/**
 * 间距体系：按"信息层级"分层，而非按数值大小随意取值。
 *
 * 关键在拉开层级差距——相邻层级若只差 2~4pt，视觉上无法区分主次，
 * 页面会显得拥挤且没有重点。这里让层级之间保持约 1.6~2 倍的落差：
 *  - inline：同一行内的元素间隔（图标与文字）
 *  - tight：紧邻的关联内容（歌名与歌手）
 *  - block：区块内的元素间隔（控件之间）
 *  - section：区块之间的分隔（给关键内容留出呼吸空间）
 *  - page：页面级留白（顶部/底部的整体呼吸）
 */
export const Gap = {
  inline: 4,
  tight: 8,
  block: 14,
  section: 22,
  page: 30,
} as const

/** 关键内容的水平边距：比普通内容更宽，让主要内容不贴边 */
export const KeyPadding = 22

/** 页面级统一栅格：所有主页面和悬浮控件共用同一套边距与高度。 */
export const PageMetrics = {
  gutter: 16,
  toolbarHeight: 52,
  toolbarMargin: 8,
  controlHeight: 40,
} as const

/**
 * 顶栏胶囊的基准宽度。
 *
 * 歌单页 / 排行榜页顶栏是多个控件排成一行，各控件的文字长度由数据决定
 * （音源名、排序名、标签名、榜单名）。若每个都按内容自适应，同一行里的
 * 胶囊会参差不齐，中英文混排时更明显；给每个控件写死宽度又会随语言和
 * 字号漂移。
 *
 * 这里给的是「基准」而非「固定值」：四个中文字 + 左右各 14pt 内边距，
 * 随全局字号缩放。四个字正好覆盖「小芸音乐」「热歌榜」「播放全部」这类
 * 最常见长度。
 */
export const ToolbarMetrics = {
  /** 左右内边距之和 */
  chipPadding: 14 * 2,
  /**
   * 胶囊基准宽度：四个中文字（15pt 字号，约 60pt）+ 左右内边距 28pt。
   *
   * 这里写的是设计值，不是最终像素值：所有调用点都在 createStyle 里，
   * 由它统一按屏幕与全局字号缩放——和这个文件里其他度量一样。
   * 在模块顶层直接调用 setSpText 反而会在 global.lx 初始化之前求值。
   */
  chipWidth: 88,
} as const

/**
 * 图标尺寸标尺。
 *
 * HIG icons.md 的要求不是某个具体数值，而是一致性：
 * "all interface icons in your app need to use a consistent size, level of detail,
 *  stroke thickness (or weight)"。
 *
 * 本项目原本的图标尺寸散在 10~28 之间，其中关闭/移除这类控件落在 10~12pt——
 * 配 44pt 命中区时字形小到几乎看不见。实测分布：10~13 共 27 处，是最密的一档，
 * 也正是最不可读的一档。
 *
 * 这里只给"控件型图标"定标尺，不动 20~28 的大图标（封面占位、空状态插图一类，
 * 它们是内容而非控件）。行内 chevron 一律 14pt，与 13pt 的行内文字视觉重量相当。
 */
export const IconSize = {
  /** 关闭 / 移除等控件图标，配 44pt 命中区 */
  affordance: 18,
  /**
   * 文字 chip 内部的删除标记。
   *
   * 与 affordance 分开是因为角色不同：affordance 是独立的图标按钮，
   * 18pt 才够它在 44pt 命中区里被看见；chip 里的叉号和 13pt 关键词并排，
   * 给 18pt 会比它所标注的文字还大。15pt 略大于正文，命中区由 hitSlop 补足。
   */
  inline: 15,
  /** 行内展开箭头 */
  disclosure: 14,
} as const

/**
 * 标签栏度量。
 *
 * 独立于 PageMetrics，因为它的约束来自另一条规则：
 * HIG accessibility.md 规定 iOS 控件默认 44x44pt、最小 28x28pt。
 * 标签是频繁点击的导航目标，必须给足 44pt，且标签字号抬到 11pt 后
 * 图标 20pt + 标签 11pt + 两行间距共约 34pt，需要比 PageToolbar 更高的容器。
 *
 * 另：HIG tab-bars.md 指出 iOS 标签栏「floats above content at the bottom」，
 * 形态是通栏贴边，不做水平内缩——内缩胶囊是 Material 分段控件的语言。
 */
export const TabBarMetrics = {
  /** 容器高度：44pt 命中区 + 上下各 3pt 呼吸 */
  height: 50,
  /** 单个标签的命中区高度，不低于 HIG 的 44pt 默认值 */
  itemHeight: 44,
  iconSize: 20,
  /** HIG accessibility.md：iOS 最小字号 11pt */
  labelSize: 11,
} as const

/** 数字等宽，避免时间/计数跳动，提升精密感 */
export const TabularNums: TextStyle = { fontVariant: ['tabular-nums'] }

/**
 * 字阶：全应用只使用这几级，避免出现 11/12/13/14/15/16 连续 1pt 递增导致层级无法辨认。
 *  - page：页面/顶栏标题
 *  - section：区块标题（配 600 字重）
 *  - body：列表主标题、正文
 *  - sub：次要信息（歌手、专辑、计数）
 *  - caption：标签、徽章、极小注解
 *
 * 下限说明：caption 原本是 10，低于 HIG accessibility.md 规定的 iOS 最小字号 11pt
 * （"| iOS, iPadOS | 17 pt | 11 pt |"）。已提到 11；sub 12 同理在限内。
 * compact 13 / body 15 对应 iOS 的 caption1..callout 区间，作为列表密度是合理取舍，
 * 但名字不要骗人：iOS 的 body 是 17，15 实为 callout，故正文级别的长文本请显式取 17。
 */
export const Typography = {
  page: 17,
  section: 15,
  body: 15,
  compact: 13,
  sub: 12,
  caption: 11,
} as const

/** 常用字重：仅保留常规与半粗，避免 bold/600/300 混用 */
export const FontWeight = {
  regular: '400',
  semibold: '600',
} as const

/** 玻璃卡片的轻微阴影：让表面在纯色主题下也能"浮"起来 */
export const glassCardShadow = createShadow({ opacity: 0.06, radius: 12, offsetY: 4, elevation: 2 })


/**
 * 玻璃浮层样式（科技感核心）。
 *
 * 关键在 borderTopColor：四边同为发丝描边时，单独把上边提亮，
 * 读起来就是"光线从上方打在玻璃上沿"的反射高光——这是玻璃质感
 * 最具识别度的特征，且只需一行样式、不额外增加视图层级。
 *
 * 注意：宿主 View 不可带 overflow: 'hidden'，否则 iOS 上阴影会被裁掉。
 *
 * 降级：系统开启「降低透明度」时改用不透明底。
 * 依据 HIG materials.md——Liquid Glass 的表现本应随 reduce transparency 变化，
 * 但 RN 没有 backdrop-filter，玻璃是半透明色块模拟的，系统不会替我们处理，
 * 所以必须由应用自己降级，否则开了这个开关的人得不到任何可读性收益。
 *
 * 只有一档：这里原本有 surface / overlay 两档，surface 专供内容层使用。
 * 依 materials.md「Don't use Liquid Glass in the content layer」，内容层已全部改用
 * createContentSurface，surface 随之无任何调用方。删掉这一档而不只是留空，
 * 是为了让它无法被重新引入——那 14 处内容层玻璃正是同一个错误。
 */
export const createGlassStyle = (
  theme: LX.ActiveTheme,
  { radius = Radius.card }: { radius?: number } = {},
): ViewStyle => {
  const { reduceTransparency } = getDisplaySettings()

  return {
    backgroundColor: reduceTransparency
      ? theme['c-content-background']
      : theme['c-glass-overlay'],
    borderRadius: radius,
    borderWidth: 1,
    borderColor: theme['c-border-background'],
    // 上沿轻高光保留受光感，但降低对比，避免卡片像彩色边框。
    // 降低透明度时一并去掉——这个高光本质是半透明材质的受光表现。
    ...(reduceTransparency
      ? null
      : {
          borderTopColor: theme.isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.84)',
          borderLeftColor: theme.isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.54)',
          borderRightColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.28)',
        }),
  }
}

/**
 * 内容层表面：不透明 + 描边，用来替代内容层里原本的玻璃。
 *
 * 依据 HIG materials.md「Don't use Liquid Glass in the content layer」：
 * 玻璃只属于浮动的功能层（标签栏、迷你播放条、sheet / menu / dialog），
 * 内容层用标准材质。分组靠描边和间距表达，而不是靠一层抬起的半透明块——
 * 实算也印证了这点：c-primary-light-1000 与页面底色的可区分度是 1.00:1，
 * 也就是说这个表面本来就「看不见」，它的唯一实际作用是压低文字对比度。
 */
export const createContentSurface = (
  theme: LX.ActiveTheme,
  { radius = Radius.card }: { radius?: number } = {},
): ViewStyle => ({
  backgroundColor: theme['c-control-surface'],
  borderRadius: radius,
  borderWidth: 1,
  borderColor: theme['c-border-background'],
})

/**
 * 镜面高光边：贴在封面卡内侧的一圈不等宽白色描边，读起来像光从左上方打下来。
 *
 * 之前这份数值在三个 Pic 组件里各写一遍，而且两套还不一致
 * （mini player 用 0.78/0.42/0.20，播放详情用 0.82/0.48/0.24）。
 * 同一个视觉元素出现多套数值，跨屏就一定会漂，所以收在这里。
 *
 * intensity：整体强度。封面越大高光越强，所以播放详情取 1（默认），
 * mini player 的 40pt 小图取 0.86 收一档——这是有意的尺寸差异，不是两套设计。
 *
 * 深浅两套不是等比关系（暗色下侧边衰减更快：顶 0.56、左侧 0.42、右侧 0.33），
 * 所以逐边写死而不是乘一个系数，否则复现不出原值。
 */
export const createSpecularEdge = (
  theme: LX.ActiveTheme,
  { radius = Radius.card, width = 1.2, intensity = 1 }: {
    radius?: number
    width?: number
    intensity?: number
  } = {},
): ViewStyle => {
  const at = (base: number) => Math.round(base * intensity * 100) / 100
  const [top, left, right] = theme.isDark ? [0.46, 0.20, 0.08] : [0.82, 0.48, 0.24]
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius,
    borderWidth: width,
    borderColor: 'transparent',
    borderTopColor: `rgba(255, 255, 255, ${at(top)})`,
    borderLeftColor: `rgba(255, 255, 255, ${at(left)})`,
    borderRightColor: `rgba(255, 255, 255, ${at(right)})`,
  }
}

/**
 * 霓虹光晕：把 iOS 阴影色设为主题色，阴影即变成"发光"而非"投影"。
 * 这是零依赖下最强的科技感手段——激活项、播放按钮、进度指示点都靠它获得"通电"感。
 */
export const neonGlow = (
  theme: LX.ActiveTheme,
  { radius = 10, opacity = 0.55 }: { radius?: number, opacity?: number } = {},
): ViewStyle => Platform.select({
  ios: {
    shadowColor: theme['c-primary'],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: opacity,
    shadowRadius: radius,
  },
  android: { elevation: 0 },
  default: {},
}) as ViewStyle

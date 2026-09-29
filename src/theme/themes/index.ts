/* eslint-disable @typescript-eslint/no-var-requires */
import { getUserTheme, saveUserTheme } from '@/utils/data'
import themes from '@/theme/themes/themes'
import settingState from '@/store/setting/state'
import themeState from '@/store/theme/state'
import { isUrl } from '@/utils'
import { privateStorageDirectoryPath } from '@/utils/fs'
import { type ImageSourcePropType } from 'react-native'
import { AA_TEXT, contrastRatio } from '@/theme/accessibility'

export const BG_IMAGES = {
  'china_ink.jpg': require('./images/china_ink.jpg') as ImageSourcePropType,
  'jqbg.jpg': require('./images/jqbg.jpg') as ImageSourcePropType,
  'landingMoon.png': require('./images/landingMoon2.png') as ImageSourcePropType,
  'myzcbg.jpg': require('./images/myzcbg.jpg') as ImageSourcePropType,
  'xnkl.png': require('./images/xnkl.png') as ImageSourcePropType,
} as const


let userThemes: LX.Theme[]
export const getAllThemes = async() => {
  // eslint-disable-next-line require-atomic-updates
  userThemes ??= await getUserTheme()
  return {
    themes,
    userThemes,
    dataPath: privateStorageDirectoryPath + '/theme_images',
  }
}

export const saveTheme = async(theme: LX.Theme) => {
  const targetTheme = userThemes.find(t => t.id === theme.id)
  if (targetTheme) Object.assign(targetTheme, theme)
  else userThemes.push(theme)
  await saveUserTheme(userThemes)
}

export const removeTheme = async(id: string) => {
  const index = userThemes.findIndex(t => t.id === id)
  if (index < 0) return
  userThemes.splice(index, 1)
  await saveUserTheme(userThemes)
}

export type LocalTheme = typeof themes[number]
type ColorsKey = keyof LX.Theme['config']['themeColors']
type ExtInfoKey = keyof LX.Theme['config']['extInfo']
const varColorRxp = /^var\((.+)\)$/

/**
 * 从候选色阶里挑第一个在给定表面上达标的颜色。
 *
 * 为什么需要它：`c-primary-dark-N` 是**对主色做固定比例的线性压暗**，
 * 不管主色本身有多亮。固定档位（早先用的 dark-500）在 16 个内置主题上
 * 全部达标，但用户可以自建主题——遍历 HSL 全域 384 个主色后发现，
 * 有 180 个（47%）在 dark-500 上不足 4.5:1，最差只有 3.02:1。
 * 也就是说近一半的用户自建主题里，品牌色文字是不可读的。
 *
 * 而 `c-primary-font` 被 EQ 曲线、RT60 读数、进度条、标签栏辉光共用，
 * 它的失效会同时污染这些地方。所以这里不能写死档位，要让它自己找。
 */
const pickAccessible = (
  colors: Partial<Record<ColorsKey, string>>,
  steps: readonly string[],
  surface: string,
  minimum: number,
): string | null => {
  for (const key of steps) {
    const color = colors[key as ColorsKey]
    if (!color) continue
    const ratio = contrastRatio(color, surface)
    if (ratio != null && ratio >= minimum) return color
  }
  return null
}

/**
 * 浅色主题：页面底色是亮的，文字要比它深。dark 阶梯在浅色下是「越走越深」，
 * 所以从 dark-500 往下找。
 */
const LIGHT_TEXT_STEPS = [
  'c-primary-dark-500', 'c-primary-dark-600', 'c-primary-dark-700',
  'c-primary-dark-800', 'c-primary-dark-900', 'c-primary-dark-1000',
] as const

/**
 * 深色主题：页面底色是暗的，文字要比它亮。
 *
 * 注意走的**仍然是 dark 阶梯**——因为 createThemeColors 里
 * `c-primary-dark-N = RGB_Linear_Shade(isDark ? 0.2 : -0.1, ...)`，
 * 暗色下 dark 阶梯是「越走越亮」，而 light 阶梯是越走越暗。
 * 走错阶梯会导致深色主色的主题里找不到任何可用文字色（实测 443 个组合失败）。
 */
const DARK_TEXT_STEPS = [
  'c-primary-dark-100', 'c-primary-dark-200', 'c-primary-dark-300',
  'c-primary-dark-400', 'c-primary-dark-500', 'c-primary-dark-600',
  'c-primary-dark-700', 'c-primary-dark-800', 'c-primary-dark-900',
  'c-primary-dark-1000',
] as const

export const buildActiveThemeColors = (theme: LX.Theme): LX.ActiveTheme => {
  let bgImg: ImageSourcePropType | undefined
  if (theme.isCustom) {
    if (theme.config.extInfo['bg-image']) {
      theme.config.extInfo['bg-image'] =
        isUrl(theme.config.extInfo['bg-image'])
          ? theme.config.extInfo['bg-image']
          : `${privateStorageDirectoryPath}/theme_images/${theme.config.extInfo['bg-image']}`
    }
  } else {
    const extInfo = (theme as LocalTheme).config.extInfo
    if (extInfo['bg-image']) {
      if (!theme.isDark || !settingState.setting['theme.hideBgDark']) bgImg = BG_IMAGES[extInfo['bg-image']]
    }
  }

  theme.config.extInfo = { ...theme.config.extInfo }

  for (const [k, v] of Object.entries(theme.config.extInfo) as Array<[ExtInfoKey, LX.Theme['config']['extInfo'][ExtInfoKey]]>) {
    if (!v.startsWith('var(')) continue
    theme.config.extInfo[k] = theme.config.themeColors[v.replace(varColorRxp, '$1') as ColorsKey]
  }

  // 品牌色作前景色时的取值。算一次，下面几处共用——
  // 算两次既浪费，也容易让两处漂移到不同档位。
  //
  // 档位不写死，而是找到第一个在页面底色上满足 AA 的颜色，理由见 pickAccessible：
  // 写死档位会让近一半用户自建主题不可读。
  const primaryFont = pickAccessible(
    theme.config.themeColors,
    theme.isDark ? DARK_TEXT_STEPS : LIGHT_TEXT_STEPS,
    theme.config.themeColors['c-primary-light-1000'],
    AA_TEXT,
  ) ?? (theme.isDark
    ? theme.config.themeColors['c-primary-light-200']
    : theme.config.themeColors['c-primary-dark-500'])
  // active 从 font 的下一档开始，让「当前项」在字色上也有可辨差异。
  // 若 font 已用掉最深/最亮的一档，active 会落回同一个值——
  // 那时靠胶囊底与字重区分，不靠颜色。
  const primaryFontActive = theme.isDark
    ? (pickAccessible(
        theme.config.themeColors,
        DARK_TEXT_STEPS.slice(1),
        theme.config.themeColors['c-primary-light-1000'],
        AA_TEXT,
      ) ?? theme.config.themeColors['c-primary-light-200'])
    : (pickAccessible(
        theme.config.themeColors,
        LIGHT_TEXT_STEPS.slice(1),
        theme.config.themeColors['c-primary-light-1000'],
        AA_TEXT,
      ) ?? theme.config.themeColors['c-primary-dark-1000'])

  return {
    id: theme.id,
    name: theme.name,
    isDark: theme.isDark,
    ...theme.config.themeColors,
    ...theme.config.extInfo,
    'c-font': theme.config.themeColors['c-850'],
    // 次要文字：c-700 在 16 个主题的页面底色上最低 5.02:1，全部通过 AA 4.5:1。
    // 往下加深当然也能过（c-750 起余量更大），但会逐步吃掉与正文 c-850 的层级差；
    // c-650 往上则贴余量、且 c-600 起部分主题跌破 4.5:1。故取 c-700。
    'c-font-label': theme.config.themeColors['c-700'],
    'c-primary-font': primaryFont,
    'c-primary-font-hover': theme.config.themeColors['c-primary-alpha-300'],
    'c-primary-font-active': primaryFontActive,
    'c-primary-background': theme.config.themeColors['c-primary-light-400-alpha-700'],
    // 实心品牌按钮的底色。
    //
    // 为什么不用 c-primary 本身：它是明度居中的品牌色，白字压上去只有 1.95:1、
    // 近黑字 1.20:1，两个方向都不达标——这批品牌色没有能承载文字的实心底。
    // dark-500 配 c-000（外观极值色）实测 16/16 达标，最低 5.09:1。
    //
    // 与 c-primary-background 的分工：那个是浅 tint 配深品牌字（4.71:1），
    // 用于次要/次级按钮；这个是实心深底配外观极值字，用于「播放全部」这类主动作。
    'c-primary-solid': theme.config.themeColors['c-primary-dark-500'],
    // 压在实心品牌底（c-primary-solid）上的文字与图标色。
    //
    // 用 c-000 是因为它随外观翻转：浅色主题下灰阶的 c-000 是纯白（对深底），
    // 深色主题下灰阶是反的，c-000 变成近黑（对浅底）——两种外观都需要「另一端」，
    // 而品牌色本身明度居中，两端都撑不住。
    // 语义名而不是直接用色板：调用点该表达「压在实心底上」，而不是「用了第 0 档灰」。
    'c-on-solid': theme.config.themeColors['c-000'],
    'c-primary-background-hover': theme.config.themeColors['c-primary-light-300-alpha-800'],
    'c-primary-background-active': theme.config.themeColors['c-primary-light-100-alpha-800'],
    'c-primary-input-background': theme.config.themeColors['c-primary-light-400-alpha-700'],
    // 按钮文字：原先取「品牌色本身」压在「品牌浅色 tint」上——同色相、相近明度，
    // 实测 16 个主题里 13~15 个不达标，最差 1.08:1（白色字压浅 tint）。
    // 也就是说全应用每个按钮的字都读不出来，而外观上完全看不出问题。
    // 改为与底色配对求解出的深品牌色：16/16 达标，最差 4.57:1。
    'c-primary-button-font': primaryFont,
    'c-button-font': primaryFont,
    'c-button-font-selected': primaryFontActive,
    'c-button-background': theme.config.themeColors['c-primary-light-400-alpha-700'],
    'c-button-background-selected': theme.config.themeColors['c-primary-alpha-600'],
    'c-button-background-hover': theme.config.themeColors['c-primary-light-300-alpha-600'],
    'c-button-background-active': theme.config.themeColors['c-primary-light-100-alpha-600'],
    'c-list-header-border-bottom': theme.config.themeColors['c-primary-alpha-900'],
    'c-content-background': theme.config.themeColors['c-primary-light-1000'],
    // 内容层控件（搜索框、来源选择、排序标签）用不透明表面。
    // 依据 HIG materials.md「Don't use Liquid Glass in the content layer」：
    // 玻璃只用于浮动的功能层，内容层用标准材质。
    // 取 light-1000（与页面底色同源）时次要文字为 5.92:1，层级靠描边与间距表达而非抬升表面。
    'c-control-surface': theme.config.themeColors['c-primary-light-1000'],
    // 玻璃只保留浮层一档：半透明底让 PageContent 已虚化的背景透出，形成色彩渗透。
    // 覆盖在内容之上且无背景模糊能力，不透明度需足够高以抑制底层文字重影。
    // 原先另有一档 c-glass-surface 专供内容层，已随内容层改实色一并删除——
    // 留着它等于给「内容层用玻璃」这个错误留后门。
    'c-glass-overlay': theme.isDark
      ? theme.config.themeColors['c-primary-light-1000-alpha-100']
      : theme.config.themeColors['c-primary-light-1000-alpha-100'],
    // 描边承担内容层的分组职责，因此比纯装饰线更实
    'c-border-background': theme.isDark
      ? theme.config.themeColors['c-primary-light-100-alpha-400']
      : theme.config.themeColors['c-primary-light-100-alpha-700'],
    // 图表参考线（目前是均衡器曲线的 0dB 基线）。
    // 单独一个 token 而不是复用 c-border-background：后者是装饰性描边，
    // 实算在浮层上只有 1.17:1（orange），几乎看不见——而 0dB 基线恰恰是
    // 整张图最重要的参考线。c-500 在浮层上落在 3.19~4.83:1，既能被看见，
    // 又明显弱于文字(≥4.5:1)与曲线颜色，不会抢读数。
    'c-chart-baseline': theme.config.themeColors['c-500'],
    'bg-image': bgImg,
  } as const
}


// const copyTheme = (theme: LX.Theme): LX.Theme => {
//   return {
//     ...theme,
//     config: {
//       ...theme.config,
//       extInfo: { ...theme.config.extInfo },
//       themeColors: { ...theme.config.themeColors },
//     },
//   }
// }
// type IDS = LocalTheme['id']
export const getTheme = async() => {
  // fs.promises.readdir()
  const shouldUseDarkColors = themeState.shouldUseDarkColors
  // let themeId = settingState.setting['theme.id'] == 'auto'
  //   ? shouldUseDarkColors
  //     ? settingState.setting['theme.darkId']
  //     : settingState.setting['theme.lightId']
  //   // : 'china_ink'
  //   : settingState.setting['theme.id']
  let themeId = settingState.setting['common.isAutoTheme'] && shouldUseDarkColors
    ? 'black'
    : settingState.setting['theme.id']
  // themeId = 'naruto'
  // themeId = 'pink'
  // themeId = 'black'
  let theme: LocalTheme | LX.Theme | undefined = themes.find(theme => theme.id == themeId)
  if (!theme) {
    userThemes = await getUserTheme()
    theme = userThemes.find(theme => theme.id == themeId)
    if (!theme) {
      themeId = settingState.setting['theme.id'] == 'auto' && shouldUseDarkColors ? 'black' : 'green'
      theme = themes.find(theme => theme.id == themeId) as LX.Theme
    }
  }

  return theme
}

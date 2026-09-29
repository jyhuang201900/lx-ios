import type { ImageSourcePropType } from 'react-native'

declare global {
  namespace LX {
    interface ThemeColors {
      'c-000': string
      'c-050': string
      'c-100': string
      'c-150': string
      'c-200': string
      'c-250': string
      'c-300': string
      'c-350': string
      'c-400': string
      'c-450': string
      'c-500': string
      'c-550': string
      'c-600': string
      'c-650': string
      'c-700': string
      'c-750': string
      'c-800': string
      'c-850': string
      'c-900': string
      'c-950': string
      'c-1000': string


      'c-theme': string

      'c-primary': string
      'c-primary-alpha-100': string
      'c-primary-alpha-200': string
      'c-primary-alpha-300': string
      'c-primary-alpha-400': string
      'c-primary-alpha-500': string
      'c-primary-alpha-600': string
      'c-primary-alpha-700': string
      'c-primary-alpha-800': string
      'c-primary-alpha-900': string

      'c-primary-dark-100': string
      'c-primary-dark-100-alpha-100': string
      'c-primary-dark-100-alpha-200': string
      'c-primary-dark-100-alpha-300': string
      'c-primary-dark-100-alpha-400': string
      'c-primary-dark-100-alpha-500': string
      'c-primary-dark-100-alpha-600': string
      'c-primary-dark-100-alpha-700': string
      'c-primary-dark-100-alpha-800': string
      'c-primary-dark-100-alpha-900': string

      'c-primary-dark-200': string
      'c-primary-dark-200-alpha-100': string
      'c-primary-dark-200-alpha-200': string
      'c-primary-dark-200-alpha-300': string
      'c-primary-dark-200-alpha-400': string
      'c-primary-dark-200-alpha-500': string
      'c-primary-dark-200-alpha-600': string
      'c-primary-dark-200-alpha-700': string
      'c-primary-dark-200-alpha-800': string
      'c-primary-dark-200-alpha-900': string

      'c-primary-dark-300': string
      'c-primary-dark-300-alpha-100': string
      'c-primary-dark-300-alpha-200': string
      'c-primary-dark-300-alpha-300': string
      'c-primary-dark-300-alpha-400': string
      'c-primary-dark-300-alpha-500': string
      'c-primary-dark-300-alpha-600': string
      'c-primary-dark-300-alpha-700': string
      'c-primary-dark-300-alpha-800': string
      'c-primary-dark-300-alpha-900': string

      'c-primary-dark-400': string
      'c-primary-dark-400-alpha-100': string
      'c-primary-dark-400-alpha-200': string
      'c-primary-dark-400-alpha-300': string
      'c-primary-dark-400-alpha-400': string
      'c-primary-dark-400-alpha-500': string
      'c-primary-dark-400-alpha-600': string
      'c-primary-dark-400-alpha-700': string
      'c-primary-dark-400-alpha-800': string
      'c-primary-dark-400-alpha-900': string

      'c-primary-dark-500': string
      'c-primary-dark-500-alpha-100': string
      'c-primary-dark-500-alpha-200': string
      'c-primary-dark-500-alpha-300': string
      'c-primary-dark-500-alpha-400': string
      'c-primary-dark-500-alpha-500': string
      'c-primary-dark-500-alpha-600': string
      'c-primary-dark-500-alpha-700': string
      'c-primary-dark-500-alpha-800': string
      'c-primary-dark-500-alpha-900': string

      'c-primary-dark-600': string
      'c-primary-dark-600-alpha-100': string
      'c-primary-dark-600-alpha-200': string
      'c-primary-dark-600-alpha-300': string
      'c-primary-dark-600-alpha-400': string
      'c-primary-dark-600-alpha-500': string
      'c-primary-dark-600-alpha-600': string
      'c-primary-dark-600-alpha-700': string
      'c-primary-dark-600-alpha-800': string
      'c-primary-dark-600-alpha-900': string

      'c-primary-dark-700': string
      'c-primary-dark-700-alpha-100': string
      'c-primary-dark-700-alpha-200': string
      'c-primary-dark-700-alpha-300': string
      'c-primary-dark-700-alpha-400': string
      'c-primary-dark-700-alpha-500': string
      'c-primary-dark-700-alpha-600': string
      'c-primary-dark-700-alpha-700': string
      'c-primary-dark-700-alpha-800': string
      'c-primary-dark-700-alpha-900': string

      'c-primary-dark-800': string
      'c-primary-dark-800-alpha-100': string
      'c-primary-dark-800-alpha-200': string
      'c-primary-dark-800-alpha-300': string
      'c-primary-dark-800-alpha-400': string
      'c-primary-dark-800-alpha-500': string
      'c-primary-dark-800-alpha-600': string
      'c-primary-dark-800-alpha-700': string
      'c-primary-dark-800-alpha-800': string
      'c-primary-dark-800-alpha-900': string

      'c-primary-dark-900': string
      'c-primary-dark-900-alpha-100': string
      'c-primary-dark-900-alpha-200': string
      'c-primary-dark-900-alpha-300': string
      'c-primary-dark-900-alpha-400': string
      'c-primary-dark-900-alpha-500': string
      'c-primary-dark-900-alpha-600': string
      'c-primary-dark-900-alpha-700': string
      'c-primary-dark-900-alpha-800': string
      'c-primary-dark-900-alpha-900': string

      'c-primary-dark-1000': string
      'c-primary-dark-1000-alpha-100': string
      'c-primary-dark-1000-alpha-200': string
      'c-primary-dark-1000-alpha-300': string
      'c-primary-dark-1000-alpha-400': string
      'c-primary-dark-1000-alpha-500': string
      'c-primary-dark-1000-alpha-600': string
      'c-primary-dark-1000-alpha-700': string
      'c-primary-dark-1000-alpha-800': string
      'c-primary-dark-1000-alpha-900': string

      'c-primary-light-100': string
      'c-primary-light-100-alpha-100': string
      'c-primary-light-100-alpha-200': string
      'c-primary-light-100-alpha-300': string
      'c-primary-light-100-alpha-400': string
      'c-primary-light-100-alpha-500': string
      'c-primary-light-100-alpha-600': string
      'c-primary-light-100-alpha-700': string
      'c-primary-light-100-alpha-800': string
      'c-primary-light-100-alpha-900': string

      'c-primary-light-200': string
      'c-primary-light-200-alpha-100': string
      'c-primary-light-200-alpha-200': string
      'c-primary-light-200-alpha-300': string
      'c-primary-light-200-alpha-400': string
      'c-primary-light-200-alpha-500': string
      'c-primary-light-200-alpha-600': string
      'c-primary-light-200-alpha-700': string
      'c-primary-light-200-alpha-800': string
      'c-primary-light-200-alpha-900': string

      'c-primary-light-300': string
      'c-primary-light-300-alpha-100': string
      'c-primary-light-300-alpha-200': string
      'c-primary-light-300-alpha-300': string
      'c-primary-light-300-alpha-400': string
      'c-primary-light-300-alpha-500': string
      'c-primary-light-300-alpha-600': string
      'c-primary-light-300-alpha-700': string
      'c-primary-light-300-alpha-800': string
      'c-primary-light-300-alpha-900': string

      'c-primary-light-400': string
      'c-primary-light-400-alpha-100': string
      'c-primary-light-400-alpha-200': string
      'c-primary-light-400-alpha-300': string
      'c-primary-light-400-alpha-400': string
      'c-primary-light-400-alpha-500': string
      'c-primary-light-400-alpha-600': string
      'c-primary-light-400-alpha-700': string
      'c-primary-light-400-alpha-800': string
      'c-primary-light-400-alpha-900': string

      'c-primary-light-500': string
      'c-primary-light-500-alpha-100': string
      'c-primary-light-500-alpha-200': string
      'c-primary-light-500-alpha-300': string
      'c-primary-light-500-alpha-400': string
      'c-primary-light-500-alpha-500': string
      'c-primary-light-500-alpha-600': string
      'c-primary-light-500-alpha-700': string
      'c-primary-light-500-alpha-800': string
      'c-primary-light-500-alpha-900': string

      'c-primary-light-600': string
      'c-primary-light-600-alpha-100': string
      'c-primary-light-600-alpha-200': string
      'c-primary-light-600-alpha-300': string
      'c-primary-light-600-alpha-400': string
      'c-primary-light-600-alpha-500': string
      'c-primary-light-600-alpha-600': string
      'c-primary-light-600-alpha-700': string
      'c-primary-light-600-alpha-800': string
      'c-primary-light-600-alpha-900': string

      'c-primary-light-700': string
      'c-primary-light-700-alpha-100': string
      'c-primary-light-700-alpha-200': string
      'c-primary-light-700-alpha-300': string
      'c-primary-light-700-alpha-400': string
      'c-primary-light-700-alpha-500': string
      'c-primary-light-700-alpha-600': string
      'c-primary-light-700-alpha-700': string
      'c-primary-light-700-alpha-800': string
      'c-primary-light-700-alpha-900': string

      'c-primary-light-800': string
      'c-primary-light-800-alpha-100': string
      'c-primary-light-800-alpha-200': string
      'c-primary-light-800-alpha-300': string
      'c-primary-light-800-alpha-400': string
      'c-primary-light-800-alpha-500': string
      'c-primary-light-800-alpha-600': string
      'c-primary-light-800-alpha-700': string
      'c-primary-light-800-alpha-800': string
      'c-primary-light-800-alpha-900': string

      'c-primary-light-900': string
      'c-primary-light-900-alpha-100': string
      'c-primary-light-900-alpha-200': string
      'c-primary-light-900-alpha-300': string
      'c-primary-light-900-alpha-400': string
      'c-primary-light-900-alpha-500': string
      'c-primary-light-900-alpha-600': string
      'c-primary-light-900-alpha-700': string
      'c-primary-light-900-alpha-800': string
      'c-primary-light-900-alpha-900': string

      'c-primary-light-1000': string
      'c-primary-light-1000-alpha-100': string
      'c-primary-light-1000-alpha-200': string
      'c-primary-light-1000-alpha-300': string
      'c-primary-light-1000-alpha-400': string
      'c-primary-light-1000-alpha-500': string
      'c-primary-light-1000-alpha-600': string
      'c-primary-light-1000-alpha-700': string
      'c-primary-light-1000-alpha-800': string
      'c-primary-light-1000-alpha-900': string
    }

    type ActiveTheme = ThemeColors & Omit<Theme['config']['extInfo'], 'bg-image'> & Pick<Theme, 'id' | 'name' | 'isDark'> & {
      'c-font': string
      'c-font-label': string
      'c-primary-font': string
      'c-primary-font-hover': string
      'c-primary-font-active': string
      'c-primary-background': string
      'c-primary-background-hover': string
      'c-primary-background-active': string
      'c-primary-input-background': string
      'c-primary-button-font': string
      'c-button-font': string
      'c-button-font-selected': string
      'c-button-background': string
      'c-button-background-selected': string
      'c-button-background-hover': string
      'c-button-background-active': string
      'c-list-header-border-bottom': string
      'c-content-background': string
      'c-border-background': string
      /**
       * 内容层控件表面（搜索框、来源选择、排序标签等）。
       * 按 HIG materials.md，内容层不使用 Liquid Glass，改用不透明的标准材质。
       */
      'c-control-surface': string
      /**
       * 图表参考线（均衡器曲线的 0dB 基线等）。
       * 与 c-border-background 分开：后者是装饰性描边，在浮层上可能低到 1.17:1，
       * 而参考线必须能被看见。
       */
      'c-chart-baseline': string
      /**
       * 实心品牌按钮的底色。与 c-primary-background 分工：
       * 那个是浅 tint 配深品牌字（次要按钮），这个是实心深底配 c-000（主动作）。
       * c-primary 本身明度居中，白字与近黑字都不达标，不能直接当按钮底。
       */
      'c-primary-solid': string
      /**
       * 压在实心品牌底（c-primary-solid）上的文字与图标色。
       * 随外观翻转：浅色主题下是白，深色主题下是近黑。
       * 用它而不是 c-000，是为了让调用点表达意图而不是色阶档位。
       */
      'c-on-solid': string
      /**
       * 玻璃质感浮层。仅供浮动的功能层使用——标签栏、迷你播放条、顶栏、
       * sheet / menu / dialog、播放页胶囊。内容层请用 c-control-surface。
       */
      'c-glass-overlay': string
      'bg-image'?: ImageSourcePropType
    }

    interface Theme {
      id: string
      name: string
      isDark: boolean
      isCustom: boolean
      config: {
        themeColors: ThemeColors
        extInfo: {
          'c-app-background': string
          'c-main-background': string
          'bg-image': string
          'bg-image-position': string
          'bg-image-size': string

          // 徽章颜色
          'c-badge-primary': string
          'c-badge-secondary': string
          'c-badge-tertiary': string
        }
      }
    }

    interface ThemeInfo {
      themes: LX.Theme[]
      userThemes: LX.Theme[]
      dataPath: string
    }

    interface ThemeSetting {
      shouldUseDarkColors: boolean
      theme: {
        id: string
        name: string
        isDark: boolean
        colors: Record<string, string>
      }
    }
  }
}

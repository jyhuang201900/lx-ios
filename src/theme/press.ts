import { useCallback, useMemo, useRef } from 'react'
import { Animated, type ViewStyle } from 'react-native'

import { useReduceMotion } from '@/utils/hooks'

export interface PressEmphasisOptions {
  /** 按下时的缩放。1 表示不缩 */
  scale?: number
  /** 按下时辉光的额外强度，叠加在 neonGlow 之上 */
  glowBoost?: number
}

export interface PressEmphasis {
  /** 挂到 TouchableOpacity / Pressable 的 onPressIn / onPressOut */
  handlers: {
    onPressIn: () => void
    onPressOut: () => void
  }
  /** 挂到被按压的 View 上，跟手缩放走原生驱动 */
  transformStyle: ViewStyle
  /**
   * 辉光强度的**增量**，不是终值。
   * 调用方自己与 neonGlow 的基准强度相加，这样不会把基准覆盖掉。
   * 阴影属性无法走原生驱动，这一份在 JS 线程插值。
   */
  glowOpacity: Animated.AnimatedInterpolation<number>
}

/**
 * 按压响应：按下时轻微收缩、辉光加强，松手弹回。
 *
 * 这是「科技感」的另一半来源，而且比常驻动画更站得住脚。
 * HIG motion.md 描述真实的 Liquid Glass 时说：
 *
 *   "the movement of Liquid Glass responds to direct touch interaction with
 *    greater emphasis to reinforce the feeling of a tactile experience"
 *
 * 也就是说，真玻璃的动效是**被触摸激发的**，不是自己在循环。
 * 之前那批常驻 Animated.loop 被删掉之后运动感归零，用这个补回来才是对的——
 * 它同时满足 motion.md 的另外两条：
 *   "Aim for brevity and precision in feedback animations."
 *   "Make motion optional."（减弱动态效果时直接跳到终态，不做补间）
 *
 * 用法必须配触感反馈（haptics）：HIG 明确说动效不能是传达信息的唯一途径。
 * 本项目各播放控件已普遍调用 hapticFeedback，保持即可。
 */
export const usePressEmphasis = ({
  scale = 0.94,
  glowBoost = 0.22,
}: PressEmphasisOptions = {}): PressEmphasis => {
  const pressed = useRef(new Animated.Value(0)).current
  const reduceMotion = useReduceMotion()

  const animate = useCallback((toValue: number) => {
    if (reduceMotion) {
      // 减弱动态效果：不做补间，直接呈现按下态。
      // 反馈仍然存在——去掉的是「动」，不是「按下了」这个信息。
      pressed.setValue(toValue)
      return
    }
    Animated.spring(pressed, {
      toValue,
      // bounciness 0 = 不回弹。回弹会让高频点击显得黏滞，
      // 而 HIG 要的是 "brief and precision"。
      bounciness: 0,
      speed: 40,
      useNativeDriver: true,
    }).start()
  }, [pressed, reduceMotion])

  return useMemo<PressEmphasis>(() => ({
    handlers: {
      onPressIn: () => { animate(1) },
      onPressOut: () => { animate(0) },
    },
    transformStyle: {
      transform: [{
        scale: pressed.interpolate({
          inputRange: [0, 1],
          outputRange: [1, scale],
        }),
      }],
    },
    glowOpacity: pressed.interpolate({
      inputRange: [0, 1],
      outputRange: [0, glowBoost],
    }),
  }), [animate, glowBoost, pressed, scale])
}

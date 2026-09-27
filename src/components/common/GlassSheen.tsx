import { memo, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

import { useReduceMotion } from '@/utils/hooks'
import { Radius } from '@/theme/layout'

interface Props {
  /** 与宿主圆角保持一致，避免光带溢出到圆角外 */
  radius?: number
  /** 光带宽度 */
  width?: number
  /** 光带亮度，玻璃面板建议 0.10~0.20 */
  opacity?: number
  /** 单次掠过耗时 */
  duration?: number
  /** 首次掠过的延迟，让同屏多个玻璃面不同步 */
  delay?: number
  style?: StyleProp<ViewStyle>
}

/**
 * 玻璃扫光：一条倾斜的柔光带周期性掠过玻璃表面。
 *
 * 之所以需要它：静态的半透明底 + 描边只能表现"玻璃是什么样"，
 * 无法表现"玻璃是活的"。真实 iOS 玻璃会随设备姿态改变反射，
 * 这里用一条缓慢掠过的光带做最廉价的等效表达（纯 transform，走原生驱动）。
 *
 * 用法：作为玻璃宿主的子节点，宿主需要 position: relative（RN 默认即是）。
 */
export default memo(({
  radius = Radius.card,
  width = 92,
  opacity = 0.16,
  duration = 2400,
  delay = 0,
  style,
}: Props) => {
  const reduceMotion = useReduceMotion()
  const progress = useRef(new Animated.Value(0)).current
  const [hostWidth, setHostWidth] = useState(0)

  useEffect(() => {
    if (reduceMotion || hostWidth <= 0) return
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      // 立即复位并等待，形成"掠过—停顿"的节奏，而不是匀速来回
      Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.delay(2800),
    ]))
    animation.start()
    return () => { animation.stop() }
  }, [delay, duration, hostWidth, progress, reduceMotion])

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 1.5, hostWidth + width * 0.5],
  })

  const handleLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width
    setHostWidth(current => current === next ? current : next)
  }

  // 尊重系统的"减弱动态效果"：直接不渲染，避免无意义的常驻动画
  if (reduceMotion) return null

  return (
    <View
      pointerEvents="none"
      onLayout={handleLayout}
      style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: radius }, style]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: -24,
          bottom: -24,
          width,
          opacity,
          backgroundColor: '#fff',
          transform: [{ translateX }, { rotate: '18deg' }],
        }}
      />
    </View>
  )
})

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
})

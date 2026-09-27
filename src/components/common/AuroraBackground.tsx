import { memo, useEffect, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native'

import { useTheme } from '@/store/theme/hook'
import { useReduceMotion } from '@/utils/hooks'
import glowImage from '@/resources/images/glass-glow.png'

interface Orb {
  /** 主题色 token：品牌色 + 两个徽章色，形成多色光晕而不是单色背景 */
  color: 'c-primary' | 'c-badge-secondary' | 'c-badge-tertiary'
  /** 相对屏幕长边的尺寸比例 */
  size: number
  /** 相对屏幕宽/高的位置比例（允许负值，让光晕从边缘外探入） */
  left: number
  top: number
  opacity: number
  /** 漂移距离（px）与单程时长，构成缓慢呼吸 */
  drift: number
  duration: number
  delay: number
}

/**
 * 光晕布局：四团大柔光交错分布，覆盖四个象限，避免整屏出现"只有一角有色"。
 * 位置刻意错开，使漂移过程中不会同时聚到同一点。
 */
const ORBS: Orb[] = [
  { color: 'c-primary', size: 1.05, left: -0.3, top: -0.16, opacity: 0.62, drift: 34, duration: 9000, delay: 0 },
  { color: 'c-badge-secondary', size: 0.9, left: 0.5, top: -0.02, opacity: 0.5, drift: -30, duration: 11500, delay: 800 },
  { color: 'c-badge-tertiary', size: 0.78, left: -0.16, top: 0.44, opacity: 0.46, drift: 26, duration: 13000, delay: 1600 },
  { color: 'c-primary', size: 0.88, left: 0.46, top: 0.62, opacity: 0.56, drift: -22, duration: 14500, delay: 2400 },
]

/** 深色主题下同样的饱和度会压低次要文字对比度，整体减一档亮度 */
const DARK_OPACITY_SCALE = 0.6

const OrbView = memo(({ orb, color, base, width, height, opacityScale }: {
  orb: Orb
  color: string
  base: number
  width: number
  height: number
  opacityScale: number
}) => {
  const reduceMotion = useReduceMotion()
  const progress = useRef(new Animated.Value(0)).current
  const size = orb.size * base

  useEffect(() => {
    if (reduceMotion) return
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(orb.delay),
      Animated.timing(progress, {
        toValue: 1,
        duration: orb.duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 0,
        duration: orb.duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]))
    animation.start()
    return () => { animation.stop() }
  }, [orb.delay, orb.duration, progress, reduceMotion])

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, orb.drift],
  })
  const scale = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.08, 1],
  })

  return (
    <Animated.Image
      source={glowImage}
      resizeMode="stretch"
      style={{
        position: 'absolute',
        left: orb.left * width,
        top: orb.top * height,
        width: size,
        height: size,
        opacity: orb.opacity * opacityScale,
        tintColor: color,
        transform: [{ translateY }, { scale }],
      }}
    />
  )
})

/**
 * 动漫风极光底：在已虚化的主题背景之上铺一层多色柔光。
 *
 * 位置的讲究：本层必须压在 PageContent 的暗化遮罩**之下**，
 * 由遮罩承担对比度兜底（正文与次要文字仍满足 WCAG AA），
 * 同时上层玻璃面板能透出被遮罩调和过的色彩，得到"色彩从毛玻璃里渗出来"的观感。
 * 若直接压在最上层，饱和色会大面积落在列表文字背后，次要文字对比度会跌破 AA。
 */
export default memo(({ width, height }: { width: number, height: number }) => {
  const theme = useTheme()
  // 用实际布局尺寸校正：iOS 的 SafeAreaView 会让容器比窗口矮，直接用窗口高度会把下方光晕推出可视区
  const [size, setSize] = useState({ width, height })
  const opacityScale = theme.isDark ? DARK_OPACITY_SCALE : 1

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout
    setSize(current => (current.width === w && current.height === h) ? current : { width: w, height: h })
  }

  const base = Math.max(size.width, size.height)

  return (
    <View pointerEvents="none" onLayout={handleLayout} style={[StyleSheet.absoluteFill, styles.clip]}>
      {ORBS.map((orb, index) => (
        <OrbView
          key={`${orb.color}-${index}`}
          orb={orb}
          color={theme[orb.color]}
          base={base}
          width={size.width}
          height={size.height}
          opacityScale={opacityScale}
        />
      ))}
    </View>
  )
})

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
})

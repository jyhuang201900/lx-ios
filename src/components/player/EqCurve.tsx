import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, View, type LayoutChangeEvent } from 'react-native'

import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { useReduceMotion } from '@/utils/hooks'
import { buildEqGeometry } from '@/utils/curves'
import { createStyle } from '@/utils/tools'
import { Radius, Typography } from '@/theme/layout'

export interface EqCurveProps {
  /** 各频段增益（dB），键为频点 */
  gains: Record<number, number>
  /** 频点，必须按频率升序 */
  frequencies: readonly number[]
  min: number
  max: number
  height?: number
  /**
   * 预设切换的计数。变化时曲线从上一形态补间到当前形态。
   * 拖动滑块**不要**改这个值——拖动必须 1:1 跟手，加补间只会让它滞后于手指。
   */
  transitionId?: number
}

const LINE = 2

/**
 * 均衡器曲线。
 *
 * 画的是**设置曲线**，不是实测频响——这一点必须说清楚，否则就成了误导。
 * 每个频点的纵坐标是该频段的增益设定值，频点之间按 dB 线性连接，
 * 这是十段图示均衡器的标准画法。它回答「现在的设置是什么形状」，
 * 而不是「声音实际听起来如何」。
 *
 * 横轴是**对数频率轴**：这些频点是 ISO 三倍频程（31 / 62 / 125 … 16000），
 * 每段恰好是前一段的两倍，所以在对数轴上等距。于是 x 直接取索引比例，
 * 不需要 log 计算——等距横轴在这里是精确的，不是近似。
 *
 * 为什么用旋转的线段而不是 SVG：本项目没有 react-native-svg，
 * 而新增原生依赖要改 CocoaPods 配置、在本机无法验证 iOS 构建。
 * 10 个频点只有 9 段，纯 View 拼出来完全够用。
 */
export default memo(({ gains, frequencies, min, max, height = 88, transitionId }: EqCurveProps) => {
  const theme = useTheme()
  const reduceMotion = useReduceMotion()
  const [width, setWidth] = useState(0)

  const handleLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width
    setWidth(current => (current === next ? current : next))
  }

  // 预设切换的补间。
  //
  // 为什么这条动效值得有：它不是装饰，而是**过程本身携带信息**——
  // 你能看出这个预设把低频抬了多少、高频压了多少，跳变时看不到。
  // HIG motion.md 说 "Strive for realistic feedback motion that follows people's
  // gestures and expectations"，而预设切换就是一次手势，曲线形变正是这次
  // 手势的直接后果，不是凭空加的动画。
  //
  // 260ms、不回弹：同一份 motion.md 要求 "brief and precision"。
  // 减弱动态效果时直接跳到终态——去掉的是「动」，没去掉「结果」。
  const morph = useRef(new Animated.Value(1)).current
  const fromRef = useRef<Record<number, number>>(gains)
  const [displayGains, setDisplayGains] = useState<Record<number, number>>(gains)
  const firstRunRef = useRef(true)

  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false
      return
    }
    fromRef.current = displayGains
    if (reduceMotion) {
      morph.setValue(1)
      setDisplayGains(gains)
      return
    }
    morph.setValue(0)
    const id = morph.addListener(({ value }) => {
      const from = fromRef.current
      const next: Record<number, number> = {}
      for (const frequency of frequencies) {
        const a = from[frequency] ?? 0
        const b = gains[frequency] ?? 0
        next[frequency] = a + (b - a) * value
      }
      setDisplayGains(next)
    })
    const animation = Animated.timing(morph, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      // 补间值参与的是纵坐标计算（布局），不是 transform，所以走不了原生驱动
      useNativeDriver: false,
    })
    animation.start()
    return () => {
      animation.stop()
      morph.removeListener(id)
    }
    // 只在预设切换时触发；拖动滑块刻意不改变 transitionId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitionId])

  // 几何交给 src/utils/curves.ts 的纯函数，测试直接 import 那份实现——
  // 不要在这里另写一份，否则验证的和发货的会漂移（对比度脚本已经栽过一次）。
  const { points, segments, gridYs, zeroY } = useMemo(() => buildEqGeometry({
    gains: displayGains,
    frequencies,
    min,
    max,
    width,
    height,
    lineWidth: LINE,
    // 两侧各留 4px：频点是直径 7px 的圆点，贴着边缘会被切一半，
    // 看起来像渲染错误而不是设计
    inset: 4,
  }), [displayGains, frequencies, height, max, min, width])

  const curveColor = theme['c-primary-font']
  const pointFill = theme['c-content-background']

  return (
    <View>
      {/* 左侧固定刻度列 + 右侧绘图区。刻度必须占独立的一列，
          否则绝对定位会压在曲线起点上。 */}
      <View style={styles.body}>
        {/* 三个刻度按 zeroY 精确定位，不能用 space-between——
            那样「0」会偏离基线好几像素，读数就不可信了。 */}
        <View style={[styles.axisCol, { height }]}>
          <Text style={styles.boundTop} size={Typography.caption} color={theme['c-font-label']}>{max > 0 ? `+${max}` : max}</Text>
          <Text style={[styles.zero, { top: zeroY - 7 }]} size={Typography.caption} color={theme['c-font-label']}>0</Text>
          <Text style={[styles.boundBottom, { top: height - 15 }]} size={Typography.caption} color={theme['c-font-label']}>{min}</Text>
        </View>

        <View style={[styles.plot, { height }]} onLayout={handleLayout}>
          {/* 0dB 基线：整张图最重要的参考线，读曲线时唯一需要的是「零在哪」 */}
          {/* 基线用 c-chart-baseline 而不是 c-border-background：
              后者是装饰性描边，实算在浮层上只有 1.17:1（orange），
              而 0dB 是整张图唯一必须看清的参考线。 */}
          {/* 次级 dB 网格线（±5 / ±10）。0dB 已有独立基线，这里只补刻度感，
              所以压得很淡——网格是用来定位的，不是抢读数的。 */}
          {gridYs.map(y => (
            <View
              key={y}
              pointerEvents="none"
              style={[styles.gridLine, { top: y, backgroundColor: theme['c-chart-baseline'] }]}
            />
          ))}

          {/* 0dB 基线：整张图最重要的参考线，读曲线时唯一需要的是「零在哪」 */}
          <View style={[styles.baseline, { top: zeroY, backgroundColor: theme['c-chart-baseline'] }]} />

        {/* 频点竖线：从曲线落到基线的梳状填充。比一条孤线更像读数窗，
            也更容易一眼看出哪段在抬、哪段在压。 */}
        {points.map((p, index) => (
          <View
            key={frequencies[index]}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: p.x - LINE / 2,
              top: Math.min(p.y, zeroY),
              width: LINE,
              height: Math.max(1, Math.abs(zeroY - p.y)),
              borderRadius: LINE / 2,
              backgroundColor: curveColor,
              opacity: 0.16,
            }}
          />
        ))}

        {segments.map(segment => <View key={segment.key} pointerEvents="none" style={segment.style} />)}

        {points.map((p, index) => (
          <View
            key={frequencies[index]}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: p.x - 3.5,
              top: p.y - 3.5,
              width: 7,
              height: 7,
              borderRadius: Radius.control,
              backgroundColor: pointFill,
              borderWidth: 1.5,
              borderColor: curveColor,
            }}
          />
        ))}

        </View>
      </View>

      {/* 频率轴只标 31 / 500 / 16k。10 个标签在手机宽度上会糊成一片，
          而读曲线靠的是形状，不是逐个核对数字。 */}
      <View style={styles.freqRow}>
        <Text size={Typography.caption} color={theme['c-font-label']}>31</Text>
        <Text size={Typography.caption} color={theme['c-font-label']}>500</Text>
        <Text size={Typography.caption} color={theme['c-font-label']}>16k</Text>
      </View>
    </View>
  )
})

const styles = createStyle({
  body: {
    flexDirection: 'row',
  },
  axisCol: {
    position: 'relative',
    width: 26,
  },
  plot: {
    flex: 1,
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.7,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    // 比基线淡一档：网格负责定位，基线负责读数，两者不该一样重
    opacity: 0.3,
  },
  boundTop: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  zero: {
    position: 'absolute',
    left: 0,
  },
  boundBottom: {
    position: 'absolute',
    left: 0,
  },
  freqRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    marginLeft: 26,
  },
})

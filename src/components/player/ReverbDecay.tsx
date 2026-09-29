import { memo, useMemo, useState } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'

import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { buildDecayBars } from '@/utils/curves'
import { createStyle } from '@/utils/tools'
import { TabularNums, Typography } from '@/theme/layout'

export interface ReverbDecayProps {
  /** 衰减包络（dB，相对峰值，等时间取点） */
  envelope: readonly number[]
  /** 包络对应的总时长（秒） */
  duration: number
  /** 纵轴下界，一般是 -60 */
  floor?: number
  height?: number
}

/**
 * 混响衰减图（Schroeder 衰减曲线）。
 *
 * 画的是**脉冲响应的实测能量衰减**，由 scripts/analyze-reverb.mjs 从 .wav
 * 离线算出，不是示意曲线。纵轴 0 → -60dB，横轴是时间。
 * 曲线下方的填充让「尾巴有多长」一眼可见——那正是 RT60 的直观含义。
 *
 * 填充用等宽竖条拼而不是 SVG：本项目没有 react-native-svg，
 * 而新增原生依赖要改 CocoaPods、在本机无法验证 iOS 构建。
 * 48 个采样点铺满约 300px 时每条约 6px，视觉上就是连续的填充面。
 */
export default memo(({ envelope, duration, floor = -60, height = 72 }: ReverbDecayProps) => {
  const theme = useTheme()
  const [width, setWidth] = useState(0)

  const handleLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width
    setWidth(current => (current === next ? current : next))
  }

  // 几何走共享实现，测试 import 的就是这份
  const bars = useMemo(
    () => buildDecayBars(envelope, width, height, floor),
    [envelope, floor, height, width],
  )

  const gridDb = [-10, -20, -30, -40, -50]

  return (
    <View onLayout={handleLayout}>
      <View style={styles.body}>
        <View style={styles.axisCol}>
          <Text style={styles.axisTop} size={Typography.caption} color={theme['c-font-label']}>0</Text>
          <Text style={styles.axisBottom} size={Typography.caption} color={theme['c-font-label']}>{floor}</Text>
        </View>

        <View style={[styles.plot, { height }]} onLayout={handleLayout}>
          {/* 10dB 一档的参考网格 */}
          {gridDb.map(db => (
            <View
              key={db}
              pointerEvents="none"
              style={[styles.gridLine, { top: ((0 - db) / (0 - floor)) * height, backgroundColor: theme['c-chart-baseline'] }]}
            />
          ))}

          {/* 衰减填充：等宽竖条从曲线落到图底 */}
          {bars.map(bar => (
            <View
              key={bar.key}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: bar.left,
                top: bar.top,
                width: bar.width + 0.5,
                height: bar.height,
                backgroundColor: theme['c-primary-font'],
                opacity: 0.22,
              }}
            />
          ))}

          {/* 曲线本身 */}
          {bars.map(bar => (
            <View
              key={`l${bar.key}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: bar.left,
                top: bar.top,
                width: bar.width + 0.5,
                height: 2,
                backgroundColor: theme['c-primary-font'],
              }}
            />
          ))}
        </View>
      </View>

      {/* 时间轴：只标首尾，中间不堆数字 */}
      <View style={styles.timeRow}>
        <Text size={Typography.caption} color={theme['c-font-label']}>0 ms</Text>
        <Text style={TabularNums} size={Typography.caption} color={theme['c-font-label']}>
          {Math.round(duration * 1000)} ms
        </Text>
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
    height: 72,
  },
  axisTop: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  axisBottom: {
    position: 'absolute',
    left: 0,
    top: 57,
  },
  plot: {
    flex: 1,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    marginLeft: 26,
  },
})

import { memo, useMemo } from 'react'
import { TouchableOpacity, View } from 'react-native'

import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { downsampleEnvelope } from '@/utils/curves'
import { createStyle } from '@/utils/tools'
import { TabularNums, Typography } from '@/theme/layout'

/** 迷你曲线的列数。48 点全画在 100pt 宽里会糊成一片，降到 16 列足够看出形状 */
const COLUMNS = 16
const SPARK_HEIGHT = 18
const FLOOR = -60

export interface RoomDecayRowProps {
  label: string
  /** 衰减包络（dB，相对峰值，等时间取点） */
  envelope: readonly number[]
  /** RT60（秒）。null 表示测不出 */
  rt60: number | null
  /** 脉冲文件时长（秒），用于判断 RT60 是否只是下界 */
  duration: number
  selected: boolean
  onPress: () => void
}

/**
 * 混响选项行：名字 + 实测衰减曲线 + RT60。
 *
 * 从「13 个名字的勾选框」变成「可以按声学特征挑房间」——
 * 以前只能凭名字猜"大厅"和"卧室"有什么区别，现在曲线直接告诉你。
 *
 * 曲线的 x 轴是**各自时长的归一化位置**，不是共同时间轴。
 * 这一点很关键：`bright-hall` 的 RT60 是 3.40s，但脉冲文件只有 1.49s
 * （尾部被截断），在共同时间轴上它反而会显示成「最短的尾巴」，与事实相反。
 * 所以曲线只比**形状**，绝对量交给 RT60 与时长读数。
 */
export default memo(({ label, envelope, rt60, duration, selected, onPress }: RoomDecayRowProps) => {
  const theme = useTheme()

  // 降采样走共享实现（最近邻，不做平均——平均会把短瞬态抹平）
  const columns = useMemo(
    () => downsampleEnvelope(envelope, COLUMNS, FLOOR),
    [envelope],
  )

  const color = selected ? theme['c-primary-font'] : theme['c-font-label']

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Icon
        name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
        size={15}
        color={selected ? theme['c-primary-font-active'] : theme['c-font-label']}
      />
      <Text style={styles.label} size={13} numberOfLines={1}>{label}</Text>

      {/* 迷你衰减曲线：柱高 = 该时刻的电平 */}
      <View style={styles.spark} pointerEvents="none">
        {columns.map((db, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              marginRight: index == columns.length - 1 ? 0 : 1,
              height: Math.max(1, ((0 - db) / (0 - FLOOR)) * SPARK_HEIGHT),
              borderRadius: 1,
              backgroundColor: color,
              opacity: selected ? 0.85 : 0.4,
            }}
          />
        ))}
      </View>

      {/* RT60 是这一行真正的比较指标，所以给等宽数字。

          当 RT60 超过脉冲文件长度时标成「≥」：那说明尾巴在文件结束前
          还没衰减完，真实值只会更长。这时候 3.40s 严格来说是**下界**。
          标出来还有个附带好处——它解释了为什么 bright-hall 的曲线看着最平：
          不是混响少，是样本不够了。 */}
      <Text
        style={[styles.rt60, TabularNums]}
        size={Typography.caption}
        color={selected ? theme['c-font'] : theme['c-font-label']}
      >
        {rt60 == null ? '—' : `${rt60 > duration ? '≥' : ''}${rt60.toFixed(2)}s`}
      </Text>
    </TouchableOpacity>
  )
})

const styles = createStyle({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 34,
  },
  label: {
    width: 74,
  },
  spark: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: SPARK_HEIGHT,
  },
  rt60: {
    // 要放得下「≥3.40s」这种带下界标记的六字符读数
    width: 48,
    textAlign: 'right',
  },
})

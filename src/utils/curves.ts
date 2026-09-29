import type { ViewStyle } from 'react-native'

/**
 * 图表几何。纯函数，无 React 依赖。
 *
 * 为什么要单独抽出来：这些数学原本内联在组件里，而我验证它们时用的是一份
 * Python 复现——也就是**两份实现**。这个项目已经在对比度脚本上栽过一次
 * （Python 的 round() 是银行家舍入，JS 的 Math.round() 是四舍五入，色阶差了 1）。
 * 同样的坑不该踩第二次，所以让组件与测试共用这一份。
 *
 * 验证方式：node scripts/check-curves.mjs 直接 import 本文件。
 */

export interface CurvePoint {
  x: number
  y: number
}

export interface CurveSegment {
  key: number
  style: ViewStyle
}

export interface EqGeometry {
  points: CurvePoint[]
  segments: CurveSegment[]
  /** 次级 dB 网格线的 y 坐标（已排除 0 与上下界） */
  gridYs: number[]
  /** 0dB 基线的 y 坐标 */
  zeroY: number
}

export interface EqGeometryInput {
  /** 各频点增益（dB） */
  gains: Record<number, number>
  /** 频点，必须按频率升序 */
  frequencies: readonly number[]
  min: number
  max: number
  width: number
  height: number
  /** 曲线线宽 */
  lineWidth?: number
  /** 两侧内缩，避免端点圆点被切一半 */
  inset?: number
}

/**
 * 均衡器曲线的几何。
 *
 * 横轴是**对数频率轴**：ISO 三倍频程序列里每段恰好是前一段的两倍，
 * 所以在 log 轴上等距，x 直接取索引比例即可——这是精确的，不是近似。
 *
 * 纵轴线性映射到 dB，0dB 固定在正中。
 */
export const buildEqGeometry = ({
  gains,
  frequencies,
  min,
  max,
  width,
  height,
  lineWidth = 2,
  inset = 4,
}: EqGeometryInput): EqGeometry => {
  const zeroY = height / 2
  if (width <= 0 || frequencies.length === 0) {
    return { points: [], segments: [], gridYs: [], zeroY }
  }

  const span = max - min
  const usable = Math.max(0, width - inset * 2)
  const step = frequencies.length > 1 ? usable / (frequencies.length - 1) : 0
  const toY = (gain: number) => height - ((gain - min) / span) * height

  const points = frequencies.map((frequency, index) => ({
    x: inset + index * step,
    y: toY(gains[frequency] ?? 0),
  }))

  const segments = points.slice(0, -1).map((p, index): CurveSegment => {
    const q = points[index + 1]
    const dx = q.x - p.x
    const dy = q.y - p.y
    const length = Math.sqrt(dx * dx + dy * dy)
    return {
      key: index,
      style: {
        position: 'absolute',
        left: p.x,
        top: p.y - lineWidth / 2,
        width: length,
        height: lineWidth,
        borderRadius: lineWidth / 2,
        // React Native 的 rotation 绕视图中心；先挪到中心再转回原点，
        // 才能实现「绕左端点旋转」
        transform: [
          { translateX: length / 2 },
          { rotate: `${Math.atan2(dy, dx)}rad` },
          { translateX: -length / 2 },
        ],
      },
    }
  })

  // 次级网格只取**严格落在** (min, max) 内的 5dB 档：
  // 排除 0（它有独立基线），也排除上下界本身（那正好压在图的边缘，
  // 画出来只是描了个边框，不提供定位信息）
  const gridYs: number[] = []
  for (let dB = Math.ceil(min / 5) * 5; dB <= max; dB += 5) {
    if (dB === 0) continue
    if (dB <= min || dB >= max) continue
    gridYs.push(toY(dB))
  }

  return { points, segments, gridYs, zeroY }
}

export interface DecayBar {
  key: number
  left: number
  top: number
  width: number
  height: number
}

/**
 * 混响衰减图的柱状填充。
 * 纵轴 0dB 在顶、floor 在底；每个采样点一根柱子从曲线落到底。
 */
export const buildDecayBars = (
  envelope: readonly number[],
  width: number,
  height: number,
  floor = -60,
): DecayBar[] => {
  if (width <= 0 || envelope.length === 0) return []
  const step = width / envelope.length
  const toY = (db: number) => ((0 - db) / (0 - floor)) * height
  return envelope.map((db, index) => {
    const clamped = Math.max(db, floor)
    const top = toY(clamped)
    const left = index * step
    const isLast = index === envelope.length - 1
    return {
      key: index,
      left,
      // 中间的柱子 +0.5 让相邻不留缝；但最后一根不能也加，
      // 否则会越过绘图区右边缘 0.5px。它改为吸收余量，精确贴住右边界。
      width: isLast ? width - left : step + 0.5,
      top,
      height: Math.max(1, height - top),
    }
  })
}

/**
 * 把衰减包络降采样成固定列数（迷你曲线用）。
 *
 * 取最近邻而不是平均：迷你曲线要表达的是**形状**，平均会把短瞬态抹平
 * （48 点分到 16 列时，1 个采样点被 3 个平均掉，等于凭空削掉 4.8dB）。
 */
export const downsampleEnvelope = (
  envelope: readonly number[],
  columns: number,
  floor = -60,
): number[] => {
  if (envelope.length === 0 || columns <= 0) return []
  const out: number[] = []
  for (let c = 0; c < columns; c++) {
    const ratio = columns > 1 ? c / (columns - 1) : 0
    const index = Math.min(envelope.length - 1, Math.round(ratio * (envelope.length - 1)))
    out.push(Math.max(floor, envelope[index]))
  }
  return out
}

import { createContext, useContext, type ReactNode } from 'react'

/**
 * 播放页操作按钮的度量（方向 A 的模块化收敛）。
 *
 * 同一批按钮（播放模式、下载、加入歌单、队列、桌面歌词、定时退出）在竖屏
 * 与横屏里是**同一份实现**，差别只有尺寸：竖屏 42/24、横屏 32/22（外加
 * 横屏下方 7pt 的间距）。以前是两套文件逐字节复制，任何一次改动都要改两遍，
 * 而且已经出现过两套数值漂移。这里把差异收成三个数，实现只留一份。
 */
export interface ControlMetrics {
  /** 命中区直径 */
  size: number
  /** 图标原始尺寸 */
  iconSize: number
  /** 按钮下方留白（横屏侧栏需要，竖屏为 0） */
  marginBottom: number
}

const DEFAULT_METRICS: ControlMetrics = {
  size: 42,
  iconSize: 24,
  marginBottom: 0,
}

const ControlMetricsContext = createContext<ControlMetrics>(DEFAULT_METRICS)

export const ControlMetricsProvider = ({ value, children }: {
  value: ControlMetrics
  children: ReactNode
}) => (
  <ControlMetricsContext.Provider value={value}>{children}</ControlMetricsContext.Provider>
)

export const useControlMetrics = () => useContext(ControlMetricsContext)

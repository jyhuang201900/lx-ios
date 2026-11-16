/**
 * 播放失败恢复的判定与计数。
 *
 * 这里只放纯状态和判定，不发任何请求：真正“重取播放地址”的动作留在
 * `core/player/player.ts`（它持有当前流地址）。这样本文件不会被 player.ts
 * 反向依赖，两个模块不会形成循环导入。
 */

/** 同一首歌连续失败到这个次数就停止重试，停在错误态 */
export const MAX_CONSECUTIVE_FAILURES = 3

/** 判定为“播放地址已失效”的 HTTP 状态码：资源过期/CDN 拒绝/已被删除 */
const EXPIRED_STATUS_CODES = [403, 404, 410]

/** 状态码读不出来时的文案兜底（上游请求库有时只把状态塞进 message） */
const EXPIRED_MESSAGE_HINTS = ['expired', 'forbidden', 'not found', 'no such', 'expired url', '失效', '过期']

// 从各种形态的错误里抠出 HTTP 状态码；抠不到返回 null 而不是猜一个值
const readErrorStatus = (err: unknown): number | null => {
  if (err == null) return null
  const source = err as { status?: unknown, statusCode?: unknown, code?: unknown, message?: unknown }
  for (const raw of [source.status, source.statusCode, source.code, source.message]) {
    if (raw == null) continue
    const status = typeof raw === 'number' ? raw : Number(/^(\d{3})$/.exec(String(raw).trim())?.[1])
    if (Number.isFinite(status)) return status
  }
  return null
}

/**
 * 是否为“播放地址失效”（403/404/410 或明确的过期文案）。
 *
 * 只有这一类才值得用同一首歌重取地址；解码失败、格式不支持之类的
 * 重取也没用，重取反而拖长卡住的时间。
 */
export const isUrlExpiredError = (err: unknown): boolean => {
  const status = readErrorStatus(err)
  if (status != null && EXPIRED_STATUS_CODES.includes(status)) return true
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  if (!message) return false
  const lower = message.toLowerCase()
  return EXPIRED_MESSAGE_HINTS.some(hint => lower.includes(hint))
}

/**
 * 失败周期：同一首歌（同一 musicId）从第一次报错到播放成功之间算一轮。
 * 切歌或播放成功都会把这一轮清空，避免上一首的失败次数算到下一首头上。
 */
interface FailureCycle {
  musicId: string | null
  count: number
  /** 本轮是否已经用过那一次 URL 重取 */
  urlRetried: boolean
}
const failureCycle: FailureCycle = { musicId: null, count: 0, urlRetried: false }

const startCycle = (musicId: string) => {
  if (failureCycle.musicId === musicId) return
  failureCycle.musicId = musicId
  failureCycle.count = 0
  failureCycle.urlRetried = false
}

/** 记一次播放失败，返回这首歌在本轮里的连续失败次数 */
export const recordPlaybackFailure = (musicId: string): number => {
  startCycle(musicId)
  failureCycle.count += 1
  return failureCycle.count
}

/** 当前轮次的连续失败次数（换歌后自然是 0） */
export const getConsecutiveFailureCount = (musicId: string): number => failureCycle.musicId === musicId ? failureCycle.count : 0

/**
 * 申请本轮唯一的一次“URL 失效重取”名额。
 *
 * 名额绑定在失败周期上：本轮用掉了就返回 false，直到播放成功
 * （resetPlaybackFailure）之后才重新开放。这就是“只重试一次”的边界。
 */
export const tryAcquireUrlRetry = (musicId: string): boolean => {
  if (failureCycle.musicId !== musicId) return false
  if (failureCycle.urlRetried) return false
  failureCycle.urlRetried = true
  return true
}

/**
 * 清空失败周期。
 * 传 musicId 时只在它仍是当前轮次的主角时才清，防止过期的“播放成功”事件
 * 把刚切到的新歌的失败计数抹掉。
 */
export const resetPlaybackFailure = (musicId?: string) => {
  if (musicId != null && failureCycle.musicId != null && failureCycle.musicId !== musicId) return
  failureCycle.musicId = null
  failureCycle.count = 0
  failureCycle.urlRetried = false
}

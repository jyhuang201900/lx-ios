/**
 * 播放音质的逐级降级链。
 *
 * 与 `recovery.ts` 的分工：
 * - `recovery.ts` 管「地址还在，但回 403/404/410 了」——同一个档位重取一次；
 * - 本文件管「这个档位根本取不到地址」——按 QUALITY_LADDER 从高到低逐档退让。
 *
 * 和 recovery.ts 一样，这里只放纯状态和判定，不发任何请求：真正重新取地址的动作
 * 留在 `core/player/player.ts`（它持有 musicInfo 和请求参数）。本文件不反向依赖
 * player.ts，两个模块不会形成循环导入。
 */

/**
 * 音质阶梯（由高到低）。
 *
 * 与 `utils/musicSdk/utils.js` 的 `QUALITYS` 同序；那边的额度/语义归契约文件所有，
 * 这里只读它的顺序，不修改、不重排。注意 master / hires / atmos 等档位不在阶梯里：
 * 它们是「高于阶梯」的档位，降级时从阶梯最高档开始找。
 */
export const QUALITY_LADDER: readonly LX.Quality[] = ['flac24bit', 'flac', 'wav', 'ape', '320k', '192k', '128k']

/** 同一首歌一次播放周期里最多降几档（与 recovery.ts 的 MAX_CONSECUTIVE_FAILURES 同量级） */
export const MAX_QUALITY_DOWNGRADES = 3

/** 某首歌声明可用的音质表，键为该档位、值为任意真值即为可用 */
export type AvailableQualities = Partial<Record<LX.Quality, unknown>>

/**
 * 比 current 低一档、且在 available 里可用的音质；没有更低的可用档返回 null。
 *
 * - current 在阶梯里：从它下面一档开始找；
 * - current 不在阶梯里（master / hires / atmos ...）：视为高于阶梯，从最高档开始找；
 * - current 为空：从最高档开始找。
 *
 * 纯函数，不读任何全局状态，便于直接断言。
 */
export const nextQuality = (
  current: LX.Quality | null | undefined,
  available: AvailableQualities | null | undefined,
): LX.Quality | null => {
  if (!available) return null
  const currentIndex = current != null ? QUALITY_LADDER.indexOf(current) : -1
  for (let index = Math.max(currentIndex + 1, 0); index < QUALITY_LADDER.length; index++) {
    const candidate = QUALITY_LADDER[index]
    if (available[candidate]) return candidate
  }
  return null
}

/**
 * 某首歌声明可用的音质（`meta._qualitys` 里为真的键）。
 *
 * 新版 musicInfo 用 `meta._qualitys` 取代了旧版的 `_types`，语义相同：
 * 「搜索/详情接口声明这首歌有哪些档位」。本地歌曲没有这个概念，返回空表。
 */
export const getAvailableQualities = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem): AvailableQualities => {
  const info = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
  if (info.source === 'local') return {}
  return info.meta._qualitys ?? {}
}

/**
 * 降级尝试记录：绑定「源 + 歌曲」，同一首歌（含同源的下载项）共享一条记录。
 *
 * 单例写法与 recovery.ts 的 failureCycle 保持一致：只保留当前这首歌的那一条，
 * 换歌（key 变了）自动从 0 开始，播放成功时由 resetQualityAttempt 清空。
 */
interface QualityAttemptState {
  key: string | null
  /** 本次周期已经降了几档 */
  downgrades: number
  /** 本次周期已经试过的档位，防止在阶梯里绕回同一个音质 */
  tried: LX.Quality[]
}

const qualityAttempt: QualityAttemptState = { key: null, downgrades: 0, tried: [] }

const createAttemptKey = (source: LX.Source, musicId: string) => `${source}_${musicId}`

const startAttempt = (key: string) => {
  if (qualityAttempt.key === key) return
  qualityAttempt.key = key
  qualityAttempt.downgrades = 0
  qualityAttempt.tried = []
}

export interface QualityAttempt {
  source: LX.Source
  musicId: string
  /** 本次周期已经降了几档 */
  getDowngradeCount: () => number
  /**
   * 取下一条降级目标；没有更低可用档、或已经降满 MAX_QUALITY_DOWNGRADES 档时返回 null。
   * 每返回一次就记一档，所以调用方必须真的拿它去取地址。
   */
  tryNext: (current: LX.Quality | null | undefined, available: AvailableQualities | null | undefined) => LX.Quality | null
}

/**
 * 取当前「源 + 歌曲」的降级记录。同 key 复用已有进度，换 key 从 0 开始。
 */
export const createQualityAttempt = (source: LX.Source, musicId: string): QualityAttempt => {
  const key = createAttemptKey(source, musicId)
  startAttempt(key)
  return {
    source,
    musicId,
    getDowngradeCount: () => qualityAttempt.key === key ? qualityAttempt.downgrades : 0,
    tryNext: (current, available) => {
      if (qualityAttempt.key !== key) return null
      if (qualityAttempt.downgrades >= MAX_QUALITY_DOWNGRADES) return null
      let candidate = nextQuality(current, available)
      // current 不在阶梯里时，第一次会算到阶梯最高的可用档；若该档本轮已经试过，
      // 从它继续往下找，避免把同一个音质取两遍
      while (candidate != null && qualityAttempt.tried.includes(candidate)) {
        candidate = nextQuality(candidate, available)
      }
      if (candidate == null) return null
      qualityAttempt.downgrades += 1
      qualityAttempt.tried.push(candidate)
      return candidate
    },
  }
}

/**
 * 清空降级记录。
 *
 * 传 source + musicId 时只在它仍是当前这条记录的主角时才清，防止过期的
 * 「播放成功」事件把刚切到的新歌的进度抹掉（与 resetPlaybackFailure 同一约束）。
 */
export const resetQualityAttempt = (source?: LX.Source | null, musicId?: string | null) => {
  if (source != null && musicId != null && qualityAttempt.key != null && qualityAttempt.key !== createAttemptKey(source, musicId)) return
  qualityAttempt.key = null
  qualityAttempt.downgrades = 0
  qualityAttempt.tried = []
}

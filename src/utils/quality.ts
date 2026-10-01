import settingState from '@/store/setting/state'

const qualityRank: Record<LX.Quality, number> = {
  master: 1000,
  atmos_plus: 900,
  atmos: 800,
  hires: 750,
  flac24bit: 700,
  wav: 600,
  flac: 500,
  ape: 400,
  '320k': 300,
  '192k': 200,
  '128k': 100,
}

/** 从高到低排序，并且去重 */
export const sortQualities = (qualities: readonly LX.Quality[]): LX.Quality[] => {
  return [...new Set(qualities)].sort((a, b) => (qualityRank[b] ?? 0) - (qualityRank[a] ?? 0))
}

/** 当前是否使用自定义音源脚本（此时可取音质由脚本自行决定） */
export const isCustomApiSource = (): boolean => /^user_api/.test(settingState.setting['common.apiSource'] ?? '')

/** 音源声明支持的音质（官方音源为内置能力，自定义音源为脚本声明） */
export const getSourceQualities = (source: LX.Source): LX.Quality[] => {
  return sortQualities(global.lx.qualityList[source] ?? [])
}

/**
 * 某首歌实际可选的音质：
 * - 官方音源：音源支持且歌曲元数据声明可用的交集（外加元数据里音源之外的档位）
 * - 自定义音源：以脚本声明的音质为准。搜索结果来自官方接口，其元数据不会包含
 *   hires/atmos/master 等档位，若继续求交集会让高音质永远无法选择
 */
export const getTrackQualities = (
  source: LX.Source,
  qualitys: Partial<Record<LX.Quality, unknown>> | undefined,
): LX.Quality[] => {
  const declared = getSourceQualities(source)
  const track = Object.keys(qualitys ?? {}).filter((quality): quality is LX.Quality => !!qualitys?.[quality as LX.Quality])
  if (isCustomApiSource()) return declared.length ? declared : sortQualities(track)
  return sortQualities([
    ...declared.filter(quality => track.includes(quality)),
    ...track.filter(quality => !declared.includes(quality)),
  ])
}

const qualityLabelKeys: Partial<Record<LX.Quality, string>> = {
  master: 'quality_master',
  atmos_plus: 'quality_atmos_plus',
  atmos: 'quality_atmos',
  hires: 'quality_hires',
  flac24bit: 'quality_lossless_24bit',
  flac: 'quality_lossless',
  '320k': 'quality_high_quality',
}

/** 音质的展示名：高音质档位有本地化名称，未收录的档位回退为原始档位名 */
export const getQualityLabel = (quality: LX.Quality): string => {
  const key = qualityLabelKeys[quality]
  if (!key) return quality
  const label = global.i18n.t(key as Parameters<typeof global.i18n.t>[0])
  return label === key ? quality : label
}

/**
 * 音质的「规格名」——即这个档位在音频工程里实际叫什么。
 *
 * 与 getQualityLabel 的区别：那个是给人读的友好名（无损 / 臻品全景声），
 * 这个是给仪表读数用的技术名（FLAC / ATMOS+ / HI-RES）。
 *
 * 为什么不走 i18n：这些是格式与标准的专有名称，中英文写法一致
 * （FLAC 就是 FLAC，Master 就是 Master），翻译它们反而会造出
 * 一个不存在的东西。真正的界面文案才需要本地化。
 */
const qualitySpecNames: Record<LX.Quality, string> = {
  master: 'MASTER',
  atmos_plus: 'ATMOS+',
  atmos: 'ATMOS',
  hires: 'HI-RES',
  flac24bit: 'FLAC 24BIT',
  wav: 'WAV',
  flac: 'FLAC',
  ape: 'APE',
  '320k': '320K',
  '192k': '192K',
  '128k': '128K',
}

export const getQualitySpecName = (quality: LX.Quality | null | undefined): string => {
  if (!quality) return ''
  return qualitySpecNames[quality] ?? quality.toUpperCase()
}

/**
 * 各档位的典型码率（kbps），用于把「实际字节数」反推回真实档位。
 *
 * 数值取自各平台公开的规格：有损档就是标称码率；无损档按 16bit/44.1kHz
 * 压缩后的常见值取；hi-res 以上按 24bit/96kHz 量级取。这是一张**判据表**，
 * 不是精确测量值，所以只用来区分量级（128k vs 无损 vs 母带），
 * 不做精细比较。
 */
const qualityBitrate: Partial<Record<LX.Quality, number>> = {
  '128k': 128,
  '192k': 192,
  '320k': 320,
  flac: 900,
  ape: 900,
  wav: 1411,
  flac24bit: 2300,
  hires: 2300,
  master: 4600,
}

/** 把 "04:16" 这样的时长转成秒 */
export const parseIntervalToSeconds = (interval: string | null | undefined): number => {
  if (!interval) return 0
  const parts = interval.split(':').map(v => Number(v))
  if (!parts.length || parts.some(v => !Number.isFinite(v))) return 0
  return parts.reduce((total, v) => total * 60 + v, 0)
}

/**
 * 用实际的流大小和时长反推真实码率，再判断它是否支撑得住所请求的档位。
 *
 * 为什么需要这个：自定义音源脚本只返回一个 URL 字符串，协议里没有任何字段
 * 说明它实际给的是哪一档（见 userApiFallback 的 normalizeRequestSuccess，
 * 那里强制 response 必须是字符串）。客户端原本把「请求的音质」直接当成
 * 「拿到的音质」，于是请求 master、后端实际回 flac 时，界面照旧显示 master，
 * 体积也和 flac 一模一样。
 *
 * 返回 null 表示**无法判断**（缺时长、缺大小、或该档位没有判据），
 * 此时调用方必须保持原判，不能臆测。
 */
export const inferQualityFromStream = (
  requested: LX.Quality,
  size: number | null,
  interval: string | null | undefined,
): LX.Quality | null => {
  if (!size || size <= 0) return null
  const seconds = parseIntervalToSeconds(interval)
  if (!seconds) return null

  const expected = qualityBitrate[requested]
  if (!expected) return null

  const actualKbps = (size * 8) / seconds / 1000
  // 实测码率够得上请求档位（留 25% 余量给容器开销与静音段），就认可
  if (actualKbps >= expected * 0.75) return null

  // 够不上：在判据表里找码率最接近实际的那一档
  let best: LX.Quality | null = null
  let bestGap = Infinity
  for (const [quality, bitrate] of Object.entries(qualityBitrate) as Array<[LX.Quality, number]>) {
    // 只在「不高于请求档位」的候选里挑，避免把降级判成升档
    if (bitrate > expected) continue
    const gap = Math.abs(bitrate - actualKbps)
    if (gap < bestGap) {
      bestGap = gap
      best = quality
    }
  }
  if (!best || best === requested) return null
  return best
}

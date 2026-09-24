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

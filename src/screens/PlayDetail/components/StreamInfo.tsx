import { useMemo } from 'react'
import { View } from 'react-native'

import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { usePlayMusicInfo, useStreamInfo } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

const getMusicInfo = (musicInfo: LX.Player.PlayMusic | null) => musicInfo && 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo

export const useAvailableQualities = () => {
  const playMusicInfo = usePlayMusicInfo()

  return useMemo(() => {
    const musicInfo = getMusicInfo(playMusicInfo.musicInfo)
    if (!musicInfo || musicInfo.source == 'local') return [] as LX.Quality[]
    const sourceQualities = global.lx.qualityList[musicInfo.source] ?? Object.keys(musicInfo.meta._qualitys) as LX.Quality[]
    return sourceQualities.filter((quality) => !!musicInfo.meta._qualitys[quality])
  }, [playMusicInfo])
}

export const useStreamLabels = () => {
  const t = useI18n()
  const sourceNameType = useSettingValue('common.sourceNameType')
  const preferredQuality = useSettingValue('player.playQuality')
  const streamInfo = useStreamInfo()
  const playMusicInfo = usePlayMusicInfo()
  const currentMusicInfo = getMusicInfo(playMusicInfo.musicInfo)
  const source = streamInfo.source ?? currentMusicInfo?.source ?? null
  const quality = streamInfo.quality ?? (currentMusicInfo?.source == 'local' ? null : preferredQuality)

  return useMemo(() => ({
    source: source == 'local'
      ? t('player_local_source')
      : source
        ? t(`source_${sourceNameType}_${source}` as any)
        : '',
    quality: quality ?? '',
  }), [quality, source, sourceNameType, t])
}

export default () => {
  const theme = useTheme()
  const t = useI18n()
  const { source, quality } = useStreamLabels()

  if (!source && !quality) return null

  return (
    <View style={styles.container}>
      {source ? <View style={{ ...styles.pill, backgroundColor: theme['c-primary-input-background'] }}>
        <Text style={styles.label} size={10} color={theme['c-font-label']}>{t('player_source')}</Text>
        <Text numberOfLines={1} size={11}>{source}</Text>
      </View> : null}
      {quality ? <View style={{ ...styles.pill, backgroundColor: theme['c-button-background-selected'] }}>
        <Text style={styles.label} size={10} color={theme['c-primary-font-active']}>{t('player_quality')}</Text>
        <Text numberOfLines={1} size={11} color={theme['c-primary-font-active']}>{quality}</Text>
      </View> : null}
    </View>
  )
}

const styles = createStyle({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    minHeight: 28,
    paddingBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '48%',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    gap: 4,
  },
  label: {
    opacity: 0.8,
  },
})

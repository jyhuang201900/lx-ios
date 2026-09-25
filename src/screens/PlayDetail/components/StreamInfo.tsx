import { useMemo } from 'react'
import { View } from 'react-native'

import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { usePlayMusicInfo, useStreamInfo } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { useUserApiList } from '@/store/userApi'
import { createStyle } from '@/utils/tools'
import { Radius } from '@/theme/layout'
import { getTrackQualities } from '@/utils/quality'

const getMusicInfo = (musicInfo: LX.Player.PlayMusic | null) => musicInfo && 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo

export const useAvailableQualities = () => {
  const playMusicInfo = usePlayMusicInfo()
  const apiSource = useSettingValue('common.apiSource')

  return useMemo(() => {
    const musicInfo = getMusicInfo(playMusicInfo.musicInfo)
    if (!musicInfo || musicInfo.source == 'local') return [] as LX.Quality[]
    // 自定义音源以脚本声明的音质为准（含 hires/atmos/master），官方音源要求歌曲元数据同样支持
    return getTrackQualities(musicInfo.source, musicInfo.meta._qualitys)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiSource, playMusicInfo])
}

export const useStreamLabels = () => {
  const t = useI18n()
  const sourceNameType = useSettingValue('common.sourceNameType')
  const apiSource = useSettingValue('common.apiSource')
  const userApiList = useUserApiList()
  const preferredQuality = useSettingValue('player.playQuality')
  const streamInfo = useStreamInfo()
  const playMusicInfo = usePlayMusicInfo()
  const currentMusicInfo = getMusicInfo(playMusicInfo.musicInfo)
  const source = streamInfo.source ?? currentMusicInfo?.source ?? null
  const quality = streamInfo.quality ?? (currentMusicInfo?.source == 'local' ? null : preferredQuality)
  const customApi = apiSource.startsWith('user_api')
    ? userApiList.find(api => api.id == apiSource)
    : undefined
  const sourceLabel = source == 'local'
    ? t('player_local_source')
    : source
      ? t(`source_${sourceNameType}_${source}` as Parameters<typeof t>[0])
      : ''
  const customSourceName = source ? customApi?.sources?.[source]?.name : undefined

  return useMemo(() => ({
    source: customApi && customSourceName
      ? `${customApi.name} · ${customSourceName || sourceLabel}`
      : sourceLabel,
    quality: quality ?? '',
  }), [customApi, customSourceName, quality, source, sourceLabel])
}

export default () => {
  const theme = useTheme()
  const t = useI18n()
  const { source, quality } = useStreamLabels()

  if (!source && !quality) return null

  return (
    <View style={styles.container}>
      {source ? <View style={{ ...styles.pill, backgroundColor: theme['c-glass-surface'] }}>
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
    borderRadius: Radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
    gap: 4,
    justifyContent: 'center',
  },
  label: {
    opacity: 0.8,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
})

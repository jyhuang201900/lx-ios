import { memo, useMemo } from 'react'
import { View } from 'react-native'

import DorpDownMenu from '@/components/common/DorpDownMenu'
import Text from '@/components/common/Text'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { hapticFeedback } from '@/utils/nativeModules/utils'
import { setPlaybackRate, updateMetaData } from '@/plugins/player'
import { setPlaybackRate as setLyricPlaybackRate } from '@/core/lyric'
import playerState from '@/store/player/state'

const RATES = [0.75, 1, 1.25, 1.5, 2] as const

interface Props {
  compact?: boolean
}

// 播放速率快捷选择，与音质按钮同构；更多精度可在播放设置弹窗中调整
export default memo(({ compact = false }: Props) => {
  const theme = useTheme()
  const t = useI18n()
  const playbackRate = useSettingValue('player.playbackRate')
  const menus = useMemo(() => RATES.map(rate => ({ action: String(rate), label: `${rate}x` })), [])
  const activeId = String(RATES.includes(playbackRate as any) ? playbackRate : 'other')

  const handlePress = ({ action }: typeof menus[number]) => {
    const rate = parseFloat(action)
    if (rate == playbackRate) return
    hapticFeedback('light')
    void setPlaybackRate(rate)
    void setLyricPlaybackRate(rate)
    void updateMetaData(playerState.musicInfo, playerState.isPlay, playerState.lastLyric, true)
    updateSetting({ 'player.playbackRate': rate })
  }

  return (
    <DorpDownMenu
      menus={menus}
      activeId={activeId}
      onPress={handlePress}
      center
      height={42}
      btnStyle={{ width: compact ? 76 : 92 }}
    >
      <View style={{
        ...styles.button,
        backgroundColor: theme['c-primary-input-background'],
        paddingHorizontal: compact ? 7 : 10,
      }}>
        <Text style={styles.caption} size={10} color={theme['c-font-label']}>{t('play_detail_setting_playback_rate')}</Text>
        <Text style={styles.value} size={compact ? 11 : 12} color={theme['c-primary-font-active']} numberOfLines={1}>{playbackRate.toFixed(2)}x</Text>
      </View>
    </DorpDownMenu>
  )
})

const styles = createStyle({
  button: {
    minHeight: 38,
    minWidth: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  caption: {
    lineHeight: 11,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  value: {
    lineHeight: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
})

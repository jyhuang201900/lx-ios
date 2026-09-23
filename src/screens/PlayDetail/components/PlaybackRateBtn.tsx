import { memo, useMemo } from 'react'
import { View } from 'react-native'

import DorpDownMenu from '@/components/common/DorpDownMenu'
import Text from '@/components/common/Text'
import { updateSetting } from '@/core/common'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { scaleSizeW } from '@/utils/pixelRatio'
import { hapticFeedback } from '@/utils/nativeModules/utils'
import { setPlaybackRate, updateMetaData } from '@/plugins/player'
import { setPlaybackRate as setLyricPlaybackRate } from '@/core/lyric'
import playerState from '@/store/player/state'

const RATES = [0.75, 1, 1.25, 1.5, 2] as const

// 播放速率快捷选择，用于播放页头部；更精细的调节仍在播放设置弹窗中
export default memo(() => {
  const theme = useTheme()
  const playbackRate = useSettingValue('player.playbackRate')
  const menus = useMemo(() => RATES.map(rate => ({ action: String(rate), label: `${rate}x` })), [])
  const active = playbackRate != 1
  const activeId = String(playbackRate)

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
      btnStyle={styles.trigger}
    >
      <View style={styles.triggerContent}>
        <Text style={{ ...styles.rateLabel, color: active ? theme['c-primary-font-active'] : theme['c-550'] }} size={11}>{Number(playbackRate).toFixed(2)}x</Text>
      </View>
    </DorpDownMenu>
  )
})

const styles = createStyle({
  trigger: {
    width: scaleSizeW(46),
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateLabel: {
    fontWeight: '600',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
})

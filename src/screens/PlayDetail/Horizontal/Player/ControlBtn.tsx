import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
// import { useIsPlay } from '@/store/player/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
// import { scaleSizeW } from '@/utils/pixelRatio'
import { useIsPlay } from '@/store/player/hook'
import { useLayout } from '@/utils/hooks'
import { marginLeft } from '../constant'
import { BTN_WIDTH } from '../MoreBtn/Btn'
import { markTimeoutExitInteraction } from '@/core/player/timeoutExit'
import { hapticFeedback } from '@/utils/nativeModules/utils'
import { Radius, neonGlow } from '@/theme/layout'

// const WIDTH = scaleSizeW(48)

const PrevBtn = ({ size }: { size: number }) => {
  const theme = useTheme()
  const handlePlayPrev = () => {
    markTimeoutExitInteraction()
    hapticFeedback('light')
    void playPrev()
  }
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={global.i18n.t('play_prev')}
      style={{ ...styles.cotrolBtn, width: size, height: size }}
      activeOpacity={0.5}
      onPress={handlePlayPrev}
    >
      <Icon name='prevMusic' color={theme['c-button-font']} rawSize={size * 0.7} />
    </TouchableOpacity>
  )
}
const NextBtn = ({ size }: { size: number }) => {
  const theme = useTheme()
  const handlePlayNext = () => {
    markTimeoutExitInteraction()
    hapticFeedback('light')
    void playNext()
  }
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={global.i18n.t('play_next')}
      style={{ ...styles.cotrolBtn, width: size, height: size }}
      activeOpacity={0.5}
      onPress={handlePlayNext}
    >
      <Icon name='nextMusic' color={theme['c-button-font']} rawSize={size * 0.7} />
    </TouchableOpacity>
  )
}

const TogglePlayBtn = ({ size }: { size: number }) => {
  const theme = useTheme()
  const isPlay = useIsPlay()
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={global.i18n.t(isPlay ? 'pause' : 'play')}
      style={{ ...styles.playBtn, width: size, height: size, backgroundColor: theme['c-button-background-selected'], ...neonGlow(theme, { radius: 14, opacity: 0.7 }) }}
      activeOpacity={0.6}
      onPress={() => {
        markTimeoutExitInteraction()
        hapticFeedback('medium')
        togglePlay()
      }}
    >
      {/* 与竖屏播放键一致：实心底上的图标要用选中态字色，
          c-button-font 在这个底色上只有 3.89:1（orange）不过 AA */}
      <Icon name={isPlay ? 'pause' : 'play'} color={theme['c-button-font-selected']} rawSize={size * 0.7} />
    </TouchableOpacity>
  )
}

const MIN_SIZE = BTN_WIDTH * 1.1
export default () => {
  const { onLayout, height, width } = useLayout()
  const size = Math.max(Math.min(height * 0.65, (width - marginLeft) * 0.52 * 0.3) * global.lx.fontSize, MIN_SIZE)
  return (
    <View style={{ ...styles.content, gap: size * 0.5 }} onLayout={onLayout}>
      <PrevBtn size={size} />
      <TogglePlayBtn size={size}/>
      <NextBtn size={size} />
    </View>
  )
}


const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    // paddingVertical: 8,
    gap: 22,
    // backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cotrolBtn: {
    justifyContent: 'center',
    alignItems: 'center',

    // backgroundColor: '#ccc',
    // marginLeft: 10,
  },
  playBtn: {
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

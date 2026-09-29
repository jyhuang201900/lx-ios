import { Animated, TouchableOpacity, View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
// import { useIsPlay } from '@/store/player/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { useIsPlay } from '@/store/player/hook'
import { createStyle } from '@/utils/tools'
import { useWindowSize } from '@/utils/hooks'
import { BTN_WIDTH } from './MoreBtn/Btn'
import { useMemo } from 'react'
import { markTimeoutExitInteraction } from '@/core/player/timeoutExit'
import { hapticFeedback } from '@/utils/nativeModules/utils'
import { neonGlow } from '@/theme/layout'
import { usePressEmphasis } from '@/theme/press'

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
  const press = usePressEmphasis({ scale: 0.92, glowBoost: 0.3 })
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={global.i18n.t(isPlay ? 'pause' : 'play')}
      style={{ ...styles.playBtn, width: size, height: size }}
      activeOpacity={0.6}
      {...press.handlers}
      onPress={() => {
        markTimeoutExitInteraction()
        hapticFeedback('medium')
        togglePlay()
      }}
    >
      {/* 签名元素：按下时收缩并让辉光加强。真实 Liquid Glass 就是
          「被触摸时更强调」，而不是自己在循环——见 usePressEmphasis 的说明。
          触感由上面的 hapticFeedback('medium') 承担，HIG motion.md 要求
          动效不能是传达信息的唯一途径。 */}
      <Animated.View
        style={[
          styles.playBtnFace,
          { width: size, height: size, backgroundColor: theme['c-button-background-selected'] },
          neonGlow(theme, { radius: 14, opacity: 0.7 }),
          { shadowOpacity: Animated.add(press.glowOpacity, 0.7) },
          press.transformStyle,
        ]}
      >
        <Icon name={isPlay ? 'pause' : 'play'} color={theme['c-button-font-selected']} rawSize={size * 0.7} />
      </Animated.View>
    </TouchableOpacity>
  )
}

const MAX_SIZE = BTN_WIDTH * 1.6
const MIN_SIZE = BTN_WIDTH * 1.2

export default () => {
  const winSize = useWindowSize()
  const maxHeight = Math.max(winSize.height * 0.11, MIN_SIZE)
  const containerStyle = useMemo(() => {
    return {
      ...styles.conatiner,
      maxHeight,
    }
  }, [maxHeight])
  const size = Math.min(Math.max(winSize.width * 0.33 * global.lx.fontSize * 0.4, MIN_SIZE), MAX_SIZE, maxHeight)

  return (
    <View style={containerStyle}>
      <PrevBtn size={size} />
      <TogglePlayBtn size={size}/>
      <NextBtn size={size} />
    </View>
  )
}


const styles = createStyle({
  conatiner: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: '4%',
    paddingVertical: 16,
    // backgroundColor: 'rgba(0, 0, 0, .1)',
  },
  cotrolBtn: {
    justifyContent: 'center',
    alignItems: 'center',

    // backgroundColor: '#ccc',
  },
  playBtn: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 视觉面与命中区分离：命中区保持固定尺寸，缩放与辉光只作用在视觉面上，
  // 这样按压缩放不会连带改变可点区域。
  playBtnFace: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

import { TouchableOpacity } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useIsPlay } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { playNext, togglePlay } from '@/core/player/player'
import { createStyle } from '@/utils/tools'
import { markTimeoutExitInteraction } from '@/core/player/timeoutExit'
import { hapticFeedback } from '@/utils/nativeModules/utils'
import { Radius } from '@/theme/layout'

const BUTTON_SIZE = 42
const ICON_SIZE = 21

const PlayNextBtn = () => {
  const theme = useTheme()

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={global.i18n.t('play_next')}
      style={styles.button}
      activeOpacity={0.55}
      onPress={() => {
        markTimeoutExitInteraction()
        hapticFeedback('light')
        void playNext()
      }}
    >
      <Icon name="nextMusic" color={theme['c-font']} size={ICON_SIZE} />
    </TouchableOpacity>
  )
}

const TogglePlayBtn = () => {
  const isPlay = useIsPlay()
  const theme = useTheme()

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={global.i18n.t(isPlay ? 'pause' : 'play')}
      style={{ ...styles.button, backgroundColor: theme['c-button-background-selected'] }}
      activeOpacity={0.62}
      onPress={() => {
        markTimeoutExitInteraction()
        hapticFeedback('medium')
        togglePlay()
      }}
    >
      <Icon name={isPlay ? 'pause' : 'play'} color={theme['c-button-font']} size={ICON_SIZE} />
    </TouchableOpacity>
  )
}

export default () => {
  return (
    <>
      <TogglePlayBtn />
      <PlayNextBtn />
    </>
  )
}

const styles = createStyle({
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

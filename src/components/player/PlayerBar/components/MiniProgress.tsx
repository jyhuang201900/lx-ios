import { View } from 'react-native'
import { useProgress } from '@/store/player/hook'
import { useBufferProgress } from '@/plugins/player'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

const clamp = (value: number) => Math.min(Math.max(value, 0), 1)

export default ({ autoUpdate }: { autoUpdate: boolean }) => {
  const theme = useTheme()
  const { progress } = useProgress(autoUpdate)
  const buffered = useBufferProgress()

  return (
    <View pointerEvents="none" style={{ ...styles.track, backgroundColor: theme['c-primary-alpha-800'] }}>
      <View style={{ ...styles.buffered, width: `${clamp(buffered) * 100}%`, backgroundColor: theme['c-primary-alpha-600'] }} />
      <View style={{ ...styles.fill, width: `${clamp(progress) * 100}%`, backgroundColor: theme['c-primary-font-active'] }} />
    </View>
  )
}

const styles = createStyle({
  track: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 4,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  buffered: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
})

import { View } from 'react-native'
import { usePlayerMusicInfo, useProgress } from '@/store/player/hook'
import { useBufferProgress } from '@/plugins/player'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

const clamp = (value: number) => Math.min(Math.max(value, 0), 1)

export default ({ autoUpdate }: { autoUpdate: boolean }) => {
  const theme = useTheme()
  const { progress } = useProgress(autoUpdate)
  const buffered = useBufferProgress()
  const musicInfo = usePlayerMusicInfo()

  // 没有歌时这条 2pt 细线既没有数据也读不出含义，只会横穿在迷你条底部
  // 像一条没对齐的分割线（截图里正是这个观感）。无歌时整条不出现。
  if (!musicInfo.id) return null

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

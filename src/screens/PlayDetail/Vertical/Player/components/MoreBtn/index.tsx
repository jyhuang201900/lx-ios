import { createStyle } from '@/utils/tools'
import { View } from 'react-native'
import PlayModeBtn from '@/screens/PlayDetail/components/controls/PlayModeBtn'
import MusicAddBtn from '@/screens/PlayDetail/components/controls/MusicAddBtn'
import DesktopLyricBtn from '@/screens/PlayDetail/components/controls/DesktopLyricBtn'
import CommentBtn from './CommentBtn'
import CollectBtn from './CollectBtn'
import DownloadBtn from '@/screens/PlayDetail/components/controls/DownloadBtn'
import QueueBtn from '@/screens/PlayDetail/components/controls/QueueBtn'
import { ControlMetricsProvider } from '@/screens/PlayDetail/components/controls/Metrics'

const METRICS = { size: 42, iconSize: 24, marginBottom: 0 }

export default () => {
  return (
    <ControlMetricsProvider value={METRICS}>
      <View style={styles.container}>
        <DesktopLyricBtn />
        <CollectBtn />
        <MusicAddBtn />
        <DownloadBtn />
        <PlayModeBtn />
        <CommentBtn />
        <QueueBtn />
      </View>
    </ControlMetricsProvider>
  )
}


const styles = createStyle({
  container: {
    minHeight: 48,
    paddingHorizontal: 4,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
})

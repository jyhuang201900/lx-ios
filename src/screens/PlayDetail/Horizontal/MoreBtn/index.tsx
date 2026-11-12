import { createStyle } from '@/utils/tools'
import { View } from 'react-native'
import PlayModeBtn from '@/screens/PlayDetail/components/controls/PlayModeBtn'
import MusicAddBtn from '@/screens/PlayDetail/components/controls/MusicAddBtn'
import TimeoutExitBtn from '@/screens/PlayDetail/components/controls/TimeoutExitBtn'
import QualityBtn from './QualityBtn'
import DownloadBtn from '@/screens/PlayDetail/components/controls/DownloadBtn'
import QueueBtn from '@/screens/PlayDetail/components/controls/QueueBtn'
import { ControlMetricsProvider } from '@/screens/PlayDetail/components/controls/Metrics'

const METRICS = { size: 32, iconSize: 22, marginBottom: 7 }

export default () => {
  return (
    <ControlMetricsProvider value={METRICS}>
      <View style={styles.container}>
        <TimeoutExitBtn />
        <MusicAddBtn />
        <DownloadBtn />
        <QualityBtn />
        <PlayModeBtn />
        <QueueBtn />
      </View>
    </ControlMetricsProvider>
  )
}


const styles = createStyle({
  container: {
    flexShrink: 0,
    flexGrow: 0,
    flexDirection: 'column',
    alignItems: 'center',
    // backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    position: 'absolute',
    height: '100%',
    left: 0,
    gap: 9,
    zIndex: 1,
  },
})

import { createStyle } from '@/utils/tools'
import { View } from 'react-native'
import PlayModeBtn from './PlayModeBtn'
import MusicAddBtn from './MusicAddBtn'
import DesktopLyricBtn from './DesktopLyricBtn'
import CommentBtn from './CommentBtn'
import CollectBtn from './CollectBtn'
import QualityBtn from './QualityBtn'

export default () => {
  return (
    <View style={styles.container}>
      <DesktopLyricBtn />
      <CollectBtn />
      <MusicAddBtn />
      <QualityBtn />
      <PlayModeBtn />
      <CommentBtn />
    </View>
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

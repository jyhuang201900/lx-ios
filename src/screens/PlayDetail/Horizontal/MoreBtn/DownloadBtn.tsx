import { downloadCurrentMusic } from '@/core/download'
import { hapticFeedback } from '@/utils/nativeModules/utils'
import Btn from './Btn'

export default () => <Btn icon="download-2" onPress={() => {
  hapticFeedback('light')
  void downloadCurrentMusic()
}} />

import { useRef } from 'react'
import DownloadQualityPicker, { type DownloadQualityPickerType } from '@/components/DownloadQualityPicker'
import playerState from '@/store/player/state'
import { toast } from '@/utils/tools'
import { hapticFeedback } from '@/utils/nativeModules/utils'
import Btn from './Btn'

export default () => {
  const pickerRef = useRef<DownloadQualityPickerType>(null)
  const handlePress = () => {
    hapticFeedback('light')
    const musicInfo = playerState.playMusicInfo.musicInfo
    const target = musicInfo && 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
    if (target && target.source != 'local') pickerRef.current?.show(target)
    else toast(global.i18n.t('player_download_unavailable'))
  }
  return <><Btn icon="download-2" onPress={handlePress} /><DownloadQualityPicker ref={pickerRef} /></>
}

import { useRef } from 'react'
import QueuePopup, { type QueuePopupType } from '@/screens/PlayDetail/components/QueuePopup'
import { hapticFeedback } from '@/utils/nativeModules/utils'
import Btn from './Btn'

export default () => {
  const popupRef = useRef<QueuePopupType>(null)

  return (
    <>
      <Btn icon="list-order" onPress={() => {
        hapticFeedback('light')
        popupRef.current?.open()
      }} />
      <QueuePopup ref={popupRef} />
    </>
  )
}

import { useLrcPlay } from '@/plugins/lyric'
import { useIsPlay, useStatusText } from '@/store/player/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'


export default () => {
  const { text } = useLrcPlay()
  const statusText = useStatusText()
  const isPlay = useIsPlay()

  return <Text style={styles.text} numberOfLines={1} size={13}>{isPlay ? text : statusText}</Text>
}

const styles = createStyle({
  text: {
    textAlign: 'center',
  },
})

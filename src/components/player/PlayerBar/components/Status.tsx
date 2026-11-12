import { useLrcPlay } from '@/plugins/lyric'
import { useIsPlay, usePlayerMusicInfo, useStatusText } from '@/store/player/hook'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'


export default ({ autoUpdate }: { autoUpdate: boolean }) => {
  const theme = useTheme()
  const { text } = useLrcPlay(autoUpdate)
  const statusText = useStatusText()
  const isPlay = useIsPlay()
  const musicInfo = usePlayerMusicInfo()
  const t = useI18n()
  // console.log('render status')

  // 无歌时给一句去处提示，而不是留一整行空白（空态需要"下一步做什么"）
  const status = !musicInfo.id
    ? t('play_bar_idle_desc')
    : isPlay ? text : statusText

  return <Text numberOfLines={1} size={12} color={theme['c-font-label']}>{status}</Text>
}

// const styles = createStyle({
//   text: {
//     // fontSize: 10,
//     // lineHeight: 18,
//     // height: 18,
//     // height: '100%',
//     // backgroundColor: 'rgba(0,0,0,0.2)',
//   },
// })

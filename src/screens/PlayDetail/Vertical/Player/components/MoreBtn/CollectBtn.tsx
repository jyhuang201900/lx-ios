import { useEffect, useState } from 'react'

import Btn from './Btn'
import { collectMusic, uncollectMusic } from '@/core/player/player'
import { LIST_IDS } from '@/config/constant'
import playerState from '@/store/player/state'
import { getListMusics } from '@/utils/listManage'
import { hapticFeedback } from '@/utils/nativeModules/utils'
import { useTheme } from '@/store/theme/hook'

export default () => {
  const [collected, setCollected] = useState(false)
  const theme = useTheme()

  useEffect(() => {
    const checkCollected = () => {
      const musicInfo = playerState.playMusicInfo.musicInfo
      if (!musicInfo) return setCollected(false)
      void getListMusics(LIST_IDS.LOVE).then((list) => {
        if (playerState.playMusicInfo.musicInfo?.id == musicInfo.id) setCollected(list.some(item => item.id == musicInfo.id))
      })
    }
    const handleListUpdate = (ids: string[]) => {
      if (ids.includes(LIST_IDS.LOVE)) checkCollected()
    }
    checkCollected()
    global.state_event.on('playMusicInfoChanged', checkCollected)
    global.app_event.on('myListMusicUpdate', handleListUpdate)
    return () => {
      global.state_event.off('playMusicInfoChanged', checkCollected)
      global.app_event.off('myListMusicUpdate', handleListUpdate)
    }
  }, [])

  const handlePress = () => {
    hapticFeedback('light')
    if (collected) uncollectMusic()
    else collectMusic()
  }

  return <Btn icon="love" color={collected ? theme['c-primary-font-active'] : undefined} onPress={handlePress} />
}

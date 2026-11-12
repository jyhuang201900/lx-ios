import { collectMusic, dislikeMusic, pause, play, playNext, playPrev, togglePlay, uncollectMusic } from '@/core/player/player'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'

export type PlayerAction = 'play' | 'pause' | 'skipNext' | 'skipPrev' | 'togglePlay' | 'collect' | 'uncollect' | 'dislike' | 'openDetail'

export const handlePlayerAction = async(action: PlayerAction) => {
  switch (action) {
    case 'play':
      play()
      break
    case 'pause':
      void pause()
      break
    case 'skipNext':
      void playNext()
      break
    case 'skipPrev':
      void playPrev()
      break
    case 'togglePlay':
      togglePlay()
      break
    case 'collect':
      collectMusic()
      break
    case 'uncollect':
      uncollectMusic()
      break
    case 'dislike':
      void dislikeMusic()
      break
    // 自动化与快捷指令用：直接进播放详情页（无歌曲时进的是空态详情）
    case 'openDetail':
      if (commonState.componentIds.home) navigations.pushPlayDetailScreen(commonState.componentIds.home, true)
      break
    // default: throw new Error('Unknown action: ' + (action as any ?? ''))
  }
}

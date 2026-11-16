import { addPlayedList, clearPlayedList } from '@/core/player/playedList'
import { pause, playNext, recoverFromPlaybackError } from '@/core/player/player'
import { resetPlaybackFailure } from '@/core/player/recovery'
import { setStatusText, setIsPlay } from '@/core/player/playStatus'
// import { resetPlayerMusicInfo } from '@/core/player/playInfo'
import { setStop } from '@/plugins/player'
import { delayUpdateMusicInfo, updateMetaData } from '@/plugins/player/playList'
import { soundEffectController } from '@/plugins/player/soundEffect'
import playerState from '@/store/player/state'
import settingState from '@/store/setting/state'
import { onHeadphonesDisconnected } from '@/utils/nativeModules/utils'
import { Platform } from 'react-native'


export default async(setting: LX.AppSetting) => {
  const setPlayStatus = () => {
    setIsPlay(true)
    // 真正播起来了就说明这一轮失败恢复走完了，连续失败计数清零
    const musicId = playerState.playMusicInfo.musicInfo?.id
    if (musicId) resetPlaybackFailure(musicId)
  }
  const setPauseStatus = () => {
    setIsPlay(false)
    if (global.lx.isPlayedStop) void pause()
  }

  /**
   * 播放报错。恢复动作（URL 失效重取、连续失败上限）在 core/player 里做，
   * 这里只负责把事件递过去；恢复本身不替产品决定跳下一首。
   */
  const handlePlayError = () => {
    setPauseStatus()
    void recoverFromPlaybackError()
  }

  const handleEnded = () => {
    // setTimeout(() => {
    if (global.lx.isPlayedStop) {
      setStatusText(global.i18n.t('player__end'))
      return
    }
    // resetPlayerMusicInfo()
    // global.app_event.stop()
    setStatusText(global.i18n.t('player__end'))
    void playNext(true)
    // })
  }

  const setStopStatus = () => {
    setIsPlay(false)
    setStatusText('')
    void setStop()
  }

  const updatePic = () => {
    if (!settingState.setting['player.isShowNotificationImage']) return
    if (playerState.playMusicInfo.musicInfo && playerState.musicInfo.pic) {
      delayUpdateMusicInfo(playerState.musicInfo, playerState.lastLyric)
    }
  }

  const refreshNowPlaying = () => {
    if (!playerState.playMusicInfo.musicInfo) return
    void updateMetaData(playerState.musicInfo, playerState.isPlay, playerState.lastLyric, true)
  }

  const handleConfigUpdated: typeof global.state_event.configUpdated = (keys, settings) => {
    if (keys.includes('player.togglePlayMethod')) {
      const newValue = settings['player.togglePlayMethod']
      if (playerState.playedList.length) clearPlayedList()
      const playMusicInfo = playerState.playMusicInfo
      if (newValue == 'random' && playMusicInfo.musicInfo && !playMusicInfo.isTempPlay) addPlayedList({ ...(playMusicInfo as LX.Player.PlayMusicInfo) })
    }
    if (keys.some(soundEffectController.isSettingKey)) void soundEffectController.applyCurrentConfig()
  }


  global.app_event.on('play', setPlayStatus)
  global.app_event.on('pause', setPauseStatus)
  global.app_event.on('error', handlePlayError)
  global.app_event.on('stop', setStopStatus)
  global.app_event.on('playerEnded', handleEnded)
  global.app_event.on('picUpdated', updatePic)
  global.app_event.on('musicToggled', refreshNowPlaying)
  global.app_event.on('lyricUpdated', refreshNowPlaying)
  global.state_event.on('configUpdated', handleConfigUpdated)
  void soundEffectController.applyCurrentConfig()

  if (Platform.OS == 'ios') {
    onHeadphonesDisconnected(() => {
      if (!playerState.isPlay) return
      void pause()
    })
  }
}

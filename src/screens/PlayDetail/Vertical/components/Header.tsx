import { memo, useRef } from 'react'

import { View, StyleSheet } from 'react-native'

import { pop } from '@/navigation'
import StatusBar from '@/components/common/StatusBar'
import { useTheme } from '@/store/theme/hook'
import { usePlayerMusicInfo } from '@/store/player/hook'
import Text from '@/components/common/Text'
import { scaleSizeH } from '@/utils/pixelRatio'
import { HEADER_HEIGHT as _HEADER_HEIGHT, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import commonState from '@/store/common/state'
import SettingPopup, { type SettingPopupType } from '../../components/SettingPopup'
import SoundEffectPopup, { type SoundEffectPopupType } from '../../components/SoundEffectPopup'
import { useStatusbarHeight } from '@/store/common/hook'
import { useSetting } from '@/store/setting/hook'
import { isSoundEffectActive, soundEffectController } from '@/plugins/player/soundEffect'
import Btn from './Btn'
import TimeoutExitBtn from './TimeoutExitBtn'
import PlaybackRateBtn from '../../components/PlaybackRateBtn'
import { hapticFeedback } from '@/utils/nativeModules/utils'

export const HEADER_HEIGHT = scaleSizeH(_HEADER_HEIGHT)


const Title = () => {
  const theme = useTheme()
  const musicInfo = usePlayerMusicInfo()


  return (
    <View style={styles.titleContent}>
      <Text numberOfLines={1} style={styles.title}>{musicInfo.name}</Text>
      <Text numberOfLines={1} style={styles.title} size={12} color={theme['c-font-label']}>{musicInfo.singer}</Text>
    </View>
  )
}

export default memo(() => {
  const popupRef = useRef<SettingPopupType>(null)
  const soundEffectPopupRef = useRef<SoundEffectPopupType>(null)
  const statusBarHeight = useStatusbarHeight()
  const theme = useTheme()
  const setting = useSetting()
  const soundEffectSupported = soundEffectController.isSupported

  const back = () => {
    hapticFeedback('light')
    void pop(commonState.componentIds.playDetail!)
  }
  const showSetting = () => {
    hapticFeedback('light')
    popupRef.current?.show()
  }
  const showSoundEffect = () => {
    hapticFeedback('light')
    soundEffectPopupRef.current?.show()
  }

  return (
    <View style={{
      height: HEADER_HEIGHT + statusBarHeight,
      paddingTop: statusBarHeight,
      // 悬浮玻璃条：半透明底让下方内容透出，底边用亮色描边形成"受光边缘"。
      // 顶栏压在内容上，底色必须足够实——歌手名是 12pt 次要文字，
      // 落在更浅的底色上时部分主题会跌破 AA 4.5:1（china_ink 3.99:1）。
      backgroundColor: theme['c-glass-overlay'],
      borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.75)',
      borderBottomWidth: 1,
    }} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_header}>
      <StatusBar />
      <View style={styles.container}>
        <Btn icon="chevron-left" label={global.i18n.t('back')} onPress={back} />
        <Title />
        <PlaybackRateBtn />
        <TimeoutExitBtn />
        {/* 平台不支持音效处理时整个按钮不出现：给一个点了没反应的控件，
            比没有这个控件更糟——它会让人以为应用坏了。 */}
        {soundEffectSupported
          ? (
              <Btn icon="slider" label={global.i18n.t('setting_play_sound_effect')} color={isSoundEffectActive(setting) ? theme['c-primary-font-active'] : undefined} onPress={showSoundEffect} />
            )
          : null}
        <Btn icon="setting" size={16} label={global.i18n.t('nav_setting')} onPress={showSetting} />
      </View>
      <SoundEffectPopup ref={soundEffectPopupRef} layoutMode="stacked" />
      <SettingPopup ref={popupRef} direction="vertical" />
    </View>
  )
})


const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    // justifyContent: 'center',
    height: '100%',
  },
  titleContent: {
    flex: 1,
    paddingHorizontal: 9,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  icon: {
    paddingLeft: 4,
    paddingRight: 4,
  },
})

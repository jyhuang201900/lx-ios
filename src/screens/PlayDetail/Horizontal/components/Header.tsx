import { memo, useRef } from 'react'

import { View, StyleSheet, TouchableOpacity } from 'react-native'

import { Icon } from '@/components/common/Icon'
import { pop } from '@/navigation'
import { useTheme } from '@/store/theme/hook'
import { usePlayerMusicInfo } from '@/store/player/hook'
import Text from '@/components/common/Text'
import { scaleSizeH } from '@/utils/pixelRatio'
import { HEADER_HEIGHT as _HEADER_HEIGHT, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import commonState from '@/store/common/state'
import CommentBtn from './CommentBtn'
import Btn from './Btn'
import PlaybackRateBtn from '../../components/PlaybackRateBtn'
import SettingPopup, { type SettingPopupType } from '../../components/SettingPopup'
import SoundEffectPopup, { type SoundEffectPopupType } from '../../components/SoundEffectPopup'
import { useSetting } from '@/store/setting/hook'
import { isSoundEffectActive, soundEffectController } from '@/plugins/player/soundEffect'
import TimeoutExitEditModal, { type TimeoutExitEditModalType, useTimeInfo } from '@/components/TimeoutExitEditModal'

export const HEADER_HEIGHT = scaleSizeH(_HEADER_HEIGHT)

const Title = () => {
  const theme = useTheme()
  const musicInfo = usePlayerMusicInfo()


  return (
    <View style={styles.titleContent}>
      <Text numberOfLines={1} style={styles.title} size={14}>{musicInfo.name}</Text>
      <Text numberOfLines={1} style={styles.title} size={12} color={theme['c-font-label']}>{musicInfo.singer}</Text>
    </View>
  )
}

export default memo(() => {
  const popupRef = useRef<SettingPopupType>(null)
  const soundEffectPopupRef = useRef<SoundEffectPopupType>(null)
  const soundEffectSupported = soundEffectController.isSupported
  const timeoutModalRef = useRef<TimeoutExitEditModalType>(null)
  const timeInfo = useTimeInfo()
  const theme = useTheme()
  const setting = useSetting()

  const back = () => {
    void pop(commonState.componentIds.playDetail!)
  }
  const showSetting = () => {
    popupRef.current?.show()
  }
  const showSoundEffect = () => {
    soundEffectPopupRef.current?.show()
  }
  const showTimeoutExit = () => {
    timeoutModalRef.current?.show()
  }

  return (
    <View
      style={{
        height: HEADER_HEIGHT,
        // 玻璃浮层：顶栏压在内容上，底色必须足够实——次要文字若落在更浅的底色上，
        // 部分主题会跌破 AA 4.5:1（china_ink 3.99:1）。
        backgroundColor: theme['c-glass-overlay'],
        borderBottomColor: theme.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.70)',
        borderBottomWidth: 1,
      }}
      nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_header}
    >
      <View style={styles.container}>
        <TouchableOpacity onPress={back} style={{ ...styles.button, width: HEADER_HEIGHT }}>
          <Icon name="chevron-left" size={18} />
        </TouchableOpacity>
        <Title />
        <PlaybackRateBtn />
        <CommentBtn />
        <Btn icon="music_time" label={global.i18n.t('timeout_exit')} color={timeInfo.active ? theme['c-primary-font-active'] : undefined} onPress={showTimeoutExit} />
      {/* 平台不支持音效处理时整个按钮不出现：给一个点了没反应的控件，
          比没有这个控件更糟——它会让人以为应用坏了。 */}
      {soundEffectSupported
        ? (
            <Btn icon="slider" label={global.i18n.t('setting_play_sound_effect')} color={isSoundEffectActive(setting) ? theme['c-primary-font-active'] : undefined} onPress={showSoundEffect} />
          )
        : null}
        <Btn icon="setting" size={18} label={global.i18n.t('nav_setting')} onPress={showSetting} />
      </View>
      <SoundEffectPopup ref={soundEffectPopupRef} position="bottom" layoutMode="split" />
      <SettingPopup ref={popupRef} position="left" direction="horizontal" />
      <TimeoutExitEditModal ref={timeoutModalRef} timeInfo={timeInfo} />
    </View>
  )
})


const styles = StyleSheet.create({
  container: {
    flex: 0,
    // backgroundColor: '#ccc',
    flexDirection: 'row',
    // justifyContent: 'center',
    height: '100%',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    flex: 0,
  },
  titleContent: {
    flex: 1,
    // alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    // flex: 1,
    // textAlign: 'center',
  },
  icon: {
    paddingLeft: 4,
    paddingRight: 4,
  },
})

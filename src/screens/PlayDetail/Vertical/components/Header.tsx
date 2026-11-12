import { memo, useMemo, useRef } from 'react'

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
import { soundEffectController } from '@/plugins/player/soundEffect'
import Btn from './Btn'
import TimeoutExitEditModal, { type TimeoutExitEditModalType, useTimeInfo } from '@/components/TimeoutExitEditModal'
import PlaybackRateBtn from '../../components/PlaybackRateBtn'
import QualityBtn from '../../components/QualityBtn'
import DorpDownMenu from '@/components/common/DorpDownMenu'
import { hapticFeedback } from '@/utils/nativeModules/utils'

export const HEADER_HEIGHT = scaleSizeH(_HEADER_HEIGHT)


const Title = () => {
  const theme = useTheme()
  const musicInfo = usePlayerMusicInfo()
  // 无歌时原本两行都是空串：顶栏中间整块留白，两侧只剩 ‹ 和 …，
  // 截图上看像顶栏渲染失败。给一句状态，和迷你条用同一个词。
  const empty = !musicInfo.id

  return (
    <View style={styles.titleContent}>
      <Text
        numberOfLines={1}
        style={styles.title}
        color={empty ? theme['c-font-label'] : theme['c-font']}
      >
        {empty ? global.i18n.t('play_bar_idle_title') : musicInfo.name}
      </Text>
      {empty
        ? null
        : <Text numberOfLines={1} style={styles.title} size={12} color={theme['c-font-label']}>{musicInfo.singer}</Text>}
    </View>
  )
}

export default memo(() => {
  const popupRef = useRef<SettingPopupType>(null)
  const soundEffectPopupRef = useRef<SoundEffectPopupType>(null)
  const timeoutModalRef = useRef<TimeoutExitEditModalType>(null)
  const timeInfo = useTimeInfo()
  const statusBarHeight = useStatusbarHeight()
  const theme = useTheme()
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

  // V2 第一刀：音效与设置是"设置项"，不是每次切歌都要看的动作，
  // 收进「…」动作面板；倍速与定时仍留在顶栏（切歌时经常要调）。
  const moreMenus = useMemo(() => {
    const menus: Array<{ action: string, label: string }> = [
      { action: 'timeout', label: global.i18n.t('timeout_exit') },
    ]
    if (soundEffectSupported) menus.push({ action: 'soundEffect', label: global.i18n.t('setting_play_sound_effect') })
    menus.push({ action: 'setting', label: global.i18n.t('nav_setting') })
    return menus
  }, [soundEffectSupported])

  const handleMorePress = ({ action }: { action: string }) => {
    if (action == 'timeout') timeoutModalRef.current?.show()
    else if (action == 'soundEffect') showSoundEffect()
    else showSetting()
  }

  return (
    <View style={{
      height: HEADER_HEIGHT + statusBarHeight,
      paddingTop: statusBarHeight,
      // 方向 A：顶栏不是一条独立玻璃板，而是浮在页面上的控件行。
      // 底色交给 PageContent 已有的暗化遮罩（0.84/0.80 + 噪点，对比度已按 AA 验过），
      // 这里再压一层同色玻璃只会把标题和封面切成两截。
      backgroundColor: 'transparent',
    }} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_header}>
      <StatusBar />
      <View style={styles.container}>
        <Btn icon="chevron-left" label={global.i18n.t('back')} onPress={back} />
        <Title />
        <PlaybackRateBtn />
        {/* 规格胶囊：档位是每首歌都会变的信息，放在顶栏；工具行里那个同一入口撤掉，
            避免界面上出现两个“音质”。点击仍走 QualityBtn 自带的下拉。 */}
        <QualityBtn />
        <DorpDownMenu
          menus={moreMenus}
          onPress={handleMorePress}
          center
          height={42}
          btnStyle={styles.moreBtn}
        >
          <Text size={17} style={{ color: theme['c-font'] }}>…</Text>
        </DorpDownMenu>
      </View>
      <SoundEffectPopup ref={soundEffectPopupRef} layoutMode="stacked" />
      <TimeoutExitEditModal ref={timeoutModalRef} timeInfo={timeInfo} />
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
  moreBtn: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

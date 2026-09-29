import { memo, useCallback, useMemo, useState } from 'react'
import { Platform, View } from 'react-native'
import { useKeyboard } from '@/utils/hooks'

import Pic from './components/Pic'
import Title from './components/Title'
import Status from './components/Status'
import ControlBtn from './components/ControlBtn'
import MiniProgress from './components/MiniProgress'
import { createStyle } from '@/utils/tools'
// import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { Radius, createGlassStyle, createShadow } from '@/theme/layout'
import { usePageVisible } from '@/store/common/hook'
import { COMPONENT_IDS } from '@/config/constant'

const isIos = Platform.OS == 'ios'

export default memo(({ isHome = false }: { isHome?: boolean }) => {
  // const { onLayout, ...layout } = useLayout()
  const { keyboardShown } = useKeyboard()
  const theme = useTheme()
  const autoHidePlayBar = useSettingValue('common.autoHidePlayBar')
  const [autoUpdate, setAutoUpdate] = useState(true)

  usePageVisible([COMPONENT_IDS.home], useCallback((visible) => {
    if (isHome) setAutoUpdate(visible)
  }, [isHome]))

  const playerComponent = useMemo(() => (
    <View style={isIos ? styles.iosHost : undefined}>
      <View style={{ ...styles.container, ...createGlassStyle(theme, { radius: isIos ? 0 : Radius.card }), ...(isIos ? null : { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }) }}>
        <Pic isHome={isHome} />
        <View style={styles.center}>
          <Title isHome={isHome} />
          <Status autoUpdate={autoUpdate} />
        </View>
        <View style={styles.right}>
          <ControlBtn />
        </View>
        <MiniProgress autoUpdate={autoUpdate} />
      </View>
    </View>
  ), [autoUpdate, isHome, theme])

  // console.log('render pb')

  return autoHidePlayBar && keyboardShown ? null : playerComponent
})


const styles = createStyle({
  iosHost: {
    // 不内缩：与通栏标签栏连成一个底部单元，对应 iOS 26 把 MiniPlayer
    // 与标签栏合并为一个浮动组件的做法
    paddingBottom: 5,
  },
  container: {
    alignSelf: 'stretch',
    // height: 100,
    // paddingTop: progressContentPadding,
    // marginTop: -progressContentPadding,
    // backgroundColor: 'rgba(0, 0, 0, .1)',
    paddingVertical: 6,
    paddingLeft: 8,
    // backgroundColor: AppColors.primary,
    // backgroundColor: 'red',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    ...createShadow({ opacity: 0.12, radius: 16, offsetY: -4, elevation: 8 }),
  },
  left: {
    // borderRadius: 3,
    flexGrow: 0,
    flexShrink: 0,
  },
  center: {
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 10,
    height: '100%',
    // justifyContent: 'space-evenly',
    // height: 48,
    // backgroundColor: 'rgba(0, 0, 0, .1)',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
    paddingLeft: 6,
    paddingRight: 4,
  },
  // row: {
  //   flexDirection: 'row',
  //   flexGrow: 0,
  //   flexShrink: 0,
  // },
})

import { memo, useEffect, useState } from 'react'
import { View } from 'react-native'
// import { useLayout } from '@/utils/hooks'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useWindowSize } from '@/utils/hooks'
import { useNavigationComponentDidAppear } from '@/navigation'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { createStyle } from '@/utils/tools'
import { HEADER_HEIGHT } from './components/Header'
import { BTN_WIDTH } from './MoreBtn/Btn'
import { marginLeft } from './constant'
import Image from '@/components/common/Image'
import { useStatusbarHeight } from '@/store/common/hook'
import commonState from '@/store/common/state'
import { useTheme } from '@/store/theme/hook'
import { Radius, neonGlow, createSpecularEdge } from '@/theme/layout'


export default memo(({ componentId }: { componentId: string }) => {
  const musicInfo = usePlayerMusicInfo()
  const theme = useTheme()
  const { width: winWidth, height: winHeight } = useWindowSize()
  const statusBarHeight = useStatusbarHeight()

  const [animated, setAnimated] = useState(!!commonState.componentIds.playDetail)
  const [pic, setPic] = useState(musicInfo.pic)
  useEffect(() => {
    if (animated) setPic(musicInfo.pic)
  }, [musicInfo.pic, animated])

  useNavigationComponentDidAppear(componentId, () => {
    setAnimated(true)
  })

  let imgWidth = Math.min((winWidth * 0.45 - marginLeft - BTN_WIDTH) * 0.76, (winHeight - statusBarHeight - HEADER_HEIGHT) * 0.62)
  imgWidth -= imgWidth * (global.lx.fontSize - 1) * 0.3
  let contentHeight = (winHeight - statusBarHeight - HEADER_HEIGHT) * 0.66
  contentHeight -= contentHeight * (global.lx.fontSize - 1) * 0.2

  return (
    <View style={{ ...styles.container, height: contentHeight }}>
      <View style={{ ...styles.glowFrame, width: imgWidth, height: imgWidth, backgroundColor: theme['c-primary'], ...(animated ? neonGlow(theme, { radius: 20, opacity: 0.15 }) : null) }}>
        <View style={{ ...styles.content, width: imgWidth, height: imgWidth, elevation: animated ? 5 : 0, backgroundColor: theme['c-glass-overlay'] }}>
          <View style={styles.imageClip}>
            <Image url={pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} style={styles.image} />
            <View
              pointerEvents="none"
              style={createSpecularEdge(theme, { radius: Radius.card, width: 1.2 })}
            />
          </View>
        </View>
      </View>
    </View>
  )
})

const styles = createStyle({
  container: {
    flexShrink: 1,
    flexGrow: 0,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
  glowFrame: {
    borderRadius: Radius.card,
  },
  content: {
    borderRadius: Radius.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  imageClip: {
    flex: 1,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.card,
  },
})

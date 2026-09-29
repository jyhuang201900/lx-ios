import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
// import { useLayout } from '@/utils/hooks'
import { createStyle } from '@/utils/tools'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useWindowSize } from '@/utils/hooks'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { useNavigationComponentDidAppear } from '@/navigation'
import { HEADER_HEIGHT } from './components/Header'
import Image from '@/components/common/Image'
import { useStatusbarHeight } from '@/store/common/hook'
import commonState from '@/store/common/state'
import { useTheme } from '@/store/theme/hook'
import { Radius, neonGlow, createSpecularEdge } from '@/theme/layout'


export default ({ componentId }: { componentId: string }) => {
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
  // console.log('render pic')

  const style = useMemo(() => {
    const imgWidth = Math.min(winWidth * 0.8, (winHeight - statusBarHeight - HEADER_HEIGHT) * 0.5)
    return {
      width: imgWidth,
      height: imgWidth,
      borderRadius: Radius.card,
    }
  }, [statusBarHeight, winHeight, winWidth])

  return (
    <View style={styles.container}>
      <View style={{ ...styles.glowFrame, ...style, backgroundColor: theme['c-primary'], ...(animated ? neonGlow(theme, { radius: 22, opacity: 0.16 }) : null) }}>
        <View style={{ ...styles.content, ...style, elevation: animated ? 5 : 0, backgroundColor: theme['c-glass-overlay'] }}>
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
}

const styles = createStyle({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  glowFrame: {
    borderRadius: Radius.card,
  },
  content: {
    borderRadius: Radius.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
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

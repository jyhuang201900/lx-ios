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
import { Radius, neonGlow, createSpecularEdge, PlayMetrics } from '@/theme/layout'


export default ({ componentId }: { componentId: string }) => {
  const musicInfo = usePlayerMusicInfo()
  const theme = useTheme()
  const { width: winWidth, height: winHeight } = useWindowSize()
  const statusBarHeight = useStatusbarHeight()

  const [animated, setAnimated] = useState(!!commonState.componentIds.playDetail)
  const [pic, setPic] = useState(musicInfo.pic)
  // 实际可用区域由容器量出来，不再只按窗口高度推算：
  // 短屏（375×667）上播放器区固定占掉约 346pt，浏览器式地拿
  // (窗口高-状态栏-顶栏)*0.46 会算出 278pt 的封面，比这一页真正剩下的
  // 231pt 高 47pt，封面会压到进度条上。量一次容器，取 min(宽, 高) 才是对的。
  const [box, setBox] = useState({ width: 0, height: 0 })
  useEffect(() => {
    if (animated) setPic(musicInfo.pic)
  }, [musicInfo.pic, animated])

  useNavigationComponentDidAppear(componentId, () => {
    setAnimated(true)
  })
  // console.log('render pic')

  const style = useMemo(() => {
    // 方向 A：封面是独立发光体，宽度按「屏宽减左右各 26」取，留白不随机型漂移；
    // 高度上限优先用容器量到的真实可用高（短屏才不会压住进度条），
    // 首帧还没量到时退回窗口推算值。
    const fallbackWidth = winWidth - PlayMetrics.coverInset * 2
    const fallbackHeight = (winHeight - statusBarHeight - HEADER_HEIGHT) * PlayMetrics.coverHeightRatio
    const availableWidth = box.width > 0 ? box.width : fallbackWidth
    const availableHeight = (box.height > 0 ? box.height : fallbackHeight) - 8
    const imgWidth = Math.min(availableWidth, availableHeight)
    return {
      width: imgWidth,
      height: imgWidth,
      borderRadius: Radius.hero,
    }
  }, [box.height, box.width, statusBarHeight, winHeight, winWidth])

  return (
    <View style={styles.container} onLayout={({ nativeEvent }) => {
      const { width, height } = nativeEvent.layout
      setBox(prev => prev.width === width && prev.height === height ? prev : { width, height })
    }}>
      <View style={{ ...styles.glowFrame, ...style, backgroundColor: theme['c-primary'], ...(animated ? neonGlow(theme, { radius: 26, opacity: 0.1 }) : null) }}>
        <View style={{ ...styles.content, ...style, elevation: animated ? 5 : 0, backgroundColor: theme['c-glass-overlay'] }}>
          <View style={styles.imageClip}>
            <Image url={pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} style={styles.image} />
            <View
              pointerEvents="none"
              style={createSpecularEdge(theme, { radius: Radius.hero, width: 1.2 })}
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
    // 左右留白由 coverInset 在宽度公式里扣，容器不再重复加边距，
    // 否则 338pt 的封面会被 28pt 的内容盒裁掉 4pt。
    paddingHorizontal: 0,
  },
  glowFrame: {
    borderRadius: Radius.hero,
  },
  content: {
    borderRadius: Radius.hero,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
  },
  imageClip: {
    flex: 1,
    borderRadius: Radius.hero,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.hero,
  },
})

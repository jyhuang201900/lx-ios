// import { useEffect, useState } from 'react'
import { Image, Platform, SafeAreaView, StyleSheet, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import ImageBackground from '@/components/common/ImageBackground'
import AuroraBackground from '@/components/common/AuroraBackground'
import noiseImage from '@/resources/images/glass-noise.png'
import { useWindowSize } from '@/utils/hooks'
import { memo, useMemo } from 'react'
import { scaleSizeAbsHR } from '@/utils/pixelRatio'
import { defaultHeaders } from './common/Image'
import SizeView from './SizeView'
import { useBgPic } from '@/store/common/hook'

interface Props {
  children: React.ReactNode
}

// 模糊越强，上层玻璃透出的背景越均匀，"毛玻璃"感越明显（RN 只能在 Image 上用 blurRadius）
const BLUR_RADIUS = Math.max(scaleSizeAbsHR(26), 14)

const ContentContainer = ({ children }: Props) => {
  if (Platform.OS == 'ios') return <SafeAreaView style={{ flex: 1 }}>{children}</SafeAreaView>
  return <>{children}</>
}

/**
 * 磨砂膜：把噪点平铺在整屏最上层。
 *
 * 组件库里没有 backdrop-filter，只靠半透明色块做出来的"玻璃"始终像一块色板；
 * 叠一层约 4% 的极细颗粒后，观感立刻从"半透明"变成"磨砂"（真实毛玻璃的颗粒来自蚀刻面）。
 * 透明度按噪点 PNG 自带的 alpha 折算，0.4 大约等于 4% 的最终颗粒强度。
 */
const FrostFilm = memo(({ isDark }: { isDark: boolean }) => (
  // 外层负责不拦截触摸：Image 不接受 pointerEvents 属性
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Image
      source={noiseImage}
      resizeMode="repeat"
      // 用绝对定位的四边约束给 Image 一个确定尺寸：Android 的 repeat 需要明确宽高
      style={[StyleSheet.absoluteFill, { opacity: isDark ? 0.46 : 0.4 }]}
    />
  </View>
))

export default ({ children }: Props) => {
  const theme = useTheme()
  const windowSize = useWindowSize()
  const pic = useBgPic()
  // const [wh, setWH] = useState<{ width: number | string, height: number | string }>({ width: '100%', height: Dimensions.get('screen').height })

  // 固定宽高度 防止弹窗键盘时大小改变导致背景被缩放
  // useEffect(() => {
  //   const onChange = () => {
  //     setWH({ width: '100%', height: '100%' })
  //   }

  //   const changeEvent = Dimensions.addEventListener('change', onChange)
  //   return () => {
  //     changeEvent.remove()
  //   }
  // }, [])
  // const handleLayout = (e: LayoutChangeEvent) => {
  //   // console.log('handleLayout', e.nativeEvent)
  //   // console.log(Dimensions.get('screen'))
  //   setWH({ width: e.nativeEvent.layout.width, height: Dimensions.get('screen').height })
  // }
  // console.log('render page content')

  const themeComponent = useMemo(() => (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <ImageBackground
        style={{ position: 'absolute', left: 0, top: 0, height: windowSize.height, width: windowSize.width, backgroundColor: theme['c-content-background'] }}
        source={theme['bg-image']}
        resizeMode="cover"
        // 背景做柔和虚化，为上层玻璃表面提供可透出的色彩底色
        blurRadius={BLUR_RADIUS}
      />
      {/* 极光层压在遮罩之下：色彩由遮罩统一调和，既保证对比度又让上层玻璃有颜色可透 */}
      <AuroraBackground width={windowSize.width} height={windowSize.height} />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: theme['c-main-background'],
            // 玻璃质感的关键：遮罩留出可透出的余量，纯不透明会把背景完全压死
            opacity: theme.isDark ? 0.8 : 0.84,
          },
        ]}
      />
      <FrostFilm isDark={theme.isDark} />
      <ContentContainer>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          {children}
        </View>
      </ContentContainer>
    </View>
  ), [children, theme, windowSize.height, windowSize.width])
  const picComponent = useMemo(() => {
    return (
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <ImageBackground
          style={{ position: 'absolute', left: 0, top: 0, height: windowSize.height, width: windowSize.width, backgroundColor: theme['c-content-background'] }}
          source={{ uri: pic!, headers: defaultHeaders }}
          resizeMode="cover"
          blurRadius={BLUR_RADIUS}
        />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: theme['c-content-background'],
              // 自定义背景图不需要压太死，用户选它就是为了看得见
              opacity: 0.56,
            },
          ]}
        />
        <FrostFilm isDark={theme.isDark} />
        <ContentContainer>
          <View style={{ flex: 1, flexDirection: 'column' }}>
            {children}
          </View>
        </ContentContainer>
      </View>
    )
  }, [children, pic, theme, windowSize.height, windowSize.width])

  return (
    <>
      <SizeView />
      {pic ? picComponent : themeComponent}
    </>
  )
}

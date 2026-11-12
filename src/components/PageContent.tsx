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
  /**
   * 极光是否播放动态。
   * 默认 false（静态）：HIG motion.md 指出应用应避免给高频界面加常驻动效，
   * 静态版仍是每屏的品牌底色。只有播放详情页传 true。
   */
  aurora?: 'static' | 'animated'
  /**
   * 用当前歌曲封面作为整页底图。
   *
   * 只有播放详情页会用。依据 HIG materials.md：
   * "The clear variant is highly translucent, which is ideal for prioritizing the
   *    visibility of the underlying content… Use this variant for components that
   *    float above media backgrounds — such as photos and videos"
   * 封面就是媒体，而播放详情页的控件正是浮在它上面的功能层。
   *
   * 与主题底图分支的差别有三点，都是被对比度逼出来的：
   * 1. 模糊更强——封面要读成一块色彩场，不是图像；
   * 2. 遮罩更实，且用主题自己的底色而非固定黑白。固定黑遮罩会把最坏情况
   *    推向"纯黑封面"，浅色主题下次要文字的余量最薄；用主题底色则把封面
   *    往主题基调推，对比度波动收窄，色相仍然保留；
   * 3. 不叠极光——封面本身就是色彩来源，两个色彩来源会互相打架。
   */
  cover?: string | null
}

// 模糊越强，上层玻璃透出的背景越均匀，"毛玻璃"感越明显（RN 只能在 Image 上用 blurRadius）
const BLUR_RADIUS = Math.max(scaleSizeAbsHR(26), 14)

/** 封面底图的模糊强度：比主题底图更重，让封面读成色彩场而不是图像 */
const COVER_BLUR_RADIUS = Math.max(scaleSizeAbsHR(54), 30)

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
const FrostFilm = memo(({ isDark, width, height }: { isDark: boolean, width: number, height: number }) => (
  // 外层负责不拦截触摸：Image 不接受 pointerEvents 属性
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Image
      source={noiseImage}
      resizeMode="repeat"
      // repeat 必须拿到数值宽高：只给 absoluteFill 的四边约束时，iOS 不会平铺，
      // 只在左上角画一块 48pt 的噪点方块（实机截图里就是个白斑）。
      style={{ position: 'absolute', left: 0, top: 0, width, height, opacity: isDark ? 0.32 : 0.4 }}
    />
  </View>
))

export default ({ children, aurora = 'static', cover = null }: Props) => {
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
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: windowSize.height,
          width: windowSize.width,
          backgroundColor: theme['c-content-background'],
          // 深色主题不用底图。同一张亮底图在 0.9 的暗遮罩下仍会透出 10%，
          // 截图里就是屏幕下半部几道竖向亮纹加一道弧形——遮罩提到 0.95 才勉强
          // 干净，但那样极光也被一起压死了。深色模式下这个位置要的是"夜"，
          // 不是"磨砂玻璃后面有张图"，所以直接把底图透明掉，底色交给
          // c-content-background，光源只留极光一层。
          opacity: theme.isDark ? 0 : 1,
        }}
        source={theme['bg-image']}
        resizeMode="cover"
        // 背景做柔和虚化，为上层玻璃表面提供可透出的色彩底色
        blurRadius={BLUR_RADIUS}
      />
      {/* 极光层压在遮罩之下：色彩由遮罩统一调和，既保证对比度又让上层玻璃有颜色可透 */}
      <AuroraBackground width={windowSize.width} height={windowSize.height} animated={aurora === 'animated'} />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: theme['c-main-background'],
            // 玻璃质感的关键：遮罩留出可透出的余量，纯不透明会把背景完全压死。
            //
            // 深色这一档收回到 0.82：底图已经在上面关掉了，遮罩下面只剩极光
            // 一层。原来把遮罩提到 0.9 是为了压底图，结果连极光一起压到不可见，
            // 深色页退化成一块均匀的深灰。0.82 让极光（本身已有 0.6 的深色系数）
            // 透出 18%，是深色下唯一的光源。
            opacity: theme.isDark ? 0.82 : 0.84,
          },
        ]}
      />
      <FrostFilm isDark={theme.isDark} width={windowSize.width} height={windowSize.height} />
      <ContentContainer>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          {children}
        </View>
      </ContentContainer>
    </View>
  ), [aurora, children, theme, windowSize.height, windowSize.width])
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
        <FrostFilm isDark={theme.isDark} width={windowSize.width} height={windowSize.height} />
        <ContentContainer>
          <View style={{ flex: 1, flexDirection: 'column' }}>
            {children}
          </View>
        </ContentContainer>
      </View>
    )
  }, [children, pic, theme, windowSize.height, windowSize.width])

  // 封面底图：见 Props.cover 的说明。
  // 遮罩取 c-main-background（主题自己的底色）而不是黑/白，是为了让对比度
  // 可预测——RN 没有 backdrop-filter，玻璃是不透明的，底图只能通过玻璃那点
  // 不透明度渗色。底色越贴近主题，文字对比度的波动就越小。
  const coverComponent = useMemo(() => (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <ImageBackground
        style={{ position: 'absolute', left: 0, top: 0, height: windowSize.height, width: windowSize.width, backgroundColor: theme['c-content-background'] }}
        source={{ uri: cover!, headers: defaultHeaders }}
        resizeMode="cover"
        // 比主题底图更糊：封面要读成色彩场而不是图像，细节只会变成噪点
        blurRadius={COVER_BLUR_RADIUS}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: theme['c-main-background'],
            opacity: theme.isDark ? 0.72 : 0.76,
          },
        ]}
      />
      <FrostFilm isDark={theme.isDark} width={windowSize.width} height={windowSize.height} />
      <ContentContainer>
        <View style={{ flex: 1, flexDirection: 'column' }}>
          {children}
        </View>
      </ContentContainer>
    </View>
  ), [children, cover, theme, windowSize.height, windowSize.width])

  return (
    <>
      <SizeView />
      {cover ? coverComponent : pic ? picComponent : themeComponent}
    </>
  )
}

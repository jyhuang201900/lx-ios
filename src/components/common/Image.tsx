import { useTheme } from '@/store/theme/hook'
import { BorderRadius } from '@/theme'
import { createStyle } from '@/utils/tools'
import { type ComponentProps, memo, useCallback, useEffect, useMemo, useState } from 'react'
import { View, type ViewProps, StyleSheet, Image as FastImage } from 'react-native'
// import FastImage, { type FastImageProps } from 'react-native-fast-image'
import Text from './Text'
import { useLayout } from '@/utils/hooks'
// export type { OnLoadEvent } from 'react-native-fast-image'

export interface ImageProps extends ViewProps {
  style: ComponentProps<typeof FastImage>['style']
  url?: string | number | null
  cache?: boolean
  resizeMode?: ComponentProps<typeof FastImage>['resizeMode']
  onError?: (url: string | number) => void
}


export const defaultHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
}

const encodeUriSafe = (uri: string) => {
  try {
    return encodeURI(decodeURI(uri))
  } catch {
    return encodeURI(uri)
  }
}

const normalizeUri = (url?: string | number | null) => {
  if (typeof url != 'string') return url
  if (!url) return url
  if (url.startsWith('/')) return 'file://' + url

  let uri = url.trim()

  if (uri.startsWith('//')) uri = 'https:' + uri
  if (uri.includes('{size}')) uri = uri.replace(/\{size\}/g, '400')

  return encodeUriSafe(uri)
}

const EmptyPic = memo(({ style, nativeID }: { style: ImageProps['style'], nativeID: ImageProps['nativeID'] }) => {
  const theme = useTheme()
  const { onLayout, width } = useLayout()
  /**
   * 占位图不写品牌缩写。
   *
   * 这里原来渲染 `L` + `X` 两个字母，按宽度缩放到 64pt——封面位 352pt 时
   * 是一屏最醒目的东西，读起来像"应用渲染失败把 logo 漏出来了"，而不是
   * "这张封面还没加载"。而且品牌已经改名「听歌」，字母对不上任何现称。
   *
   * 用 `♪` 而不是 iconfont：字体里那个 `album` 字形是「圆角框里一个音符」，
   * 和标签栏的「歌单」图标是同一个符号——放到迷你条 44pt 的封面上，
   * 整条读作"歌单缩略图"；放到 352pt 封面上，放大后更像一个歌单入口。
   * U+266A 是纯音符，任何系统字体都有，语义只有"音乐"这一层。
   */
  /**
   * 上限提到 88。
   *
   * 原来的 56 是配 44pt 迷你条封面定的：44 × 0.42 ≈ 18，视觉刚好。但同一个
   * 56 套到 340pt 的播放页封面上只占 16%——整片浅绿里一颗小音符，读起来是
   * "加载失败"而不是"这张专辑还没封面"。0.42 的比例本身没问题（110pt 的
   * 歌单卡片算出 46、165pt 的大卡算出 69，都合身），只有大图被 56 提前截断。
   * 上限放到 88，等于只放开 width > 134 的那一档。
   */
  const size = Math.min(Math.max(width * 0.42, 16), 110)

  return (
    <View
      style={StyleSheet.compose({ ...styles.emptyPic, backgroundColor: theme['c-primary-light-900-alpha-200'] }, style)}
      onLayout={onLayout}
      nativeID={nativeID}
    >
      <Text size={size} color={theme['c-primary-font']} style={styles.mark}>♪</Text>
    </View>
  )
})

const Image = memo(({ url, cache, resizeMode = 'cover', style, onError, nativeID }: ImageProps) => {
  const theme = useTheme()
  const [isError, setError] = useState(false)
  const handleError = useCallback(() => {
    setError(true)
    onError?.(url!)
  }, [onError, url])
  useEffect(() => {
    setError(false)
  }, [url])
  let uri = typeof url == 'number'
    ? FastImage.resolveAssetSource(url).uri
    : normalizeUri(url) as string | undefined
  const showDefault = useMemo(() => !uri || isError, [isError, uri])
  return (
    showDefault ? <EmptyPic style={style} nativeID={nativeID} />
      : (
          <FastImage
            /**
             * 加载中要给封面位一个底色。
             *
             * 这里原来是裸 style：图片还没落盘的那一两秒，FastImage 是透明的，
             * 透出来的是卡片的白底——歌单页第一张卡就这么拍进过截图，一格纯白
             * 方片，和其它封面并排时读作"这张图坏了"。占位图（EmptyPic）用的是
             * c-primary-light-900-alpha-200，加载中也用同一个色，视觉上就是
             * "封面位在这里，图马上到"，而不是一块白板。
             */
            style={StyleSheet.compose(style, { backgroundColor: theme['c-primary-light-900-alpha-200'] })}
            source={{
              uri: uri!,
              headers: defaultHeaders,
              cache: cache === false ? 'reload' : 'force-cache',
              // priority: FastImage.priority.normal,
              // cache: cache === false ? 'web' : 'immutable',
            }}
            onError={handleError}
            resizeMode={resizeMode}
            nativeID={nativeID}
          />
        )
  )
}, (prevProps, nextProps) => {
  return prevProps.url == nextProps.url &&
    prevProps.style == nextProps.style &&
    prevProps.nativeID == nextProps.nativeID
})

export const getSize = (uri: string, success: (width: number, height: number) => void, failure?: (error: any) => void) => {
  FastImage.getSize(normalizeUri(uri) as string, success, failure)
}
export const clearMemoryCache = async() => {
  // return Promise.all([FastImage.clearMemoryCache(), FastImage.clearDiskCache()])
}
export default Image

const styles = createStyle({
  emptyPic: {
    borderRadius: BorderRadius.normal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 颜色仍取 c-primary-font（对任意主题自纠到 ≥4.5:1），再降透明度
  // 到 0.6：它是装饰性占位而不是信息文本，不该和真实封面抢眼
  mark: {
    opacity: 0.85,
  },
})

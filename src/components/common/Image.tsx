import { useTheme } from '@/store/theme/hook'
import { BorderRadius } from '@/theme'
import { createStyle } from '@/utils/tools'
import { type ComponentProps, memo, useCallback, useEffect, useMemo, useState } from 'react'
import { View, type ViewProps, StyleSheet, Image as FastImage } from 'react-native'
// import FastImage, { type FastImageProps } from 'react-native-fast-image'
import { Icon } from './Icon'
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
   * 占位图不再写品牌缩写。
   *
   * 这里原来渲染 `L` + `X` 两个字母，按宽度缩放到 64pt——封面位 352pt 时
   * 是一屏最醒目的东西，读起来像"应用渲染失败把 logo 漏出来了"，而不是
   * "这张封面还没加载"。而且品牌已经改名「听歌」，字母对不上任何现称。
   *
   * 改成一枚低对比的唱片图标：任何尺寸下都读作"这里本该有一张封面"，
   * 和 Apple Music 空封面的灰色音符是同一套语言。上限 56pt 是故意的——
   * 占位不该在大封面上抢主视觉。
   */
  const size = Math.min(Math.max(width * 0.42, 18), 56)

  return (
    <View
      style={StyleSheet.compose({ ...styles.emptyPic, backgroundColor: theme['c-primary-light-900-alpha-200'] }, style)}
      onLayout={onLayout}
      nativeID={nativeID}
    >
      <Icon
        name="album"
        // rawSize 绕过 scaleSizeW：这里的 size 是按已布局宽度算出的 pt 值，
        // 再乘一次屏幕缩放会让大封面上的图标偏大一档
        rawSize={size}
        color={theme['c-primary-font']}
        style={styles.mark}
      />
    </View>
  )
})

const Image = memo(({ url, cache, resizeMode = 'cover', style, onError, nativeID }: ImageProps) => {
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
            style={style}
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
    opacity: 0.6,
  },
})

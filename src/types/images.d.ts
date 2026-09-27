/**
 * 静态图片资源声明。
 *
 * Metro 会把 import 的图片解析成 { uri, width, height } 这类资源对象，
 * 但 TypeScript 不认识 .png 后缀，缺少这里会直接报 TS2307。
 */
declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native'

  const content: ImageSourcePropType
  export default content
}

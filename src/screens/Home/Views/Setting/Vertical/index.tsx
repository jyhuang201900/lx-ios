import { useCallback, useRef } from 'react'
import { ScrollView, View } from 'react-native'
import PageToolbar from '@/components/common/PageToolbar'
import NavList from './NavList'
import Main, { type MainType, type SettingScreenIds } from '../Main'
import { Gap } from '@/theme/layout'

export type { SettingScreenIds } from '../Main'

export default () => {
  const mainRef = useRef<MainType>(null)
  const handleChangeId = useCallback((id: SettingScreenIds) => {
    mainRef.current?.setActiveId(id)
  }, [])

  return (
    <View style={{ flex: 1 }}>
      <PageToolbar>
        <NavList onChangeId={handleChangeId} />
      </PageToolbar>
      {/**
       * 这里原本是一个没有滚动容器的 <View style={{ flex: 1 }}>。
       *
       * 后果不只是"最后几项看不到"：设置项按自然高度渲染，超出容器的部分
       * 在 iOS 上默认 overflow: visible，会直接画到下方的迷你播放条和标签栏
       * 上面——真机截图里"隐藏黑色主题背景"就是这样被压住的。
       * 而主题、语言、字体大小、分享方式等都在被压住的那一段之后，
       * 也就是说它们完全无法触达。
       *
       * 底部留白给 Section 自己的 marginBottom 之外再补一段，
       * 让最后一项滚到标签栏上方时仍有呼吸空间。
       */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Gap.page }}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        <Main ref={mainRef} />
      </ScrollView>
    </View>
  )
}

import { memo, useMemo } from 'react'
import { View } from 'react-native'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { Radius, Typography } from '@/theme/layout'

const styles = createStyle({
  chip: {
    borderRadius: Radius.pill,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  text: {
    marginRight: 6,
    fontWeight: '400',
    alignSelf: 'center',
    textAlign: 'center',
  },
})

export type BadgeType = 'normal' | 'secondary' | 'tertiary'

export default memo(({ type = 'normal', children }: {
  type?: BadgeType
  children: string
}) => {
  const theme = useTheme()
  /**
   * 这里原来是无底色的 9pt 纯文字，颜色取 c-badge-primary/secondary/tertiary——
   * 那三个都是无对比度保证的品牌/徽章色，实测最低只有 1.75:1（orange），
   * 而 9pt 连 iOS 的 11pt 最小字号都不到。这是全应用重复次数最多的元素里
   * 最不可读的一块文字。
   *
   * 改成真正的 chip：tint 底 + c-primary-font 字，字号提到 11pt。
   * 三个 tint 深浅不同，用来区分音质档位，实测 4.82 / 4.93 / 4.98:1 全部达标。
   */
  const background = useMemo(() => {
    switch (type) {
      case 'secondary': return theme['c-primary-light-600-alpha-800']
      case 'tertiary': return theme['c-primary-light-800-alpha-800']
      default: return theme['c-primary-light-400-alpha-800']
    }
  }, [type, theme])

  return (
    <View style={[styles.chip, { backgroundColor: background }]}>
      <Text style={styles.text} size={Typography.caption} color={theme['c-primary-font']}>{children}</Text>
    </View>
  )
})

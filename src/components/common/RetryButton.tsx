import { memo } from 'react'
import { TouchableOpacity } from 'react-native'

import Text from './Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { Radius } from '@/theme/layout'

/**
 * 各页面空态 / 错误态共用的动作按钮。
 *
 * 它原来是一枚 hairline 描边 + `c-border-background` 色的胶囊，字 12pt、
 * 用 `c-font-label`。在浅色磨砂背景上那圈描边几乎不可见，字色又和被说明
 * 的标题同一档深——真机截图里「去搜索添加歌曲」读起来就是一个输入框，
 * 没人会去点。
 *
 * 空态的动作应该是明确的：这里改成纯文字按钮，用 `c-primary-font` 和
 * 600 字重把"这是可以按的"直接写在颜色上，去掉形状竞争——空态里唯一的
 * 图形元素留给上面的图标盘。
 */
export default memo(({ label, onPress }: {
  label: string
  onPress: () => void
}) => {
  const theme = useTheme()
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.button}
      onPress={onPress}
    >
      <Text size={13} color={theme['c-primary-font']} style={styles.label}>{label}</Text>
    </TouchableOpacity>
  )
})

const styles = createStyle({
  button: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
  },
})

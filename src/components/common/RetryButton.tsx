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
 * 空态的动作应该是明确的。第一版改成纯文字按钮后，真机截图上它连形状都
 * 没了——「去搜索添加歌曲」只是标题下面多出来的一行绿字，比描边版更不像
 * 按钮。空态里需要一个能按的东西，就必须有一个能按的形状。
 *
 * 现在用最浅的一档主题面（`c-primary-background-active`，和选中态、图标盘
 * 同色）做底，字仍用 `c-primary-font` + 600。它比主按钮轻，比标题重，
 * 一眼能认出是按钮，又不会把整页的视觉重心抢走。
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
      style={[styles.button, { backgroundColor: theme['c-primary-background-active'] }]}
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

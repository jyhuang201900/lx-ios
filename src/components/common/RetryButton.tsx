import { memo } from 'react'
import { StyleSheet, TouchableOpacity } from 'react-native'

import Text from './Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'

// 各页面空态/错误态共用的重试按钮，保持一致的尺寸与圆角
export default memo(({ label, onPress }: {
  label: string
  onPress: () => void
}) => {
  const theme = useTheme()
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ ...styles.button, borderColor: theme['c-border-background'] }}
      onPress={onPress}
    >
      <Text size={12} color={theme['c-font-label']}>{label}</Text>
    </TouchableOpacity>
  )
})

const styles = createStyle({
  button: {
    minHeight: 34,
    paddingHorizontal: 18,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

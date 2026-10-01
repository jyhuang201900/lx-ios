import { memo } from 'react'

import Button, { type BtnProps } from '@/components/common/Button'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { Radius } from '@/theme/layout'

type ButtonProps = BtnProps

export default memo(({ disabled, onPress, children }: ButtonProps) => {
  const theme = useTheme()

  return (
    <Button style={{ ...styles.button, backgroundColor: theme['c-button-background'] }} onPress={onPress} disabled={disabled}>
      <Text style={styles.label} size={14} color={theme['c-button-font']}>{children}</Text>
    </Button>
  )
})

const styles = createStyle({
  button: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.button,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { textAlign: 'center', textAlignVertical: 'center' },
})

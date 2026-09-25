import { View } from 'react-native'

import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { FontWeight, Typography, glassCardShadow } from '@/theme/layout'


interface Props {
  title: string
  children: React.ReactNode | React.ReactNode[]
}

export default ({ title, children }: Props) => {
  const theme = useTheme()

  return (
    <View style={{ ...styles.container, ...glassCardShadow, backgroundColor: theme['c-glass-surface'], borderColor: theme['c-border-background'] }}>
      <Text style={{ ...styles.title, color: theme['c-font'] }} size={Typography.section} >{title}</Text>
      <View>
        {children}
      </View>
    </View>
  )
}


const styles = createStyle({
  container: {
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 16,
  },
  title: {
    // 与内部设置项（paddingHorizontal: 10）左对齐
    paddingLeft: 10,
    marginBottom: 14,
    fontWeight: FontWeight.semibold,
    textAlignVertical: 'center',
    // lineHeight: 16,
  },
})

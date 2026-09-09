import { View } from 'react-native'

import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'


interface Props {
  title: string
  children: React.ReactNode | React.ReactNode[]
}

export default ({ title, children }: Props) => {
  const theme = useTheme()

  return (
    <View style={{ ...styles.container, backgroundColor: theme['c-primary-input-background'], borderColor: theme['c-border-background'] }}>
      <Text style={{ ...styles.title, borderLeftColor: theme['c-primary'] }} size={16} >{title}</Text>
      <View>
        {children}
      </View>
    </View>
  )
}


const styles = createStyle({
  container: {
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  title: {
    borderLeftWidth: 5,
    paddingLeft: 12,
    marginBottom: 12,
    // lineHeight: 16,
  },
})

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
      <Text style={{ ...styles.title, color: theme['c-font'] }} size={16} >{title}</Text>
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
    paddingLeft: 1,
    marginBottom: 14,
    textAlignVertical: 'center',
    // lineHeight: 16,
  },
})

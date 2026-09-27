import { memo } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Gap, PageMetrics } from '@/theme/layout'
import { createStyle } from '@/utils/tools'

interface Props {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export default memo(({ children, style }: Props) => {
  return <View style={[styles.toolbar, style]}>{children}</View>
})

const styles = createStyle({
  toolbar: {
    height: PageMetrics.toolbarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Gap.inline,
    paddingHorizontal: PageMetrics.gutter,
    marginTop: PageMetrics.toolbarMargin,
    marginBottom: PageMetrics.toolbarMargin,
    zIndex: 2,
  },
})

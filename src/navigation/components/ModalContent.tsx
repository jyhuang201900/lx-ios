import { View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { Radius, createGlassStyle, createShadow } from '@/theme/layout'
// import { useWindowSize } from '@/utils/hooks'
const HEADER_HEIGHT = 20

interface Props {
  children: React.ReactNode
}


export default ({ children }: Props) => {
  const theme = useTheme()

  return (
    <View style={{ ...styles.centeredView, backgroundColor: 'rgba(50,50,50,.3)' }}>
      <View style={{ ...styles.modalView, ...createGlassStyle(theme, { radius: Radius.card }) }}>
        <View style={{ ...styles.header, backgroundColor: theme['c-primary-light-100-alpha-100'] }}></View>
        {children}
      </View>
    </View>
  )
}


const styles = createStyle({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    maxWidth: '90%',
    minWidth: '60%',
    maxHeight: '78%',
    // 圆角与底色由 createGlassStyle 统一给出
    ...createShadow({ opacity: 0.22, radius: 18, offsetY: 8, elevation: 3 }),
  },
  header: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    height: HEADER_HEIGHT,
  },
})

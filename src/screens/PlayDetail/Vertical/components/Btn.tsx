import { TouchableOpacity } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { createStyle } from '@/utils/tools'
import { scaleSizeH } from '@/utils/pixelRatio'
import { HEADER_HEIGHT as _HEADER_HEIGHT } from '@/config/constant'

export const HEADER_HEIGHT = scaleSizeH(_HEADER_HEIGHT)

export default ({ icon, size = 18, color, onPress, label }: {
  icon: string
  size?: number
  color?: string
  onPress: () => void
  /** 读屏器朗读的按钮名称 */
  label?: string
}) => {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ ...styles.button, width: HEADER_HEIGHT }}>
      <Icon name={icon} color={color} size={size} />
    </TouchableOpacity>
  )
}

const styles = createStyle({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    flex: 0,
    borderRadius: HEADER_HEIGHT / 2,
  },
})

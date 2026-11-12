import { TouchableOpacity } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useControlMetrics } from './Metrics'

/** 操作按钮：尺寸来自所在的 MoreBtn 行（竖屏 42 / 横屏 32），实现只有这一份。 */
export default ({ icon, color, onPress, onLongPress, label, size, iconSize }: {
  icon: string
  color?: string
  onPress: () => void
  onLongPress?: () => void
  /** 读屏器朗读的按钮名称 */
  label?: string
  /** 个别位置需要覆盖的尺寸，缺省用所在行的度量 */
  size?: number
  iconSize?: number
}) => {
  const theme = useTheme()
  const metrics = useControlMetrics()
  const boxSize = size ?? metrics.size
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ ...styles.controlBtn, width: boxSize, height: boxSize, marginBottom: metrics.marginBottom }}
      activeOpacity={0.5}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Icon name={icon} color={color ?? theme['c-font-label']} size={iconSize ?? metrics.iconSize} />
    </TouchableOpacity>
  )
}

const styles = createStyle({
  controlBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})

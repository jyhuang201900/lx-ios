import { useTheme } from '@/store/theme/hook'
import { useMemo, useRef, useImperativeHandle, forwardRef } from 'react'
import { Pressable, type PressableProps, StyleSheet, type StyleProp, type View, type ViewProps, type ViewStyle } from 'react-native'
// import { AppColors } from '@/theme'


export interface BtnProps extends PressableProps {
  ripple?: PressableProps['android_ripple']
  style?: ViewProps['style']
  onChangeText?: (value: string) => void
  onClearText?: () => void
  children: React.ReactNode
}


export interface BtnType {
  measure: (callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void) => void
}

export default forwardRef<BtnType, BtnProps>(({
  ripple: propsRipple = {},
  disabled,
  children,
  style,
  accessibilityRole,
  accessibilityState,
  ...props
}, ref) => {
  const theme = useTheme()
  const btnRef = useRef<View>(null)
  const ripple = useMemo(() => ({
    color: theme['c-primary-light-200-alpha-700'],
    ...propsRipple,
  }), [theme, propsRipple])

  useImperativeHandle(ref, () => ({
    measure(callback) {
      btnRef.current?.measure(callback)
    },
  }))

  return (
    <Pressable
      android_ripple={ripple}
      disabled={disabled}
      // iOS 上 android_ripple 不生效，这里用透明度提供按压反馈，并补齐按钮语义与禁用态
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      style={(state) => StyleSheet.compose(
        { opacity: disabled ? 0.3 : state.pressed ? 0.72 : 1 },
        style as StyleProp<ViewStyle>,
      )}
      {...props}
      ref={btnRef}
    >
      {children}
    </Pressable>
  )
})


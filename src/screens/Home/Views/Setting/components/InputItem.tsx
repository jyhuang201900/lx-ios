import { memo, useState, useEffect, useRef } from 'react'

import { StyleSheet, View, Keyboard } from 'react-native'
import type { InputType, InputProps } from '@/components/common/Input'
import Input from '@/components/common/Input'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { Radius, createContentSurface } from '@/theme/layout'


export interface InputItemProps extends InputProps {
  value: string
  label: string
  onChanged: (text: string, callback: (vlaue: string) => void) => void
}

export default memo(({ value, label, onChanged, ...props }: InputItemProps) => {
  const [text, setText] = useState(value)
  const textRef = useRef(value)
  const isMountRef = useRef(false)
  const inputRef = useRef<InputType>(null)
  const theme = useTheme()
  const saveValue = () => {
    onChanged?.(text, (value: string) => {
      if (!isMountRef.current) return
      const newValue = String(value)
      setText(newValue)
      textRef.current = newValue
    })
  }
  useEffect(() => {
    isMountRef.current = true
    return () => {
      isMountRef.current = false
    }
  }, [])
  useEffect(() => {
    const handleKeyboardDidHide = () => {
      if (!inputRef.current?.isFocused()) return
      onChanged?.(textRef.current, value => {
        if (!isMountRef.current) return
        const newValue = String(value)
        setText(newValue)
        textRef.current = newValue
      })
    }
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', handleKeyboardDidHide)

    return () => {
      keyboardDidHide.remove()
    }
  }, [onChanged])
  useEffect(() => {
    if (value != text) {
      const newValue = String(value)
      setText(newValue)
      textRef.current = newValue
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  const handleSetSelectMode = (text: string) => {
    setText(text)
    textRef.current = text
  }
  return (
    <View style={styles.container}>
      <Text style={styles.label} size={14}>{label}</Text>
      {/**
        * 输入框原来只有 c-control-surface 一层底。那个色是 c-primary-light-1000，
        * 跟页面底色的可区分度是 1.00:1 —— 等于看不见。真机截图里「最大缓存大小」
        * 下面那个 1024 就渲染成一行裸文字，没人看得出它是能改的。
        * 描边必须跟着一起来，这正是 createContentSurface 存在的理由。
        */}
      <Input
        value={text}
        ref={inputRef}
        onChangeText={handleSetSelectMode}
        style={{ ...styles.input, ...createContentSurface(theme, { radius: Radius.control }) }}
        {...props}
        onBlur={saveValue}
       />
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    paddingLeft: 10,
    marginBottom: 14,
  },
  label: {
    marginBottom: 5,
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    borderRadius: Radius.control,
    // paddingTop: 3,
    // paddingBottom: 3,
    maxWidth: 300,
  },
})

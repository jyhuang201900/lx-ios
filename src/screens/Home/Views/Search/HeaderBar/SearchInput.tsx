import { useCallback, useRef, forwardRef, useImperativeHandle, useState } from 'react'
import { View } from 'react-native'
import Input, { type InputType, type InputProps } from '@/components/common/Input'
import { useI18n } from '@/lang'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

export interface SearchInputProps {
  onChangeText: (text: string) => void
  onSubmit: (text: string) => void
  onBlur: () => void
  onTouchStart: () => void
}

export interface SearchInputType {
  setText: (text: string) => void
  // getText: () => string
  focus: () => void
  blur: () => void
}

export default forwardRef<SearchInputType, SearchInputProps>(({ onChangeText, onSubmit, onBlur, onTouchStart }, ref) => {
  // const theme = useTheme()
  const [text, setText] = useState('')
  const inputRef = useRef<InputType>(null)
  const t = useI18n()
  const theme = useTheme()

  useImperativeHandle(ref, () => ({
    // getText() {
    //   return text.trim()
    // },
    setText(text) {
      setText(text)
    },
    focus() {
      inputRef.current?.focus()
    },
    blur() {
      inputRef.current?.blur()
    },
  }))

  const handleChangeText = (text: string) => {
    setText(text)
    onChangeText(text.trim())
  }

  const handleClearText = useCallback(() => {
    setText('')
    onChangeText('')
    onSubmit('')
  }, [onChangeText, onSubmit])

  const handleSubmit = useCallback<NonNullable<InputProps['onSubmitEditing']>>(({ nativeEvent: { text } }) => {
    onSubmit(text)
  }, [onSubmit])

  return (
    <View style={{ ...styles.shell, backgroundColor: theme['c-primary-input-background'] }}>
      <Icon name="search-2" size={16} color={theme['c-font-label']} />
      <Input
        ref={inputRef}
        placeholder={t('search_input_placeholder')}
        value={text}
        onChangeText={handleChangeText}
        style={styles.input}
        onBlur={onBlur}
        onSubmitEditing={handleSubmit}
        onClearText={handleClearText}
        onTouchStart={onTouchStart}
        clearBtn
      />
    </View>
  )
})

const styles = createStyle({
  shell: {
    height: 46,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 3,
    borderRadius: 15,
  },
  input: {
    height: 44,
    paddingLeft: 9,
    fontSize: 15,
  },
})

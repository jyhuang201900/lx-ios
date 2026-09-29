import { useImperativeHandle, forwardRef, useMemo, useRef } from 'react'
import { View, TouchableHighlight } from 'react-native'

import Modal, { type ModalType } from './Modal'
import { Icon } from '@/components/common/Icon'
import { useKeyboard } from '@/utils/hooks'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { scaleSizeH } from '@/utils/pixelRatio'
import { IconSize, createGlassStyle, createShadow, Radius } from '@/theme/layout'

const HEADER_HEIGHT = 48
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
    // backgroundColor: 'white',
    borderRadius: Radius.sheet,
    ...createShadow({ opacity: 0.22, radius: 16, offsetY: 6, elevation: 6 }),
  },
  header: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomWidth: 1,
    height: HEADER_HEIGHT,
  },
  title: {
    flex: 1,
    paddingLeft: 20,
    paddingRight: 48,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    borderTopRightRadius: 18,
    flexGrow: 0,
    flexShrink: 0,
    height: HEADER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export interface DialogProps {
  onHide?: () => void
  keyHide?: boolean
  bgHide?: boolean
  closeBtn?: boolean
  title?: string
  children: React.ReactNode | React.ReactNode[]
  height?: number | `${number}%`
}

export interface DialogType {
  setVisible: (visible: boolean) => void
}

export default forwardRef<DialogType, DialogProps>(({
  onHide,
  keyHide = true,
  bgHide = true,
  closeBtn = true,
  title = '',
  children,
  height,
}: DialogProps, ref) => {
  const theme = useTheme()
  const { keyboardShown, keyboardHeight } = useKeyboard()
  const modalRef = useRef<ModalType>(null)

  useImperativeHandle(ref, () => ({
    setVisible(visible: boolean) {
      modalRef.current?.setVisible(visible)
    },
  }))

  const closeBtnComponent = useMemo(() => {
    return closeBtn
      ? <TouchableHighlight style={{ ...styles.closeBtn, width: scaleSizeH(HEADER_HEIGHT) }} underlayColor={theme['c-primary-dark-200-alpha-600']} onPress={() => modalRef.current?.setVisible(false)}>
      <Icon name="close" color={theme['c-font-label']} size={IconSize.affordance} />
        </TouchableHighlight>
      : null
  }, [closeBtn, theme])

  return (
    <Modal onHide={onHide} keyHide={keyHide} bgHide={bgHide} bgColor="rgba(50,50,50,.3)" ref={modalRef}>
      <View style={{ ...styles.centeredView, paddingBottom: keyboardShown ? keyboardHeight : 0 }}>
        <View style={{ ...styles.modalView, height, ...createGlassStyle(theme, { radius: Radius.sheet }) }} onStartShouldSetResponder={() => true}>
        {/* 标题条原来用 c-primary-light-100-alpha-100 作底、c-primary-light-1000 作字。
            那个底色不随外观切换：深色主题下它是浅灰 rgb(159,159,159)，
            而深色主题的文字同样是浅的——浅压浅。实测标题只有 1.61:1，
            连 c-font 落到这个底上也只有 1.86:1。
            问题在底色而非文字，所以别再给它编语义：去掉底色，改用发丝线分组
            （分隔线本就是分组手段），文字回到 c-font——
            那个 token 的档位是按对比度挑过的。 */}
        <View style={[styles.header, { borderBottomColor: theme['c-border-background'] }]}>
          <Text style={styles.title} size={13} color={theme['c-font']} numberOfLines={1}>{title}</Text>
            {closeBtnComponent}
          </View>
          {children}
        </View>
      </View>
    </Modal>
  )
})

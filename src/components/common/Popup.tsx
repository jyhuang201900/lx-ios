import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
import {
  Animated,
  PanResponder,
  View,
  TouchableOpacity,
  type LayoutChangeEvent,
} from 'react-native'

import Modal, { type ModalType } from './Modal'
import { Icon } from '@/components/common/Icon'
import { useKeyboard } from '@/utils/hooks'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { useStatusbarHeight } from '@/store/common/hook'
import { IconSize, Radius, createGlassStyle } from '@/theme/layout'

const styles = createStyle({
  centeredView: {
    flex: 1,
    // justifyContent: 'flex-end',
    // alignItems: 'center',
  },
  modalView: {
    elevation: 6,
    flexGrow: 0,
    flexShrink: 1,
  },
  header: {
    flex: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // 头部是下滑关闭的唯一拖拽区：内容区必须留给列表滚动，
    // 整块接管手势会把滚动一起吃掉。
    overflow: 'hidden',
  },
  title: {
    flex: 1,
    paddingLeft: 20,
    paddingRight: 44,
    paddingTop: 16,
    paddingBottom: 12,
    textAlign: 'center',
    textAlignVertical: 'center',
    // lineHeight: 20,
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    // borderTopRightRadius: 8,
    flexGrow: 0,
    flexShrink: 0,
    height: 44,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: '#eee',
  },
})

export interface PopupProps {
  onHide?: () => void
  keyHide?: boolean
  bgHide?: boolean
  closeBtn?: boolean
  position?: 'top' | 'left' | 'right' | 'bottom'
  title?: string
  children: React.ReactNode
}

export interface PopupType {
  setVisible: (visible: boolean) => void
}

export default forwardRef<PopupType, PopupProps>(({
  onHide = () => {},
  keyHide = true,
  bgHide = true,
  closeBtn = true,
  position = 'bottom',
  title = '',
  children,
}: PopupProps, ref) => {
  const theme = useTheme()
  const { keyboardShown, keyboardHeight } = useKeyboard()
  const statusBarHeight = useStatusbarHeight()

  const modalRef = useRef<ModalType>(null)
  const translateY = useRef(new Animated.Value(0)).current
  const sheetHeightRef = useRef(0)

  /**
   * 下滑关闭。
   *
   * 依据 HIG sheets.md：「Support swiping to dismiss a sheet. People expect to
   * swipe vertically to dismiss a sheet instead of tapping a dismiss button.」
   * 此前底部弹层只能靠一个 12pt 的 ✕ 图标关闭，是本项目最高频的交互缺口。
   *
   * 三个决定：
   * 1. 只挂在头部，不挂整块——否则会吃掉内容区的列表滚动。
   * 2. 只响应向下的位移，向上直接不接管——避免和「展开内容」的手势预期打架。
   * 3. 跟手 + 短促回弹，不用长动画。HIG motion.md 要求反馈动作「brief and precise」，
   *    并且「Let people cancel motion」：位移不够就弹回，不替用户做决定。
   *
   * 不加 resize grabber：这个弹层并不可调整尺寸，HIG sheets.md 说 grabber 是给
   * 「resizable sheet」的，加了就是承诺一个不存在的交互。
   */
  const dismissSheet = useCallback(() => {
    const height = sheetHeightRef.current || 320
    Animated.timing(translateY, {
      toValue: height,
      duration: 180,
      useNativeDriver: true,
    }).start(() => { modalRef.current?.setVisible(false) })
  }, [translateY])

  const panResponder = useMemo(() => PanResponder.create({
    // 声明可以接管垂直手势，否则在 ScrollView 头部里会被子视图截走
    onMoveShouldSetPanResponder: (_evt, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_evt, g) => {
      // 向上不跟随：给内容一个「这里不是拖拽把手」的信号
      translateY.setValue(Math.max(0, g.dy))
    },
    onPanResponderRelease: (_evt, g) => {
      const height = sheetHeightRef.current || 320
      const far = g.dy > height * 0.28
      const fast = g.vy > 0.8
      if (far || fast) {
        dismissSheet()
        return
      }
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 18,
      }).start()
    },
    onPanResponderTerminate: () => {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start()
    },
  }), [dismissSheet, translateY])

  useImperativeHandle(ref, () => ({
    setVisible(visible: boolean) {
      modalRef.current?.setVisible(visible)
    },
  }))

  const closeBtnComponent = useMemo(() => closeBtn
    ? <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={global.i18n.t('close')}
        style={styles.closeBtn}
        onPress={() => modalRef.current?.setVisible(false)}
      >
      <Icon name="close" style={{ color: theme['c-font-label'] }} size={IconSize.affordance} />
      </TouchableOpacity>
    : null, [closeBtn, theme])

  const handleSheetLayout = useCallback((e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.height
    if (next > 0) sheetHeightRef.current = next
  }, [])

  const [centeredViewStyle, modalViewStyle] = useMemo(() => {
    switch (position) {
      case 'top':
        return [
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            justifyContent: 'flex-start',
          },
          {
            width: '100%',
            maxHeight: '78%',
            minHeight: '20%',
            // backgroundColor: 'white',
          },
        ] as const
      case 'left':
        return [
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            flexDirection: 'row',
            justifyContent: 'flex-start',
          },
          {
            minWidth: '45%',
            maxWidth: '78%',
            height: '100%',
            paddingTop: statusBarHeight,
            // backgroundColor: 'white',
          },
        ] as const
      case 'right':
        return [
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            flexDirection: 'row',
            justifyContent: 'flex-end',
          },
          {
            minWidth: '45%',
            maxWidth: '78%',
            height: '100%',
            paddingTop: statusBarHeight,
            // backgroundColor: 'white',
          },
        ] as const
      case 'bottom':
      default:
        return [
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            justifyContent: 'flex-end',
          },
          {
            width: '100%',
            maxHeight: '78%',
            minHeight: '20%',
            // backgroundColor: 'white',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
        ] as const
    }
  }, [position, statusBarHeight])

  return (
    <Modal onHide={onHide} keyHide={keyHide} bgHide={bgHide} bgColor="rgba(50,50,50,.2)" ref={modalRef}
      animationType={position == 'bottom' ? 'slide' : 'fade'}
    >
      <View style={{ ...styles.centeredView, ...centeredViewStyle, paddingBottom: keyboardShown ? keyboardHeight : 0 }}>
        <Animated.View
          onLayout={handleSheetLayout}
          // 横向弹层不做下滑关闭：HIG sheets.md 说的是底部 sheet 的纵向手势，
          // 侧滑面板的预期是横向，不是纵向。
          style={{
            ...styles.modalView,
            ...modalViewStyle,
            ...createGlassStyle(theme, { radius: Radius.sheet }),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.16,
            shadowRadius: 18,
            transform: position == 'bottom' ? [{ translateY }] : undefined,
          }}
          onStartShouldSetResponder={() => true}
        >
          <View
            style={styles.header}
            {...(position == 'bottom' ? panResponder.panHandlers : null)}
          >
            <Text size={13} style={styles.title} numberOfLines={1}>{title}</Text>
            {closeBtnComponent}
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  )
})

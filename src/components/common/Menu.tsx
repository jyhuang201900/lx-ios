import { useImperativeHandle, forwardRef, useMemo, useRef, useState, type Ref } from 'react'
import { View, Animated, TouchableHighlight, StyleSheet } from 'react-native'
import { useWindowSize } from '@/utils/hooks'

import Modal, { type ModalType } from './Modal'

import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { scaleSizeH, scaleSizeW } from '@/utils/pixelRatio'
import { Radius, createGlassStyle } from '@/theme/layout'

const menuItemHeight = scaleSizeH(44)
const menuItemWidth = scaleSizeW(100)

export interface Position { w: number, h: number, x: number, y: number, menuWidth?: number, menuHeight?: number }
export interface MenuSize { width?: number, height?: number }
export type Menus = Readonly<Array<{ action: string, label: string, disabled?: boolean }>>

const styles = createStyle({
  mask: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0,
    backgroundColor: 'black',
  },
  menu: {
    position: 'absolute',
    borderRadius: Radius.card,
    backgroundColor: 'white',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
  },
  // 圆角裁剪放在内层，否则 iOS 上外层的阴影会被 overflow: hidden 一起裁掉。
  // 内层不再画描边：否则会盖住外层玻璃的上沿高光边
  menuClip: {
    flex: 1,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  menuItem: {
    paddingHorizontal: 16,
    // height: menuItemHeight,
    // width: menuItemWidth,
    // alignItems: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.10)',
    // backgroundColor: '#ccc',
  },
  // menuText: {
  //   // textAlign: 'center',
  //   fontSize: 14,
  // },
})

interface Props<M extends Menus = Menus> {
  menus: Readonly<M>
  onPress?: (menu: M[number]) => void
  buttonPosition: Position
  menuSize: MenuSize
  onHide: () => void
  width?: number
  height?: number
  fontSize?: number
  center?: boolean
  activeId?: M[number]['action'] | null
}

const Menu = ({
  buttonPosition,
  menuSize,
  menus,
  width,
  height,
  onPress = () => {},
  onHide,
  activeId,
  fontSize = 15,
  center = false,
}: Props) => {
  const theme = useTheme()
  const windowSize = useWindowSize()
  // const fadeAnim = useRef(new Animated.Value(0)).current
  // console.log(buttonPosition)

  const menuItemStyle = useMemo(() => {
    return {
      width: width ?? menuSize.width ?? menuItemWidth,
      height: height ?? menuSize.height ?? menuItemHeight,
    }
  }, [menuSize, width, height])

  const menuStyle = useMemo(() => {
    let menuHeight = menus.length * menuItemStyle.height
    const topHeight = buttonPosition.y - 20
    const bottomHeight = windowSize.height - buttonPosition.y - buttonPosition.h - 20
    if (menuHeight > topHeight && menuHeight > bottomHeight) menuHeight = Math.max(topHeight, bottomHeight)

    const menuWidth = menuItemStyle.width
    const bottomSpace = windowSize.height - buttonPosition.y - buttonPosition.h - 20
    const rightSpace = windowSize.width - buttonPosition.x - menuWidth
    const showInBottom = bottomSpace >= menuHeight
    const showInRight = rightSpace >= menuWidth
    const frameStyle: {
      height: number
      width: number
      top: number
      left?: number
      right?: number
    } = {
      height: menuHeight,
      top: showInBottom ? buttonPosition.y + buttonPosition.h : buttonPosition.y - menuHeight,
      width: menuWidth,
    }
    if (showInRight) {
      frameStyle.left = buttonPosition.x
    } else {
      frameStyle.right = windowSize.width - buttonPosition.x - buttonPosition.w
    }
    return frameStyle
  }, [menus.length, menuItemStyle, buttonPosition, windowSize])

  const menuPress = (menu: Menus[number]) => {
    // if (menu.disabled) return
    onHide()
    setTimeout(() => {
      onPress(menu)
    }, 260)
  }

  // console.log('render menu')
  // console.log(activeId)
  // console.log(menuStyle)
  // console.log(menuItemStyle)
  return (
    <View style={{ ...styles.menu, ...menuStyle, ...createGlassStyle(theme, { radius: Radius.card }) }} onStartShouldSetResponder={() => true}>
      <View style={styles.menuClip}>
        <Animated.ScrollView keyboardShouldPersistTaps={'always'}>
          {
            menus.map((menu, index) => (
              menu.disabled
                ? (
                    <View
                      key={menu.action}
                      style={{ ...styles.menuItem, borderBottomWidth: index == menus.length - 1 ? 0 : StyleSheet.hairlineWidth, width: menuItemStyle.width, height: menuItemStyle.height, opacity: 0.4 }}
                    >
                      <Text style={{ width: '100%', textAlign: center ? 'center' : 'left', textAlignVertical: 'center' }} size={fontSize} numberOfLines={1}>{menu.label}</Text>
                    </View>
                  )
                : menu.action == activeId
                  ? (
                      <View
                        key={menu.action}
                        style={{ ...styles.menuItem, borderBottomWidth: index == menus.length - 1 ? 0 : StyleSheet.hairlineWidth, width: menuItemStyle.width, height: menuItemStyle.height, backgroundColor: theme['c-primary-background-active'] }}
                      >
                        {/* 选中态由底色 + 字重表达，不用品牌色染文字。

                            这块底色上文字色的可选范围很窄，实算：
                              c-font               6.71:1  ✓
                              c-primary-font       3.30:1  ✗
                              c-primary-font-active 4.05:1 ✗
                              c-font-label         4.40:1  ✗
                            品牌色压在自己的浅色底上必然掉到 3~4:1，正是
                            tab-bars.md 说的"标签色与内容层底色相近"那类问题。
                            而把底色加实只会更糟：china_ink 下 c-font-label
                            从 4.40 掉到 3.72。所以选中态只能靠底色 + 字重。

                            改动这里前请跑 python scripts/check-contrast.py。 */}
                        <Text style={{ width: '100%', textAlign: center ? 'center' : 'left', textAlignVertical: 'center', fontWeight: '600' }} color={theme['c-font']} size={fontSize} numberOfLines={1}>{menu.label}</Text>
                      </View>
                    )
                  : (
                      <TouchableHighlight
                        key={menu.action}
                        style={{ ...styles.menuItem, borderBottomWidth: index == menus.length - 1 ? 0 : StyleSheet.hairlineWidth, width: menuItemStyle.width, height: menuItemStyle.height }}
                        underlayColor={theme['c-primary-background-active']}
                        onPress={() => { menuPress(menu) }}
                      >
                        <Text style={{ width: '100%', textAlign: center ? 'center' : 'left', textAlignVertical: 'center' }} size={fontSize} numberOfLines={1}>{menu.label}</Text>
                      </TouchableHighlight>
                    )

            ))
          }
        </Animated.ScrollView>
      </View>
    </View>
  )
}

export interface MenuProps<M extends Menus = Menus> {
  menus: M
  onPress: (menu: M[number]) => void
  onHide?: () => void
  width?: number
  height?: number
  fontSize?: number
  center?: boolean
  activeId?: M[number]['action'] | null
}

export interface MenuType {
  show: (position: Position, menuSize?: MenuSize) => void
  hide: () => void
}

const Component = <M extends Menus>({ menus, width, height, activeId, onHide, onPress, fontSize, center }: MenuProps<M>, ref: Ref<MenuType>) => {
  // console.log(visible)
  const modalRef = useRef<ModalType>(null)
  const [position, setPosition] = useState<Position>({ w: 0, h: 0, x: 0, y: 0 })
  const [menuSize, setMenuSize] = useState<MenuSize>({ })
  const hide = () => {
    modalRef.current?.setVisible(false)
  }
  useImperativeHandle(ref, () => ({
    show(newPosition, menuSize) {
      setPosition(newPosition)
      if (menuSize) setMenuSize(menuSize)
      modalRef.current?.setVisible(true)
    },
    hide() {
      hide()
    },
  }))

  return (
    <Modal onHide={onHide} ref={modalRef}>
      <Menu menus={menus} width={width} height={height} activeId={activeId} buttonPosition={position} menuSize={menuSize} onPress={onPress} onHide={hide} fontSize={fontSize} center={center} />
    </Modal>
  )
}

// export default forwardRef(Component) as ForwardRefFn<MenuType>
export default forwardRef(Component) as <M extends Menus>(p: MenuProps<M> & { ref?: Ref<MenuType> }) => JSX.Element | null

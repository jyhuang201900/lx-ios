import { useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle, type Ref } from 'react'
import { StyleSheet, View, Animated, Platform } from 'react-native'
// import PropTypes from 'prop-types'
// import { AppColors } from '@/theme'
import { useTheme } from '@/store/theme/hook'
import { Radius, createGlassStyle } from '@/theme/layout'
import { useReduceMotion } from '@/utils/hooks'
import List, { type ItemT, type ListProps, type ListType } from './List'
// import InsetShadow from 'react-native-inset-shadow'

export interface SearchTipListProps<T> extends ListProps<T> {
  onPressBg?: () => void
  hideWhenEmpty?: boolean
}
export interface SearchTipListType<T> {
  setList: (list: T[]) => void
  setHeight: (height: number) => void
  hide: () => void
}

const noop = () => {}

const Component = <T extends ItemT<T>>({ onPressBg = noop, hideWhenEmpty = true, ...props }: SearchTipListProps<T>, ref: Ref<SearchTipListType<T>>) => {
  const theme = useTheme()
  const reduceMotion = useReduceMotion()
  const translateY = useRef(new Animated.Value(0)).current
  const scaleY = useRef(new Animated.Value(0)).current
  const [visible, setVisible] = useState(false)
  const [animatePlayed, setAnimatPlayed] = useState(true)
  const listRef = useRef<ListType<T>>(null)
  const prevListRef = useRef<T[]>([])
  const heightRef = useRef(0)

  useImperativeHandle(ref, () => ({
    setList(list) {
      if (prevListRef.current.length) {
        if (!list.length && hideWhenEmpty) handleHide()
      } else if ((list.length || !hideWhenEmpty) && !visible) handleShow()
      prevListRef.current = list
      requestAnimationFrame(() => {
        listRef.current?.setList(list)
      })
    },
    setHeight(height) {
      heightRef.current = height
    },
    hide() {
      prevListRef.current = []
      requestAnimationFrame(() => {
        listRef.current?.setList([])
      })
      handleHide()
    },
  }))


  const handleShow = useCallback(() => {
    // console.log('handleShow', height, visible)
    if (!heightRef.current) return
    setVisible(true)
    setAnimatPlayed(false)
    if (reduceMotion) {
      translateY.setValue(0)
      scaleY.setValue(1)
      setAnimatPlayed(true)
      return
    }
    requestAnimationFrame(() => {
      translateY.setValue(-heightRef.current / 2)
      scaleY.setValue(0)

      Animated.parallel([
      // Animated.timing(fade, {
      //   toValue: 1,
      //   duration: 300,
      //   useNativeDriver: true,
      // }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleY, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setAnimatPlayed(true)
      })
    })
  }, [reduceMotion, translateY, scaleY])

  const handleHide = useCallback(() => {
    setAnimatPlayed(false)
    if (reduceMotion) {
      setVisible(false)
      setAnimatPlayed(true)
      return
    }
    Animated.parallel([
      // Animated.timing(fade, {
      //   toValue: 0,
      //   duration: 200,
      //   useNativeDriver: true,
      // }),
      Animated.timing(translateY, {
        toValue: -heightRef.current / 2,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start((finished) => {
      // console.log(finished)
      if (!finished) return
      setVisible(false)
      setAnimatPlayed(true)
    })
  }, [reduceMotion, translateY, scaleY])


  const component = useMemo(() => (
    <Animated.View
      style={{
        ...styles.anima,
        transform: [
          { translateY },
          { scaleY },
        ],
      }}>
      <View
      style={{ ...styles.mask, backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}
        onTouchStart={onPressBg}></View>
      <View style={styles.content}>
        <View style={{
          ...styles.containerShadow,
          ...createGlassStyle(theme, { radius: Radius.card }),
        }}>
          <View style={styles.containerClip}>
            <List ref={listRef} {...props} />
          </View>
        </View>
      </View>
    </Animated.View>
  ), [onPressBg, props, scaleY, theme, translateY])

  return !visible && animatePlayed ? null : component
}

export default forwardRef(Component) as
  <T,>(p: SearchTipListProps<T> & { ref?: Ref<SearchTipListType<T>> }) => JSX.Element | null

const styles = StyleSheet.create({
  anima: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: '100%',
    zIndex: 10,
  },
  content: {
    zIndex: 1,
    paddingTop: 6,
    paddingLeft: 8,
    paddingRight: 8,
  },
  mask: {
    ...StyleSheet.absoluteFillObject,
    // 底色由调用处按主题给出：深色下 5% 黑几乎不可见，反向用白才有等效压暗感
  },
  containerShadow: {
    flex: 0,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 6,
        },
        shadowOpacity: 0.16,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  // 只负责把圆角裁剪掉，描边交给外层玻璃，避免盖住上沿高光
  containerClip: {
    flexShrink: 1,
    maxHeight: '100%',
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
})

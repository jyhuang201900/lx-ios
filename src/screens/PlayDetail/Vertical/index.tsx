import { memo, useState, useRef, useMemo, useEffect, type ComponentRef } from 'react'
import { Animated, AppState, View, type AccessibilityActionEvent } from 'react-native'

import Header from './components/Header'
// import Aside from './components/Aside'
// import Main from './components/Main'
import Player from './Player'
import PagerView, { type PagerViewOnPageScrollEvent, type PagerViewOnPageSelectedEvent } from 'react-native-pager-view'
import Pic from './Pic'
import Lyric from './Lyric'
import { hapticFeedback, screenkeepAwake, screenUnkeepAwake } from '@/utils/nativeModules/utils'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { Radius, createGlassStyle } from '@/theme/layout'
import { useReduceMotion } from '@/utils/hooks'

const LyricPage = ({ activeIndex }: { activeIndex: number }) => {
  const initedRef = useRef(false)
  const lyric = useMemo(() => <Lyric />, [])
  switch (activeIndex) {
    // case 3:
    case 1:
      if (!initedRef.current) initedRef.current = true
      return lyric
    default:
      return initedRef.current ? lyric : null
  }
  // return activeIndex == 0 || activeIndex == 1 ? setting : null
}

// global.iskeep = false
export default memo(({ componentId }: { componentId: string }) => {
  const theme = useTheme()
  const reduceMotion = useReduceMotion()
  const [pageIndex, setPageIndex] = useState(0)
  const showLyricRef = useRef(false)
  const previousPageRef = useRef(0)
  const indicatorProgress = useRef(new Animated.Value(0)).current
  const pagerRef = useRef<ComponentRef<typeof PagerView>>(null)

  const onPageScroll = ({ nativeEvent }: PagerViewOnPageScrollEvent) => {
    indicatorProgress.setValue(nativeEvent.offset)
  }

  const onPageSelected = ({ nativeEvent }: PagerViewOnPageSelectedEvent) => {
    if (previousPageRef.current != nativeEvent.position) hapticFeedback('light')
    previousPageRef.current = nativeEvent.position
    indicatorProgress.setValue(nativeEvent.position)
    setPageIndex(nativeEvent.position)
    showLyricRef.current = nativeEvent.position == 1
    if (showLyricRef.current) {
      screenkeepAwake()
    } else {
      screenUnkeepAwake()
    }
  }

  const onPageAccessibilityAction = ({ nativeEvent }: AccessibilityActionEvent) => {
    const target = nativeEvent.actionName == 'increment'
      ? 1
      : nativeEvent.actionName == 'decrement'
        ? 0
        : null
    if (target == null || target == pageIndex) return
    pagerRef.current?.setPage(target)
  }

  useEffect(() => {
    let appstateListener = AppState.addEventListener('change', (state) => {
      switch (state) {
        case 'active':
          if (showLyricRef.current && !commonState.componentIds.comment) screenkeepAwake()
          break
        case 'background':
          screenUnkeepAwake()
          break
      }
    })

    const handleComponentIdsChange = (ids: CommonState['componentIds']) => {
      if (ids.comment) screenUnkeepAwake()
      else if (AppState.currentState == 'active') screenkeepAwake()
    }

    global.state_event.on('componentIdsUpdated', handleComponentIdsChange)

    return () => {
      global.state_event.off('componentIdsUpdated', handleComponentIdsChange)
      appstateListener.remove()
      screenUnkeepAwake()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <Header />
      <View style={styles.container}>
        <PagerView
          ref={pagerRef}
          onPageSelected={onPageSelected}
          onPageScroll={onPageScroll}
          // onPageScrollStateChanged={onPageScrollStateChanged}
          style={styles.pagerView}
        >
          <Animated.View
            collapsable={false}
            style={reduceMotion ? styles.page : {
              ...styles.page,
              opacity: indicatorProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.74] }),
              transform: [
                { scale: indicatorProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
                { translateY: indicatorProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) },
              ],
            }}
          >
            <Pic componentId={componentId} />
          </Animated.View>
          <Animated.View
            collapsable={false}
            style={reduceMotion ? styles.page : {
              ...styles.page,
              opacity: indicatorProgress.interpolate({ inputRange: [0, 1], outputRange: [0.56, 1] }),
              transform: [
                { scale: indicatorProgress.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
                { translateY: indicatorProgress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) },
              ],
            }}
          >
            <LyricPage activeIndex={pageIndex} />
          </Animated.View>
        </PagerView>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={global.i18n.t('play_detail_page_indicator')}
          accessibilityActions={[{ name: 'decrement' }, { name: 'increment' }]}
          accessibilityValue={{ min: 1, max: 2, now: pageIndex + 1 }}
          onAccessibilityAction={onPageAccessibilityAction}
          style={{ ...styles.pageIndicator, ...createGlassStyle(theme, { radius: Radius.pill }) }}
        >
          <Animated.View
            style={{
              ...styles.pageIndicatorItem,
              width: indicatorProgress.interpolate({ inputRange: [0, 1], outputRange: [20, 6] }),
              opacity: indicatorProgress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 0.38] }),
              backgroundColor: theme['c-primary-font-active'],
            }}
          />
          <Animated.View
            style={{
              ...styles.pageIndicatorItem,
              width: indicatorProgress.interpolate({ inputRange: [0, 1], outputRange: [6, 20] }),
              opacity: indicatorProgress.interpolate({ inputRange: [0, 1], outputRange: [0.38, 0.94] }),
              backgroundColor: theme['c-primary-font-active'],
            }}
          />
        </View>
        <Player />
      </View>
    </>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  pageIndicator: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    height: 28,
    paddingHorizontal: 6,
    gap: 6,
  },
  pageIndicatorItem: {
    height: 6,
    borderRadius: Radius.pill,
    opacity: 0.86,
  },
})

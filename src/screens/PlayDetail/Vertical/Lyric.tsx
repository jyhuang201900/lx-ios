import { memo, useMemo, useEffect, useRef, useCallback } from 'react'
import { View, FlatList, TouchableOpacity, type FlatListProps, type LayoutChangeEvent, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native'
// import { useLayout } from '@/utils/hooks'
import { type Line, useLrcPlay, useLrcSet } from '@/plugins/lyric'
import { createStyle } from '@/utils/tools'
// import { useComponentIds } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import Text, { AnimatedColorText } from '@/components/common/Text'
import { setSpText } from '@/utils/pixelRatio'
import playerState from '@/store/player/state'
import PlayLine, { type PlayLineType } from '../components/PlayLine'
import KaraokeLine from '../components/KaraokeLine'
import { normalizeExtendedLyricText } from '../components/lyricText'
import { markTimeoutExitInteraction } from '@/core/player/timeoutExit'
// import { screenkeepAwake } from '@/utils/nativeModules/utils'
// import { log } from '@/utils/log'
// import { toast } from '@/utils/tools'

type FlatListType = FlatListProps<Line>

// const useLock = () => {
//   const showCommentRef = useRef(false)


//   useEffect(() => {
//     let appstateListener = AppState.addEventListener('change', (state) => {
//       switch (state) {
//         case 'active':
//           if (showLyricRef.current && !showCommentRef.current) screenkeepAwake()
//           break
//         case 'background':
//           screenUnkeepAwake()
//           break
//       }
//     })
//     return () => {
//       appstateListener.remove()
//     }
//   }, [])
//   useEffect(() => {
//     let listener: ReturnType<typeof onNavigationComponentDidDisappearEvent>
//     showCommentRef.current = !!componentIds.comment
//     if (showCommentRef.current) {
//       if (showLyricRef.current) screenUnkeepAwake()
//       listener = onNavigationComponentDidDisappearEvent(componentIds.comment as string, () => {
//         if (showLyricRef.current && AppState.currentState == 'active') screenkeepAwake()
//       })
//     }

//     const rm = global.state_event.on('componentIdsUpdated', (ids) => {

//     })

//     return () => {
//       if (listener) listener.remove()
//     }
//   }, [])
// }

interface LineProps {
  line: Line
  lineNum: number
  activeLine: number
  activeWordIndex: number
  activeWordProgress: number
  onLayout: (lineNum: number, height: number, width: number) => void
  onPress: (time: number) => void
}
const LrcLine = memo(({ line, lineNum, activeLine, activeWordIndex, activeWordProgress, onLayout, onPress }: LineProps) => {
  const theme = useTheme()
  const lrcFontSize = useSettingValue('playDetail.vertical.style.lrcFontSize')
  const textAlign = useSettingValue('playDetail.style.align')
  const size = lrcFontSize / 10
  const lineHeight = setSpText(size) * 1.3

  const handlePress = useCallback(() => {
    onPress(line.time / 1000)
  }, [line.time, onPress])

  const colors = useMemo(() => {
    const active = activeLine == lineNum
    return active ? [
      // 已播放字：品牌色。c-primary-font 在第九轮改成了「自我纠正」档位——
      // 它会向下找到第一个在页面底色上满足 AA 的色阶，因此对任意主色都达标
      // （原先写死的 c-primary-dark-200 在 orange 上只有 2.93:1）。
      theme['c-primary-font'],
      // 当前行未播放：c-font-label，比非当前行明显更强
      theme['c-font-label'],
      1,
    ] as const : [
      // 非当前行：c-650 最低 5.02:1（封面底图最坏 4.77:1）。
      // 原来用 c-450 再乘 0.6 不透明度 → 实际只有 2.01:1，
      // 16 个主题里 15 个不达标，而这是全应用最大的表面。
      theme['c-650'],
      theme['c-650'],
      1,
    ] as const
  }, [activeLine, lineNum, theme])

  const handleLayout = ({ nativeEvent }: LayoutChangeEvent) => {
    onLayout(lineNum, nativeEvent.layout.height, nativeEvent.layout.width)
  }


  // textBreakStrategy="simple" 用于解决某些设备上字体被截断的问题
  // https://stackoverflow.com/a/72822360
  return (
    <TouchableOpacity
      // 不再用不透明度做降级：那会把已经偏浅的灰再压下去（原来 0.72 × c-450
      // 只剩 2.01:1）。当前行改由**字重**标记——零对比度代价，
      // 而且 HIG accessibility.md 要求信息不能只靠颜色传达，字重正好是第二通道。
      style={styles.line}
      onLayout={handleLayout}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={line.text}
    >
      {
      lineNum == activeLine && line.words?.length
        ? (
        <Text style={{
          ...styles.lineText,
          ...(activeLine == lineNum ? styles.lineTextActive : null),
          textAlign,
          lineHeight,
          opacity: colors[2],
        }} size={size}>
                <KaraokeLine words={line.words} activeWordIndex={activeWordIndex} activeWordProgress={activeWordProgress} size={size} playedColor={colors[0]} inactiveColor={colors[1]} />
              </Text>
          )
        : (
      <AnimatedColorText style={{
        ...styles.lineText,
        ...(activeLine == lineNum ? styles.lineTextActive : null),
        textAlign,
        lineHeight,
      }} textBreakStrategy="simple" color={colors[0]} opacity={colors[2]} size={size}>{line.text}</AnimatedColorText>
          )
      }
      {
        line.extendedLyrics.map((lrc, index) => {
          const text = normalizeExtendedLyricText(lrc)
          if (!text) return null
          return (<AnimatedColorText style={{
            ...styles.lineTranslationText,
            ...(activeLine == lineNum ? styles.lineTextActive : null),
            textAlign,
            lineHeight: lineHeight * 0.8,
          }} textBreakStrategy="simple" key={index} color={colors[1]} opacity={colors[2]} size={size * 0.8}>{text}</AnimatedColorText>)
        })
      }
    </TouchableOpacity>
  )
}, (prevProps, nextProps) => {
  if (prevProps.line !== nextProps.line) return false
  if (prevProps.onPress !== nextProps.onPress) return false
  const wasActive = prevProps.activeLine == prevProps.lineNum
  const isActive = nextProps.activeLine == nextProps.lineNum
  if (wasActive || isActive) {
    return prevProps.activeLine == nextProps.activeLine &&
      prevProps.activeWordIndex == nextProps.activeWordIndex &&
      prevProps.activeWordProgress == nextProps.activeWordProgress
  }
  return true
})
const wait = async() => new Promise(resolve => setTimeout(resolve, 100))

export default () => {
  const lyricLines = useLrcSet()
  const { line, wordIndex, wordProgress } = useLrcPlay()
  const flatListRef = useRef<FlatList>(null)
  const playLineRef = useRef<PlayLineType>(null)
  const isPauseScrollRef = useRef(true)
  const scrollTimoutRef = useRef<NodeJS.Timeout | null>(null)
  const delayScrollTimeout = useRef<NodeJS.Timeout | null>(null)
  const lineRef = useRef({ line: 0, prevLine: 0 })
  const isFirstSetLrc = useRef(true)
  const scrollInfoRef = useRef<NativeSyntheticEvent<NativeScrollEvent>['nativeEvent'] | null>(null)
  const listLayoutInfoRef = useRef<{ spaceHeight: number, lineHeights: number[] }>({ spaceHeight: 0, lineHeights: [] })
  const listHeightRef = useRef(0)
  const correctScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isShowLyricProgressSetting = useSettingValue('playDetail.isShowLyricProgressSetting')
  // useLock()
  // const [imgUrl, setImgUrl] = useState(null)
  // const theme = useGetter('common', 'theme')
  // const { onLayout, ...layout } = useLayout()

  // useEffect(() => {
  //   const url = playMusicInfo ? playMusicInfo.musicInfo.img : null
  //   if (imgUrl == url) return
  //   setImgUrl(url)
  // // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [playMusicInfo])

  // const imgWidth = useMemo(() => layout.width * 0.75, [layout.width])
  /**
   * 计算第 index 行居中所需的滚动偏移。
   *
   * 行高来自每一行的 onLayout；缺失的行高先用已测行的平均值估算，
   * 这样即使那一行还没渲染出来也能算出一个可用的位置。
   */
  const computeScrollOffset = (index: number) => {
    const { spaceHeight, lineHeights } = listLayoutInfoRef.current
    const measuredHeight = listHeightRef.current
    const viewport = measuredHeight > 0
      ? measuredHeight
      : (scrollInfoRef.current?.layoutMeasurement.height ?? 0)
    if (!spaceHeight || !viewport) return null

    const measured = lineHeights.slice(0, index + 1).filter(h => h > 0)
    const average = measured.length
      ? measured.reduce((sum, h) => sum + h, 0) / measured.length
      : 0
    if (!average) return null

    let offset = spaceHeight
    for (let i = 0; i < index; i++) offset += lineHeights[i] || average
    offset += (lineHeights[index] || average) / 2
    return Math.max(0, offset - viewport * 0.42)
  }

  /**
   * 定位到当前行。
   *
   * 分两步，缺一不可：
   *
   * 1) 先按估算偏移快速跳一次。行高只有「已经渲染出来的行」才量得到，
   *    而 FlatList 是虚拟化的——当前行通常在一屏之外。所以这里用已测行的
   *    平均高度补齐未知行，先滚到大致位置，把目标行拉进渲染窗口。
   *
   * 2) 等目标行的真实高度量到之后，再用 scrollToIndex 落到精确位置。
   *
   * 只有第 1 步会「对不上」：当前行越靠后，累加的估算值越多，误差越大。
   * 只有第 2 步会「很慢」：没有 getItemLayout 时 scrollToIndex 对未渲染的
   * 行会直接失败，只能靠 onScrollToIndexFailed 反复重试，直到那行被渲染。
   * 两步合起来才既有速度又有精度。
   */
  const scheduleExactScroll = (index: number) => {
    if (correctScrollTimeoutRef.current) clearTimeout(correctScrollTimeoutRef.current)
    let attempts = 0
    const tick = () => {
      correctScrollTimeoutRef.current = null
      const list = flatListRef.current
      if (!list) return
      // 目标行已经有真实高度，说明它进入了渲染窗口，可以精确对齐了
      if (listLayoutInfoRef.current.lineHeights[index]) {
        try {
          list.scrollToIndex({ index, animated: true, viewPosition: 0.42 })
        } catch {}
        return
      }
      // 最多等约 1 秒；超时就停在估算位置上，不再无限重试
      if (++attempts >= 12) return
      correctScrollTimeoutRef.current = setTimeout(tick, 80)
    }
    correctScrollTimeoutRef.current = setTimeout(tick, 80)
  }

  const handleScrollToActive = (index = lineRef.current.line) => {
    if (index < 0) return
    const list = flatListRef.current
    if (!list) return

    const offset = computeScrollOffset(index)
    if (offset == null) {
      // 连平均高度都还没有（首次进入、一行都没量到），先按索引试一次
      try {
        list.scrollToIndex({ index, animated: true, viewPosition: 0.42 })
      } catch {}
    } else {
      try {
        list.scrollToOffset({ offset, animated: true })
      } catch {}
    }

    scheduleExactScroll(index)
  }

  const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollInfoRef.current = nativeEvent
    listHeightRef.current = nativeEvent.layoutMeasurement.height
    if (isPauseScrollRef.current) {
      playLineRef.current?.updateScrollInfo(nativeEvent)
    }
  }

  /**
   * 视口高度在第一次滚动事件之前是未知的，而首次定位必须用到它。
   * FlatList 自己的 onLayout 最早、也最可靠。
   */
  const handleListLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    listHeightRef.current = nativeEvent.layout.height
  }, [])
  const handleScrollBeginDrag = () => {
    isPauseScrollRef.current = true
    playLineRef.current?.setVisible(true)
    if (delayScrollTimeout.current) {
      clearTimeout(delayScrollTimeout.current)
      delayScrollTimeout.current = null
    }
    if (scrollTimoutRef.current) {
      clearTimeout(scrollTimoutRef.current)
      scrollTimoutRef.current = null
    }
  }

  const onScrollEndDrag = () => {
    if (!isPauseScrollRef.current) return
    if (scrollTimoutRef.current) clearTimeout(scrollTimoutRef.current)
    scrollTimoutRef.current = setTimeout(() => {
      playLineRef.current?.setVisible(false)
      scrollTimoutRef.current = null
      isPauseScrollRef.current = false
      if (!playerState.isPlay) return
      handleScrollToActive()
    }, 3000)
  }


  useEffect(() => {
    return () => {
      if (delayScrollTimeout.current) {
        clearTimeout(delayScrollTimeout.current)
        delayScrollTimeout.current = null
      }
      if (scrollTimoutRef.current) {
        clearTimeout(scrollTimoutRef.current)
        scrollTimoutRef.current = null
      }
      if (correctScrollTimeoutRef.current) {
        clearTimeout(correctScrollTimeoutRef.current)
        correctScrollTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    // linesRef.current = lyricLines
    listLayoutInfoRef.current.lineHeights = []
    lineRef.current.prevLine = 0
    lineRef.current.line = 0
    if (!flatListRef.current) return
    flatListRef.current.scrollToOffset({
      offset: 0,
      animated: false,
    })
    if (!lyricLines.length) return
    playLineRef.current?.updateLyricLines(lyricLines)
    requestAnimationFrame(() => {
      if (isFirstSetLrc.current) {
        isFirstSetLrc.current = false
        setTimeout(() => {
          isPauseScrollRef.current = false
          handleScrollToActive()
        }, 100)
      } else {
        if (delayScrollTimeout.current) clearTimeout(delayScrollTimeout.current)
        delayScrollTimeout.current = setTimeout(() => {
          handleScrollToActive(0)
        }, 100)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lyricLines])

  useEffect(() => {
    if (line < 0) return
    lineRef.current.prevLine = lineRef.current.line
    lineRef.current.line = line
    if (!flatListRef.current || isPauseScrollRef.current) return

    if (line - lineRef.current.prevLine != 1) {
      handleScrollToActive()
      return
    }

    delayScrollTimeout.current = setTimeout(() => {
      delayScrollTimeout.current = null
      handleScrollToActive()
    }, 600)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line])

  useEffect(() => {
    requestAnimationFrame(() => {
      playLineRef.current?.updateLayoutInfo(listLayoutInfoRef.current)
      playLineRef.current?.updateLyricLines(lyricLines)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShowLyricProgressSetting])

  const handleScrollToIndexFailed: FlatListType['onScrollToIndexFailed'] = (info) => {
    void wait().then(() => {
      handleScrollToActive(info.index)
    })
  }

  const handleLineLayout = useCallback<LineProps['onLayout']>((lineNum, height) => {
    listLayoutInfoRef.current.lineHeights[lineNum] = height
    playLineRef.current?.updateLayoutInfo(listLayoutInfoRef.current)
  }, [])

  const handleSpaceLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    listLayoutInfoRef.current.spaceHeight = nativeEvent.layout.height
    playLineRef.current?.updateLayoutInfo(listLayoutInfoRef.current)
  }, [])

  const handlePlayLine = useCallback((time: number) => {
    playLineRef.current?.setVisible(false)
    markTimeoutExitInteraction()
    global.app_event.setProgress(time)
  }, [])

  const handleLinePress = useCallback((time: number) => {
    markTimeoutExitInteraction()
    global.app_event.setProgress(time)
  }, [])

  const renderItem: FlatListType['renderItem'] = ({ item, index }) => {
    return (
      <LrcLine line={item} lineNum={index} activeLine={line} activeWordIndex={wordIndex} activeWordProgress={wordProgress} onLayout={handleLineLayout} onPress={handleLinePress} />
    )
  }
  const getkey: FlatListType['keyExtractor'] = (item, index) => `${index}${item.text}`

  const spaceComponent = useMemo(() => (
    <View style={styles.space} onLayout={handleSpaceLayout}></View>
  ), [handleSpaceLayout])

  return (
    <>
      <FlatList
        data={lyricLines}
        renderItem={renderItem}
        keyExtractor={getkey}
        style={styles.container}
        onLayout={handleListLayout}
        ref={flatListRef}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={spaceComponent}
        ListFooterComponent={spaceComponent}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        fadingEdgeLength={100}
        initialNumToRender={12}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        onScroll={handleScroll}
      />
      { isShowLyricProgressSetting ? <PlayLine ref={playLineRef} onPlayLine={handlePlayLine} /> : null }
    </>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
    paddingLeft: 28,
    paddingRight: 28,
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
  space: {
    paddingTop: '100%',
  },
  line: {
    paddingTop: 12,
    paddingBottom: 12,
    // opacity: 0,
  },
  lineText: {
    textAlign: 'center',
    // fontSize: 16,
    // lineHeight: 20,
    // paddingTop: 5,
    // paddingBottom: 5,
    // opacity: 0,
  },
  // 当前行用字重标记。它是免费的——不消耗任何对比度，
  // 而原来的不透明度方案把非当前行压到了 2.01:1。
  lineTextActive: {
    fontWeight: '600',
  },
  lineTranslationText: {
    textAlign: 'center',
    // fontSize: 13,
    // lineHeight: 17,
    paddingTop: 6,
    // paddingBottom: 5,
  },
})

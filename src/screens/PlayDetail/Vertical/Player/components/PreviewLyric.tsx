import { memo, useMemo } from 'react'
import { View } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { useLrcPlay, useLrcSet } from '@/plugins/lyric'
import { createStyle } from '@/utils/tools'
import { Gap, Typography } from '@/theme/layout'

/**
 * 播放页歌词预览（方向 A）：标题下两行，当前行亮、下一行暗。
 *
 * 只读：歌词页仍然是独立分页，这里不复制滚动逻辑，也不新造播放状态——
 * 当前行来自 `useLrcPlay()`（逐行触发，不是逐帧），上一行/下一行从
 * `useLrcSet()` 的同一份歌词里取，避免和歌词页算出两套索引。
 *
 * 没有歌词时整块不渲染：留一行空白比显示"暂无歌词"更像一个坏掉的控件。
 */
export default memo(() => {
  const theme = useTheme()
  const { line } = useLrcPlay()
  const lines = useLrcSet()

  const preview = useMemo(() => {
    const list = Array.isArray(lines) ? lines : []
    const current = list[line]?.text ?? ''
    const next = list[line + 1]?.text ?? ''
    return current.length > 0 ? { current, next } : null
  }, [line, lines])

  if (preview == null) return null

  return (
    <View style={styles.container} accessible accessibilityLabel={preview.current}>
      <Text numberOfLines={1} style={{ ...styles.current, color: theme['c-font'] }}>{preview.current}</Text>
      {preview.next.length > 0
        ? <Text numberOfLines={1} style={{ ...styles.next, color: theme['c-font-label'] }}>{preview.next}</Text>
        : null}
    </View>
  )
})

const styles = createStyle({
  container: {
    minHeight: 44,
    justifyContent: 'center',
    paddingTop: Gap.tight,
    paddingBottom: Gap.tight,
  },
  current: {
    fontSize: Typography.body,
    fontWeight: '500',
    lineHeight: 22,
  },
  next: {
    fontSize: Typography.compact,
    lineHeight: 20,
    marginTop: 2,
    opacity: 0.72,
  },
})

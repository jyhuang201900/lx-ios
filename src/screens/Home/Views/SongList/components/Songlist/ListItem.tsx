import { memo, useCallback } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { createStyle } from '@/utils/tools'
import { type ListInfoItem } from '@/store/songlist/state'
import Text from '@/components/common/Text'
import { scaleSizeW } from '@/utils/pixelRatio'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { useTheme } from '@/store/theme/hook'
import Image from '@/components/common/Image'
import { useI18n } from '@/lang'
import { Radius, Typography, createShadow } from '@/theme/layout'

const gap = scaleSizeW(15)
export default memo(({ item, index, width, showSource, onPress }: {
  item: ListInfoItem
  index: number
  showSource: boolean
  width: number
  onPress: (item: ListInfoItem, index: number) => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  const itemWidth = width - gap
  const hasMeta = [item.author, item.play_count, item.total].some(Boolean)
  /**
   * 三段挤一行必然截断。
   *
   * 卡片宽度只有三列的一半（~110pt），`作者 · 1万 · 55 首` 拼成单行后
   * 实测渲染成「1万 · 55 首…」——作者名整个丢掉，剩下的是两个数字，读
   * 起来像乱码。拆两层：作者单独一行，体量（播放量 · 曲目数）另起一行
   * 用更小的字号。信息一条不少，最长的字段（作者）也不再被截。
   */
  const meta = [
    item.play_count,
    item.total ? t('list_song_count', { num: item.total }) : '',
  ].filter(Boolean).join(' · ')
  const handlePress = useCallback(() => {
    onPress(item, index)
  }, [index, item, onPress])
  return (
    item.source
      ? (
          <View style={{ ...styles.listItem, width: itemWidth }}>
            <View style={{ ...styles.listItemImg, backgroundColor: theme['c-content-background'] }}>
              <View style={styles.listItemImgClip}>
                <TouchableOpacity activeOpacity={0.5} onPress={handlePress}>
                  <Image url={item.img} nativeID={`${NAV_SHEAR_NATIVE_IDS.songlistDetail_pic}_from_${item.id}`} style={{ width: itemWidth, height: itemWidth, borderRadius: Radius.card }} />
                  { showSource ? (
                    <Text
                      style={{
                        ...styles.sourceLabel,
                        // 原来用 30% 黑衬 + 硬编码白字。实算该衬底在白色封面上只有
                        // 2.12:1、浅灰封面 3.36:1，均低于 4.5:1——遮罩浓度被假设成了
                        // "封面总是深色"。改为不透明胶囊底 + 跟随主题的文字色，
                        // 对任意封面都稳定。
                        backgroundColor: theme['c-content-background'],
                      }}
                      size={Typography.caption}
                      color={theme['c-font']}
                    >{item.source}</Text>
                  ) : null }
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.5} onPress={handlePress}>
              <Text style={styles.listItemTitle} numberOfLines={ 2 }>{item.name}</Text>
            </TouchableOpacity>
            {hasMeta ? (
              <>
                {item.author ? (
                  <Text style={styles.listItemMeta} color={theme['c-font-label']} numberOfLines={1}>{item.author}</Text>
                ) : null}
                {meta ? (
                  <Text style={styles.listItemMetaSub} color={theme['c-font-label']} numberOfLines={1}>{meta}</Text>
                ) : null}
              </>
            ) : null}
            {/* <Text>{JSON.stringify(item)}</Text> */}
          </View>
        )
      : <View style={{ ...styles.listItem, width: itemWidth }} />
  )
}, (prevProps, nextProps) => (
  prevProps.item === nextProps.item &&
  prevProps.index === nextProps.index &&
  prevProps.width === nextProps.width &&
  prevProps.showSource === nextProps.showSource &&
  prevProps.onPress === nextProps.onPress
))

const styles = createStyle({
  listItem: {
    // width: 90,
    margin: 10,
  },
  listItemImg: {
    // backgroundColor: '#eee',
    borderRadius: Radius.card,
    marginBottom: 5,
    ...createShadow({ opacity: 0.12, radius: 8, offsetY: 3, elevation: 2 }),
  },
  listItemImgClip: {
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  sourceLabel: {
    paddingLeft: 4,
    paddingBottom: 2,
    paddingRight: 4,
    position: 'absolute',
    top: 0,
    right: 0,
    borderBottomLeftRadius: Radius.pill,
  },
  listItemTitle: {
    fontSize: Typography.compact,
    // overflow: 'hidden',
    marginBottom: 5,
  },
  listItemMeta: {
    fontSize: Typography.sub,
    lineHeight: 17,
  },
  listItemMetaSub: {
    fontSize: Typography.caption,
    lineHeight: 15,
    // 弱一层：作者是主，体量是辅
    opacity: 0.8,
  },
})

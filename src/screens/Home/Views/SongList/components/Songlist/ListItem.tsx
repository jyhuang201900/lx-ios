import { memo, useCallback } from 'react'
import { View, Platform, TouchableOpacity } from 'react-native'
import { createStyle } from '@/utils/tools'
import { type ListInfoItem } from '@/store/songlist/state'
import Text from '@/components/common/Text'
import { scaleSizeW } from '@/utils/pixelRatio'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { useTheme } from '@/store/theme/hook'
import Image from '@/components/common/Image'
import { useI18n } from '@/lang'
import { Typography } from '@/theme/layout'

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
  const handlePress = useCallback(() => {
    onPress(item, index)
  }, [index, item, onPress])
  return (
    item.source
      ? (
          <View style={{ ...styles.listItem, width: itemWidth }}>
            <View style={{ ...styles.listItemImg, backgroundColor: theme['c-content-background'] }}>
              <TouchableOpacity activeOpacity={0.5} onPress={handlePress}>
                <Image url={item.img} nativeID={`${NAV_SHEAR_NATIVE_IDS.songlistDetail_pic}_from_${item.id}`} style={{ width: itemWidth, height: itemWidth, borderRadius: 16 }} />
                { showSource ? <Text style={styles.sourceLabel} size={Typography.caption} color="#fff" >{item.source}</Text> : null }
              </TouchableOpacity>
            </View>
            <TouchableOpacity activeOpacity={0.5} onPress={handlePress}>
              <Text style={styles.listItemTitle} numberOfLines={ 2 }>{item.name}</Text>
            </TouchableOpacity>
            {(item.author || item.play_count || item.total) ? (
              <Text style={styles.listItemMeta} color={theme['c-font-label']} numberOfLines={1}>
                {[
                  item.author,
                  item.play_count,
                  item.total ? t('list_song_count', { num: item.total }) : '',
                ].filter(Boolean).join(' · ')}
              </Text>
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
    borderRadius: 16,
    marginBottom: 5,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.20,
        shadowRadius: 1.41,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sourceLabel: {
    paddingLeft: 4,
    paddingBottom: 2,
    paddingRight: 4,
    position: 'absolute',
    top: 0,
    right: 0,
    borderBottomLeftRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  listItemTitle: {
    // 网格卡比列表更紧凑，使用 13pt 独立档位
    fontSize: 13,
    // overflow: 'hidden',
    marginBottom: 5,
  },
  listItemMeta: {
    fontSize: 11,
    lineHeight: 16,
  },
})

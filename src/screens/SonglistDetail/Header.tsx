import { forwardRef, memo, useEffect, useImperativeHandle, useState } from 'react'
import { View } from 'react-native'
import { BorderWidths } from '@/theme'
import ButtonBar from './ActionBar'
import { useNavigationComponentDidAppear } from '@/navigation'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { scaleSizeW } from '@/utils/pixelRatio'
import { useTheme } from '@/store/theme/hook'
import Text, { AnimatedText } from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import Image from '@/components/common/Image'
import { useI18n } from '@/lang'
import { useListInfo } from './state'
import { useAnimateOnecNumber } from '@/utils/hooks/useAnimateNumber'
import { useStatusbarHeight } from '@/store/common/hook'
import { FontWeight, Gap, Typography } from '@/theme/layout'

const IMAGE_WIDTH = scaleSizeW(70)

const CountText = memo(({ count }: { count: string }) => {
  const theme = useTheme()
  const [animFade] = useAnimateOnecNumber(0, 1, 250, false)
  const [animTranslateY] = useAnimateOnecNumber(10, 0, 250, false)
  return (
    <AnimatedText style={{
      ...styles.playCount,
      // 播放量压在歌单封面上，而封面是用户内容、颜色不可控。
      // 原来用 50% 黑衬 + 硬编码白字：实算白色封面上只有 3.95:1，低于 12pt 所需的 4.5:1。
      // 改为不透明胶囊底 + 跟随主题的文字色，与歌单卡片的来源标签同一套做法。
      backgroundColor: theme['c-content-background'],
      color: theme['c-font'],
      opacity: animFade,
      transform: [
        { translateY: animTranslateY },
      ],
    }} size={Typography.sub} numberOfLines={ 1 }>{count}</AnimatedText>
  )
}, (prevProps, nextProps) => {
  return true
})

const Pic = ({ componentId, playCount, imgUrl }: {
  componentId: string
  playCount: string
  imgUrl?: string
}) => {
  const [pic, setPic] = useState(imgUrl)
  const [animated, setAnimated] = useState(false)
  const info = useListInfo()
  useEffect(() => {
    if (animated) setPic(imgUrl)
  }, [imgUrl, animated])

  useNavigationComponentDidAppear(componentId, () => {
    setAnimated(true)
  })

  return (
    <View style={{ ...styles.listItemImg, width: IMAGE_WIDTH, height: IMAGE_WIDTH }}>
      <Image nativeID={`${NAV_SHEAR_NATIVE_IDS.songlistDetail_pic}_to_${info.id}`} url={pic} style={{ flex: 1, borderRadius: 4 }} />
      {
        playCount && animated ? <CountText count={playCount} /> : null
      }
    </View>
  )
}

export interface HeaderProps {
  componentId: string
}

export interface HeaderType {
  setInfo: (info: DetailInfo) => void
}
export interface DetailInfo {
  name: string
  desc: string
  playCount: string
  imgUrl?: string
  author?: string
  songCount?: number
}

export default forwardRef<HeaderType, HeaderProps>(({ componentId }: { componentId: string }, ref) => {
  const statusBarHeight = useStatusbarHeight()
  const theme = useTheme()
  const info = useListInfo()
  const t = useI18n()
  const [detailInfo, setDetailInfo] = useState<DetailInfo>({ name: '', desc: '', playCount: '', imgUrl: info.img, author: info.author })

  useImperativeHandle(ref, () => ({
    setInfo(info) {
      setDetailInfo(info)
    },
  }), [])

  return (
    <View style={{ ...styles.container, paddingTop: statusBarHeight, borderBottomColor: theme['c-border-background'] }}>
      {/*
        这一块原先自带 padding: 10，叠在列表容器的 16pt 内缩上就是 26pt，
        封面比下面的歌曲行多缩进 10pt，整屏看起来是歪的。
        水平方向改由列表容器统一负责，这里只留垂直呼吸。
      */}
      <View style={styles.heroRow}>
        <Pic componentId={componentId} playCount={detailInfo.playCount} imgUrl={detailInfo.imgUrl} />
        <View style={styles.heroCopy} nativeID={NAV_SHEAR_NATIVE_IDS.songlistDetail_title}>
          <Text size={Typography.page} numberOfLines={2} style={styles.title}>{detailInfo.name}</Text>
          {
            (info.author || detailInfo.playCount)
              ? <Text size={Typography.caption} color={theme['c-font-label']} numberOfLines={1} style={styles.metaLine}>
                  {[info.author, detailInfo.playCount].filter(Boolean).join(' · ')}
                </Text>
              : null
          }
          {detailInfo.songCount ? (
            <Text size={Typography.caption} color={theme['c-font-label']} numberOfLines={1} style={styles.metaLine}>
              {t('list_song_count', { num: detailInfo.songCount })}
            </Text>
          ) : null}
          {detailInfo.desc ? (
            <Text size={Typography.sub} style={styles.desc} color={theme['c-font-label']} numberOfLines={4}>{detailInfo.desc}</Text>
          ) : null}
        </View>
      </View>
      <ButtonBar />
      {/* <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexGrow: 0, flexShrink: 1, paddingTop: 5, paddingRight: 5 }}>
              <Text style={{ fontSize: 12, color: AppColors.normal20 }} numberOfLines={ 1 }>{playCount || '-'}</Text>
              <Text style={{ fontSize: 12, color: AppColors.normal30 }} numberOfLines={ 1 }>{this.props.selectListInfo.author || this.props.listDetailData.info.author}</Text>
            </View>
      </View> */}
    </View>
  )
})

const styles = createStyle({
  container: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
    borderBottomWidth: BorderWidths.normal,
    paddingBottom: Gap.tight,
  },
  /** 与歌曲行共用列表容器的水平内缩，只补垂直呼吸 */
  heroRow: {
    flexDirection: 'row',
    flexGrow: 0,
    flexShrink: 0,
    paddingVertical: Gap.tight,
  },
  heroCopy: {
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: Gap.tight,
    gap: 2,
  },
  title: { fontWeight: FontWeight.semibold },
  metaLine: { marginTop: 1 },
  desc: { lineHeight: 18, marginTop: 4 },
  listItemImg: {
    // backgroundColor: '#eee',
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
    // width: 70,
    // height: 70,
    // ...Platform.select({
    //   ios: {
    //     shadowColor: '#000',
    //     shadowOffset: {
    //       width: 0,
    //       height: 1,
    //     },
    //     shadowOpacity: 0.20,
    //     shadowRadius: 1.41,
    //   },
    //   android: {
    //     elevation: 2,
    //   },
    // }),
  },
  playCount: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    paddingLeft: 3,
    paddingRight: 3,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
})

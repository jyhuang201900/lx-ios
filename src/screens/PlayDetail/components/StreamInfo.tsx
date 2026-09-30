import { memo, useMemo } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'

import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { usePlayMusicInfo, useStreamInfo } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { useUserApiList } from '@/store/userApi'
import { createStyle } from '@/utils/tools'
import { sizeFormate } from '@/utils/common'
import { getQualitySpecName, getTrackQualities } from '@/utils/quality'
import { Radius, TabularNums, Typography, createGlassStyle } from '@/theme/layout'

const getMusicInfo = (musicInfo: LX.Player.PlayMusic | null) => musicInfo && 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo

export const useAvailableQualities = () => {
  const playMusicInfo = usePlayMusicInfo()
  const apiSource = useSettingValue('common.apiSource')

  return useMemo(() => {
    const musicInfo = getMusicInfo(playMusicInfo.musicInfo)
    if (!musicInfo || musicInfo.source == 'local') return [] as LX.Quality[]
    // 自定义音源以脚本声明的音质为准（含 hires/atmos/master），官方音源要求歌曲元数据同样支持
    return getTrackQualities(musicInfo.source, musicInfo.meta._qualitys)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiSource, playMusicInfo])
}

/**
 * 当前流的三个读数：来自哪个音源、什么规格、多大。
 *
 * 这些数字以前就存在，但被塞在两个 11pt 的小药丸里，扫一眼读不出来。
 * 这里是整个产品唯一的「此刻」，把它们排成仪表读数是内容层放得下的信息，
 * 不是装饰——三个标签各自说了一件真事（design-principles.md：
 * "Numbering, eyebrows, dividers, and labels should say something true about the content"）。
 */
const useStreamReadout = () => {
  const t = useI18n()
  const sourceNameType = useSettingValue('common.sourceNameType')
  const apiSource = useSettingValue('common.apiSource')
  const preferredQuality = useSettingValue('player.playQuality')
  const userApiList = useUserApiList()
  const streamInfo = useStreamInfo()
  const playMusicInfo = usePlayMusicInfo()

  const customApi = apiSource.startsWith('user_api')
    ? userApiList.find(api => api.id == apiSource)
    : undefined

  return useMemo(() => {
    const musicInfo = getMusicInfo(playMusicInfo.musicInfo)
    const source = streamInfo.source ?? musicInfo?.source ?? null
    const quality = streamInfo.quality ?? (musicInfo?.source == 'local' ? null : preferredQuality)
    const isLocal = source == 'local'

    const sourceLabel = isLocal
      ? t('player_local_source')
      : source
        ? t(`source_${sourceNameType}_${source}` as Parameters<typeof t>[0])
        : ''
    const customSourceName = source ? customApi?.sources?.[source]?.name : undefined

    /**
     * 体积取的是**当前这条流**的真实大小，来自播放地址的 content-length。
     *
     * 以前这里是查搜索结果的 `meta._qualitys[quality].size`。那张表只覆盖
     * 内置音源能解析出来的档位（最高到 flac24bit），自定义音源的
     * hires / atmos / master 根本不在搜索结果里，于是选到这几档时体积
     * 永远是空的，界面干脆把整列去掉了——这就是「hi-res 以上没有体积」。
     *
     * HEAD 拿不到 content-length 时（部分服务器不响应 HEAD、跨域限制等），
     * 回退到搜索元数据里的旧值——它只覆盖内置音源的低档位，但聊胜于无。
     *
     * 本地文件不显示：它的体积属于文件属性，不是「这条流有多大」，
     * 和这里的语义不同。
     */
    const metaSize = !isLocal && quality && musicInfo?.source != 'local'
      ? musicInfo?.meta._qualitys?.[quality]?.size
      : null
    const size = !isLocal
      ? (streamInfo.size ? sizeFormate(streamInfo.size) : (metaSize ?? ''))
      : ''

    return {
      source: customApi && customSourceName
        ? `${customApi.name} · ${customSourceName || sourceLabel}`
        : sourceLabel,
      format: getQualitySpecName(quality),
      size,
    }
  }, [customApi, playMusicInfo, preferredQuality, sourceNameType, streamInfo, t])
}

const Readout = memo(({ label, value, valueColor, align = 'left', grow = false }: {
  label: string
  value: string
  valueColor?: string
  align?: 'left' | 'right'
  grow?: boolean
}) => {
  const theme = useTheme()
  return (
    <View style={[styles.readout, grow ? styles.readoutGrow : null, align == 'right' ? styles.readoutRight : null]}>
      <Text size={Typography.caption} color={theme['c-font-label']} numberOfLines={1}>{label}</Text>
      <Text
        style={[TabularNums, align == 'right' ? styles.readoutRight : null]}
        size={Typography.compact}
        color={valueColor ?? theme['c-font']}
        numberOfLines={1}
      >{value}</Text>
    </View>
  )
})

const Divider = () => {
  const theme = useTheme()
  return <View style={[styles.divider, { backgroundColor: theme['c-border-background'] }]} />
}

export default ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const theme = useTheme()
  const t = useI18n()
  const { source, format, size } = useStreamReadout()

  if (!source && !format) return null

  // 列数随实际可得的读数变化：体积未知时就不占位列，
  // 免得留一个空格子破坏仪表的节奏。
  const columns = [
    <Readout key="source" label={t('player_source')} value={source} grow />,
    format ? <Divider key="d1" /> : null,
    format ? <Readout key="format" label={t('player_format')} value={format} valueColor={theme['c-primary-font']} /> : null,
    size ? <Divider key="d2" /> : null,
    size ? <Readout key="size" label={t('player_size')} value={size} align="right" /> : null,
  ].filter(Boolean)

  return (
    <View style={[styles.container, style]}>
      <View style={{ ...styles.panel, ...createGlassStyle(theme, { radius: Radius.card }) }}>
        <View style={styles.readouts}>{columns}</View>
      </View>
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 0,
    paddingBottom: 6,
  },
  panel: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  readouts: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  readout: {
    flexShrink: 0,
    // 标签与读数贴得比常规行距更紧——仪表盘要的是"同一组读数"的感觉，
    // 而不是两行独立文本
    gap: 1,
  },
  readoutGrow: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  readoutRight: {
    alignItems: 'flex-end',
    textAlign: 'right',
  },
  divider: {
    width: 1,
    marginHorizontal: 10,
    opacity: 0.5,
  },
})

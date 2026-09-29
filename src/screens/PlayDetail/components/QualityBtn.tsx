import { memo, useMemo } from 'react'
import { View } from 'react-native'

import DorpDownMenu from '@/components/common/DorpDownMenu'
import Text from '@/components/common/Text'
import { changeCurrentMusicQuality } from '@/core/player/player'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { toast, createStyle } from '@/utils/tools'
import { getQualityLabel } from '@/utils/quality'
import { hapticFeedback } from '@/utils/nativeModules/utils'
import { Radius, Typography, createGlassStyle } from '@/theme/layout'
import { useAvailableQualities } from './StreamInfo'

interface Props {
  compact?: boolean
}

export default memo(({ compact = false }: Props) => {
  const theme = useTheme()
  const t = useI18n()
  const currentQuality = useSettingValue('player.playQuality')
  const qualities = useAvailableQualities()
  const menus = useMemo(() => qualities.map((quality) => ({ action: quality, label: getQualityLabel(quality) })), [qualities])
  const selectedQuality = qualities.includes(currentQuality) ? currentQuality : qualities[0]

  if (!menus.length) return null

  const handlePress = ({ action }: typeof menus[number]) => {
    if (action == selectedQuality) return
    hapticFeedback('light')
    updateSetting({ 'player.playQuality': action })
    toast(t('player_quality_switching'))
    changeCurrentMusicQuality(action)
  }

  return (
    <DorpDownMenu
      menus={menus}
      activeId={selectedQuality}
      onPress={handlePress}
      center
      height={42}
      btnStyle={{ width: compact ? 76 : 92 }}
    >
      <View style={{
        ...styles.button,
        // 玻璃浮层：它压在播放详情页内容上。此前底色取的是内容层那档浅色玻璃，
        // 次要标签实算仅 3.99:1（china_ink），低于 AA 4.5:1。
        ...createGlassStyle(theme, { radius: Radius.control }),
        paddingHorizontal: compact ? 7 : 10,
      }}>
        <Text style={styles.caption} size={Typography.caption} color={theme['c-font-label']}>{t('player_quality')}</Text>
        <Text style={styles.value} size={compact ? 11 : 12} color={theme['c-primary-font-active']} numberOfLines={1}>{selectedQuality}</Text>
      </View>
    </DorpDownMenu>
  )
})

const styles = createStyle({
  button: {
    minHeight: 38,
    minWidth: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  caption: {
    lineHeight: 11,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  value: {
    fontWeight: '600',
    lineHeight: 15,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
})

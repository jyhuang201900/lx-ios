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
import { hapticFeedback } from '@/utils/nativeModules/utils'
import { useAvailableQualities } from './StreamInfo'

interface Props {
  compact?: boolean
}

export default memo(({ compact = false }: Props) => {
  const theme = useTheme()
  const t = useI18n()
  const currentQuality = useSettingValue('player.playQuality')
  const qualities = useAvailableQualities()
  const menus = useMemo(() => qualities.map((quality) => ({ action: quality, label: quality })), [qualities])

  if (!menus.length) return null

  const handlePress = ({ action }: typeof menus[number]) => {
    if (action == currentQuality) return
    hapticFeedback('light')
    updateSetting({ 'player.playQuality': action })
    toast(t('player_quality_switching'))
    changeCurrentMusicQuality(action)
  }

  return (
    <DorpDownMenu
      menus={menus}
      activeId={currentQuality}
      onPress={handlePress}
      center
      height={42}
      btnStyle={{ width: compact ? 76 : 92 }}
    >
      <View style={{
        ...styles.button,
        backgroundColor: theme['c-primary-input-background'],
        paddingHorizontal: compact ? 7 : 10,
      }}>
        <Text style={styles.caption} size={10} color={theme['c-font-label']}>{t('player_quality')}</Text>
        <Text style={styles.value} size={compact ? 11 : 12} color={theme['c-primary-font-active']} numberOfLines={1}>{currentQuality}</Text>
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
  },
  value: {
    fontWeight: '600',
    lineHeight: 15,
  },
})

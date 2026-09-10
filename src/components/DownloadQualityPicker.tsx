import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'

import Popup, { type PopupType } from '@/components/common/Popup'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { downloadMusic, getDownloadQualities } from '@/core/download'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

export interface DownloadQualityPickerType {
  show: (musicInfo: LX.Music.MusicInfoOnline) => void
}

export default forwardRef<DownloadQualityPickerType>((_, ref) => {
  const theme = useTheme()
  const popupRef = useRef<PopupType>(null)
  const [musicInfo, setMusicInfo] = useState<LX.Music.MusicInfoOnline | null>(null)
  const qualities = useMemo(() => musicInfo ? getDownloadQualities(musicInfo) : [], [musicInfo])

  useImperativeHandle(ref, () => ({
    show(info) {
      setMusicInfo(info)
      requestAnimationFrame(() => popupRef.current?.setVisible(true))
    },
  }))

  const handleSelect = (quality: LX.Quality) => {
    if (!musicInfo) return
    popupRef.current?.setVisible(false)
    void downloadMusic(musicInfo, quality)
  }

  return (
    <Popup ref={popupRef} title={global.i18n.t('download_quality_title')}>
      <View style={styles.content}>
        {musicInfo ? <View style={{ ...styles.track, backgroundColor: theme['c-primary-input-background'] }}>
          <View style={{ ...styles.trackIcon, backgroundColor: theme['c-primary-background-active'] }}>
            <Icon name="download-2" size={17} color={theme['c-primary-font-active']} />
          </View>
          <View style={styles.trackCopy}>
            <Text size={14} numberOfLines={1}>{musicInfo.name}</Text>
            {musicInfo.singer ? <Text size={11} color={theme['c-font-label']} numberOfLines={1}>{musicInfo.singer}</Text> : null}
          </View>
        </View> : null}
        <Text style={styles.hint} size={12} color={theme['c-font-label']}>{global.i18n.t('download_quality_available')}</Text>
        <View style={styles.qualityList}>
          {qualities.map(quality => <TouchableOpacity
            key={quality}
            accessibilityRole="button"
            accessibilityLabel={`${global.i18n.t('player_download')} ${quality}`}
            style={{ ...styles.qualityButton, backgroundColor: theme['c-primary-input-background'], borderColor: theme['c-border-background'] }}
            onPress={() => handleSelect(quality)}
          >
            <Text size={14}>{quality.toUpperCase()}</Text>
            <Icon name="chevron-right" size={11} color={theme['c-font-label']} />
          </TouchableOpacity>)}
        </View>
        {!qualities.length ? <Text style={styles.empty} size={12} color={theme['c-font-label']}>{global.i18n.t('download_quality_unavailable')}</Text> : null}
      </View>
    </Popup>
  )
})

const styles = createStyle({
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  track: { minHeight: 58, borderRadius: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  trackIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  trackCopy: { flex: 1, gap: 4, paddingLeft: 10 },
  hint: { paddingTop: 18, paddingBottom: 8, textAlign: 'center', textAlignVertical: 'center' },
  qualityList: { gap: 8 },
  qualityButton: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { paddingVertical: 22, textAlign: 'center' },
})

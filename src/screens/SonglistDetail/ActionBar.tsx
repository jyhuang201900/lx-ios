import { memo } from 'react'
import { View } from 'react-native'
import Button from '@/components/common/Button'

import { createStyle, toast } from '@/utils/tools'
import { pop } from '@/navigation'
import { useTheme } from '@/store/theme/hook'
import commonState from '@/store/common/state'
import Text from '@/components/common/Text'
import { handleCollect, handlePlay } from './listAction'
import songlistState from '@/store/songlist/state'
import { useI18n } from '@/lang'
import { useListInfo } from './state'
// import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'

export default memo(() => {
  const theme = useTheme()
  const t = useI18n()
  const info = useListInfo()

  const back = () => {
    void pop(commonState.componentIds.songlistDetail!)
  }

  const isReady = !!songlistState.listDetailInfo.info.name

  const handlePlayAll = () => {
    if (!isReady) {
      toast(t('load_failed'))
      return
    }
    handlePlay(info.id, info.source, songlistState.listDetailInfo.list).catch(() => {
      toast(t('load_failed'))
    })
  }

  const handleCollection = () => {
    if (!isReady) {
      toast(t('load_failed'))
      return
    }
    handleCollect(info.id, info.source, songlistState.listDetailInfo.info.name || info.name).catch(() => {
      toast(t('load_failed'))
    })
  }

  return (
    <View style={styles.container}>
      <Button onPress={handleCollection} style={[styles.controlBtn, !isReady && styles.controlBtnDisabled]}>
        <Text style={{ ...styles.controlBtnText, color: theme['c-button-font'], ...(isReady ? undefined : styles.controlBtnTextDisabled) }}>{t('collect_songlist')}</Text>
      </Button>
      <Button onPress={handlePlayAll} style={[styles.controlBtn, !isReady && styles.controlBtnDisabled]}>
        <Text style={{ ...styles.controlBtnText, color: theme['c-button-font'], ...(isReady ? undefined : styles.controlBtnTextDisabled) }}>{t('play_all')}</Text>
      </Button>
      <Button onPress={back} style={styles.controlBtn}>
        <Text style={{ ...styles.controlBtnText, color: theme['c-button-font'] }}>{t('back')}</Text>
      </Button>
    </View>
  )
})

const styles = createStyle({
  container: {
    flexDirection: 'row',
    width: '100%',
    flexGrow: 0,
    flexShrink: 0,
  },
  controlBtn: {
    flexGrow: 1,
    flexShrink: 1,
    width: '33%',
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 10,
    paddingRight: 10,
  },
  controlBtnText: {
    fontSize: 13,
    textAlign: 'center',
  },
  controlBtnDisabled: {
    opacity: 0.45,
  },
  controlBtnTextDisabled: {
    opacity: 0.8,
  },
})


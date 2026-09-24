import { memo, useCallback, useRef, useState } from 'react'
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
  const [pending, setPending] = useState<'' | 'play' | 'collect'>('')
  const pendingRef = useRef(false)

  const back = () => {
    void pop(commonState.componentIds.songlistDetail!)
  }

  const isReady = !!songlistState.listDetailInfo.info.name
  const disabled = !isReady || pending !== ''

  const handlePlayAll = useCallback(() => {
    if (!isReady) {
      toast(t('load_failed'))
      return
    }
    // 详情仍在加载时重复点击会并发发起两次网络请求，这里做在途保护
    if (pendingRef.current) return
    pendingRef.current = true
    setPending('play')
    handlePlay(info.id, info.source, songlistState.listDetailInfo.list).catch(() => {
      toast(t('load_failed'))
    }).finally(() => {
      pendingRef.current = false
      setPending('')
    })
  }, [info.id, info.source, isReady, t])

  const handleCollection = useCallback(() => {
    if (!isReady) {
      toast(t('load_failed'))
      return
    }
    if (pendingRef.current) return
    pendingRef.current = true
    setPending('collect')
    handleCollect(info.id, info.source, songlistState.listDetailInfo.info.name || info.name).catch(() => {
      toast(t('load_failed'))
    }).finally(() => {
      pendingRef.current = false
      setPending('')
    })
  }, [info.id, info.name, info.source, isReady, t])

  const playLabel = pending === 'play' ? t('loading') : t('play_all')
  const collectLabel = pending === 'collect' ? t('loading') : t('collect_songlist')

  return (
    <View style={styles.container}>
      <Button
        onPress={handleCollection}
        disabled={disabled}
        accessibilityLabel={t('collect_songlist')}
        style={[styles.controlBtn, disabled && styles.controlBtnDisabled]}
      >
        <Text style={{ ...styles.controlBtnText, color: theme['c-button-font'], ...(disabled ? styles.controlBtnTextDisabled : undefined) }}>{collectLabel}</Text>
      </Button>
      <Button
        onPress={handlePlayAll}
        disabled={disabled}
        accessibilityLabel={t('play_all')}
        style={[styles.controlBtn, disabled && styles.controlBtnDisabled]}
      >
        <Text style={{ ...styles.controlBtnText, color: theme['c-button-font'], ...(disabled ? styles.controlBtnTextDisabled : undefined) }}>{playLabel}</Text>
      </Button>
      <Button onPress={back} accessibilityLabel={t('back')} style={styles.controlBtn}>
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

import { memo, useCallback, useRef, useState } from 'react'
import { View } from 'react-native'
import Button from '@/components/common/Button'

import { createStyle, toast } from '@/utils/tools'
import { pop } from '@/navigation'
import { useTheme } from '@/store/theme/hook'
import commonState from '@/store/common/state'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { handleCollect, handlePlay } from './listAction'
import { useSonglistDetail } from '@/store/songlist/hook'
import { useI18n } from '@/lang'
import { useListInfo } from './state'
import { FontWeight, Gap, IconSize, PageMetrics, Radius, Typography, createContentSurface } from '@/theme/layout'
// import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'

export default memo(() => {
  const theme = useTheme()
  const t = useI18n()
  const info = useListInfo()
  const detail = useSonglistDetail()
  const [pending, setPending] = useState<'' | 'play' | 'collect'>('')
  const pendingRef = useRef(false)

  const back = () => {
    void pop(commonState.componentIds.songlistDetail!)
  }

  /**
   * 详情回来了才允许点这两个按钮。
   *
   * 这里读的是 useSonglistDetail() 的订阅值，不是模块级 store：后者在
   * 赋值时不会触发重渲染，按钮会一直停在首帧的禁用态——也就是之前
   * 「收藏歌单、播放全部都失效」的原因。
   */
  /**
   * 判断详情是否已经可用。
   *
   * 详情名可能是空串（接口先返回空、或从「打开歌单」输入框进来时没有名字），
   * 所以这里对空串也要回退到列表项名称——用 `??` 只处理 null/undefined，
   * 空串会漏过去，按钮又会变成永远禁用。
   */
  const detailName = detail.info.name
  const readyName = detailName != null && detailName !== '' ? detailName : info.name
  const isReady = !!readyName
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
    handlePlay(info.id, info.source, detail.list).catch(() => {
      toast(t('load_failed'))
    }).finally(() => {
      pendingRef.current = false
      setPending('')
    })
  }, [detail.list, info.id, info.source, isReady, t])

  const handleCollection = useCallback(() => {
    if (!isReady) {
      toast(t('load_failed'))
      return
    }
    if (pendingRef.current) return
    pendingRef.current = true
    setPending('collect')
    handleCollect(info.id, info.source, readyName).catch(() => {
      toast(t('load_failed'))
    }).finally(() => {
      pendingRef.current = false
      setPending('')
    })
  }, [info.id, info.source, isReady, readyName, t])

  const playLabel = pending === 'play' ? t('loading') : t('play_all')
  const collectLabel = pending === 'collect' ? t('loading') : t('collect_songlist')

  return (
    <View style={styles.container}>
      {/*
        这一行原本是三个等宽文字按钮，没有图标、没有边框、也没有主次：
        收藏和播放全部读不到详情时永远禁用（上面已修），即使可用也只是一行
        平铺文字，看不出哪个是主要动作。
        现在「播放全部」是主按钮（实心品牌底 + 播放图标），「收藏歌单」
        是次要按钮（内容层表面 + 心形图标），「返回」退成工具栏左侧的
        图标按钮——它本来就不该和两个主操作平分注意力。
      */}
      <Button
        onPress={back}
        accessibilityLabel={t('back')}
        style={{ ...styles.iconBtn, ...createContentSurface(theme, { radius: Radius.pill }) }}
      >
        <Icon name="chevron-left" size={IconSize.affordance} color={theme['c-font']} />
      </Button>
      <View style={styles.actions}>
        <Button
          onPress={handleCollection}
          disabled={disabled}
          accessibilityLabel={t('collect_songlist')}
          style={{ ...styles.secondaryBtn, ...createContentSurface(theme, { radius: Radius.pill }), ...(disabled ? styles.btnDisabled : null) }}
        >
          <Icon name="love" size={15} color={theme['c-primary-font-active']} />
          <Text style={styles.btnText} size={Typography.compact} color={theme['c-primary-font-active']}>{collectLabel}</Text>
        </Button>
        <Button
          onPress={handlePlayAll}
          disabled={disabled}
          accessibilityLabel={t('play_all')}
          style={{ ...styles.primaryBtn, backgroundColor: theme['c-primary-solid'], ...(disabled ? styles.btnDisabled : null) }}
        >
          <Icon name="play" size={15} color={theme['c-on-solid']} />
          <Text style={styles.btnText} size={Typography.compact} color={theme['c-on-solid']}>{playLabel}</Text>
        </Button>
      </View>
    </View>
  )
})

const styles = createStyle({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: PageMetrics.gutter,
    paddingBottom: Gap.tight,
    gap: Gap.tight,
  },
  /** 返回是导航动作，退成图标按钮，不与两个主操作争注意力 */
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  actions: {
    flexDirection: 'row',
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'flex-end',
    gap: Gap.tight,
  },
  primaryBtn: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexGrow: 0,
    flexShrink: 0,
  },
  secondaryBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexGrow: 0,
    flexShrink: 0,
  },
  btnText: {
    fontWeight: FontWeight.semibold,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  btnDisabled: {
    opacity: 0.45,
  },
})

import { forwardRef, type Ref, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { View, type ColorValue } from 'react-native'

import DorpDownMenu, { type DorpDownMenuProps as _DorpDownMenuProps } from '@/components/common/DorpDownMenu'
import Text from '@/components/common/Text'
import { useI18n, type Message } from '@/lang'
import { ensureHealthLoaded, getHealthSnapshot, subscribeSourceHealth, type SourceHealthSnapshot } from '@/core/sourceHealth'

import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { createStyle } from '@/utils/tools'

type Sources = Readonly<Array<LX.OnlineSource | 'all'>>

export interface SourceSelectorProps<S extends Sources> {
  fontSize?: number
  center?: _DorpDownMenuProps<any>['center']
  onSourceChange: (source: S[number]) => void
}

export interface SourceSelectorType<S extends Sources> {
  setSourceList: (list: S, activeSource: S[number]) => void
}

export const useSourceListI18n = (list: Sources) => {
  const sourceNameType = useSettingValue('common.sourceNameType')
  const t = useI18n()
  return useMemo(() => {
    return list.map(s => ({ label: t(`source_${sourceNameType}_${s}`), action: s }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, sourceNameType, t])
}

const Component = <S extends Sources>({ fontSize = 15, center, onSourceChange }: SourceSelectorProps<S>, ref: Ref<SourceSelectorType<S>>) => {
  const sourceNameType = useSettingValue('common.sourceNameType')
  const [list, setList] = useState([] as unknown as S)
  const [source, setSource] = useState<S[number]>('kw')
  const t = useI18n()
  const theme = useTheme()

  // 健康快照：初值先吃内存（启动时 refreshHealth 可能已经填过），再补一次读盘，之后跟订阅
  const [health, setHealth] = useState<SourceHealthSnapshot | null>(() => getHealthSnapshot())
  useEffect(() => {
    setHealth(getHealthSnapshot())
    void ensureHealthLoaded()
    return subscribeSourceHealth(setHealth)
  }, [])

  useImperativeHandle(ref, () => ({
    setSourceList(list, activeSource) {
      setList(list)
      setSource(activeSource)
    },
  }), [])

  const sourceList_t = useSourceListI18n(list)

  interface SourceMenuItem { label: string, action: S[number], color?: ColorValue }

  // i18n 缺 key 时会回显 key 本身（src/lang/i18n.ts:96-99），这里再兜一层占位文案，
  // 避免菜单项显示成"酷我音乐source_unavailable"。key 落地后自动走语言包。
  // 待补 key 见 shots-gh/i18n-requests/source-health.md。
  const unavailableSuffix = useMemo(() => {
    const key = 'source_unavailable'
    const text = t(key as unknown as keyof Message)
    return text === key ? '（不可用）' : text
  }, [t])

  const menuItems = useMemo(() => {
    // 只有 state === 'unavailable' 才置灰：'unknown' 是整轮全失败判出的网络问题，
    // 断网时不该把五个源全标成不可用。点击行为一律不变，用户仍可手点一次重试。
    const sources = health?.sources
    return sourceList_t.map((item): SourceMenuItem => {
      if (sources?.[item.action]?.state !== 'unavailable') return item
      return {
        ...item,
        label: `${item.label}${unavailableSuffix}`,
        color: theme['c-font-label'],
      }
    })
  }, [sourceList_t, health, unavailableSuffix, theme])

  type DorpDownMenuProps = _DorpDownMenuProps<typeof menuItems>

  const handleChangeSource: DorpDownMenuProps['onPress'] = ({ action }) => {
    onSourceChange(action)
    setSource(action)
  }

  return (
    <DorpDownMenu
      menus={menuItems}
      center={center}
      onPress={handleChangeSource}
      fontSize={fontSize}
      activeId={source}
      btnStyle={styles.sourceMenuButton}
    >
      <View style={styles.sourceMenu}>
        <Text style={{ width: '100%', textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false }} numberOfLines={1} size={fontSize}>{t(`source_${sourceNameType}_${source}`)}</Text>
      </View>
    </DorpDownMenu>
  )
}

export default forwardRef(Component) as <S extends Sources>(p: SourceSelectorProps<S> & { ref?: Ref<SourceSelectorType<S>> }) => JSX.Element | null


const styles = createStyle({
  sourceMenuButton: {
    flex: 1,
  },
  sourceMenu: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    /**
     * 内边距收到 8：音源名统一按四字宽度摆放（由外层容器给宽度），
     * 再留 15pt 的左右内边距会把文字挤到换行边缘。
     */
    paddingLeft: 8,
    paddingRight: 8,
    // backgroundColor: '#ccc',
  },
})

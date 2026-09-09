import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'

import { Icon } from '@/components/common/Icon'
import { BorderRadius, BorderWidths } from '@/theme'
import { useTheme } from '@/store/theme/hook'
import { useActiveListId, useListFetching, useMusicList } from '@/store/list/hook'
import listState from '@/store/list/state'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { LIST_IDS } from '@/config/constant'
import Loading from '@/components/common/Loading'
import { useSettingValue } from '@/store/setting/hook'

export interface ActiveListProps {
  onShowSearchBar: () => void
  onScrollToTop: () => void
}
export interface ActiveListType {
  setVisibleBar: (visible: boolean) => void
}

export default forwardRef<ActiveListType, ActiveListProps>(({ onShowSearchBar, onScrollToTop }, ref) => {
  const theme = useTheme()
  const currentListId = useActiveListId()
  const fetching = useListFetching(currentListId)
  const musicList = useMusicList()
  const langId = useSettingValue('common.langId')
  const currentListName = useMemo(() => {
    switch (currentListId) {
      case LIST_IDS.TEMP:
        return global.i18n.t('list_name_temp')
      case LIST_IDS.DEFAULT:
        return global.i18n.t('list_name_default')
      case LIST_IDS.LOVE:
        return global.i18n.t('list_name_love')
      default:
        return listState.allList.find(l => l.id === currentListId)?.name ?? ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentListId, langId])
  const [visibleBar, setVisibleBar] = useState(true)

  useImperativeHandle(ref, () => ({
    setVisibleBar(visible) {
      setVisibleBar(visible)
    },
  }))

  return (
    <View style={{ ...styles.currentList, opacity: visibleBar ? 1 : 0, backgroundColor: theme['c-primary-input-background'], borderColor: theme['c-border-background'] }}>
      <TouchableOpacity accessibilityRole="button" accessibilityHint="长按回到歌曲开头" onPress={onScrollToTop} onLongPress={onScrollToTop} style={styles.currentListMain}>
        <View style={{ ...styles.currentListIcon, backgroundColor: theme['c-primary-background-active'] }}>
          <Icon color={theme['c-primary-font']} name="album" size={15} />
        </View>
        <View style={styles.currentListCopy}>
          <Text style={styles.currentListText} numberOfLines={1} color={theme['c-font']}>{currentListName}</Text>
          <Text numberOfLines={1} size={11} color={theme['c-font-label']}>{fetching ? global.i18n.t('list_loading') : global.i18n.t('list_song_count', { num: musicList.length })}</Text>
        </View>
        { fetching ? <Loading color={theme['c-primary']} style={styles.loading} /> : null }
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={global.i18n.t('nav_search')} style={{ ...styles.currentListBtns, backgroundColor: theme['c-primary-background-active'] }} onPress={onShowSearchBar}>
        <Icon color={theme['c-primary-font']} name="search-2" size={16} />
      </TouchableOpacity>
    </View>
  )
})


const styles = createStyle({
  currentList: {
    flexDirection: 'row',
    paddingRight: 10,
    height: 56,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: BorderWidths.normal,
    borderRadius: BorderRadius.normal + 8,
    // backgroundColor: 'rgba(0,0,0,0.2)',
  },
  currentListIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentListMain: {
    flex: 1,
    height: '100%',
    paddingLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentListCopy: {
    flex: 1,
    paddingLeft: 10,
  },
  currentListText: {
    paddingRight: 10,
  },
  loading: {
    marginRight: 5,
  },
  currentListBtns: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'rgba(0,0,0,0.2)',
  },
})

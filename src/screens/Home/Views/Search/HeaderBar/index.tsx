import { useRef, forwardRef, useImperativeHandle } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Icon } from '@/components/common/Icon'

// import music from '@/utils/musicSdk'
import { BorderWidths } from '@/theme'
// import InsetShadow from 'react-native-inset-shadow'
import SourceSelector, {
  type SourceSelectorType as _SourceSelectorType,
  type SourceSelectorProps as _SourceSelectorProps,
} from '@/components/SourceSelector'
import SearchInput, { type SearchInputType, type SearchInputProps } from './SearchInput'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { type Source as MusicSource } from '@/store/search/music/state'
import { type Source as SonglistSource } from '@/store/search/songlist/state'
import SearchTypeSelector from '../SearchTypeSelector'

type Sources = Readonly<Array<MusicSource | SonglistSource>>
type SourceSelectorProps = _SourceSelectorProps<Sources>
type SourceSelectorType = _SourceSelectorType<Sources>

export interface HeaderBarProps {
  onSourceChange: SourceSelectorProps['onSourceChange']
  onTipSearch: SearchInputProps['onChangeText']
  onSearch: SearchInputProps['onSubmit']
  onHideTipList: SearchInputProps['onBlur']
  onShowTipList: SearchInputProps['onTouchStart']
  showPlayAll?: boolean
  onPlayAll?: () => void
}

export interface HeaderBarType {
  setSourceList: SourceSelectorType['setSourceList']
  setText: SearchInputType['setText']
  blur: SearchInputType['blur']
}


export default forwardRef<HeaderBarType, HeaderBarProps>(({ onSourceChange, onTipSearch, onSearch, onHideTipList, onShowTipList, showPlayAll = false, onPlayAll }, ref) => {
  const sourceSelectorRef = useRef<SourceSelectorType>(null)
  const searchInputRef = useRef<SearchInputType>(null)
  const theme = useTheme()

  useImperativeHandle(ref, () => ({
    setSourceList(list, source) {
      sourceSelectorRef.current?.setSourceList(list, source)
    },
    setText(text) {
      searchInputRef.current?.setText(text)
    },
    blur() {
      searchInputRef.current?.blur()
    },
  }), [])


  return (
    <View style={{ ...styles.searchBar, borderBottomColor: theme['c-border-background'] }}>
      <View style={{ ...styles.selector, backgroundColor: theme['c-button-background'], borderColor: theme['c-border-background'] }}>
        <SourceSelector ref={sourceSelectorRef} onSourceChange={onSourceChange} center />
      </View>
      <SearchInput
        ref={searchInputRef}
        onChangeText={onTipSearch}
        onSubmit={onSearch}
        onBlur={onHideTipList}
        onTouchStart={onShowTipList}
      />
      <View style={styles.typeSelector}>
        <SearchTypeSelector />
      </View>
      {showPlayAll && onPlayAll ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={global.i18n.t('play_all')}
          style={{ ...styles.playAllButton, backgroundColor: theme['c-primary-background-active'] }}
          onPress={onPlayAll}
        >
          <Icon name="play" size={13} color={theme['c-primary-font-active']} />
        </TouchableOpacity>
      ) : null}
    </View>
  )
})

const styles = createStyle({
  searchBar: {
    flexDirection: 'row',
    height: 58,
    zIndex: 2,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
    borderBottomWidth: BorderWidths.normal,
  },
  selector: {
    height: 42,
    marginRight: 9,
    borderRadius: 16,
    borderWidth: BorderWidths.normal,
    overflow: 'hidden',
  },
  typeSelector: {
    marginLeft: 9,
    flexGrow: 0,
    flexShrink: 0,
  },
  playAllButton: {
    marginLeft: 9,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

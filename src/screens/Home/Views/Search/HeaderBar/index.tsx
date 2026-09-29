import { useRef, forwardRef, useImperativeHandle } from 'react'
import { View } from 'react-native'

// import music from '@/utils/musicSdk'
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
import { PageMetrics, Radius, createContentSurface } from '@/theme/layout'
import PageToolbar from '@/components/common/PageToolbar'

type Sources = Readonly<Array<MusicSource | SonglistSource>>
type SourceSelectorProps = _SourceSelectorProps<Sources>
type SourceSelectorType = _SourceSelectorType<Sources>

export interface HeaderBarProps {
  onSourceChange: SourceSelectorProps['onSourceChange']
  onTipSearch: SearchInputProps['onChangeText']
  onSearch: SearchInputProps['onSubmit']
  onHideTipList: SearchInputProps['onBlur']
  onShowTipList: SearchInputProps['onTouchStart']
}

export interface HeaderBarType {
  setSourceList: SourceSelectorType['setSourceList']
  setText: SearchInputType['setText']
  blur: SearchInputType['blur']
}


export default forwardRef<HeaderBarType, HeaderBarProps>(({ onSourceChange, onTipSearch, onSearch, onHideTipList, onShowTipList }, ref) => {
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
    <PageToolbar>
      <View style={{ ...styles.selector, ...createContentSurface(theme, { radius: Radius.control }) }}>
        <SourceSelector ref={sourceSelectorRef} onSourceChange={onSourceChange} />
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
    </PageToolbar>
  )
})

const styles = createStyle({
  selector: {
    height: PageMetrics.controlHeight,
    minWidth: 64,
    flexGrow: 0,
    flexShrink: 0,
    marginRight: 8,
    // 圆角与描边由 createContentSurface 统一给出
    overflow: 'hidden',
  },
  typeSelector: {
    marginLeft: 8,
    flexGrow: 0,
    flexShrink: 0,
  },
})

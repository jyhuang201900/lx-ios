import { forwardRef, useImperativeHandle, useRef } from 'react'

import SourceSelector, {
  type SourceSelectorType as _SourceSelectorType,
  type SourceSelectorProps as _SourceSelectorProps,
} from '@/components/SourceSelector'
import leaderboardState, { type Source, type InitState } from '@/store/leaderboard/state'

type Sources = Readonly<InitState['sources']>
type SourceSelectorCommonProps = _SourceSelectorProps<Sources>
type SourceSelectorCommonType = _SourceSelectorType<Sources>

export interface SourceSelectorProps {
  onSourceChange: SourceSelectorCommonProps['onSourceChange']
}

export interface SourceSelectorType {
  setSource: (source: Source) => void
}

export default forwardRef<SourceSelectorType, SourceSelectorProps>(({ onSourceChange }, ref) => {
  const sourceSelectorRef = useRef<SourceSelectorCommonType>(null)

  useImperativeHandle(ref, () => ({
    setSource(source) {
      sourceSelectorRef.current?.setSourceList(leaderboardState.sources, source)
    },
  }), [])


  return <SourceSelector ref={sourceSelectorRef} onSourceChange={onSourceChange} />
})

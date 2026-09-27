import { useCallback, useRef } from 'react'
import { View } from 'react-native'
import PageToolbar from '@/components/common/PageToolbar'
import NavList from './NavList'
import Main, { type MainType, type SettingScreenIds } from '../Main'

export type { SettingScreenIds } from '../Main'

export default () => {
  const mainRef = useRef<MainType>(null)
  const handleChangeId = useCallback((id: SettingScreenIds) => {
    mainRef.current?.setActiveId(id)
  }, [])

  return (
    <View style={{ flex: 1 }}>
      <PageToolbar>
        <NavList onChangeId={handleChangeId} />
      </PageToolbar>
      <View style={{ flex: 1 }}>
        <Main ref={mainRef} />
      </View>
    </View>
  )
}

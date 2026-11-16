import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'

import Basic from './settings/Basic'
import Player from './settings/Player'
import LyricDesktop from './settings/LyricDesktop'
import Search from './settings/Search'
import List from './settings/List'
import Sync from './settings/Sync'
import Backup from './settings/Backup'
import Other from './settings/Other'
import Version from './settings/Version'
import About from './settings/About'
import ThemeScreen from './settings/Theme/Screen'
import { pickStartupSettingId } from './startupSetting'

export const SETTING_SCREENS = [
  'basic',
  // 主题外观：内容原本只内联在 basic 里（Basic 直接引 ../Theme），
  // CI 要单独拍这一屏，所以拆出一个独立导航项；Basic 那边的内联用法不变。
  'theme',
  'player',
  'lyric_desktop',
  'search',
  'list',
  'sync',
  'backup',
  'other',
  'version',
  'about',
] as const

export type SettingScreenIds = typeof SETTING_SCREENS[number]

// interface MainProps {
//   onUpdateActiveId: (id: string) => void
// }
export interface MainType {
  setActiveId: (id: SettingScreenIds) => void
}

const Main = forwardRef<MainType, {}>((props, ref) => {
  // 截图流程用：manifest 预置了 common.startupSettingId 时直接渲染该子页，
  // 未预置（null）或下标越界时沿用 global 里的默认值，产品行为不变。
  const [id, setId] = useState<SettingScreenIds>(() => pickStartupSettingId(SETTING_SCREENS, global.lx.settingActiveId))

  useImperativeHandle(ref, () => ({
    setActiveId(id) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setId(id)
        })
      })
    },
  }))

  const component = useMemo(() => {
    switch (id) {
      case 'player': return <Player />
      case 'lyric_desktop': return <LyricDesktop />
      case 'search': return <Search />
      case 'list': return <List />
      case 'sync': return <Sync />
      case 'backup': return <Backup />
      case 'other': return <Other />
      case 'version': return <Version />
      case 'about': return <About />
      case 'theme': return <ThemeScreen />
      case 'basic':
      default: return <Basic />
    }
  }, [id])

  return component
})


export default Main


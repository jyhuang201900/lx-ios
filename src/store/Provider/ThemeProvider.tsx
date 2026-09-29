import { memo, useEffect, useMemo, useState } from 'react'

import themeState, { ThemeContext } from '../theme/state'
import { useDisplaySettings } from '@/theme/accessibility'


export default memo(({ children }: {
  children: React.ReactNode
}) => {
  const [theme, setTheme] = useState(themeState.theme)
  // 系统显示设置（降低透明度 / 加粗文本）会改变玻璃与描边的取法，
  // 所以让它参与 context 值：任何 useTheme() 的消费者都会随之重渲染，
  // createGlassStyle 里的降级分支才能真正生效。
  const displaySettings = useDisplaySettings()

  useEffect(() => {
    const handleUpdateTheme = (theme: LX.ActiveTheme) => {
      requestAnimationFrame(() => {
        setTheme(theme)
      })
    }
    global.state_event.on('themeUpdated', handleUpdateTheme)
    return () => {
      global.state_event.off('themeUpdated', handleUpdateTheme)
    }
  }, [])

  // 仅在主题或显示设置变化时产出新对象，避免每次渲染都让 useTheme() 的
  // 消费者失去 memo 收益。设置本身不塞进 theme：样式函数从模块仓库读取，
  // 这里只需要让引用变化，从而触发消费者重渲染并重算样式。
  // displaySettings 确实不参与计算，但删掉它就等于关掉了降级——
  // 这是有意为之的"仅用于触发重渲染"依赖。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value: LX.ActiveTheme = useMemo(() => ({ ...theme }), [displaySettings, theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
})

import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

export interface DisplaySettings {
  reduceTransparency: boolean
  boldText: boolean
}

const INITIAL: DisplaySettings = { reduceTransparency: false, boldText: false }

let current: DisplaySettings = INITIAL
const listeners = new Set<(s: DisplaySettings) => void>()

export const getDisplaySettings = (): DisplaySettings => current

export const setDisplaySettings = (next: DisplaySettings) => {
  current = next
  listeners.forEach(l => { l(next) })
}

/**
 * 订阅系统显示设置并写入模块级仓库。
 *
 * 为什么需要这个仓库：createGlassStyle 是普通样式函数，不是 Hook，
 * 拿不到 hook 的返回值。而降级逻辑必须对全部玻璃表面统一生效，
 * 不能让某些表面漏掉——所以把设置放在模块作用域，由根部组件统一同步。
 *
 * RN 0.73 没有暴露 iOS 的 Increase Contrast（darkerSystemColors），
 * 可用的是 reduceMotion、reduceTransparency、boldText、grayscale、invertColors。
 * 对比度的责任因此落在默认色板本身：16 个主题的正文与次要文字均满足 AA 4.5:1
 * （由 scripts/check-contrast.py 实算核验）。
 */
export const useDisplaySettings = (): DisplaySettings => {
  const [settings, setSettings] = useState<DisplaySettings>(current)

  useEffect(() => {
    let mounted = true

    const apply = (next: Partial<DisplaySettings>) => {
      if (!mounted) return
      setDisplaySettings({ ...getDisplaySettings(), ...next })
    }

    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then(v => { apply({ reduceTransparency: v }) })
      .catch(() => {})
    void AccessibilityInfo.isBoldTextEnabled()
      .then(v => { apply({ boldText: v }) })
      .catch(() => {})

    const subs = [
      AccessibilityInfo.addEventListener('reduceTransparencyChanged', v => { apply({ reduceTransparency: v }) }),
      AccessibilityInfo.addEventListener('boldTextChanged', v => { apply({ boldText: v }) }),
    ]

    const onChange = (next: DisplaySettings) => { if (mounted) setSettings(next) }
    listeners.add(onChange)

    return () => {
      mounted = false
      subs.forEach(s => { s.remove() })
      listeners.delete(onChange)
    }
  }, [])

  return settings
}

// ---------------------------------------------------------------------------
// 对比度工具
//
// 放在这里而不是 scripts 里，是因为派生 token 的计算发生在运行时（index.ts），
// 核验脚本只是复用同一套规则。两者共用一份实现，才不会出现
// 「脚本说通过、代码实际不通过」那种静默漂移。
// ---------------------------------------------------------------------------

const parseRgb = (color: string): readonly [number, number, number] | null => {
  const match = /rgba?\(([^)]+)\)/.exec(color.trim())
  if (!match) return null
  const parts = match[1].split(',')
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])]
}

const channelLuminance = (value: number) => {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export const relativeLuminance = (color: string): number | null => {
  const rgb = parseRgb(color)
  if (!rgb) return null
  const [r, g, b] = rgb
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
}

export const contrastRatio = (a: string, b: string): number | null => {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  if (la == null || lb == null) return null
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** WCAG AA 正文对比度。11~17pt 的文字适用这个门槛 */
export const AA_TEXT = 4.5

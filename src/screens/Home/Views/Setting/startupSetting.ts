import settingState from '@/store/setting/state'
import type { SettingScreenIds } from './Main'

/**
 * 截图流程用：把 common.startupSettingId（SETTING_SCREENS 的下标）解析成真实子页 id。
 *
 * 为什么要有它：模拟器里点不了导航条，CI 只能靠往 AsyncStorage manifest 里预置
 * 一个下标，冷启动时由设置页自己选中对应项——和 common.startupNavId 同一条路子。
 * 没预置（null）、不是整数、下标越界时原样返回 fallback，产品行为不变。
 */
export const pickStartupSettingId = (
  screens: readonly SettingScreenIds[],
  fallback: SettingScreenIds,
): SettingScreenIds => {
  const index: number | null = settingState.setting['common.startupSettingId']
  if (typeof index != 'number' || !Number.isInteger(index)) return fallback
  return screens[index] ?? fallback
}

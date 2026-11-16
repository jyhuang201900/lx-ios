import { updateSetting as mergeSetting } from '@/config/setting'
import state, { migrateSetting, normalizeSetting } from './state'


export default {
  /**
   * 用存储读出的整份配置初始化设置。
   * 为什么把入参放宽成 unknown：调用方拿到的是“存储里的原始值”，不保证是合法 LX.AppSetting，
   * 清洗统一放在 store 这一层做，调用方不需要各自防御。
   */
  initSetting(rawSetting: unknown, fromVersion?: string | null) {
    state.setting = normalizeSetting(rawSetting, fromVersion).setting
  },
  updateSetting(newSetting: Partial<LX.AppSetting>) {
    // 为什么先把新值过一遍 migrate/sanitize：core/common 启动时把整份存储设置从这里灌进 store，
    // 这里是脏数据（旧版本残留 key、错类型值）进入内存的最后一道闸；只把合法 key 交给 merge，
    // 被丢弃的 key 在 store 里保持原值（通常是默认值），不会被写穿。
    const { setting: cleanSetting } = migrateSetting(newSetting)
    const result = mergeSetting(cleanSetting)
    state.setting = result.setting
    global.state_event.configUpdated(result.updatedSettingKeys, result.updatedSetting)
  },
}

import defaultSetting from '@/config/defaultSetting'
import { bootLog } from '@/utils/bootLog'


interface InitState {
  setting: LX.AppSetting
}

/**
 * 当前设置存储的结构版本号。
 * 为什么不另写死字面量：版本号只能有一个权威来源，两处各写一份迟早失配，
 * 将来升版本只改 defaultSetting.version 即可。
 */
export const SETTING_SCHEMA_VERSION: string = defaultSetting.version

// 统一以 Record 视图读取默认值，避免每个 key 都要窄化一次联合类型
const DEFAULT_SETTING_RECORD = defaultSetting as unknown as Record<string, unknown>

// 这几个 key 会改写对象原型，即使将来某个默认值恰好同名也不接受（防御性拦截）
const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype']

// 默认值为 null 的 key 只接受原始值：它们的声明类型都是 string 联合/null，运行期分辨不出具体联合，
// 但对象/数组一定不属于任何声明类型，可以直接判脏
const isPrimitiveValue = (val: unknown): boolean => val === null || ['string', 'number', 'boolean'].includes(typeof val)

const typeName = (val: unknown): string => {
  if (val === null) return 'null'
  if (val === undefined) return 'undefined'
  if (Array.isArray(val)) return 'array'
  return typeof val
}

export interface SettingReset {
  key: string
  expected: string
  received: string
}

export interface SettingAudit {
  /** 校验通过、可直接合并的配置（只含 defaultSetting 里存在的 key） */
  setting: Partial<LX.AppSetting>
  /** 被丢弃的未知 key：旧版本残留、同步/导入写入的脏字段 */
  droppedKeys: string[]
  /** 类型不符、应回退默认值的 key */
  resets: SettingReset[]
}

// 同一次运行内每个 key 只记一条日志：滑杆类设置会高频写值，脏 key 反复刷日志会淹没启动日志
const loggedKeys = new Set<string>()

/**
 * 校验并清洗一份从存储（或同步、导入）读出的设置对象。
 * 为什么需要：AsyncStorage 里可能是旧版本残留字段、别的客户端写入的类型错值，
 * 直接 merge 进内存会让未声明的 key 常驻（并再次落盘），也会把错类型塞给 UI/播放器。
 */
export const sanitizeSetting = (raw: unknown): SettingAudit => {
  const setting: Record<string, unknown> = {}
  const droppedKeys: string[] = []
  const resets: SettingReset[] = []

  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    // 存储里可能是字符串/数组等完全不是配置对象的内容，整体作废，全部走默认值
    if (raw != null) bootLog(`[setting] stored setting is not an object (${typeName(raw)}), fallback to defaults.`)
    return { setting, droppedKeys, resets }
  }

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.includes(key) || !Object.prototype.hasOwnProperty.call(DEFAULT_SETTING_RECORD, key)) {
      droppedKeys.push(key)
      continue
    }
    // 没写过的 key（undefined）交给默认值兜底，属于正常情况，不算脏数据
    if (value === undefined) continue

    const defaultValue = DEFAULT_SETTING_RECORD[key]
    if (defaultValue === null) {
      // 默认值是 null 说明该 key 本身是“可选值”，不能按“与默认值类型相同”来判，
      // 否则任何非 null 的合法值都会被误判为类型不符
      if (!isPrimitiveValue(value)) {
        resets.push({ key, expected: 'string | null', received: typeName(value) })
        continue
      }
      setting[key] = value
      continue
    }

    if (typeof value !== typeof defaultValue) {
      resets.push({ key, expected: typeof defaultValue, received: typeName(value) })
      continue
    }
    // NaN / Infinity 的 typeof 同样是 number，但落到音量、速率这类字段会让播放器算出 NaN
    if (typeof value === 'number' && !Number.isFinite(value)) {
      resets.push({ key, expected: 'finite number', received: String(value) })
      continue
    }

    setting[key] = value
  }

  if (droppedKeys.length > 0) bootLog(`[setting] dropped ${droppedKeys.length} unknown key(s): ${droppedKeys.join(', ')}`)
  for (const item of resets) {
    if (loggedKeys.has(item.key)) continue
    loggedKeys.add(item.key)
    bootLog(`[setting] type mismatch, fallback to default: ${item.key} (expect ${item.expected}, got ${item.received})`)
  }

  return { setting: setting as Partial<LX.AppSetting>, droppedKeys, resets }
}

/**
 * 设置迁移钩子（占位实现，当前只做 normalize）。
 * 将来接法：
 *   1. 每升一版在这里加一段 `if (compareVer(fromVersion, '2.1') < 0) { ... }`，
 *      段落里只做“旧 key -> 新 key”的搬运，不改无关字段；
 *   2. 搬运允许产出已废弃字段（例如旧 `player.*` 结构），所以最后仍统一走 sanitizeSetting；
 *   3. 升版本时把 defaultSetting.version（即 SETTING_SCHEMA_VERSION）抬到新值，
 *      并在 defaultSetting 里补上新 key 的默认值。
 * @param raw 从存储读出的原始对象，可能是任意脏数据
 * @param fromVersion 存储里记录的版本号，缺省时取 raw.version
 */
export const migrateSetting = (raw: unknown, fromVersion?: string | null): SettingAudit => {
  // 先浅拷贝：调用方可能继续持有原对象，处理过程不就地改写它
  const source = raw != null && typeof raw === 'object' && !Array.isArray(raw)
    ? { ...(raw as Record<string, unknown>) }
    : null
  const version = fromVersion ?? (typeof source?.version === 'string' ? source.version : null)

  if (version != null && version !== SETTING_SCHEMA_VERSION) {
    bootLog(`[setting] migrate from ${version} to ${SETTING_SCHEMA_VERSION}: no migration step registered yet, normalize only.`)
  }

  return sanitizeSetting(source ?? raw)
}

/**
 * 把存储读出的配置变成可直接赋给 store 的完整设置：未知 key 丢弃、类型不符回退、缺失 key 补默认值。
 * 为什么额外提供：调用方只该做一次赋值，不该自己再拼一遍默认值（拼错就会漏 key）。
 */
export const normalizeSetting = (raw: unknown, fromVersion?: string | null): { setting: LX.AppSetting, audit: SettingAudit } => {
  const audit = migrateSetting(raw, fromVersion)
  const setting: LX.AppSetting = { ...defaultSetting, ...audit.setting }
  // 版本号永远以当前代码为准，避免脏数据把 version 写回旧值后被原样存回去
  setting.version = SETTING_SCHEMA_VERSION
  return { setting, audit }
}

const state: InitState = {
  setting: { ...defaultSetting },
}


export default state

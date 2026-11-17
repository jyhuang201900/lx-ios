/**
 * 音源健康探针
 *
 * 用途：启动后在后台给五个在线音源各发一次最轻量的请求，把结果缓存到 `@source_health`，
 *       音源选择器据此把"确定不可用"的源置灰。全部源同时失败时判为网络问题（unknown），
 *       不置灰——否则用户一断网就会看到五个源全灰，误以为所有源都挂了。
 * 用法：`void refreshHealth()`（启动挂一次）；界面侧 `getHealthSnapshot()` +
 *       `subscribeSourceHealth(cb)`；需要强制重探时 `refreshHealth({ force: true })`。
 * 依赖：`@/utils/musicSdk`（kw/kg/tx/wy/mg 的 hotSearch.getList）、`@/utils/musicSdk/utils`
 *       （normalizeError / REQUEST_ERROR_CODES）、`@/plugins/storage`、`@/utils/log`。
 * 验证：2026-11-17，`node runs/source-health-test/check.mjs`：
 *       成功源→ok、超时源→TIMEOUT、500 源→HTTP、全失败→unknown、24h 内复用缓存不再探测。
 */
import { getData, saveData } from '@/plugins/storage'
import musicSdk from '@/utils/musicSdk'
import { normalizeError, REQUEST_ERROR_CODES } from '@/utils/musicSdk/utils'
import { log } from '@/utils/log'

/** 单源探测的超时上限：超过 8 秒还没响应就当这一源失败，不让它拖住整轮探测 */
export const PROBE_TIMEOUT_MS = 8000
/** 快照有效期：24 小时内复用上次结果，避免每次启动都打一轮五源请求 */
export const HEALTH_TTL_MS = 24 * 60 * 60 * 1000
/** 上次整轮判为"疑似断网"时缩短有效期：断网是暂时的，隔 10 分钟该再试一次 */
export const NETWORK_SUSPECT_TTL_MS = 10 * 60 * 1000

/**
 * 与 `src/config/constant.ts` 的 storageDataPrefix 同风格（`@xxx_yyy`）。
 * 那个对象不在本次写域里，所以这里就地定义，键名与任务约定一致。
 */
const HEALTH_STORAGE_KEY = '@source_health'

/** 在线音源清单：与 `src/utils/musicSdk/index.js:12-46` 的 sources.sources 保持一致（bd 已注释、xm 是占位） */
export const SOURCE_IDS = ['kw', 'kg', 'tx', 'wy', 'mg'] as const
export type SourceId = typeof SOURCE_IDS[number]

/**
 * 健康状态的三种取值：
 * - `ok`：探通了
 * - `unavailable`：单独探这一源失败（HTTP 非 2xx / 结构不符 / 单源超时），确定是这个源的问题
 * - `unknown`：整轮全失败，更像断网 / 代理挂了，界面不据此置灰
 */
export type SourceHealthState = 'ok' | 'unavailable' | 'unknown'

export interface SourceHealth {
  id: string
  ok: boolean
  state: SourceHealthState
  latencyMs: number
  checkedAt: number
  errorCode?: string
}

export interface SourceHealthSnapshot {
  checkedAt: number
  /** 整轮全失败且没有任何"连上了但报错"的证据：判为网络问题，界面不置灰 */
  networkSuspect: boolean
  sources: Record<string, SourceHealth>
}

/** 单个源的探测动作；默认实现打 hotSearch，单测里可以替换成任意 mock */
export type ProbeTask = () => Promise<unknown>
export type ProbeTargets = Record<string, ProbeTask>

export interface ProbeAllOptions {
  timeoutMs?: number
}

export interface RefreshHealthOptions extends ProbeAllOptions {
  /** 忽略缓存，强制重探 */
  force?: boolean
  /** 替换探测目标（单测 / 灰度用）；不传则用五个音源的 hotSearch */
  targets?: ProbeTargets
}

// musicSdk 是 JS 模块，TS 侧拿到的全是 any；集中收窄成显式形状，避免一串 unsafe-* 报错
interface ProbeCapableSource {
  hotSearch?: {
    getList?: (retryNum?: number) => Promise<unknown>
  }
}
const sdk = musicSdk as unknown as Record<string, ProbeCapableSource | undefined>
const normalize = normalizeError as (err: unknown, ctx?: { source?: string }) => { code?: string }
const ERROR_CODES = REQUEST_ERROR_CODES as {
  TIMEOUT: string
  HTTP: string
  SCHEMA: string
  NO_API: string
  UNKNOWN: string
}

type HealthListener = (snapshot: SourceHealthSnapshot | null) => void
const listeners = new Set<HealthListener>()

let memorySnapshot: SourceHealthSnapshot | null = null
let loadTask: Promise<SourceHealthSnapshot | null> | null = null

const notify = () => {
  for (const listener of listeners) {
    try {
      listener(memorySnapshot)
    } catch (err) {
      // 为什么：监听方（界面）抛错不该让整轮探测失败，只记日志
      log.error('source health listener error:', err instanceof Error ? err.message : String(err))
    }
  }
}

/**
 * 默认探测目标：热搜词。
 *
 * 为什么选热搜而不是榜单：五个源都实现了 `hotSearch.getList()`，一次请求直达词条列表；
 * 榜单要先取榜单目录、再按榜单 id 拉内容，贵一倍且多一次失败机会。
 * 返回而不是直接调用，是为了让 `getList` 仍以 hotSearch 对象为 this（它内部用 this._requestObj 去重）。
 */
const getDefaultTargets = (): ProbeTargets => {
  const targets: ProbeTargets = {}
  for (const id of SOURCE_IDS) {
    const hotSearch = sdk[id]?.hotSearch
    const getList = hotSearch?.getList
    if (!hotSearch || typeof getList !== 'function') continue
    targets[id] = async() => getList.call(hotSearch)
  }
  return targets
}

const getHttpStatus = (err: unknown): number | null => {
  if (err == null || typeof err != 'object') return null
  const record = err as { status?: unknown, statusCode?: unknown }
  const status = typeof record.status == 'number' ? record.status : record.statusCode
  return typeof status == 'number' && status >= 400 ? status : null
}

/**
 * 失败原因归一化成 REQUEST_ERROR_CODES 里的一员。
 *
 * 先看 HTTP 状态：音源子目录里大量直接用 httpFetch，抛出来的错误不带 RequestError 的 code，
 * 但 500/403 这类响应对界面来说是"连上了、源坏了"，必须与超时区分开。
 * 其余交给统一错误层 —— 它按文案把超时 / 断网 / 结构错误映射成固定 code。
 */
const toErrorCode = (err: unknown, source: string): string => {
  if (getHttpStatus(err) != null) return ERROR_CODES.HTTP
  const code = normalize(err, { source }).code
  return typeof code == 'string' ? code : ERROR_CODES.UNKNOWN
}

const createProbeTimeout = (id: string) => Object.assign(new Error(`source probe timeout: ${id}`), { code: ERROR_CODES.TIMEOUT })

/**
 * 给探测 Promise 套一个上限。
 * 用 Promise.race 而不是依赖各音源自己的 timeout：热搜接口有的走 httpFetch、有的走 eapi 封装，
 * 超时配置不统一，这里兜最后一道 8 秒。超时后原请求无法在这里取消（探测目标只交出 Promise，
 * 没有 cancel 句柄），所以只丢掉结果，不 pretend 已取消。
 */
const raceWithTimeout = async<T>(task: Promise<T>, timeoutMs: number, id: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeoutTask = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(createProbeTimeout(id))
    }, timeoutMs)
  })
  try {
    return await Promise.race([task, timeoutTask])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * 探测单个源。
 * @param id 音源 id
 * @param targets 探测目标表（单测注入）
 * @param timeoutMs 上限毫秒
 */
export const probeSource = async(id: string, targets: ProbeTargets, timeoutMs = PROBE_TIMEOUT_MS): Promise<SourceHealth> => {
  const task = targets[id]
  const startedAt = Date.now()
  if (!task) {
    // 没有探测目标 = 这一源没实现热搜接口，属于"确定不可用"，与网络无关
    return { id, ok: false, state: 'unavailable', latencyMs: 0, checkedAt: startedAt, errorCode: ERROR_CODES.NO_API }
  }

  try {
    await raceWithTimeout(task(), timeoutMs, id)
    const finishedAt = Date.now()
    return { id, ok: true, state: 'ok', latencyMs: finishedAt - startedAt, checkedAt: finishedAt }
  } catch (err) {
    const finishedAt = Date.now()
    return {
      id,
      ok: false,
      state: 'unavailable',
      latencyMs: finishedAt - startedAt,
      checkedAt: finishedAt,
      errorCode: toErrorCode(err, id),
    }
  }
}

const roundHealth = (health: SourceHealth): SourceHealth => health

/**
 * 并发探测所有源。
 *
 * `Promise.allSettled` 保证单源失败（甚至单源 reject 到我们这层）不影响其它源的结果；
 * probeSource 本身不会 reject，这里再用 allSettled 是第二道保险。
 *
 * 全失败判定：五个源全挂且没有任何一个给出"服务器有响应"的证据（HTTP / SCHEMA）时，
 * 判为网络问题（networkSuspect），状态改记 `unknown` 而不是 `unavailable` —— 界面据此不置灰。
 * 注意是全失败才降级：四个源正常、一个源 500，那个源照样是 unavailable。
 */
export const probeAll = async(targets: ProbeTargets = getDefaultTargets(), options: ProbeAllOptions = {}): Promise<SourceHealthSnapshot> => {
  const ids = Object.keys(targets)
  const settled = await Promise.allSettled(ids.map(async id => probeSource(id, targets, options.timeoutMs)))

  const sources: Record<string, SourceHealth> = {}
  let checkedAt = 0
  ids.forEach((id, index) => {
    const result = settled[index]
    const health: SourceHealth = result.status === 'fulfilled'
      ? roundHealth(result.value)
      : {
          id,
          ok: false,
          state: 'unavailable',
          latencyMs: 0,
          checkedAt: Date.now(),
          errorCode: ERROR_CODES.UNKNOWN,
        }
    sources[id] = health
    if (health.checkedAt > checkedAt) checkedAt = health.checkedAt
  })

  const healthList = Object.values(sources)
  const allFailed = healthList.length > 0 && healthList.every(item => !item.ok)
  const reachableButBroken = healthList.some(item => item.errorCode === ERROR_CODES.HTTP || item.errorCode === ERROR_CODES.SCHEMA)
  const networkSuspect = allFailed && !reachableButBroken
  if (networkSuspect) {
    for (const health of healthList) {
      // 保留实测的 errorCode / 耗时，只把"结论"降级成 unknown，方便排查时看原始证据
      health.state = 'unknown'
    }
  }

  return {
    checkedAt: checkedAt || Date.now(),
    networkSuspect,
    sources,
  }
}

const isSourceHealthSnapshot = (value: unknown): value is SourceHealthSnapshot => {
  if (value == null || typeof value != 'object') return false
  const record = value as { checkedAt?: unknown, networkSuspect?: unknown, sources?: unknown }
  return typeof record.checkedAt === 'number' && typeof record.networkSuspect === 'boolean' &&
    record.sources != null && typeof record.sources === 'object'
}

/** 内存快照；启动前 / 还没读盘时是 null，界面按"全部正常"渲染 */
export const getHealthSnapshot = (): SourceHealthSnapshot | null => memorySnapshot

/**
 * 只从存储里读一次快照（不探测）。
 * 多次调用共享同一个 Promise：音源选择器在多个页面各挂一次，没必要读五遍。
 */
export const ensureHealthLoaded = async(): Promise<SourceHealthSnapshot | null> => {
  if (loadTask) return loadTask
  loadTask = (async() => {
    try {
      const cached = await getData<SourceHealthSnapshot>(HEALTH_STORAGE_KEY)
      if (!isSourceHealthSnapshot(cached)) return null
      memorySnapshot = cached
      notify()
      return cached
    } catch (err) {
      // 为什么吞掉：读盘失败只说明这次拿不到快照，界面退回"全部正常"，不该影响启动
      log.error('source health cache read fail:', err instanceof Error ? err.message : String(err))
      return null
    }
  })()
  return loadTask
}

const isFresh = (snapshot: SourceHealthSnapshot) => {
  const age = Date.now() - snapshot.checkedAt
  if (age < 0) return false
  return age < (snapshot.networkSuspect ? NETWORK_SUSPECT_TTL_MS : HEALTH_TTL_MS)
}

/**
 * 刷新快照：优先复用 24 小时内的缓存，过期或 `force` 时才真正探测。
 * 永不 reject —— 启动流程是 `void refreshHealth()`，抛错会变成未捕获的 promise rejection。
 */
export const refreshHealth = async(options: RefreshHealthOptions = {}): Promise<SourceHealthSnapshot | null> => {
  // 先看内存：本次启动内刚探过一轮时，别因为"读盘只读一次"又把五个源重打一遍
  const cached = memorySnapshot ?? await ensureHealthLoaded()
  if (!options.force && cached && isFresh(cached)) return cached

  try {
    const snapshot = await probeAll(options.targets, { timeoutMs: options.timeoutMs })
    // 为什么关掉这条规则：探测要跑好几秒，期间另一次 refreshHealth 可能已经写了更新的快照；
    // 这里按"最后完成的一轮为准"覆盖是有意行为（旧结果不该压住新结果），不是原子性缺陷。
    // eslint-disable-next-line require-atomic-updates
    memorySnapshot = snapshot
    notify()
    await saveData(HEALTH_STORAGE_KEY, snapshot)
    if (snapshot.networkSuspect) {
      log.warn('source health: all sources failed, treat as network issue (unknown)')
    }
    return snapshot
  } catch (err) {
    log.error('source health probe fail:', err instanceof Error ? err.message : String(err))
    return memorySnapshot ?? cached
  }
}

/** 订阅快照变化；返回取消订阅函数（给 useEffect 直接 return） */
export const subscribeSourceHealth = (listener: HealthListener): () => void => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 某一源是否"确定不可用"（unknown 不算：那是网络问题，不该置灰） */
export const isSourceUnavailable = (id: string): boolean => memorySnapshot?.sources[id]?.state === 'unavailable'

/** 单测 / 登出清理用：丢掉内存态，不碰存储 */
export const resetHealthMemory = () => {
  memorySnapshot = null
  loadTask = null
}

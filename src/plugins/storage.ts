import AsyncStorage from '@react-native-async-storage/async-storage'
import { log } from '@/utils/log'

const partKeyPrefix = '@___PART___'
const partKeyArrPrefix = '@___PART_A___'
const partKeyPrefixRxp = /^@___PART___/
const partKeyArrPrefixRxp = /^@___PART_A___/
const keySplit = ','

// iOS 上 AsyncStorage 的桥调用偶发不回调，一个挂住的 getItem 能把整个启动流程卡死。
// 这里给每个原语套一层 3 秒超时；超时抛 TIMEOUT，沿用原有「出错就 throw」的语义，
// 由调用方的 catch 记日志——不改变错误传播方式，只保证不会无限等待。
const STORAGE_TIMEOUT = 3000

const withTimeout = async<T>(p: Promise<T>, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`storage timeout: ${label}`))
    }, STORAGE_TIMEOUT)
  })
  return Promise.race([p, timeout]).finally(() => {
    clearTimeout(timer)
  })
}

// AsyncStorage 的默认导出没有类型声明，这里写出它真实的形状，
// 好让包装层有准确签名（否则整条链路退化成 any）。
interface StorageLike {
  getItem: (key: string) => Promise<string | null>
  multiGet: (keys: readonly string[]) => Promise<ReadonlyArray<readonly [string, string | null]>>
  multiSet: (pairs: ReadonlyArray<readonly [string, string]>) => Promise<void>
  removeItem: (key: string) => Promise<void>
  multiRemove: (keys: readonly string[]) => Promise<void>
  getAllKeys: () => Promise<readonly string[]>
  clear: () => Promise<void>
}
const storage = AsyncStorage as unknown as StorageLike

const store = {
  getItem: async(key: string): Promise<string | null> => withTimeout(storage.getItem(key), `getItem ${key}`),
  multiGet: async(keys: readonly string[]): Promise<ReadonlyArray<readonly [string, string | null]>> => withTimeout(storage.multiGet(keys), `multiGet x${keys.length}`),
  multiSet: async(pairs: ReadonlyArray<readonly [string, string]>): Promise<void> => withTimeout(storage.multiSet(pairs), `multiSet x${pairs.length}`),
  removeItem: async(key: string): Promise<void> => withTimeout(storage.removeItem(key), `removeItem ${key}`),
  multiRemove: async(keys: readonly string[]): Promise<void> => withTimeout(storage.multiRemove(keys), `multiRemove x${keys.length}`),
  getAllKeys: async(): Promise<readonly string[]> => withTimeout(storage.getAllKeys(), 'getAllKeys'),
  clear: async(): Promise<void> => withTimeout(storage.clear(), 'clear'),
}
const limit = 500000

const buildData = (key: string, value: any, datas: Array<[string, string]>) => {
  let valueStr = JSON.stringify(value)
  if (valueStr.length <= limit) {
    datas.push([key, valueStr])
    return
  }

  const partKeys = []
  for (let i = 0, len = Math.floor(valueStr.length / limit); i <= len; i++) {
    let partKey = `${partKeyArrPrefix}${key}${i}`
    partKeys.push(partKey)
    datas.push([partKey, valueStr.substring(i * limit, (i + 1) * limit)])
  }
  datas.push([key, partKeyArrPrefix + JSON.stringify(partKeys)])
}

// 1.4.0 之前的数据分片存储方式，存在key的内容与分隔符冲突的问题
// 1.4.0 开始改用数组存储，不再使用分隔符的方式
const handleGetDataOld = async<T>(partKeys: string): Promise<T> => {
  const keys = partKeys.replace(partKeyPrefixRxp, '').split(keySplit)

  return store.multiGet(keys).then(datas => {
    return JSON.parse(datas.map(data => data[1]).join(''))
  })
}

const handleGetData = async<T>(partKeys: string): Promise<T> => {
  if (partKeys.startsWith(partKeyPrefix)) return handleGetDataOld<T>(partKeys)

  const keys = JSON.parse(partKeys.replace(partKeyArrPrefixRxp, '')) as string[]
  return store.multiGet(keys).then(datas => {
    return JSON.parse(datas.map(data => data[1]).join(''))
  })
}

export const saveData = async(key: string, value: any) => {
  const datas: Array<[string, string]> = []
  buildData(key, value, datas)

  try {
    await removeData(key)
    await store.multiSet(datas)
  } catch (e: any) {
    // saving error
    log.error('storage error[saveData]:', key, e.message)
    throw e
  }
}

export const getData = async<T = unknown>(key: string): Promise<T | null> => {
  let value: string | null
  try {
    value = await store.getItem(key)
  } catch (e: any) {
    // error reading value
    log.error('storage error[getData]:', key, e.message)
    throw e
  }
  if (value && (partKeyPrefixRxp.test(value) || partKeyArrPrefixRxp.test(value))) {
    return handleGetData<T>(value)
  } else if (value == null) return value
  return JSON.parse(value)
}

export const removeData = async(key: string) => {
  let value: string | null
  try {
    value = await store.getItem(key)
  } catch (e: any) {
    // error reading value
    log.error('storage error[removeData]:', key, e.message)
    throw e
  }
  if (value) {
    if (partKeyPrefixRxp.test(value)) {
      let partKeys = value.replace(partKeyPrefixRxp, '').split(keySplit)
      partKeys.push(key)
      try {
        await store.multiRemove(partKeys)
      } catch (e: any) {
        // remove error
        log.error('storage error[removeData]:', key, e.message)
        throw e
      }
      return
    } else if (partKeyArrPrefixRxp.test(value)) {
      let partKeys = JSON.parse(value.replace(partKeyArrPrefixRxp, '')) as string[]
      partKeys.push(key)
      try {
        await store.multiRemove(partKeys)
      } catch (e: any) {
        // remove error
        log.error('storage error[removeData]:', key, e.message)
        throw e
      }
      return
    }
  }

  try {
    await store.removeItem(key)
  } catch (e: any) {
    // remove error
    log.error('storage error[removeData]:', key, e.message)
    throw e
  }
}

export const getAllKeys = async() => {
  let keys
  try {
    keys = await store.getAllKeys()
  } catch (e: any) {
    // read key error
    log.error('storage error[getAllKeys]:', e.message)
    throw e
  }

  return keys
}


export const getDataMultiple = async<T extends readonly string[]>(keys: T) => {
  type RawData = { [K in keyof T]: [T[K], string | null] }
  let datas: RawData
  try {
    datas = await store.multiGet(keys) as RawData
  } catch (e: any) {
    // read error
    log.error('storage error[getDataMultiple]:', e.message)
    throw e
  }
  const promises: Array<Promise<ReadonlyArray<[unknown | null]>>> = []
  for (const [, value] of datas) {
    if (value && (partKeyPrefixRxp.test(value) || partKeyArrPrefixRxp.test(value))) {
      promises.push(handleGetData(value))
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      promises.push(Promise.resolve(value ? JSON.parse(value) : value))
    }
  }
  return Promise.all(promises).then(values => {
    return datas.map(([key], index) => ([key, values[index]])) as { [K in keyof T]: [T[K], unknown] }
  })
}

export const saveDataMultiple = async(datas: Array<[string, any]>) => {
  const allData: Array<[string, string]> = []
  for (const [key, value] of datas) {
    buildData(key, value, allData)
  }
  try {
    await removeDataMultiple(datas.map(k => k[0]))
    await store.multiSet(allData)
  } catch (e: any) {
    // save error
    log.error('storage error[saveDataMultiple]:', e.message)
    throw e
  }
}


export const removeDataMultiple = async(keys: string[]) => {
  if (!keys.length) return
  const datas = await store.multiGet(keys)
  let allKeys: string[] = []
  for (const [key, value] of datas) {
    allKeys.push(key)
    if (value) {
      if (partKeyPrefixRxp.test(value)) {
        allKeys.push(...value.replace(partKeyPrefixRxp, '').split(keySplit))
      } else if (partKeyArrPrefixRxp.test(value)) {
        allKeys.push(...JSON.parse(value.replace(partKeyArrPrefixRxp, '')) as string[])
      }
    }
  }
  try {
    await store.multiRemove(allKeys)
  } catch (e: any) {
    // remove error
    log.error('storage error[removeDataMultiple]:', e.message)
    throw e
  }
}

export const clearAll = async() => {
  try {
    await store.clear()
  } catch (e: any) {
    // clear error
    log.error('storage error[clearAll]:', e.message)
    throw e
  }
}

export { useAsyncStorage } from '@react-native-async-storage/async-storage'

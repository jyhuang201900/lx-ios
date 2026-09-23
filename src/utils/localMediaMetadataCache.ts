import { readMetadata, type MusicMetadataFull } from './localMediaMetadata'
import { type FileType } from './fs'

const METADATA_CACHE_LIMIT = 300
const metadataCache = new Map<string, MusicMetadataFull>()
const metadataPromises = new Map<string, Promise<MusicMetadataFull | null>>()

export const getLocalMetadataCacheKey = (file: FileType): string => `${file.path}|${file.lastModified}|${file.size}`

export const readMetadataCached = async(file: FileType): Promise<MusicMetadataFull | null> => {
  const key = getLocalMetadataCacheKey(file)
  const cached = metadataCache.get(key)
  if (cached) return cached

  let promise = metadataPromises.get(key)
  if (!promise) {
    promise = readMetadata(file.path).catch(() => null)
    metadataPromises.set(key, promise)
  }

  const metadata = await promise
  metadataCache.set(key, metadata)
  metadataPromises.delete(key)

  if (metadataCache.size > METADATA_CACHE_LIMIT) {
    const oldestKey = metadataCache.keys().next().value
    if (oldestKey) metadataCache.delete(oldestKey)
  }

  return metadata
}

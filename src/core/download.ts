import { getLyricInfo, getMusicUrlInfo } from '@/core/music'
import playerState from '@/store/player/state'
import settingState from '@/store/setting/state'
import { downloadFile, existsFile, externalStorageDirectoryPath, mkdir, stopDownload, unlink, writeFile } from '@/utils/fs'
import { toast } from '@/utils/tools'
import { sortQualities } from '@/utils/quality'
import { Platform } from 'react-native'

export type DownloadTaskStatus = 'queued' | 'downloading' | 'completed' | 'failed' | 'canceled'

export interface DownloadTask {
  id: string
  name: string
  singer: string
  quality: LX.Quality | null
  status: DownloadTaskStatus
  progress: number
  receivedBytes: number
  totalBytes: number
  createdAt: number
}

interface DownloadTaskInternal extends DownloadTask {
  musicInfo: LX.Music.MusicInfoOnline
}

interface DownloadProgressEvent {
  bytesWritten: number
  contentLength: number
}

const activeDownloadIds = new Set<string>()
const qualityExtensions: Record<LX.Quality, string> = {
  '128k': 'mp3',
  '192k': 'mp3',
  '320k': 'mp3',
  flac: 'flac',
  flac24bit: 'flac',
  ape: 'ape',
  wav: 'wav',
}

const downloadTasks = new Map<string, DownloadTaskInternal>()
const downloadJobIds = new Map<string, number>()
const downloadPaths = new Map<string, string>()
const canceledDownloadIds = new Set<string>()
const downloadTaskListeners = new Set<(tasks: DownloadTask[]) => void>()
let isDownloadQueueRunning = false

export const getLocalMusicDirectory = () => `${externalStorageDirectoryPath}/Music`

const getOnlineMusicInfo = (musicInfo: LX.Player.PlayMusic | null): LX.Music.MusicInfoOnline | null => {
  if (!musicInfo) return null
  const target = 'progress' in musicInfo ? musicInfo.metadata.musicInfo : musicInfo
  return target.source == 'local' ? null : target
}

const createFileName = (musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality) => {
  const title = settingState.setting['download.fileName']
    .replace('歌名', musicInfo.name)
    .replace('歌手', musicInfo.singer)
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim() || musicInfo.id
  return `${title}.${qualityExtensions[quality]}`
}

const createLyricSidecar = (lyricInfo: LX.Player.LyricInfo) => {
  const lyric = lyricInfo.rawlrcInfo?.lyric ?? lyricInfo.lyric
  if (!lyric) return ''
  const parts = [
    ['lrc', lyric],
    ['tlrc', lyricInfo.rawlrcInfo?.tlyric ?? lyricInfo.tlyric],
    ['rlrc', lyricInfo.rawlrcInfo?.rlyric ?? lyricInfo.rlyric],
    ['awlrc', lyricInfo.rawlrcInfo?.lxlyric ?? lyricInfo.lxlyric],
  ].filter((item): item is [string, string] => !!item[1])
    .map(([name, value]) => `${name}:${Buffer.from(value).toString('base64')}`)
  return parts.length ? `[awlrc:${parts.join(',')}]\n${lyric}` : lyric
}

const notifyDownloadTasks = () => {
  const tasks = [...downloadTasks.values()]
    .map(({ musicInfo: _musicInfo, ...task }) => task)
    .sort((a, b) => b.createdAt - a.createdAt)
  for (const listener of downloadTaskListeners) listener(tasks)
}

const updateDownloadTask = (id: string, patch: Partial<DownloadTask>) => {
  const task = downloadTasks.get(id)
  if (!task) return
  downloadTasks.set(id, { ...task, ...patch })
  notifyDownloadTasks()
}

const isDownloadTaskActive = (status: DownloadTaskStatus) => status == 'queued' || status == 'downloading'

export const getDownloadTasks = (): DownloadTask[] => {
  return [...downloadTasks.values()]
    .map(({ musicInfo: _musicInfo, ...task }) => task)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export const subscribeDownloadTasks = (listener: (tasks: DownloadTask[]) => void) => {
  downloadTaskListeners.add(listener)
  listener(getDownloadTasks())
  return () => {
    downloadTaskListeners.delete(listener)
  }
}

export const cancelDownloadTask = (id: string) => {
  const task = downloadTasks.get(id)
  if (!task || !isDownloadTaskActive(task.status)) return
  canceledDownloadIds.add(id)
  const jobId = downloadJobIds.get(id)
  if (jobId) stopDownload(jobId)
  updateDownloadTask(id, { status: 'canceled' })
}

export const removeDownloadTask = (id: string) => {
  const task = downloadTasks.get(id)
  if (!task || isDownloadTaskActive(task.status)) return
  downloadTasks.delete(id)
  notifyDownloadTasks()
}

export const retryDownloadTask = (id: string) => {
  const task = downloadTasks.get(id)
  if (!task || isDownloadTaskActive(task.status)) return
  updateDownloadTask(id, {
    status: 'queued',
    progress: 0,
    receivedBytes: 0,
    totalBytes: 0,
    createdAt: Date.now(),
  })
  void processDownloadQueue()
}

const getUniqueDownloadPath = async(musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality) => {
  const directory = getLocalMusicDirectory()
  if (!await existsFile(directory)) await mkdir(directory)
  const fileName = createFileName(musicInfo, quality)
  let path = `${directory}/${fileName}`
  if (await existsFile(path)) path = `${directory}/${fileName.replace(/(\.[^.]+)$/, `_${Date.now()}$1`)}`
  return path
}

const cleanupDownloadPath = async(id: string) => {
  const path = downloadPaths.get(id)
  if (!path) return
  await unlink(path).catch(() => {})
}

const runDownloadTask = async(taskId: string) => {
  const task = downloadTasks.get(taskId)
  if (!task) return
  updateDownloadTask(taskId, {
    status: 'downloading',
    progress: 0,
    receivedBytes: 0,
    totalBytes: 0,
  })
  try {
    const { url, quality } = await getMusicUrlInfo({
      musicInfo: task.musicInfo,
      quality: task.quality ?? undefined,
      isRefresh: false,
      allowToggleSource: true,
    })
    if (canceledDownloadIds.has(taskId)) return
    if (!quality) throw new Error('quality unavailable')

    const path = await getUniqueDownloadPath(task.musicInfo, quality)
    downloadPaths.set(taskId, path)
    updateDownloadTask(taskId, { quality })

    const job = downloadFile(url, path, {
      background: true,
      progressInterval: 250,
      progress: (data: DownloadProgressEvent) => {
        const total = Math.max(0, data.contentLength)
        const received = Math.max(0, data.bytesWritten)
        updateDownloadTask(taskId, {
          receivedBytes: received,
          totalBytes: total,
          progress: total > 0 ? Math.min(1, received / total) : 0,
        })
      },
    })
    if (job.jobId) downloadJobIds.set(taskId, job.jobId)
    const result = await job.promise
    if (canceledDownloadIds.has(taskId)) {
      void cleanupDownloadPath(taskId)
      return
    }
    if (result.statusCode && (result.statusCode < 200 || result.statusCode >= 300)) {
      throw new Error(`HTTP ${result.statusCode}`)
    }

    const lyricInfo = await getLyricInfo({ musicInfo: task.musicInfo, isRefresh: false }).catch(() => null)
    if (lyricInfo) {
      const lyric = createLyricSidecar(lyricInfo)
      if (lyric) await writeFile(path.replace(/\.[^.]+$/, '.lrc'), lyric).catch(() => {})
    }
    updateDownloadTask(taskId, { status: 'completed', progress: 1 })
    toast(global.i18n.t('player_download_success', { quality }), 'long')
  } catch (err) {
    console.log('download current music failed', err)
    if (!canceledDownloadIds.has(taskId)) {
      void cleanupDownloadPath(taskId)
      updateDownloadTask(taskId, { status: 'failed' })
      toast(global.i18n.t('player_download_failed'), 'long')
    }
  } finally {
    downloadJobIds.delete(taskId)
    downloadPaths.delete(taskId)
    canceledDownloadIds.delete(taskId)
  }
}

const processDownloadQueue = async() => {
  if (isDownloadQueueRunning) return
  isDownloadQueueRunning = true
  try {
    while (true) {
      const task = [...downloadTasks.values()].find(item => item.status == 'queued')
      if (!task) break
      await runDownloadTask(task.id)
    }
  } finally {
    isDownloadQueueRunning = false
  }
}

const enqueueDownload = (musicInfo: LX.Music.MusicInfoOnline, requestedQuality?: LX.Quality) => {
  const id = `${musicInfo.source}_${musicInfo.id}`
  const existingTask = downloadTasks.get(id)
  if (existingTask && isDownloadTaskActive(existingTask.status)) {
    toast(global.i18n.t('player_download_running'))
    return
  }

  downloadTasks.set(id, {
    id,
    name: musicInfo.name,
    singer: musicInfo.singer,
    quality: requestedQuality ?? null,
    status: 'queued',
    progress: 0,
    receivedBytes: 0,
    totalBytes: 0,
    createdAt: Date.now(),
    musicInfo,
  })
  notifyDownloadTasks()
  toast(global.i18n.t('player_download_start'))
  void processDownloadQueue()
}

/** Return qualities advertised by the source and supported by this track. */
export const getDownloadQualities = (musicInfo: LX.Music.MusicInfoOnline): LX.Quality[] => {
  const sourceQualities = global.lx.qualityList[musicInfo.source] ?? []
  const trackQualities = Object.keys(musicInfo.meta._qualitys ?? {}).filter((quality): quality is LX.Quality => !!musicInfo.meta._qualitys[quality as LX.Quality])
  const qualities = [
    ...sourceQualities.filter(quality => trackQualities.includes(quality)),
    ...trackQualities.filter(quality => !sourceQualities.includes(quality)),
  ]
  return sortQualities(qualities)
}

/** Download an online track to Files > On My iPhone > LX Music > Music. */
export const downloadMusic = async(musicInfo: LX.Music.MusicInfoOnline, requestedQuality?: LX.Quality) => {
  if (musicInfo.source == 'local') {
    toast(global.i18n.t('player_download_unavailable'))
    return
  }
  if (Platform.OS == 'ios') {
    enqueueDownload(musicInfo, requestedQuality)
    return
  }

  const downloadId = `${musicInfo.source}_${musicInfo.id}`
  if (activeDownloadIds.has(downloadId)) {
    toast(global.i18n.t('player_download_running'))
    return
  }

  activeDownloadIds.add(downloadId)
  toast(global.i18n.t('player_download_start'))
  try {
    const { url, quality } = await getMusicUrlInfo({
      musicInfo,
      quality: requestedQuality,
      isRefresh: false,
      allowToggleSource: true,
    })
    if (!quality) throw new Error('quality unavailable')

    const directory = getLocalMusicDirectory()
    if (!await existsFile(directory)) await mkdir(directory)
    const fileName = createFileName(musicInfo, quality)
    let path = `${directory}/${fileName}`
    if (await existsFile(path)) path = `${directory}/${fileName.replace(/(\.[^.]+)$/, `_${Date.now()}$1`)}`
    const result = await downloadFile(url, path, { background: true }).promise
    if (result.statusCode && (result.statusCode < 200 || result.statusCode >= 300)) throw new Error(`HTTP ${result.statusCode}`)
    const lyricInfo = await getLyricInfo({ musicInfo, isRefresh: false }).catch(() => null)
    if (lyricInfo) {
      const lyric = createLyricSidecar(lyricInfo)
      if (lyric) await writeFile(path.replace(/\.[^.]+$/, '.lrc'), lyric).catch(() => {})
    }
    toast(global.i18n.t('player_download_success', { quality }))
  } catch (err) {
    console.log('download current music failed', err)
    toast(global.i18n.t('player_download_failed'))
  } finally {
    activeDownloadIds.delete(downloadId)
  }
}

export const downloadCurrentMusic = async(quality?: LX.Quality) => {
  const musicInfo = getOnlineMusicInfo(playerState.playMusicInfo.musicInfo)
  if (!musicInfo) {
    toast(global.i18n.t('player_download_unavailable'))
    return
  }
  return downloadMusic(musicInfo, quality)
}

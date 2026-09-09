import { getMusicUrlInfo } from '@/core/music'
import playerState from '@/store/player/state'
import settingState from '@/store/setting/state'
import { downloadFile, existsFile, externalStorageDirectoryPath, mkdir } from '@/utils/fs'
import { toast } from '@/utils/tools'

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

/** Download an online track to Files > On My iPhone > LX Music > Music. */
export const downloadMusic = async(musicInfo: LX.Music.MusicInfoOnline) => {
  if (musicInfo.source == 'local') {
    toast(global.i18n.t('player_download_unavailable'))
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
      isRefresh: false,
      allowToggleSource: true,
    })
    if (!quality) throw new Error('quality unavailable')

    const directory = `${externalStorageDirectoryPath}/Music`
    if (!await existsFile(directory)) await mkdir(directory)
    const fileName = createFileName(musicInfo, quality)
    let path = `${directory}/${fileName}`
    if (await existsFile(path)) path = `${directory}/${fileName.replace(/(\.[^.]+)$/, `_${Date.now()}$1`)}`
    const result = await downloadFile(url, path, { background: true }).promise
    if (result.statusCode && (result.statusCode < 200 || result.statusCode >= 300)) throw new Error(`HTTP ${result.statusCode}`)
    toast(global.i18n.t('player_download_success', { quality }))
  } catch (err) {
    console.log('download current music failed', err)
    toast(global.i18n.t('player_download_failed'))
  } finally {
    activeDownloadIds.delete(downloadId)
  }
}

export const downloadCurrentMusic = async() => {
  const musicInfo = getOnlineMusicInfo(playerState.playMusicInfo.musicInfo)
  if (!musicInfo) {
    toast(global.i18n.t('player_download_unavailable'))
    return
  }
  return downloadMusic(musicInfo)
}

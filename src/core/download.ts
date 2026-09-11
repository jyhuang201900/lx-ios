import { getLyricInfo, getMusicUrlInfo } from '@/core/music'
import playerState from '@/store/player/state'
import settingState from '@/store/setting/state'
import { downloadFile, existsFile, externalStorageDirectoryPath, mkdir, writeFile } from '@/utils/fs'
import { toast } from '@/utils/tools'
import { sortQualities } from '@/utils/quality'

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

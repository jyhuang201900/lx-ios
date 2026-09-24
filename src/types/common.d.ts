// import './app_setting'

declare namespace LX {
  type OnlineSource = 'kw' | 'kg' | 'tx' | 'wy' | 'mg'
  type Source = OnlineSource | 'local'
  // hires/atmos/atmos_plus/master 为自定义音源常见的高音质档位（官方音源不会声明）
  type Quality = '128k' | '192k' | '320k' | 'flac' | 'flac24bit' | 'ape' | 'wav' | 'hires' | 'atmos' | 'atmos_plus' | 'master'
  type QualityList = Partial<Record<LX.Source, LX.Quality[]>>

  type ShareType = 'system' | 'clipboard'

  type UpdateStatus = 'downloaded' | 'downloading' | 'error' | 'checking' | 'idle'
  interface VersionInfo {
    version: string
    desc: string
  }
}

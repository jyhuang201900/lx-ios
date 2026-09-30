import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, FlatList, InteractionManager, Platform, RefreshControl, StyleSheet, TouchableOpacity, View, type FlatListProps } from 'react-native'

import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import Input from '@/components/common/Input'
import { removeListMusics } from '@/core/list'
import { getLocalMusicDirectory, subscribeDownloadTasks } from '@/core/download'
import DownloadQueue from './DownloadQueue'
import { playNext } from '@/core/player/player'
import { LIST_IDS } from '@/config/constant'
import { buildLocalMusicInfo, buildLocalMusicInfoByFilePath } from '@/screens/Home/Views/Mylist/MyList/listAction'
import { existsFile, extname, mkdir, readDir, selectFile, unlink, type FileType } from '@/utils/fs'
import { confirmDialog, createStyle, toast } from '@/utils/tools'
import type { MusicMetadataFull } from '@/utils/localMediaMetadata'
import { getLocalMetadataCacheKey, readMetadataCached } from '@/utils/localMediaMetadataCache'
import { useTheme } from '@/store/theme/hook'
import { addTempPlayList } from '@/core/player/tempPlayList'
import LocalMusicItem from './LocalMusicItem'
import { FontWeight, PageMetrics, Radius, Typography, createContentSurface } from '@/theme/layout'
import PageToolbar from '@/components/common/PageToolbar'

const audioExtensions = ['mp3', 'flac', 'wav', 'ape', 'ogg', 'm4a', 'aac']

const isAudioFile = (file: FileType) => file.isFile && (file.mimeType?.startsWith('audio/') || audioExtensions.includes(extname(file.name).toLowerCase()))

export default () => {
  const theme = useTheme()
  const [files, setFiles] = useState<FileType[]>([])
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<'latest' | 'name' | 'artist' | 'duration'>('latest')
  const [metadataMap, setMetadataMap] = useState(() => new Map<string, MusicMetadataFull | null>())
  const metadataMapRef = useRef(metadataMap)
  const [refreshing, setRefreshing] = useState(false)
  const [importing, setImporting] = useState(false)
  const importingRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const lastRefreshRef = useRef(0)
  const completedTaskIdsRef = useRef(new Set<string>())
  const directory = useMemo(() => getLocalMusicDirectory(), [])

  const refresh = useCallback(async(force = false) => {
    if (!force && hasLoadedRef.current && Date.now() - lastRefreshRef.current < 1500) return
    setRefreshing(true)
    try {
      if (!await existsFile(directory)) await mkdir(directory)
      const entries = await readDir(directory)
      setFiles(entries.filter(isAudioFile).sort((a, b) => b.lastModified - a.lastModified))
      hasLoadedRef.current = true
      lastRefreshRef.current = Date.now()
    } catch (error) {
      console.warn('read local music failed', error)
      toast(global.i18n.t('local_music_load_failed'))
    } finally {
      setRefreshing(false)
    }
  }, [directory])

  useEffect(() => {
    void refresh(true)
    const handleNav = (id: string) => { if (id == 'nav_local') void refresh() }
    global.state_event.on('navActiveIdUpdated', handleNav)
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state == 'active') void refresh(true)
    })
    return () => {
      global.state_event.off('navActiveIdUpdated', handleNav)
      appStateSubscription.remove()
    }
  }, [refresh])

  useEffect(() => subscribeDownloadTasks(tasks => {
    const completed = tasks.filter(task => task.status == 'completed' && !completedTaskIdsRef.current.has(task.id))
    if (!completed.length) return
    for (const task of completed) completedTaskIdsRef.current.add(task.id)
    void refresh(true)
  }), [refresh])

  const importMusic = useCallback(async() => {
    if (importingRef.current) return
    importingRef.current = true
    setImporting(true)
    try {
      if (!await existsFile(directory)) await mkdir(directory)
      const file = await selectFile({ extTypes: audioExtensions, toPath: directory })
      if (!file?.path || !isAudioFile(file)) {
        if (file?.path) await unlink(file.path)
        toast(global.i18n.t('storage_file_no_match'), 'long')
        return
      }
      await refresh(true)
      toast(global.i18n.t('local_music_import_success'))
    } catch (error: any) {
      if (!String(error?.code ?? '').includes('picker_cancelled')) toast(global.i18n.t('local_music_import_failed'))
    } finally {
      importingRef.current = false
      setImporting(false)
    }
  }, [directory, refresh])

  const playFile = useCallback(async(file: FileType, metadata: MusicMetadataFull | null) => {
    const musicInfo = metadata ? buildLocalMusicInfo(file.path, metadata) : buildLocalMusicInfoByFilePath(file)
    addTempPlayList([{ listId: LIST_IDS.PLAY_LATER, musicInfo, isTop: true }])
    await playNext()
  }, [])

  const removeFile = useCallback(async(file: FileType) => {
    const confirmed = await confirmDialog({
      title: global.i18n.t('local_music_delete_title'),
      message: global.i18n.t('local_music_delete_confirm', { name: file.name }),
      confirmButtonText: global.i18n.t('delete'),
    })
    if (!confirmed) return
    try {
      await unlink(file.path)
      await unlink(file.path.replace(/\.[^.]+$/, '.lrc')).catch(() => {})
      await removeListMusics(LIST_IDS.DEFAULT, [file.path])
      setFiles(current => current.filter(item => item.path != file.path))
      toast(global.i18n.t('local_music_delete_success'))
    } catch {
      toast(global.i18n.t('local_music_delete_failed'))
    }
  }, [])

  const buildMusicInfoFromFile = useCallback((file: FileType) => {
    const metadata = metadataMap.get(getLocalMetadataCacheKey(file))
    return metadata ? buildLocalMusicInfo(file.path, metadata) : buildLocalMusicInfoByFilePath(file)
  }, [metadataMap])

  const handleMetadata = useCallback((file: FileType, metadata: MusicMetadataFull | null) => {
    const key = getLocalMetadataCacheKey(file)
    const next = new Map(metadataMapRef.current)
    next.set(key, metadata)
    metadataMapRef.current = next
    setMetadataMap(next)
  }, [])

  const applyMetadataMap = useCallback((updater: (previous: Map<string, MusicMetadataFull | null>) => Map<string, MusicMetadataFull | null>) => {
    const next = updater(metadataMapRef.current)
    if (next === metadataMapRef.current) return
    metadataMapRef.current = next
    setMetadataMap(next)
  }, [])

  const renderItem = useCallback<NonNullable<FlatListProps<FileType>['renderItem']>>(({ item }) => (
    <LocalMusicItem
      file={item}
      onPlay={playFile}
      onDelete={removeFile}
      onMetadata={handleMetadata}
    />
  ), [playFile, removeFile, handleMetadata])
  const keyExtractor = useCallback<NonNullable<FlatListProps<FileType>['keyExtractor']>>(item => item.path, [])
  const visibleFiles = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return files.filter(file => {
      if (!keyword) return true
      const metadata = metadataMap.get(getLocalMetadataCacheKey(file))
      return [
        file.name,
        metadata?.name,
        metadata?.singer,
        metadata?.albumName,
      ].filter(Boolean).join(' ').toLowerCase().includes(keyword)
    }).sort((a, b) => {
      const metadataA = metadataMap.get(getLocalMetadataCacheKey(a))
      const metadataB = metadataMap.get(getLocalMetadataCacheKey(b))
      switch (sortMode) {
        case 'name':
          return (metadataA?.name ?? a.name).localeCompare(metadataB?.name ?? b.name, undefined, { numeric: true, sensitivity: 'base' })
        case 'artist':
          return (metadataA?.singer ?? '').localeCompare(metadataB?.singer ?? '', undefined, { numeric: true, sensitivity: 'base' })
        case 'duration':
          return (metadataB?.interval ?? 0) - (metadataA?.interval ?? 0)
        case 'latest':
        default:
          return b.lastModified - a.lastModified
      }
    })
  }, [files, metadataMap, search, sortMode])

  useEffect(() => {
    let cancelled = false
    const currentKeys = new Set(files.map(getLocalMetadataCacheKey))

    applyMetadataMap(previous => {
      const next = new Map<string, MusicMetadataFull | null>()
      for (const [key, metadata] of previous) {
        if (currentKeys.has(key)) next.set(key, metadata)
      }
      return next
    })

    const pendingFiles = files.filter(file => !metadataMapRef.current.has(getLocalMetadataCacheKey(file)))
    let index = 0

    const readNextBatch = () => {
      if (cancelled || index >= pendingFiles.length) return
      const batch = pendingFiles.slice(index, index + 8)
      index += batch.length

      void Promise.all(batch.map(async file => ([
        getLocalMetadataCacheKey(file),
        await readMetadataCached(file).catch(() => null),
      ] as const))).then(results => {
        if (cancelled) return
        applyMetadataMap(previous => {
          const next = new Map(previous)
          for (const [key, metadata] of results) next.set(key, metadata)
          return next
        })
        void InteractionManager.runAfterInteractions(() => {
          readNextBatch()
        })
      })
    }

    readNextBatch()
    return () => {
      cancelled = true
    }
  }, [files, applyMetadataMap])

  const playAllVisible = useCallback(async() => {
    if (!visibleFiles.length) return
    addTempPlayList(visibleFiles.map(file => ({
      listId: LIST_IDS.PLAY_LATER,
      musicInfo: buildMusicInfoFromFile(file),
      isTop: true,
    })))
    await playNext()
  }, [visibleFiles, buildMusicInfoFromFile])

  return <View style={styles.container}>
    <PageToolbar>
      <View style={styles.toolbarCopy}>
        <Text size={Typography.section} color={theme['c-font']} style={styles.toolbarTitle}>{global.i18n.t('local_music_title')}</Text>
        <Text size={Typography.caption} color={theme['c-font-label']}>{global.i18n.t('local_music_summary', { num: search ? visibleFiles.length : files.length })}</Text>
      </View>
      <View style={styles.toolbarActions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={global.i18n.t('local_music_import')}
          accessibilityState={{ disabled: importing }}
          disabled={importing}
          style={{ ...styles.toolbarButton, ...createContentSurface(theme, { radius: Radius.pill }), opacity: importing ? 0.5 : 1 }}
          onPress={() => { void importMusic() }}
        >
          <Icon name="add-music" size={16} color={theme['c-primary-font-active']} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={global.i18n.t('local_music_refresh')}
          accessibilityState={{ disabled: refreshing }}
          disabled={refreshing}
          style={{ ...styles.toolbarButton, ...createContentSurface(theme, { radius: Radius.pill }), opacity: refreshing ? 0.5 : 1 }}
          onPress={() => { void refresh() }}
        >
          <Icon name="available_updates" size={16} color={theme['c-font-label']} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={global.i18n.t('play_all')}
          disabled={!visibleFiles.length}
          style={{ ...styles.toolbarButton, backgroundColor: theme['c-primary-solid'], opacity: visibleFiles.length ? 1 : 0.4 }}
          onPress={() => { void playAllVisible() }}
        >
          <Icon name="play" size={16} color={theme['c-on-solid']} />
        </TouchableOpacity>
      </View>
    </PageToolbar>
    {Platform.OS == 'ios' ? <DownloadQueue /> : null}
    <View style={{ ...styles.searchCard, ...createContentSurface(theme, { radius: Radius.control }) }}>
      <Icon name="search-2" size={15} color={theme['c-font-label']} />
      <Input
        value={search}
        onChangeText={setSearch}
        onClearText={() => { setSearch('') }}
        clearBtn
        placeholder={global.i18n.t('local_music_search')}
        returnKeyType="search"
        enterKeyHint="search"
        autoCorrect={false}
        spellCheck={false}
        style={styles.searchInput}
        size={13}
      />
    </View>
    {/*
      这一行原本左边是一个孤立的「应用音乐库」标签，右边是排序条，两者挤在
      同一条 32pt 高、左右各留 16pt 的行里——标签既不是标题也不属于排序，
      排序条被它顶到右侧，四个按钮在小屏上还会换行。

      排序控件自己已经说明用途，去掉标签，让它整行排满、左对齐，
      与上方搜索框、下方列表共用同一条左边缘。
    */}
    <View style={styles.sectionHeader}>
      <View style={{ ...styles.sortBar, ...createContentSurface(theme, { radius: Radius.pill }) }}>
        {
          (
            [
              ['latest', 'local_music_sort_latest'],
              ['name', 'local_music_sort_name'],
              ['artist', 'local_music_sort_artist'],
              ['duration', 'local_music_sort_duration'],
            ] as const
          ).map(([mode, labelKey]) => (
            <TouchableOpacity
              key={mode}
              accessibilityRole="button"
              accessibilityLabel={global.i18n.t(labelKey)}
              accessibilityState={{ selected: sortMode == mode }}
              style={{ ...styles.sortButton, backgroundColor: sortMode == mode ? theme['c-button-background-selected'] : 'transparent' }}
              onPress={() => { setSortMode(mode) }}
            >
              <Text size={12} color={sortMode == mode ? theme['c-button-font-selected'] : theme['c-font-label']}>{global.i18n.t(labelKey)}</Text>
            </TouchableOpacity>
          ))
        }
      </View>
    </View>
    <FlatList
      data={visibleFiles}
      keyExtractor={keyExtractor}
      contentContainerStyle={visibleFiles.length ? styles.list : styles.emptyList}
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          colors={[theme['c-primary']]}
          progressBackgroundColor={theme['c-primary-input-background']}
          tintColor={theme['c-primary']}
          title={global.i18n.t('pull_to_refresh')}
          titleColor={theme['c-font-label']}
          progressViewOffset={64}
          onRefresh={() => { void refresh(true) }}
        />
      )}
      renderItem={renderItem}
      ListEmptyComponent={search ? <View style={styles.empty}>
        <Icon name="search-2" size={28} color={theme['c-font-label']} style={styles.emptyIcon} />
        <Text style={styles.emptyTitle} size={14}>{global.i18n.t('local_music_no_match')}</Text>
      </View> : <View style={styles.empty}>
        <Icon name="music_time" size={28} color={theme['c-font-label']} style={styles.emptyIcon} />
        <Text style={styles.emptyTitle} size={14}>{global.i18n.t('local_music_empty_title')}</Text>
        <Text style={styles.emptyDescription} size={Typography.sub} color={theme['c-font-label']}>{global.i18n.t('local_music_empty_desc')}</Text>
      </View>}
    />
  </View>
}

const styles = createStyle({
  container: { flex: 1 },
  toolbarCopy: { flex: 1, gap: 2 },
  toolbarTitle: { fontWeight: FontWeight.semibold },
  toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolbarButton: { width: 36, height: 36, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  searchCard: { marginHorizontal: PageMetrics.gutter, marginBottom: 10, minHeight: 42, borderRadius: Radius.control, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center' },
  searchInput: { height: 38, paddingLeft: 8, fontSize: 13 },
  sectionHeader: { minHeight: 32, paddingHorizontal: PageMetrics.gutter, marginBottom: 4, flexDirection: 'row', alignItems: 'center' },
  sortBar: { flex: 1, height: 34, flexDirection: 'row', alignItems: 'center', padding: 3, borderRadius: Radius.pill, gap: 2 },
  sortButton: { height: '100%', flex: 1, paddingHorizontal: 4, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: PageMetrics.gutter, paddingBottom: 32 },
  emptyList: { flexGrow: 1 },
  /**
   * 空状态原来只有 alignItems: 'center'（水平居中）加一个写死的 paddingTop: 58，
   * 于是整块吊在顶部，下面留下一大片只有模糊封面的空白。
   *
   * emptyList 已经是 flexGrow: 1，让空状态自己撑满并垂直居中，
   * 底部留白把它稍微抬离正中，避开迷你播放条。
   */
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 42, paddingBottom: 56 },
  emptyIcon: { opacity: 0.5 },
  emptyTitle: { marginTop: 12 },
  emptyDescription: { marginTop: 7, textAlign: 'center', lineHeight: 19 },
})

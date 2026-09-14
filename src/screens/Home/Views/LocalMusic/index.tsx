import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, FlatList, Platform, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native'

import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { addListMusics, removeListMusics } from '@/core/list'
import { getLocalMusicDirectory } from '@/core/download'
import { subscribeDownloadTasks } from '@/core/download'
import DownloadQueue from './DownloadQueue'
import { playListById } from '@/core/player/player'
import { LIST_IDS } from '@/config/constant'
import { buildLocalMusicInfo, buildLocalMusicInfoByFilePath } from '@/screens/Home/Views/Mylist/MyList/listAction'
import { existsFile, extname, mkdir, readDir, selectFile, unlink, type FileType } from '@/utils/fs'
import { confirmDialog, createStyle, toast } from '@/utils/tools'
import type { MusicMetadataFull } from '@/utils/localMediaMetadata'
import { useTheme } from '@/store/theme/hook'
import LocalMusicItem from './LocalMusicItem'

const audioExtensions = ['mp3', 'flac', 'wav', 'ape', 'ogg', 'm4a', 'aac']

const isAudioFile = (file: FileType) => file.isFile && (file.mimeType?.startsWith('audio/') || audioExtensions.includes(extname(file.name).toLowerCase()))

export default () => {
  const theme = useTheme()
  const [files, setFiles] = useState<FileType[]>([])
  const [refreshing, setRefreshing] = useState(false)
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

  const importMusic = async() => {
    try {
      if (!await existsFile(directory)) await mkdir(directory)
      const file = await selectFile({ extTypes: audioExtensions, toPath: directory })
      if (!file?.path || !isAudioFile(file)) {
        if (file?.path) await unlink(file.path)
        toast(global.i18n.t('storage_file_no_match'), 'long')
        return
      }
      await refresh()
      toast(global.i18n.t('local_music_import_success'))
    } catch (error: any) {
      if (!String(error?.code ?? '').includes('picker_cancelled')) toast(global.i18n.t('local_music_import_failed'))
    }
  }

  const playFile = async(file: FileType, metadata: MusicMetadataFull | null) => {
    const musicInfo = metadata ? buildLocalMusicInfo(file.path, metadata) : buildLocalMusicInfoByFilePath(file)
    await addListMusics(LIST_IDS.DEFAULT, [musicInfo], 'bottom')
    await playListById(LIST_IDS.DEFAULT, musicInfo.id)
  }

  const removeFile = async(file: FileType) => {
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
  }

  return <View style={styles.container}>
    <View style={{ ...styles.summary, backgroundColor: theme['c-primary-input-background'], borderColor: theme['c-border-background'] }}>
      <View style={{ ...styles.summaryIcon, backgroundColor: theme['c-primary-background-active'] }}>
        <Icon name="music_time" size={20} color={theme['c-primary-font-active']} />
      </View>
      <View style={styles.summaryCopy}>
        <Text size={16}>{global.i18n.t('local_music_title')}</Text>
        <Text size={11} color={theme['c-font-label']}>{global.i18n.t('local_music_summary', { num: files.length })}</Text>
      </View>
    </View>
    <View style={styles.actions}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={global.i18n.t('local_music_import')}
        style={{ ...styles.primaryAction, backgroundColor: theme['c-primary'] }}
        onPress={() => { void importMusic() }}
      >
        <Icon name="add-music" size={15} color={theme['c-primary-button-font']} />
        <Text size={12} color={theme['c-primary-button-font']}>{global.i18n.t('local_music_import')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={global.i18n.t('local_music_refresh')}
        style={{ ...styles.refreshAction, backgroundColor: theme['c-primary-input-background'], borderColor: theme['c-border-background'] }}
        onPress={() => { void refresh() }}
      >
        <Text size={12} color={theme['c-font']}>{refreshing ? global.i18n.t('loading') : global.i18n.t('local_music_refresh')}</Text>
      </TouchableOpacity>
    </View>
    {Platform.OS == 'ios' ? <DownloadQueue /> : null}
    <View style={styles.sectionHeader}>
      <Text size={12} color={theme['c-font-label']}>{global.i18n.t('local_music_storage')}</Text>
      <Text size={11} color={theme['c-font-label']}>{global.i18n.t('local_music_storage_hint')}</Text>
    </View>
    <FlatList
      data={files}
      keyExtractor={item => item.path}
      contentContainerStyle={files.length ? styles.list : styles.emptyList}
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          colors={[theme['c-primary']]}
          progressViewOffset={64}
          onRefresh={() => { void refresh(true) }}
        />
      )}
      renderItem={({ item }) => (
        <LocalMusicItem file={item} onPlay={(file, metadata) => { void playFile(file, metadata) }} onDelete={file => { void removeFile(file) }} />
      )}
      ListEmptyComponent={<View style={styles.empty}>
        <Icon name="music_time" size={32} color={theme['c-font-label']} />
        <Text style={styles.emptyTitle} size={15}>{global.i18n.t('local_music_empty_title')}</Text>
        <Text style={styles.emptyDescription} size={12} color={theme['c-font-label']}>{global.i18n.t('local_music_empty_desc')}</Text>
      </View>}
    />
  </View>
}

const styles = createStyle({
  container: { flex: 1, paddingTop: 14 },
  summary: { minHeight: 76, marginHorizontal: 16, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  summaryIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  summaryCopy: { flex: 1, paddingLeft: 12, gap: 5, justifyContent: 'center' },
  actions: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 9 },
  primaryAction: { flex: 1, minHeight: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  refreshAction: { minWidth: 82, minHeight: 43, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { minHeight: 32, paddingHorizontal: 17, paddingBottom: 7, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyList: { flexGrow: 1 },
  empty: { alignItems: 'center', paddingHorizontal: 42, paddingTop: 58 },
  emptyTitle: { marginTop: 15 },
  emptyDescription: { marginTop: 7, textAlign: 'center', lineHeight: 19 },
})

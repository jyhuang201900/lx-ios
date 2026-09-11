import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'

import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { addListMusics, removeListMusics } from '@/core/list'
import { getLocalMusicDirectory } from '@/core/download'
import { playListById } from '@/core/player/player'
import { LIST_IDS } from '@/config/constant'
import { buildLocalMusicInfoByFilePath } from '@/screens/Home/Views/Mylist/MyList/listAction'
import { existsFile, extname, mkdir, readDir, selectFile, unlink, type FileType } from '@/utils/fs'
import { confirmDialog, createStyle, toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'

const audioExtensions = ['mp3', 'flac', 'wav', 'ape', 'ogg', 'm4a', 'aac']

const formatSize = (size: number) => {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(size >= 100 * 1024 * 1024 ? 0 : 1)} MB`
}

const isAudioFile = (file: FileType) => file.isFile && (file.mimeType?.startsWith('audio/') || audioExtensions.includes(extname(file.name).toLowerCase()))

export default () => {
  const theme = useTheme()
  const [files, setFiles] = useState<FileType[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const directory = useMemo(() => getLocalMusicDirectory(), [])

  const refresh = useCallback(async() => {
    setRefreshing(true)
    try {
      if (!await existsFile(directory)) await mkdir(directory)
      const entries = await readDir(directory)
      setFiles(entries.filter(isAudioFile).sort((a, b) => b.lastModified - a.lastModified))
    } catch (error) {
      console.warn('read local music failed', error)
      toast(global.i18n.t('local_music_load_failed'))
    } finally {
      setRefreshing(false)
    }
  }, [directory])

  useEffect(() => {
    void refresh()
    const handleNav = (id: string) => { if (id == 'nav_local') void refresh() }
    global.state_event.on('navActiveIdUpdated', handleNav)
    return () => { global.state_event.off('navActiveIdUpdated', handleNav) }
  }, [refresh])

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

  const playFile = async(file: FileType) => {
    const musicInfo = buildLocalMusicInfoByFilePath(file)
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
      <TouchableOpacity accessibilityRole="button" style={{ ...styles.primaryAction, backgroundColor: theme['c-primary'] }} onPress={() => { void importMusic() }}>
        <Icon name="add-music" size={15} color={theme['c-primary-button-font']} />
        <Text size={12} color={theme['c-primary-button-font']}>{global.i18n.t('local_music_import')}</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={{ ...styles.refreshAction, backgroundColor: theme['c-primary-input-background'], borderColor: theme['c-border-background'] }} onPress={() => { void refresh() }}>
        <Text size={12} color={theme['c-font']}>{refreshing ? global.i18n.t('loading') : global.i18n.t('local_music_refresh')}</Text>
      </TouchableOpacity>
    </View>
    <View style={styles.sectionHeader}>
      <Text size={12} color={theme['c-font-label']}>{global.i18n.t('local_music_storage')}</Text>
      <Text size={11} color={theme['c-font-label']}>{global.i18n.t('local_music_storage_hint')}</Text>
    </View>
    <FlatList
      data={files}
      keyExtractor={item => item.path}
      contentContainerStyle={files.length ? styles.list : styles.emptyList}
      renderItem={({ item }) => <View style={{ ...styles.row, borderColor: theme['c-border-background'] }}>
        <TouchableOpacity accessibilityRole="button" style={styles.rowMain} onPress={() => { void playFile(item) }}>
          <View style={{ ...styles.fileIcon, backgroundColor: theme['c-primary-background-active'] }}>
            <Icon name="play-outline" size={15} color={theme['c-primary-font-active']} />
          </View>
          <View style={styles.fileCopy}>
            <Text size={14} numberOfLines={1}>{item.name.replace(/\.[^.]+$/, '')}</Text>
            <Text size={11} color={theme['c-font-label']} numberOfLines={1}>{extname(item.name).toUpperCase()} · {formatSize(item.size)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${global.i18n.t('delete')} ${item.name}`} style={styles.deleteButton} onPress={() => { void removeFile(item) }}>
          <Icon name="remove" size={14} color={theme['c-font-label']} />
        </TouchableOpacity>
      </View>}
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
  row: { minHeight: 64, marginBottom: 6, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 16 },
  rowMain: { flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center' },
  fileIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  fileCopy: { flex: 1, paddingHorizontal: 11, gap: 5, justifyContent: 'center' },
  deleteButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: 42, paddingTop: 58 },
  emptyTitle: { marginTop: 15 },
  emptyDescription: { marginTop: 7, textAlign: 'center', lineHeight: 19 },
})

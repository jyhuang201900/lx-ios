import { memo, useEffect, useState } from 'react'
import { StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native'

import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { formatPlayTime2 } from '@/utils'
import { extname, type FileType } from '@/utils/fs'
import { readMetadata, type MusicMetadataFull } from '@/utils/localMediaMetadata'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'

const formatSize = (size: number) => {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(size >= 100 * 1024 * 1024 ? 0 : 1)} MB`
}

const getFileTitle = (file: FileType, metadata: MusicMetadataFull | null) => {
  if (metadata?.name) return metadata.name
  return file.name.replace(/\.[^.]+$/, '')
}

export default memo(({ file, onPlay, onDelete }: {
  file: FileType
  onPlay: (file: FileType, metadata: MusicMetadataFull | null) => void
  onDelete: (file: FileType) => void
}) => {
  const theme = useTheme()
  const [metadata, setMetadata] = useState<MusicMetadataFull | null>(null)

  useEffect(() => {
    let isActive = true
    void readMetadata(file.path)
      .then(info => {
        if (isActive) setMetadata(info)
      })
      .catch(() => {
        if (isActive) setMetadata(null)
      })
    return () => {
      isActive = false
    }
  }, [file.path, file.lastModified])

  const title = getFileTitle(file, metadata)
  const artist = metadata?.singer ?? ''
  const album = metadata?.albumName ?? ''
  const detail = [artist, album].filter(Boolean).join(' · ')
  const fileType = extname(file.name).toUpperCase()
  const interval = metadata?.interval ? formatPlayTime2(metadata.interval) : ''

  return (
    <View style={{ ...styles.row, borderColor: theme['c-border-background'] }}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={[title, artist].filter(Boolean).join(' ')}
        style={styles.rowMain}
        onPress={() => onPlay(file, metadata)}
      >
        <View style={{ ...styles.fileIcon, backgroundColor: theme['c-primary-background-active'] }}>
          <Icon name="play-outline" size={15} color={theme['c-primary-font-active']} />
        </View>
        <View style={styles.fileCopy}>
          <Text size={14} numberOfLines={1}>{title}</Text>
          {detail ? <Text size={11} color={theme['c-font-label']} numberOfLines={1}>{detail}</Text> : null}
          <RNText style={{ ...styles.fileMeta, color: theme['c-250'] }} numberOfLines={1}>
            {fileType} · {formatSize(file.size)}
          </RNText>
        </View>
      </TouchableOpacity>
      {interval ? <RNText style={{ ...styles.interval, color: theme['c-250'] }}>{interval}</RNText> : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${global.i18n.t('delete')} ${title}`}
        style={styles.deleteButton}
        onPress={() => onDelete(file)}
      >
        <Icon name="remove" size={14} color={theme['c-font-label']} />
      </TouchableOpacity>
    </View>
  )
}, (prevProps, nextProps) => prevProps.file === nextProps.file)

const styles = createStyle({
  row: {
    minHeight: 72,
    marginBottom: 6,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
  },
  rowMain: {
    flex: 1,
    minHeight: 72,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileCopy: {
    flex: 1,
    paddingHorizontal: 11,
    gap: 3,
    justifyContent: 'center',
  },
  fileMeta: {
    fontSize: 10,
  },
  interval: {
    marginLeft: 6,
    fontSize: 11,
    textAlign: 'right',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

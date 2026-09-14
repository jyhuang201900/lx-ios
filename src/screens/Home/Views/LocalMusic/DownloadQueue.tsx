import { useEffect, useState } from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import {
  cancelDownloadTask,
  removeDownloadTask,
  retryDownloadTask,
  subscribeDownloadTasks,
  type DownloadTask,
} from '@/core/download'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'

const statusKeys: Record<DownloadTask['status'], string> = {
  queued: 'download_queue_queued',
  downloading: 'download_queue_downloading',
  completed: 'download_queue_completed',
  failed: 'download_queue_failed',
  canceled: 'download_queue_canceled',
}

export default () => {
  const theme = useTheme()
  const [tasks, setTasks] = useState<DownloadTask[]>([])

  useEffect(() => subscribeDownloadTasks(allTasks => {
    setTasks(allTasks.filter(task => task.status != 'completed').slice(0, 3))
  }), [])

  if (!tasks.length) return null

  return (
    <View style={styles.container}>
      <Text style={styles.title} size={12} color={theme['c-font-label']}>{global.i18n.t('download_queue_title')}</Text>
      {tasks.map(task => (
        <View key={task.id} style={{ ...styles.task, borderColor: theme['c-border-background'] }}>
          <View style={{ ...styles.taskIcon, backgroundColor: theme['c-primary-background-active'] }}>
            <Icon name="download-2" size={15} color={theme['c-primary-font-active']} />
          </View>
          <View style={styles.taskCopy}>
            <Text size={13} numberOfLines={1}>{task.name}</Text>
            <Text size={11} color={theme['c-font-label']} numberOfLines={1}>
              {global.i18n.t(statusKeys[task.status])}
              {task.status == 'downloading' && task.totalBytes > 0 ? ` · ${Math.round(task.progress * 100)}%` : ''}
            </Text>
            {task.status == 'downloading' ? (
              <View style={styles.progressTrack}>
                <View style={{
                  ...styles.progressValue,
                  width: `${Math.max(2, Math.round(task.progress * 100))}%`,
                  backgroundColor: theme['c-primary'],
                }} />
              </View>
            ) : null}
          </View>
          {task.status == 'failed' ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={global.i18n.t('download_queue_retry')}
              style={styles.action}
              onPress={() => retryDownloadTask(task.id)}
            >
              <Icon name="download-2" size={14} color={theme['c-font']} />
            </TouchableOpacity>
          ) : null}
          {task.status == 'queued' || task.status == 'downloading' ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={global.i18n.t('download_queue_cancel')}
              style={styles.action}
              onPress={() => cancelDownloadTask(task.id)}
            >
              <Icon name="close" size={13} color={theme['c-font-label']} />
            </TouchableOpacity>
          ) : null}
          {task.status == 'canceled' ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={global.i18n.t('delete')}
              style={styles.action}
              onPress={() => removeDownloadTask(task.id)}
            >
              <Icon name="remove" size={13} color={theme['c-font-label']} />
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
    </View>
  )
}

const styles = createStyle({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    marginBottom: 7,
    paddingHorizontal: 1,
  },
  task: {
    minHeight: 58,
    marginBottom: 6,
    paddingHorizontal: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCopy: {
    flex: 1,
    paddingLeft: 10,
    paddingRight: 6,
    gap: 4,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(127,127,127,0.22)',
    overflow: 'hidden',
  },
  progressValue: {
    height: 3,
    borderRadius: 2,
  },
  action: {
    width: 34,
    height: 34,
    marginLeft: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

import { memo, type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'

import Text from './Text'
import { Icon } from './Icon'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { Gap, Typography } from '@/theme/layout'

export interface EmptyStateProps {
  /** 图标名，取自 resources/fonts/selection.json；不传就只有文字台阶 */
  icon?: string
  title: string
  /** 第二行解释，说明「为什么空」或「下一步做什么」 */
  description?: string
  /** 操作槽，通常放一个重试/去搜索按钮 */
  children?: ReactNode
  /** 列表内嵌用：垂直居中改为固定上边距，避免把长列表的空态顶到半屏 */
  compact?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * 空态的唯一实现。
 *
 * 以前每个列表各写一份：图标 28 + 14pt 灰字，有的带描述有的不带，
 * 有的 paddingBottom 56 有的 0——同一个产品里「没内容」长成好几种样子。
 * 这里把它做成三段固定台阶：图标盘 → 标题 → 解释，字色只用
 * c-primary-font / c-font / c-font-label 三档，任何主题下都能自证对比度。
 */
const EmptyState = memo(({ icon, title, description, children, compact, style }: EmptyStateProps) => {
  const theme = useTheme()

  return (
    <View style={[styles.container, compact ? styles.containerCompact : null, style]}>
      {icon
        ? (
            <View style={[styles.badge, { backgroundColor: theme['c-primary-light-900-alpha-200'] }]}>
              <Icon name={icon} size={26} color={theme['c-primary-font']} />
            </View>
          )
        : null}
      <Text size={Typography.body} color={theme['c-font']} style={styles.title} numberOfLines={2}>{title}</Text>
      {description
        ? <Text size={Typography.sub} color={theme['c-font-label']} style={styles.description}>{description}</Text>
        : null}
      {children ? <View style={styles.action}>{children}</View> : null}
    </View>
  )
})

export default EmptyState

const styles = createStyle({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    /**
     * 视觉重心比几何中心高一点点才「看着居中」，但只是「一点点」。
     *
     * 这里原来是 Gap.section * 2 = 44，是标题行高的两倍：06-love 的截图里
     * 空态中心比列表区中心高出 36pt（约屏高 4%），下方空出一大片，读作
     * "内容没加载出来"。收到一个 Gap.tight 后偏差降到 2% 以内，仍然是
     * 上重下轻的视觉中心，但不再像掉在半空。
     */
    paddingBottom: Gap.tight,
  },
  containerCompact: {
    flex: 0,
    justifyContent: 'flex-start',
    paddingTop: Gap.section * 2,
    paddingBottom: Gap.section,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: Gap.tight + 6,
    textAlign: 'center',
  },
  description: {
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  action: {
    marginTop: Gap.block,
  },
})

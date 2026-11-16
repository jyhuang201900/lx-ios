import { memo } from 'react'

import { useI18n } from '@/lang'
import Section from '../../components/Section'
import Theme from './index'

/**
 * 主题外观独立子页。
 *
 * 为什么单独包一层 Section：这份内容原来只内联在「基本设置」里（Basic 直接引
 * ../Theme），单独成页时没有区块标题和卡片底，截图里会是一堆悬空控件；
 * 包一层 Section 后它与其它子页版式一致，而 Basic 那边的内联用法保持不动。
 */
export default memo(() => {
  const t = useI18n()
  return (
    <Section title={t('setting_theme')}>
      <Theme />
    </Section>
  )
})

import { View } from 'react-native'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { IconSize, PageMetrics, Radius, ToolbarMetrics, createContentSurface } from '@/theme/layout'
import { forwardRef, useImperativeHandle, useState } from 'react'


export interface CurrentTagBtnProps {
  onShowList: () => void
}

export interface CurrentTagBtnType {
  setCurrentTagInfo: (name: string) => void
}

export default forwardRef<CurrentTagBtnType, CurrentTagBtnProps>(({ onShowList }, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const [name, setName] = useState('')

  useImperativeHandle(ref, () => ({
    setCurrentTagInfo(name) {
      if (!name) name = t('songlist_tag_default')
      setName(name)
    },
  }))

  return (
    <Button style={[styles.btn, createContentSurface(theme, { radius: Radius.control })]} onPress={onShowList}>
      <View style={styles.content}>
        <Text style={styles.sourceMenu} numberOfLines={1} color={theme['c-font']}>{name}</Text>
        <Icon name="chevron-right" size={IconSize.disclosure} color={theme['c-font-label']} />
      </View>
    </Button>
  )
})


const styles = createStyle({
  btn: {
    /**
     * 标签按钮原本只给 minHeight + 左右内边距，宽度由文字撑开，
     * 并且 justifyContent / alignItems 都是 'flex-start'——按钮默认是
     * column 方向，flex-start 把内容顶到顶部，真机上「华语 >」看起来
     * 就是偏上、没垂直居中。
     *
     * 统一到四字基准宽度并显式居中，与同一行的音源 / 排序 / 打开对齐。
     */
    width: ToolbarMetrics.chipWidth,
    height: PageMetrics.controlHeight,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceMenu: {
    maxWidth: '100%',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    paddingRight: 3,
  },
})

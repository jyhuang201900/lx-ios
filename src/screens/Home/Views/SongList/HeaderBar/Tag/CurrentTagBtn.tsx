import { View } from 'react-native'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
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
    <Button style={[styles.btn, { backgroundColor: theme['c-primary-input-background'] }]} onPress={onShowList}>
      <View style={styles.content}>
        <Text style={styles.sourceMenu} numberOfLines={1} color={theme['c-font']}>{name}</Text>
        <Icon name="chevron-right" size={11} color={theme['c-font-label']} />
      </View>
    </Button>
  )
})


const styles = createStyle({
  btn: {
    minHeight: 40,
    paddingLeft: 10,
    paddingRight: 10,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  sourceMenu: {
    maxWidth: 64,
    textAlign: 'left',
    textAlignVertical: 'center',
    paddingRight: 3,
  },
})

import { memo } from 'react'

import { View } from 'react-native'

import CheckBox, { type CheckBoxProps } from '@/components/common/CheckBox'
import { createStyle } from '@/utils/tools'
import { Radius } from '@/theme/layout'


export default memo((props: CheckBoxProps) => {
  return (
    <View style={styles.container}>
      <CheckBox {...props} />
    </View>
  )
})

const styles = createStyle({
  container: {
    paddingHorizontal: 10,
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: Radius.control,
    // marginTop: -10,
    // marginBottom: 0,
  },
})

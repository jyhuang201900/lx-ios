import { memo } from 'react'

import { View } from 'react-native'

import CheckBox, { type CheckBoxProps } from '@/components/common/CheckBox'
import { createStyle } from '@/utils/tools'


export default memo((props: CheckBoxProps) => {
  return (
    <View style={styles.container}>
      <CheckBox {...props} />
    </View>
  )
})

const styles = createStyle({
  container: {
    paddingLeft: 10,
    paddingRight: 8,
    minHeight: 38,
    justifyContent: 'center',
    // marginTop: -10,
    // marginBottom: 0,
  },
})

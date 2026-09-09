import MusicList from './MusicList'
import MyList from './MyList'
import { createStyle } from '@/utils/tools'
import { View } from 'react-native'
import { useEffect } from 'react'
import { getListPrevSelectId } from '@/utils/data'
import { setActiveList } from '@/core/list'

/**
 * Keep the library and its content in one navigation layer. Switching a
 * playlist should never hide songs behind a drawer.
 */
export default () => {
  useEffect(() => {
    void getListPrevSelectId().then(setActiveList)
  }, [])

  return (
    <View style={styles.container}>
      <MyList />
      <MusicList />
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
})

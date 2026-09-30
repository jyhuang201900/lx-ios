import MusicList, { type MusicListType } from './MusicList'
import MyList from './MyList'
import { createStyle } from '@/utils/tools'
import { View } from 'react-native'
import { useEffect, useRef } from 'react'
import { getListPrevSelectId } from '@/utils/data'
import { setActiveList } from '@/core/list'

/**
 * Keep the library and its content in one navigation layer. Switching a
 * playlist should never hide songs behind a drawer.
 */
export default () => {
  const musicListRef = useRef<MusicListType>(null)

  useEffect(() => {
    void getListPrevSelectId().then(setActiveList)
  }, [])

  return (
    <View style={styles.container}>
      {/* 工具栏的搜索框在 MyList 里，真正的歌单内过滤在 MusicList 里 */}
      <MyList onSearch={keyword => musicListRef.current?.search(keyword)} />
      <MusicList ref={musicListRef} />
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
})

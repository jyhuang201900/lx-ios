import Content from './Content'
import PlayerBar from '@/components/player/PlayerBar'
import TabBar from './TabBar'
import { useNavActiveId } from '@/store/common/hook'

export default () => {
  const activeId = useNavActiveId()

  return (
    <>
      <Content />
      <PlayerBar isHome />
      {activeId == 'nav_setting' ? null : <TabBar />}
    </>
  )
}

import { useEffect } from 'react'
// import { View, StyleSheet } from 'react-native'
import { useHorizontalMode } from '@/utils/hooks'

import Vertical from './Vertical'
import Horizontal from './Horizontal'
import PageContent from '@/components/PageContent'
import StatusBar from '@/components/common/StatusBar'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import { usePlayerMusicInfo } from '@/store/player/hook'

export default ({ componentId }: { componentId: string }) => {
  const isHorizontalMode = useHorizontalMode()
  const musicInfo = usePlayerMusicInfo()

  useEffect(() => {
    setComponentId(COMPONENT_IDS.playDetail, componentId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 播放详情页是整个产品唯一的"此刻"：动态极光只在这里出现，
  // 并且把当前封面铺成整页底色——HIG materials.md 把 clear 玻璃浮在
  // 照片/视频之上列为最理想的用法，封面就是那张照片。
  // 有封面时不再叠极光，两个色彩来源会互相打架。
  return (
    <PageContent aurora="animated" cover={musicInfo?.pic ?? null}>
      <StatusBar />
      {
        isHorizontalMode
          ? <Horizontal componentId={componentId} />
          : <Vertical componentId={componentId} />
      }
    </PageContent>
  )
}

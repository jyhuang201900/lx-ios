import { memo, useEffect } from 'react'
import { View, AppState } from 'react-native'
import { screenkeepAwake, screenUnkeepAwake } from '@/utils/nativeModules/utils'
import StatusBar from '@/components/common/StatusBar'
import MoreBtn from './MoreBtn'

import Header from './components/Header'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import PageContent from '@/components/PageContent'
import commonState, { type InitState as CommonState } from '@/store/common/state'

import Pic from './Pic'
// import ControlBtn from './ControlBtn'
import Lyric from './Lyric'
import Player from './Player'
import { createStyle } from '@/utils/tools'
import { marginLeftRaw } from './constant'
import { useStatusbarHeight } from '@/store/common/hook'
import StreamInfo from '../components/StreamInfo'
// import MoreBtn from './MoreBtn2'

export default memo(({ componentId }: { componentId: string }) => {
  const statusBarHeight = useStatusbarHeight()

  useEffect(() => {
    setComponentId(COMPONENT_IDS.playDetail, componentId)
    screenkeepAwake()
    let appstateListener = AppState.addEventListener('change', (state) => {
      switch (state) {
        case 'active':
          if (!commonState.componentIds.comment) screenkeepAwake()
          break
        case 'background':
          screenUnkeepAwake()
          break
      }
    })

    const handleComponentIdsChange = (ids: CommonState['componentIds']) => {
      if (ids.comment) screenUnkeepAwake()
      else if (AppState.currentState == 'active') screenkeepAwake()
    }

    global.state_event.on('componentIdsUpdated', handleComponentIdsChange)

    return () => {
      global.state_event.off('componentIdsUpdated', handleComponentIdsChange)
      appstateListener.remove()
      screenUnkeepAwake()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 注意：父级 PlayDetail 已经包了一层 PageContent，这里是第二层。
  // 这是改动前就有的结构，所以内层**刻意不传 cover**——否则会出现
  // 双层封面底图（模糊半径叠加、遮罩叠加），横屏会明显比竖屏暗。
  // 结果是横屏看不到封面底色，属于已知限制而非设计选择。
  // 要修得先确认内层的 SafeAreaView / StatusBar 职责能否上提，
  // 那是结构改动，本机无法验证横屏布局，暂不动。
  return (
      <PageContent aurora="animated">
      <StatusBar />
      <View style={{ ...styles.container, paddingTop: statusBarHeight }}>
        <View style={styles.left}>
          <Header />
          <View style={styles.leftContent}>
            <MoreBtn />
            <Pic componentId={componentId} />
          </View>
          <StreamInfo style={styles.streamInfo} />
          <Player />
          {/* <View style={styles.controlBtn} nativeID="pageIndicator">
            <MoreBtn />
            <ControlBtn />
          </View> */}
        </View>
        <View style={styles.right}>
          <Lyric />
        </View>
      </View>
    </PageContent>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  left: {
    flex: 1,
    width: '45%',
    paddingBottom: 14,
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
  leftContent: {
    flexShrink: 1,
    flexGrow: 0,
    marginLeft: marginLeftRaw,
    // flexDirection: 'row',
    // backgroundColor: 'rgba(0,0,0,0.1)',
    // alignItems: 'center',
  },
  streamInfo: {
    // 读数条与左侧列对齐（竖屏由宿主的 KeyPadding 负责，组件本身不带外边距）
    marginLeft: marginLeftRaw,
  },
  right: {
    width: '55%',
    flexGrow: 0,
    flexShrink: 0,
    paddingRight: 10,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // backgroundColor: '#eee',
  },
})

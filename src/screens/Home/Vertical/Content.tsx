import { View } from 'react-native'
// import { getWindowSise, onDimensionChange } from '@/utils/tools'
import Main from './Main'
import StatusBar from '@/components/common/StatusBar'
import { createStyle } from '@/utils/tools'

const Content = () => {
  /**
   * 这里原本还包了一层 DrawerLayoutFixed，内容是 DrawerNav——
   * 而 DrawerNav 渲染的是与底部标签栏完全相同的 NAV_MENUS，
   * 属于同一层级出现两套导航，当前位置不再唯一（违反 tab-bars.md）。
   *
   * 更关键的是它已经不可达：打开抽屉只依赖 changeMenuVisible(true)，
   * 全项目只有 changeMenuVisible(false) 的发射点，横屏 Header 里的菜单按钮
   * 也一直是注释状态。也就是说这套重复导航从未能被打开。
   *
   * 现在顶层导航唯一由底部标签栏承担（HIG tab-bars.md：
   * "Make sure the tab bar is visible when people navigate to different sections"）。
   * 歌单页的标签抽屉是另一回事——它是可达的筛选器，保留在 SongList/index.tsx。
   */
  return (
    <View style={styles.container}>
      <StatusBar />
      <Main />
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
})

export default Content

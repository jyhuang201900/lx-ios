import { memo } from 'react'
import { View } from 'react-native'

// import Title from './components/Title'
import MoreBtn from './components/MoreBtn'
import PlayInfo from './components/PlayInfo'
import ControlBtn from './components/ControlBtn'
import { createStyle } from '@/utils/tools'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import StreamInfo from '../../components/StreamInfo'
import PreviewLyric from './components/PreviewLyric'
import { Gap, KeyPadding } from '@/theme/layout'
import { useTheme } from '@/store/theme/hook'


export default memo(() => {
  const theme = useTheme()
  return (
    <View style={styles.container} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_player}>
      <StreamInfo />
      <PreviewLyric />
      {/* 方向 A 的层级：进度 → 主导航 → 次级操作。
          操作行从进度条上方移到最底部，并用一条发丝线与主控制区分开，
          读起来是"先控制播放，再处理这首歌"，而不是八个图标挤在中间。 */}
      <PlayInfo />
      <ControlBtn />
      <View style={{ ...styles.actions, borderTopColor: theme['c-border-background'] }}>
        <MoreBtn />
      </View>
    </View>
  )
})

const styles = createStyle({
  container: {
    flex: 0,
    width: '100%',
    // 关键内容区：水平边距比普通内容更宽，底部留出呼吸空间
    paddingHorizontal: KeyPadding,
    paddingBottom: Gap.section,
    paddingTop: Gap.block,
    // backgroundColor: AppColors.primary,
    // backgroundColor: 'red',
    flexDirection: 'column',
  },
  actions: {
    borderTopWidth: 1,
    paddingTop: 6,
  },
  status: {
    marginTop: 10,
    flexDirection: 'column',
    flex: 0,
    paddingLeft: 5,
    justifyContent: 'space-evenly',
    // backgroundColor: 'rgba(0, 0, 0, .1)',
  },
})

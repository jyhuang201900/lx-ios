import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { navigations } from '@/navigation'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import commonState from '@/store/common/state'
import playerState from '@/store/player/state'
import { LIST_IDS, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import Image from '@/components/common/Image'
import { useTheme } from '@/store/theme/hook'
import { Radius, createShadow } from '@/theme/layout'
import { useCallback } from 'react'
import { setLoadErrorPicUrl, setMusicInfo } from '@/core/player/playInfo'

const PIC_HEIGHT = scaleSizeH(44)

const styles = StyleSheet.create({
  imageFrame: {
    width: PIC_HEIGHT,
    height: PIC_HEIGHT,
    borderRadius: Radius.control,
  },
  imageClip: {
    flex: 1,
    borderRadius: Radius.control,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.control,
  },
  specularEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  imageShadow: createShadow({ opacity: 0.12, radius: 6, offsetY: 3, elevation: 2 }),
})

export default ({ isHome }: { isHome: boolean }) => {
  const theme = useTheme()
  const musicInfo = usePlayerMusicInfo()
  const handlePress = () => {
    // console.log('')
    // console.log(playMusicInfo)
    if (!musicInfo.id) return
    navigations.pushPlayDetailScreen(commonState.componentIds.home!)

    // toast(global.i18n.t('play_detail_todo_tip'), 'long')
  }

  const handleLongPress = () => {
    if (!isHome) return
    const listId = playerState.playMusicInfo.listId
    if (!listId || listId == LIST_IDS.DOWNLOAD) return
    global.app_event.jumpListPosition()
  }

  const handleError = useCallback((url: string | number) => {
    setLoadErrorPicUrl(url as string)
    setMusicInfo({
      pic: null,
    })
  }, [])

  return (
    <TouchableOpacity onLongPress={handleLongPress} onPress={handlePress} activeOpacity={0.7} >
      <View style={{ ...styles.imageFrame, ...styles.imageShadow, backgroundColor: theme['c-primary'] }}>
        <View style={styles.imageClip}>
          <Image url={musicInfo.pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} style={styles.image} onError={handleError} />
          <View
            pointerEvents="none"
            style={{
              ...styles.specularEdge,
              borderTopColor: theme.isDark ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.78)',
              borderLeftColor: theme.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.42)',
              borderRightColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.20)',
            }}
          />
        </View>
      </View>
    </TouchableOpacity>
  )
}


// const styles = StyleSheet.create({
//   playInfoImg: {

//   },
// })

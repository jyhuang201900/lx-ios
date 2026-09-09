import { View, TouchableOpacity } from 'react-native'
// import Button from '@/components/common/Button'
// import { navigations } from '@/navigation'
// import { BorderWidths } from '@/theme'
import { useTheme } from '@/store/theme/hook'
import { useNavActiveId, useStatusbarHeight } from '@/store/common/hook'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import StatusBar from '@/components/common/StatusBar'
import { scaleSizeH } from '@/utils/pixelRatio'
import { HEADER_HEIGHT, NAV_MENUS } from '@/config/constant'
import { type InitState as CommonState } from '@/store/common/state'
import SearchTypeSelector from '@/screens/Home/Views/Search/SearchTypeSelector'
import { setNavActiveId } from '@/core/common'
import { useSettingValue } from '@/store/setting/hook'

const headerComponents: Partial<Record<CommonState['navActiveId'], React.ReactNode>> = {
  nav_search: <SearchTypeSelector />,
}

const NavButtons = () => {
  const theme = useTheme()
  const activeId = useNavActiveId()
  return <View style={styles.navButtons}>
    {NAV_MENUS.map(menu => <TouchableOpacity
      key={menu.id}
      accessibilityRole="button"
      accessibilityLabel={global.i18n.t(menu.id)}
      style={{ ...styles.navButton, backgroundColor: activeId == menu.id ? theme['c-primary-background-active'] : 'transparent', borderColor: activeId == menu.id ? theme['c-primary-background-active'] : 'transparent' }}
      onPress={() => { if (activeId != menu.id) setNavActiveId(menu.id) }}
    >
      <Icon color={activeId == menu.id ? theme['c-primary-font-active'] : theme['c-font-label']} name={menu.icon} size={18} />
    </TouchableOpacity>)}
  </View>
}


// const LeftTitle = () => {
//   const id = useNavActiveId()
//   const t = useI18n()

//   return <Text style={styles.leftTitle} size={18}>{t(id)}</Text>
// }
const LeftHeader = () => {
  const theme = useTheme()
  const id = useNavActiveId()
  const t = useI18n()
  const statusBarHeight = useStatusbarHeight()

  return (
    <View style={{
      ...styles.container,
      height: scaleSizeH(HEADER_HEIGHT) + statusBarHeight + scaleSizeH(42),
      paddingTop: statusBarHeight,
    }}>
      <View style={styles.left}>
        <NavButtons />
        <View style={styles.titleBtn}>
          <Text style={styles.leftTitle} size={18}>{t(id)}</Text>
        </View>
      </View>
      {headerComponents[id] ?? null}

      {/* <TouchableOpacity style={styles.btn} onPress={openSetting}>
        <Icon style={{ ...styles.btnText, color: theme['c-font'] }} name="setting" size={styles.btnText.fontSize} />
      </TouchableOpacity> */}
    </View>
  )
}


// const RightTitle = () => {
//   const id = useNavActiveId()
//   const t = useI18n()

//   return <Text style={styles.rightTitle} size={18}>{t(id)}</Text>
// }
const RightHeader = () => {
  const theme = useTheme()
  const t = useI18n()
  const id = useNavActiveId()
  const statusBarHeight = useStatusbarHeight()

  return (
    <View style={{
      ...styles.container,
      height: scaleSizeH(HEADER_HEIGHT) + statusBarHeight + scaleSizeH(42),
      paddingTop: statusBarHeight,
    }}>
      <View style={styles.left}>
        <View style={styles.titleBtn}>
          <Text style={styles.rightTitle} size={18}>{t(id)}</Text>
        </View>
      </View>
      {headerComponents[id] ?? null}
      <NavButtons />
      {/* <TouchableOpacity style={styles.btn} onPress={openSetting}>
        <Icon style={{ ...styles.btnText, color: theme['c-font'] }} name="setting" size={styles.btnText.fontSize} />
      </TouchableOpacity> */}
    </View>
  )
}

const Header = () => {
  const drawerLayoutPosition = useSettingValue('common.drawerLayoutPosition')
  return (
    <>
      <StatusBar />
      {drawerLayoutPosition == 'left' ? <LeftHeader /> : <RightHeader />}

    </>
  )
}


const styles = createStyle({
  container: {
    // width: '100%',
    paddingRight: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'rgba(0,0,0,0.1)',
    zIndex: 10,
    position: 'relative',
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    paddingLeft: 7,
    alignItems: 'center',
    height: '100%',
    paddingTop: scaleSizeH(42),
  },
  btn: {
    // flex: 1,
    width: HEADER_HEIGHT,
    // backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 4,
    left: 10,
    right: 10,
    height: scaleSizeH(42),
  },
  navButton: {
    width: 44,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 3,
  },
  titleBtn: {
    flex: 1,
    // backgroundColor: 'rgba(0,0,0,0.1)',
    height: '100%',
    justifyContent: 'center',
  },
  leftTitle: {
    paddingLeft: 14,
    paddingRight: 16,
  },
  rightTitle: {
    paddingLeft: 16,
    paddingRight: 16,
  },
})

export default Header

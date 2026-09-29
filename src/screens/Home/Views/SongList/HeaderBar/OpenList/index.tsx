import { useRef, forwardRef, useImperativeHandle } from 'react'
// import { Icon } from '@/components/common/Icon'
import Button from '@/components/common/Button'
// import { navigations } from '@/navigation'
import Modal, { type ModalType } from './Modal'
import { type Source } from '@/store/songlist/state'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'
import { Radius } from '@/theme/layout'
import { useTheme } from '@/store/theme/hook'
import { Icon } from '@/components/common/Icon'

// export interface OpenListProps {
//   onTagChange: (name: string, id: string) => void
// }

export interface OpenListType {
  setInfo: (source: Source) => void
}

export default forwardRef<OpenListType, {}>((props, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const modalRef = useRef<ModalType>(null)
  const songlistInfoRef = useRef<{ source: Source }>({ source: 'kw' })

  useImperativeHandle(ref, () => ({
    setInfo(source) {
      songlistInfoRef.current.source = source
    },
  }))

  const handleOpenSonglist = (id: string) => {
    // console.log(id, songlistInfoRef.current.source)
    navigations.pushSonglistDetailScreen(commonState.componentIds.home!, {
      play_count: undefined,
      id,
      author: '',
      name: '',
      img: undefined,
      desc: undefined,
      source: songlistInfoRef.current.source,
    })
  }

  // const handleSourceChange: ModalProps['onSourceChange'] = (source) => {
  //   songlistInfoRef.current.source = source
  // }


  return (
    <>
      <Button
        style={[styles.button, { backgroundColor: theme['c-primary-solid'] }]}
        onPress={() => modalRef.current?.show(songlistInfoRef.current.source)}
      >
        <Icon name="album" size={14} color={theme['c-on-solid']} />
        <Text size={12} color={theme['c-on-solid']}>{t('songlist_open')}</Text>
      </Button>
      <Modal ref={modalRef} onOpenId={handleOpenSonglist} />
    </>
  )
})

const styles = createStyle({
  button: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 10,
    paddingRight: 10,
    minHeight: 40,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    gap: 5,
  },
})

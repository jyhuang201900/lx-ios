import { useEffect, useState } from 'react'
import state, { type InitState } from './state'

/**
 * 订阅歌单详情。
 *
 * 详情页的「收藏 / 播放全部」需要等详情返回后才可点。这两个按钮原先直接读
 * 模块级的 `songlistState.listDetailInfo`，但 store 的赋值不会触发 React 重渲染，
 * 组件只会在自己因别的原因重渲染时才顺带读到新值。结果是详情回来了、
 * 按钮仍然是禁用态——用户看到的就是「收藏歌单、播放全部都失效」。
 */
export const useSonglistDetail = () => {
  const [detail, setDetail] = useState<InitState['listDetailInfo']>(state.listDetailInfo)

  useEffect(() => {
    const handleUpdate = (next: InitState['listDetailInfo']) => {
      setDetail({ ...next })
    }
    global.state_event.on('songlistDetailUpdated', handleUpdate)
    return () => {
      global.state_event.off('songlistDetailUpdated', handleUpdate)
    }
  }, [])

  return detail
}

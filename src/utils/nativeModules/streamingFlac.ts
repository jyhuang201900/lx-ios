import { NativeEventEmitter, NativeModules, Platform } from 'react-native'
import { useSyncExternalStore } from 'react'

type StreamingFlacState = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'stopped'

export interface StreamingFlacStateEvent {
  type: 'state'
  state: StreamingFlacState
  position?: number
  duration?: number
  /** STREAMINFO 的采样率（Hz）；首帧之前为 0 */
  sampleRate?: number
  /** STREAMINFO 的位深（bit）；首帧之前为 0 */
  bitsPerSample?: number
}

export interface StreamingFlacErrorEvent {
  type: 'error'
  message?: string
  state?: StreamingFlacState
  position?: number
  duration?: number
}

export interface StreamingFlacWarningEvent {
  type: 'warning'
  message?: string
  state?: StreamingFlacState
  position?: number
  duration?: number
  code?: number
  statusName?: string
}

export interface StreamingFlacEndedEvent {
  type: 'ended'
  state?: StreamingFlacState
  position?: number
  duration?: number
}

export type StreamingFlacEvent =
  | StreamingFlacStateEvent
  | StreamingFlacErrorEvent
  | StreamingFlacWarningEvent
  | StreamingFlacEndedEvent

interface NativeStreamingFlacModule {
  openStream?: (url: string, headers?: Record<string, string>, volume?: number, rate?: number, autoplay?: boolean) => Promise<void>
  resume?: () => Promise<void>
  pause?: () => Promise<void>
  stop?: () => Promise<void>
  reset?: () => Promise<void>
  seekTo?: (position: number) => Promise<number>
  setVolume?: (volume: number) => Promise<void>
  setRate?: (rate: number) => Promise<void>
  getPosition?: () => Promise<number>
  getBufferedPosition?: () => Promise<number>
  getDuration?: () => Promise<number>
  getState?: () => Promise<StreamingFlacState>
  addListener?: (eventName: string) => void
  removeListeners?: (count: number) => void
}

interface NativeStreamingFlacEventModule {
  addListener: (eventName: string) => void
  removeListeners: (count: number) => void
}

const StreamingFlacPlayerModule = NativeModules.StreamingFlacPlayerModule as NativeStreamingFlacModule | undefined
const StreamingFlacEventModule = NativeModules.StreamingFlacPlayerModule as NativeStreamingFlacEventModule | undefined
const emitter = Platform.OS == 'ios' && typeof StreamingFlacEventModule?.addListener == 'function' && typeof StreamingFlacEventModule?.removeListeners == 'function'
  ? new NativeEventEmitter(StreamingFlacEventModule)
  : null

const assertSupported = <K extends keyof NativeStreamingFlacModule>(method: K) => {
  const target = StreamingFlacPlayerModule?.[method]
  if (Platform.OS != 'ios' || typeof target != 'function') {
    throw new Error(`StreamingFlacPlayerModule.${String(method)} is not supported`)
  }
  return target.bind(StreamingFlacPlayerModule) as Exclude<NativeStreamingFlacModule[K], undefined>
}

export const isStreamingFlacSupported = Platform.OS == 'ios' && !!StreamingFlacPlayerModule

export const openStreamingFlac = async(url: string, headers: Record<string, string> = {}, volume = 1, rate = 1, autoplay = true) => {
  const open = assertSupported('openStream')
  return open(url, headers, volume, rate, autoplay)
}

export const resumeStreamingFlac = async() => assertSupported('resume')()
export const pauseStreamingFlac = async() => assertSupported('pause')()
export const stopStreamingFlac = async() => assertSupported('stop')()
export const resetStreamingFlac = async() => assertSupported('reset')()
export const seekStreamingFlac = async(position: number) => assertSupported('seekTo')(position)
export const setStreamingFlacVolume = async(volume: number) => assertSupported('setVolume')(volume)
export const setStreamingFlacRate = async(rate: number) => assertSupported('setRate')(rate)
export const getStreamingFlacPosition = async() => assertSupported('getPosition')()
export const getStreamingFlacBufferedPosition = async() => assertSupported('getBufferedPosition')()
export const getStreamingFlacDuration = async() => assertSupported('getDuration')()
export const getStreamingFlacState = async() => assertSupported('getState')()

export const onStreamingFlacEvent = (listener: (event: StreamingFlacEvent) => void) => {
  if (!emitter) return () => {}
  const subscription = emitter.addListener('streaming-flac-event', (event: StreamingFlacEvent) => {
    if (event.type == 'state') updateStreamFormat(event)
    listener(event)
  })
  return () => {
    subscription.remove()
  }
}

/**
 * 当前流的真实格式（来自原生 STREAMINFO）。
 *
 * 单独放一份而不是塞进播放状态：采样率/位深只在流式 FLAC 时有意义，
 * 本地文件与其它音源走的是另一条解码路径，混进通用状态会让读数在两种
 * 来源之间来回跳。值在首帧之前是 0，调用方据此不渲染。
 */
export interface StreamingFlacFormat {
  sampleRate: number
  bitsPerSample: number
}

let streamFormat: StreamingFlacFormat = { sampleRate: 0, bitsPerSample: 0 }
const formatListeners = new Set<() => void>()

export const getStreamingFlacFormat = () => streamFormat

const subscribeStreamFormat = (listener: () => void) => {
  formatListeners.add(listener)
  return () => { formatListeners.delete(listener) }
}

const updateStreamFormat = (event: StreamingFlacStateEvent) => {
  const next = {
    sampleRate: event.sampleRate ?? 0,
    bitsPerSample: event.bitsPerSample ?? 0,
  }
  if (next.sampleRate == streamFormat.sampleRate && next.bitsPerSample == streamFormat.bitsPerSample) return
  streamFormat = next
  formatListeners.forEach(listener => { listener() })
}

/** 播放页读数用：只在原生真的报过 STREAMINFO 之后才返回非零值。 */
export const useStreamingFlacFormat = () => useSyncExternalStore(subscribeStreamFormat, getStreamingFlacFormat)

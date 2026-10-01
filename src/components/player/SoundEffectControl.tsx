import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'

import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import Slider from '@/components/common/Slider'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import SoundEffectPresetSaveModal, { type SoundEffectPresetSaveModalType } from './SoundEffectPresetSaveModal'
import { createStyle, confirmDialog, tipDialog, toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useSetting } from '@/store/setting/hook'
import {
  createConvolutionSettingPatch,
  createCustomBandSettingPatch,
  createCustomGainsSettingPatch,
  createEqualizerGainsRecord,
  createPresetSettingPatch,
  equalizerFrequencies,
  equalizerPresets,
  getEqualizerGains,
  isSoundEffectActive,
  normalizeEqualizerPresetId,
  soundEffectController,
  soundEffectConvolutionOptions,
} from '@/plugins/player/soundEffect'
import {
  getUserConvolutionPresetList,
  getUserEQPresetList,
  removeUserConvolutionPreset,
  removeUserEQPreset,
  saveUserConvolutionPreset,
  saveUserEQPreset,
} from '@/store/soundEffect'
import { Radius, Typography } from '@/theme/layout'
import EqCurve from './EqCurve'
import ReverbDecay from './ReverbDecay'
import RoomDecayRow from './RoomDecayRow'
import { REVERB_PROFILES } from '@/plugins/player/soundEffect/reverbProfile'

const minGain = -15
const maxGain = 15
const minPitchPlaybackRate = 0.5
const maxPitchPlaybackRate = 1.5
const defaultSurroundSpeed = 25
const defaultSurroundDistance = 5
const maxUserPresetCount = 31

type PreviewGains = Record<typeof equalizerFrequencies[number], number>
type LayoutMode = 'split' | 'stacked'

const formatGain = (gain: number) => `${gain > 0 ? '+' : ''}${Number.isInteger(gain) ? gain : gain.toFixed(1)}db`
const formatPercent = (value: number) => `${Math.round(value) * 10}%`
const formatPlaybackRate = (value: number) => `${value.toFixed(2)}x`
const formatPlain = (value: number) => `${Math.round(value)}`

const SoundEffectOverview = memo(({ presetName, active }: { presetName: string, active: boolean }) => {
  const t = useI18n()
  const theme = useTheme()
  return (
    <View style={{ ...styles.overview, backgroundColor: active ? theme['c-primary-background-active'] : theme['c-primary-input-background'], borderColor: theme['c-border-background'] }}>
      <View style={styles.overviewCopy}>
        <Text size={16} style={styles.overviewTitle}>{t('setting_play_sound_effect')}</Text>
        <Text size={12} color={theme['c-font-label']}>{t('setting_play_sound_effect_preset')} · {presetName}</Text>
      </View>
      <View style={{ ...styles.overviewStatus, backgroundColor: active ? theme['c-primary'] : theme['c-button-background'] }}>
        <Text size={12} color={active ? theme['c-primary-button-font'] : theme['c-button-font']}>{active ? t('setting_play_sound_effect_enable') : t('setting_play_sound_effect_preset_none')}</Text>
      </View>
    </View>
  )
})

const PlaceholderCheckbox = memo(({
  checked,
  label,
  onPress,
}: {
  checked: boolean
  label: string
  onPress: () => void
}) => {
  const theme = useTheme()

  return (
    <TouchableOpacity style={styles.placeholderCheckbox} activeOpacity={0.7} onPress={onPress}>
      <Icon
        name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
        size={15}
        color={checked ? theme['c-primary-font-active'] : theme['c-font-label']}
      />
      <Text size={13}>{label}</Text>
    </TouchableOpacity>
  )
})

const PlaceholderSliderRow = memo(({
  label,
  value,
  minimumValue,
  maximumValue,
  step,
  onValueChange,
  onSlidingComplete,
  formatter,
  valueColor,
}: {
  label: string
  value: number
  minimumValue: number
  maximumValue: number
  step: number
  onValueChange: (value: number) => void
  onSlidingComplete?: (value: number) => void
  formatter: (value: number) => string
  valueColor?: string
}) => {
  const theme = useTheme()

  return (
    <View style={styles.placeholderSliderItem}>
      {label ? <Text size={13}>{label}</Text> : null}
      <View style={styles.placeholderSliderContent}>
        <View style={styles.sliderWrap}>
          <Slider
            minimumValue={minimumValue}
            maximumValue={maximumValue}
            step={step}
            value={value}
            onValueChange={onValueChange}
            onSlidingComplete={onSlidingComplete}
          />
        </View>
        <Text size={12} color={valueColor ?? theme['c-font-label']} style={styles.placeholderValue}>{formatter(value)}</Text>
      </View>
    </View>
  )
})

const PresetAddButton = memo(({
  onPress,
  disabled = false,
}: {
  onPress: () => void
  disabled?: boolean
}) => {
  const theme = useTheme()

  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.7}
      onPress={() => {
        if (disabled) return
        onPress()
      }}
      style={{
        ...styles.presetAddButton,
        borderColor: theme['c-primary-font-active'],
        opacity: disabled ? 0.35 : 0.7,
      }}>
      <Text size={15} color={theme['c-primary-font-active']} style={styles.presetAddText}>+</Text>
    </TouchableOpacity>
  )
})

const EqualizerSection = memo(({
  presetId,
  transitionId,
  previewGains,
  userPresetList,
  activeUserPresetId,
  onReset,
  onPresetPress,
  onSavePreset,
  saveDisabled,
  onUserPresetPress,
  onUserPresetLongPress,
  onValueChange,
  onSlidingComplete,
  layoutMode,
}: {
  presetId: LX.SoundEffectPresetId
  /** 预设切换计数，只在整条曲线被替换时变化；拖动滑块不会改它 */
  transitionId: number
  previewGains: PreviewGains
  userPresetList: LX.SoundEffect.EQPreset[]
  activeUserPresetId: string | null
  onReset: () => void
  onPresetPress: (presetId: Exclude<LX.SoundEffectPresetId, 'custom'>) => void
  onSavePreset: () => void
  saveDisabled: boolean
  onUserPresetPress: (preset: LX.SoundEffect.EQPreset) => void
  onUserPresetLongPress: (preset: LX.SoundEffect.EQPreset) => void
  onValueChange: (frequency: typeof equalizerFrequencies[number], value: number) => void
  onSlidingComplete: (frequency: typeof equalizerFrequencies[number], value: number) => void
  layoutMode: LayoutMode
}) => {
  const t = useI18n()
  const theme = useTheme()
  const dividerColor = theme['c-primary-alpha-500']

  const equalizerRows = useMemo(() => {
    const result: Array<Array<typeof equalizerFrequencies[number]>> = []
    for (let index = 0; index < equalizerFrequencies.length; index += 2) {
      result.push(equalizerFrequencies.slice(index, index + 2))
    }
    return result
  }, [])

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('setting_play_sound_effect_equalizer')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity activeOpacity={0.7} onPress={onReset} style={{ ...styles.resetButton, backgroundColor: theme['c-button-background'] }}>
            <Text size={12} color={theme['c-button-font']}>{t('setting_play_sound_effect_reset')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 曲线放在滑块之前：先看形状，再调数值。
          previewGains 在拖动过程中实时更新，所以曲线是跟着手指走的，
          不需要额外动画——HIG motion.md 要的是 brief and precision，
          而这里直接跟手反而最准。 */}
      <View style={styles.eqCurveWrap}>
        <EqCurve
          gains={previewGains}
          frequencies={equalizerFrequencies}
          min={minGain}
          max={maxGain}
          transitionId={transitionId}
        />
      </View>

      {layoutMode == 'split'
        ? (
            <View style={styles.equalizerGrid}>
              {equalizerRows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.equalizerRow}>
                  {row.map((frequency, frequencyIndex) => (
                    <View
                      key={frequency}
                      style={{
                        ...styles.equalizerItem,
                        borderRightWidth: frequencyIndex == 0 ? 1 : 0,
                        borderRightColor: dividerColor,
                        paddingRight: frequencyIndex == 0 ? 8 : 0,
                        paddingLeft: frequencyIndex == 1 ? 8 : 0,
                      }}>
                      <View style={styles.equalizerSliderRow}>
                        <Text size={13} style={styles.equalizerLabel}>{frequency >= 1000 ? `${frequency / 1000}k` : `${frequency}`}</Text>
                        <View style={styles.sliderWrap}>
                          <Slider
                            minimumValue={minGain}
                            maximumValue={maxGain}
                            step={0.1}
                            value={previewGains[frequency]}
                            onValueChange={value => { onValueChange(frequency, Number(value)) }}
                            onSlidingComplete={value => { onSlidingComplete(frequency, Number(value)) }}
                          />
                        </View>
                        <Text size={12} color={theme['c-font-label']} style={styles.equalizerValue}>{formatGain(previewGains[frequency])}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )
        : (
            <View style={styles.stackedEqualizerList}>
              {equalizerFrequencies.map(frequency => (
                <View key={frequency} style={styles.stackedEqualizerItem}>
                  <View style={styles.equalizerSliderRow}>
                    <Text size={13} style={styles.equalizerLabel}>{frequency >= 1000 ? `${frequency / 1000}k` : `${frequency}`}</Text>
                    <View style={styles.sliderWrap}>
                      <Slider
                        minimumValue={minGain}
                        maximumValue={maxGain}
                        step={0.1}
                        value={previewGains[frequency]}
                        onValueChange={value => { onValueChange(frequency, Number(value)) }}
                        onSlidingComplete={value => { onSlidingComplete(frequency, Number(value)) }}
                      />
                    </View>
                    <Text size={12} color={theme['c-font-label']} style={styles.equalizerValue}>{formatGain(previewGains[frequency])}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

      <View style={styles.presetList}>
        {equalizerPresets.filter(preset => preset.id != 'none').map(preset => {
          const isActive = preset.id == presetId
          return (
            <TouchableOpacity
              key={preset.id}
              activeOpacity={0.7}
              style={{
                ...styles.presetButton,
                backgroundColor: isActive ? theme['c-button-background-selected'] : theme['c-button-background'],
              }}
              onPress={() => { onPresetPress(preset.id) }}>
              <Text size={13} color={isActive ? theme['c-button-font-selected'] : theme['c-button-font']}>
                {t(preset.nameKey)}
              </Text>
            </TouchableOpacity>
          )
        })}
        {userPresetList.map(preset => {
          const isActive = preset.id == activeUserPresetId
          return (
            <TouchableOpacity
              key={preset.id}
              activeOpacity={0.7}
              style={{
                ...styles.presetButton,
                backgroundColor: isActive ? theme['c-button-background-selected'] : theme['c-button-background'],
              }}
              onPress={() => { onUserPresetPress(preset) }}
              onLongPress={() => { onUserPresetLongPress(preset) }}>
              <Text size={13} color={isActive ? theme['c-button-font-selected'] : theme['c-button-font']}>
                {preset.name}
              </Text>
            </TouchableOpacity>
          )
        })}
        <PresetAddButton onPress={onSavePreset} disabled={saveDisabled} />
      </View>
    </View>
  )
})

const EnvironmentSection = memo(({
  selectedSource,
  mainGain,
  sendGain,
  userPresetList,
  activeUserPresetId,
  onToggleConvolution,
  onMainGainChange,
  onSendGainChange,
  onSavePreset,
  saveDisabled,
  onUserPresetPress,
  onUserPresetLongPress,
}: {
  selectedSource: string
  mainGain: number
  sendGain: number
  userPresetList: LX.SoundEffect.ConvolutionPreset[]
  activeUserPresetId: string | null
  onToggleConvolution: (source: string) => void
  onMainGainChange: (value: number) => void
  onSendGainChange: (value: number) => void
  onSavePreset: () => void
  saveDisabled: boolean
  onUserPresetPress: (preset: LX.SoundEffect.ConvolutionPreset) => void
  onUserPresetLongPress: (preset: LX.SoundEffect.ConvolutionPreset) => void
}) => {
  const t = useI18n()
  const theme = useTheme()
  const disabledConvolution = !selectedSource
  // option.source 就是 IR 的文件名，所以能直接查实测画像表
  const selectedProfile = selectedSource ? REVERB_PROFILES[selectedSource] : undefined

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('setting_play_sound_effect_environment')}</Text>
      </View>
      <View style={styles.envList}>
        {soundEffectConvolutionOptions.map(item => {
          const profile = REVERB_PROFILES[item.source]
          return (
            <RoomDecayRow
              key={item.id}
              label={t(item.labelKey)}
              envelope={profile?.envelope ?? []}
              rt60={profile?.rt60 ?? null}
              duration={profile?.duration ?? 0}
              selected={selectedSource == item.source}
              onPress={() => { onToggleConvolution(item.source) }}
            />
          )
        })}
      </View>

      {/* 房间声学画像：选中某个脉冲响应后，显示它**实测**的衰减曲线与 RT60。
          数据由 scripts/analyze-reverb.mjs 从 .wav 离线解析
          （ISO 3382-1 Schroeder 反向积分），不是示意曲线。
          RT60 是定义一个空间混响特征的核心指标——0.5s 是卧室，
          3s 以上是大厅，差别不需要试听就看得出来。 */}
      {selectedProfile
        ? (
            <View style={styles.roomProfile}>
              <View style={styles.roomProfileHeader}>
                <Text style={styles.roomProfileTitle}>{t('setting_play_sound_effect_room_profile')}</Text>
                <View style={styles.roomReadouts}>
                  <Text style={styles.roomReadoutValue} color={theme['c-primary-font']}>
                    {selectedProfile.rt60 == null
                      ? '—'
                      : `RT60 ${selectedProfile.rt60 > selectedProfile.duration ? '≥' : ''}${selectedProfile.rt60.toFixed(2)} s`}
                  </Text>
                </View>
              </View>
              <ReverbDecay envelope={selectedProfile.envelope} duration={selectedProfile.duration} />
              <View style={styles.roomSpecs}>
                <Text size={Typography.caption} color={theme['c-font-label']}>
                  {(selectedProfile.sampleRate / 1000).toFixed(1)} kHz
                </Text>
                <Text size={Typography.caption} color={theme['c-font-label']}>
                  {selectedProfile.channels} ch
                </Text>
                <Text size={Typography.caption} color={theme['c-font-label']}>
                  {Math.round(selectedProfile.duration * 1000)} ms
                </Text>
              </View>
              {/* 必须写清楚这些数字的适用范围。
                  AppDelegate.mm 里 `refreshConvolutionEngineLockedWithAssetUri`
                  在采样率未就绪 / 资源解析失败 / IR 解析失败时会返回 NO，
                  随后 `loadFactoryPreset:` 用一个**苹果出厂预设**顶替——
                  bright-hall 会变成 .largeHall，s2_r4_bd 变成 .cathedral。
                  那是另一个房间，声学性质不同，而这里显示的仍是原 IR 的实测值。
                  原生那侧改不动（此处无 Xcode，.mm 改完无法编译验证），
                  所以至少不让 JS 侧的表述越界。 */}
              <Text style={styles.roomProfileNote} size={Typography.caption} color={theme['c-font-label']}>
                {t('setting_play_sound_effect_room_profile_note')}
              </Text>
            </View>
          )
        : null}

      <View style={{ ...styles.placeholderGroup, opacity: disabledConvolution ? 0.45 : 1 }}>
        <PlaceholderSliderRow
          label={t('setting_play_sound_effect_environment_origin_gain')}
          value={mainGain}
          minimumValue={0}
          maximumValue={50}
          step={1}
          onValueChange={value => {
            if (disabledConvolution) return
            onMainGainChange(Number(value))
          }}
          formatter={formatPercent}
        />
        <PlaceholderSliderRow
          label={t('setting_play_sound_effect_environment_effect_gain')}
          value={sendGain}
          minimumValue={0}
          maximumValue={50}
          step={1}
          onValueChange={value => {
            if (disabledConvolution) return
            onSendGainChange(Number(value))
          }}
          formatter={formatPercent}
        />
      </View>

      <View style={styles.presetList}>
        {userPresetList.map(preset => {
          const isActive = preset.id == activeUserPresetId
          return (
            <TouchableOpacity
              key={preset.id}
              activeOpacity={0.7}
              style={{
                ...styles.presetButton,
                backgroundColor: isActive ? theme['c-button-background-selected'] : theme['c-button-background'],
              }}
              onPress={() => { onUserPresetPress(preset) }}
              onLongPress={() => { onUserPresetLongPress(preset) }}>
              <Text size={13} color={isActive ? theme['c-button-font-selected'] : theme['c-button-font']}>
                {preset.name}
              </Text>
            </TouchableOpacity>
          )
        })}
        <PresetAddButton onPress={onSavePreset} disabled={disabledConvolution || saveDisabled} />
      </View>
    </View>
  )
})

const PitchSection = memo(({
  playbackRate,
  onReset,
  onValueChange,
  onShowTip,
}: {
  playbackRate: number
  onReset: () => void
  onValueChange: (value: number) => void
  onShowTip: () => void
}) => {
  const t = useI18n()
  const theme = useTheme()

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderTitle}>
          <Text style={styles.sectionTitle}>{t('setting_play_sound_effect_pitch')}</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={onShowTip} style={styles.tipButton}>
            <Icon name="help" size={14} color={theme['c-font-label']} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity activeOpacity={0.7} onPress={onReset} style={{ ...styles.resetButton, backgroundColor: theme['c-button-background'] }}>
            <Text size={12} color={theme['c-button-font']}>{t('setting_play_sound_effect_reset')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <PlaceholderSliderRow
        label=""
        value={playbackRate}
        minimumValue={minPitchPlaybackRate}
        maximumValue={maxPitchPlaybackRate}
        step={0.01}
        onValueChange={value => { onValueChange(Number(value)) }}
        formatter={formatPlaybackRate}
      />
    </View>
  )
})

const SurroundSection = memo(({
  enabled,
  speed,
  distance,
  onToggle,
  onSpeedChange,
  onDistanceChange,
}: {
  enabled: boolean
  speed: number
  distance: number
  onToggle: () => void
  onSpeedChange: (value: number) => void
  onDistanceChange: (value: number) => void
}) => {
  const t = useI18n()
  const theme = useTheme()

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('setting_play_sound_effect_surround')}</Text>
        <PlaceholderCheckbox
          checked={enabled}
          label={t('setting_play_sound_effect_surround_enable')}
          onPress={onToggle}
        />
      </View>
      <View>
        <PlaceholderSliderRow
          label={t('setting_play_sound_effect_surround_speed')}
          value={speed}
          minimumValue={1}
          maximumValue={50}
          step={1}
          onValueChange={value => { onSpeedChange(Number(value)) }}
          formatter={formatPlain}
          valueColor={speed != defaultSurroundSpeed ? theme['c-primary-font-active'] : undefined}
        />
        <PlaceholderSliderRow
          label={t('setting_play_sound_effect_surround_distance')}
          value={distance}
          minimumValue={1}
          maximumValue={30}
          step={1}
          onValueChange={value => { onDistanceChange(Number(value)) }}
          formatter={formatPlain}
          valueColor={distance != defaultSurroundDistance ? theme['c-primary-font-active'] : undefined}
        />
      </View>
    </View>
  )
})

export default memo(({ showTip = true, layoutMode = 'split' }: {
  showTip?: boolean
  layoutMode?: LayoutMode
}) => {
  const t = useI18n()
  const theme = useTheme()
  const dividerColor = theme['c-primary-alpha-500']
  const setting = useSetting()
  const savePresetModalRef = useRef<SoundEffectPresetSaveModalType>(null)
  const [previewGains, setPreviewGains] = useState<PreviewGains>(() => getEqualizerGains(setting))
  const [eqTransitionId, setEqTransitionId] = useState(0)
  const [userEqPresetList, setUserEqPresetList] = useState<LX.SoundEffect.EQPreset[]>([])
  const [userConvolutionPresetList, setUserConvolutionPresetList] = useState<LX.SoundEffect.ConvolutionPreset[]>([])
  const presetId = normalizeEqualizerPresetId(setting['player.soundEffect.preset'])
  const convolutionSource = setting['player.soundEffect.convolution.fileName']
  const convolutionMainGain = setting['player.soundEffect.convolution.mainGain']
  const convolutionSendGain = setting['player.soundEffect.convolution.sendGain']
  const pitchPlaybackRate = setting['player.soundEffect.pitchShifter.playbackRate']
  const surroundEnabled = setting['player.soundEffect.panner.enable']
  const surroundSpeed = setting['player.soundEffect.panner.speed']
  const soundDistance = setting['player.soundEffect.panner.soundR']
  const activeEqUserPresetId = useMemo(() => userEqPresetList.find(preset =>
    equalizerFrequencies.every(frequency => preset[`hz${frequency}` as keyof LX.SoundEffect.EQPreset] == previewGains[frequency]),
  )?.id ?? null, [previewGains, userEqPresetList])
  const activeConvolutionUserPresetId = useMemo(() => userConvolutionPresetList.find(preset =>
    preset.source == convolutionSource &&
    preset.mainGain == convolutionMainGain &&
    preset.sendGain == convolutionSendGain,
  )?.id ?? null, [convolutionMainGain, convolutionSendGain, convolutionSource, userConvolutionPresetList])
  const isEqPresetLimitReached = userEqPresetList.length >= maxUserPresetCount
  const isConvolutionPresetLimitReached = userConvolutionPresetList.length >= maxUserPresetCount
  const active = isSoundEffectActive(setting)
  const activePreset = equalizerPresets.find(item => item.id == presetId)
  const presetName = t(activePreset?.nameKey ?? 'setting_play_sound_effect_preset_custom')

  useEffect(() => {
    setPreviewGains(getEqualizerGains(setting))
  }, [setting])

  // 预设切换计数，供 EqCurve 判断要不要补间。
  //
  // 监听「预设身份」而不是在各个处理函数里手动 +1，原因有两个：
  // 1. 拖动滑块会持续改 previewGains，若直接以它为触发源就会一直补间，
  //    曲线会滞后于手指。预设身份只在整条曲线被替换时才变。
  // 2. 「重置」只调用 updateSetting、不直接 setPreviewGains，靠设置回流才生效。
  //    在处理函数里加计数会早于 gain 更新，动画就会补间到旧值；
  //    监听身份变化则天然发生在渲染之后，顺序是对的。
  useEffect(() => {
    setEqTransitionId(id => id + 1)
  }, [activeEqUserPresetId, presetId])

  useEffect(() => {
    let cancelled = false
    const loadPresetLists = async() => {
      const [eqList, convolutionList] = await Promise.all([
        getUserEQPresetList(),
        getUserConvolutionPresetList(),
      ])
      if (cancelled) return
      setUserEqPresetList(eqList)
      setUserConvolutionPresetList(convolutionList)
    }
    void loadPresetLists()
    return () => {
      cancelled = true
    }
  }, [])

  const handleReset = () => {
    updateSetting(createPresetSettingPatch('none'))
  }

  const handlePresetPress = (nextPresetId: Exclude<LX.SoundEffectPresetId, 'custom'>) => {
    const preset = equalizerPresets.find(item => item.id == nextPresetId)
    if (!preset) return
    const nextPreview = createEqualizerGainsRecord(preset.gains)
    setPreviewGains(nextPreview)
    updateSetting(createPresetSettingPatch(nextPresetId))
  }

  const handleValueChange = (frequency: typeof equalizerFrequencies[number], value: number) => {
    value = Math.round(value * 10) / 10
    setPreviewGains(prev => {
      const next = {
        ...prev,
        [frequency]: value,
      }
      void soundEffectController.applyCurrentEqualizerConfig(next)
      return next
    })
  }

  const handleSlidingComplete = (frequency: typeof equalizerFrequencies[number], value: number) => {
    updateSetting(createCustomBandSettingPatch(frequency, value, setting))
  }

  const handleToggleConvolution = (source: string) => {
    if (convolutionSource == source) {
      updateSetting({ 'player.soundEffect.convolution.fileName': '' })
      return
    }
    updateSetting(createConvolutionSettingPatch(source))
  }

  const handleUpdateConvolutionMainGain = (value: number) => {
    updateSetting({ 'player.soundEffect.convolution.mainGain': Math.round(value) })
  }

  const handleUpdateConvolutionSendGain = (value: number) => {
    updateSetting({ 'player.soundEffect.convolution.sendGain': Math.round(value) })
  }

  const handleResetPitch = () => {
    updateSetting({ 'player.soundEffect.pitchShifter.playbackRate': 1 })
  }

  const handleShowPitchTip = () => {
    void tipDialog({
      title: t('setting_play_sound_effect_pitch'),
      message: t('setting_play_sound_effect_pitch_tip'),
    })
  }

  const handleUpdatePitch = (value: number) => {
    updateSetting({ 'player.soundEffect.pitchShifter.playbackRate': value })
  }

  const handleShowSaveEqPreset = () => {
    if (isEqPresetLimitReached) {
      toast(t('setting_play_sound_effect_preset_limit', { num: maxUserPresetCount }))
      return
    }
    savePresetModalRef.current?.show({
      title: t('setting_play_sound_effect_save_eq_title'),
      onSave: async(name) => {
        const nextList = await saveUserEQPreset({
          name,
          hz31: previewGains[31],
          hz62: previewGains[62],
          hz125: previewGains[125],
          hz250: previewGains[250],
          hz500: previewGains[500],
          hz1000: previewGains[1000],
          hz2000: previewGains[2000],
          hz4000: previewGains[4000],
          hz8000: previewGains[8000],
          hz16000: previewGains[16000],
        })
        setUserEqPresetList(nextList)
      },
    })
  }

  const handleApplyEqPreset = (preset: LX.SoundEffect.EQPreset) => {
    const gains = [
      preset.hz31,
      preset.hz62,
      preset.hz125,
      preset.hz250,
      preset.hz500,
      preset.hz1000,
      preset.hz2000,
      preset.hz4000,
      preset.hz8000,
      preset.hz16000,
    ]
    setPreviewGains(createEqualizerGainsRecord(gains))
    updateSetting(createCustomGainsSettingPatch(gains))
  }

  const handleRemoveEqPreset = async(preset: LX.SoundEffect.EQPreset) => {
    const confirm = await confirmDialog({
      title: t('setting_play_sound_effect_remove_preset_title'),
      message: t('setting_play_sound_effect_remove_preset_message', { name: preset.name }),
    })
    if (!confirm) return
    setUserEqPresetList(await removeUserEQPreset(preset.id))
  }

  const handleShowSaveConvolutionPreset = () => {
    if (isConvolutionPresetLimitReached) {
      toast(t('setting_play_sound_effect_preset_limit', { num: maxUserPresetCount }))
      return
    }
    savePresetModalRef.current?.show({
      title: t('setting_play_sound_effect_save_env_title'),
      onSave: async(name) => {
        if (!convolutionSource) return
        const nextList = await saveUserConvolutionPreset({
          name,
          source: convolutionSource,
          mainGain: convolutionMainGain,
          sendGain: convolutionSendGain,
        })
        setUserConvolutionPresetList(nextList)
      },
    })
  }

  const handleApplyConvolutionPreset = (preset: LX.SoundEffect.ConvolutionPreset) => {
    updateSetting({
      'player.soundEffect.convolution.fileName': preset.source,
      'player.soundEffect.convolution.mainGain': preset.mainGain,
      'player.soundEffect.convolution.sendGain': preset.sendGain,
    })
  }

  const handleRemoveConvolutionPreset = async(preset: LX.SoundEffect.ConvolutionPreset) => {
    const confirm = await confirmDialog({
      title: t('setting_play_sound_effect_remove_preset_title'),
      message: t('setting_play_sound_effect_remove_preset_message', { name: preset.name }),
    })
    if (!confirm) return
    setUserConvolutionPresetList(await removeUserConvolutionPreset(preset.id))
  }

  const handleToggleSurround = () => {
    updateSetting({ 'player.soundEffect.panner.enable': !surroundEnabled })
  }

  const handleUpdateSurroundSpeed = (value: number) => {
    updateSetting({ 'player.soundEffect.panner.speed': Math.round(value) })
  }

  const handleUpdateSurroundDistance = (value: number) => {
    updateSetting({ 'player.soundEffect.panner.soundR': Math.round(value) })
  }

  if (layoutMode == 'stacked') {
    return (
      <View style={styles.container}>
        <SoundEffectOverview presetName={presetName} active={active} />
        <View style={{ ...styles.sectionBlock, ...styles.sectionCard, backgroundColor: theme['c-content-background'], borderColor: theme['c-border-background'] }}>
          <EnvironmentSection
            selectedSource={convolutionSource}
            mainGain={convolutionMainGain}
            sendGain={convolutionSendGain}
            userPresetList={userConvolutionPresetList}
            activeUserPresetId={activeConvolutionUserPresetId}
            onToggleConvolution={handleToggleConvolution}
            onMainGainChange={handleUpdateConvolutionMainGain}
            onSendGainChange={handleUpdateConvolutionSendGain}
            onSavePreset={handleShowSaveConvolutionPreset}
            saveDisabled={isConvolutionPresetLimitReached}
            onUserPresetPress={handleApplyConvolutionPreset}
            onUserPresetLongPress={preset => { void handleRemoveConvolutionPreset(preset) }}
          />
        </View>
        <View style={{ ...styles.sectionBlock, ...styles.sectionCard, ...styles.sectionBlockWithDivider, backgroundColor: theme['c-content-background'], borderColor: theme['c-border-background'], borderTopColor: dividerColor }}>
    <EqualizerSection
    presetId={presetId}
    transitionId={eqTransitionId}
    previewGains={previewGains}
            userPresetList={userEqPresetList}
            activeUserPresetId={activeEqUserPresetId}
            onReset={handleReset}
            onPresetPress={handlePresetPress}
            onSavePreset={handleShowSaveEqPreset}
            saveDisabled={isEqPresetLimitReached}
            onUserPresetPress={handleApplyEqPreset}
            onUserPresetLongPress={preset => { void handleRemoveEqPreset(preset) }}
            onValueChange={handleValueChange}
            onSlidingComplete={handleSlidingComplete}
            layoutMode={layoutMode}
          />
        </View>
        <View style={{ ...styles.sectionBlock, ...styles.sectionCard, ...styles.sectionBlockWithDivider, backgroundColor: theme['c-content-background'], borderColor: theme['c-border-background'], borderTopColor: dividerColor }}>
          <PitchSection
            playbackRate={pitchPlaybackRate}
            onReset={handleResetPitch}
            onValueChange={handleUpdatePitch}
            onShowTip={handleShowPitchTip}
          />
        </View>
        <View style={{ ...styles.sectionBlock, ...styles.sectionCard, ...styles.sectionBlockWithDivider, backgroundColor: theme['c-content-background'], borderColor: theme['c-border-background'], borderTopColor: dividerColor }}>
          <SurroundSection
            enabled={surroundEnabled}
            speed={surroundSpeed}
            distance={soundDistance}
            onToggle={handleToggleSurround}
            onSpeedChange={handleUpdateSurroundSpeed}
            onDistanceChange={handleUpdateSurroundDistance}
          />
        </View>
        {showTip ? (
          <View style={styles.tip}>
            <Text size={12} color={theme['c-font-label']}>{t('setting_play_sound_effect_tip')}</Text>
          </View>
        ) : null}
        <SoundEffectPresetSaveModal ref={savePresetModalRef} />
      </View>
    )
  }

  /**
   * 不支持时必须直说，不能照常渲染。
   *
   * 依据：`isSoundEffectSupported = Platform.OS == 'ios' && 原生模块存在`，
   * 不满足时 `updateNativeSoundEffectConfig` 会**静默 return**。
   * 也就是说在 Android 上，这个面板原本会完整画出 EQ 曲线、13 条房间衰减曲线、
   * RT60 读数和全部滑块——而它们一个都不作用于声音。
   *
   * 那正是「装饰冒充信息」：界面看上去在报告真实的频响与房间声学，
   * 实际只是回显一组没生效的设置。仪器要么接在信号链上，要么就不该出现。
   *
   * 放在所有 Hook 之后，早返回会违反 Hook 规则。
   */
  if (!soundEffectController.isSupported) {
    return (
      <View style={styles.unsupported}>
        <Icon name="info" size={20} color={theme['c-font-label']} />
        <Text style={styles.unsupportedText} size={13} color={theme['c-font-label']}>
          {t('sound_effect_unsupported')}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <SoundEffectOverview presetName={presetName} active={active} />
      <View style={styles.layout}>
        <View style={styles.leftColumn}>
          <View style={{ ...styles.sectionBlock, ...styles.sectionCard, backgroundColor: theme['c-content-background'], borderColor: theme['c-border-background'] }}>
            <EnvironmentSection
              selectedSource={convolutionSource}
              mainGain={convolutionMainGain}
              sendGain={convolutionSendGain}
              userPresetList={userConvolutionPresetList}
              activeUserPresetId={activeConvolutionUserPresetId}
              onToggleConvolution={handleToggleConvolution}
              onMainGainChange={handleUpdateConvolutionMainGain}
              onSendGainChange={handleUpdateConvolutionSendGain}
              onSavePreset={handleShowSaveConvolutionPreset}
              saveDisabled={isConvolutionPresetLimitReached}
              onUserPresetPress={handleApplyConvolutionPreset}
              onUserPresetLongPress={preset => { void handleRemoveConvolutionPreset(preset) }}
            />
          </View>
          <View style={{ ...styles.sectionBlock, ...styles.sectionCard, ...styles.sectionBlockWithDivider, backgroundColor: theme['c-content-background'], borderColor: theme['c-border-background'], borderTopColor: dividerColor }}>
            <PitchSection
              playbackRate={pitchPlaybackRate}
              onReset={handleResetPitch}
              onValueChange={handleUpdatePitch}
              onShowTip={handleShowPitchTip}
            />
          </View>
          <View style={{ ...styles.sectionBlock, ...styles.sectionCard, ...styles.sectionBlockWithDivider, backgroundColor: theme['c-content-background'], borderColor: theme['c-border-background'], borderTopColor: dividerColor }}>
            <SurroundSection
              enabled={surroundEnabled}
              speed={surroundSpeed}
              distance={soundDistance}
              onToggle={handleToggleSurround}
              onSpeedChange={handleUpdateSurroundSpeed}
              onDistanceChange={handleUpdateSurroundDistance}
            />
          </View>
          {showTip ? (
            <View style={styles.tip}>
              <Text size={12} color={theme['c-font-label']}>{t('setting_play_sound_effect_tip')}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ ...styles.columnDivider, borderRightColor: dividerColor }} />

        <View style={styles.rightColumn}>
          <View style={{ ...styles.sectionBlock, ...styles.sectionCard, backgroundColor: theme['c-content-background'], borderColor: theme['c-border-background'] }}>
            <EqualizerSection
              presetId={presetId}
              transitionId={eqTransitionId}
              previewGains={previewGains}
              userPresetList={userEqPresetList}
              activeUserPresetId={activeEqUserPresetId}
              onReset={handleReset}
              onPresetPress={handlePresetPress}
              onSavePreset={handleShowSaveEqPreset}
              saveDisabled={isEqPresetLimitReached}
              onUserPresetPress={handleApplyEqPreset}
              onUserPresetLongPress={preset => { void handleRemoveEqPreset(preset) }}
              onValueChange={handleValueChange}
              onSlidingComplete={handleSlidingComplete}
              layoutMode={layoutMode}
            />
          </View>
        </View>
      </View>
      <SoundEffectPresetSaveModal ref={savePresetModalRef} />
    </View>
  )
})

const styles = createStyle({
  // 不支持时的诚实说明：不用"禁用"灰掉整块面板，
  // 而是直接讲清楚为什么没有这些控件
  unsupported: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  unsupportedText: {
    flex: 1,
    lineHeight: 19,
  },
  container: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  overview: { minHeight: 68, borderRadius: Radius.card, borderWidth: 1, paddingHorizontal: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  overviewCopy: { flex: 1, minWidth: 0, gap: 4 },
  overviewTitle: { fontWeight: '600' },
  overviewStatus: { maxWidth: '48%', borderRadius: Radius.control, paddingHorizontal: 10, paddingVertical: 7 },
  layout: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  leftColumn: {
    flex: 1,
    minWidth: 0,
  },
  rightColumn: {
    flex: 1,
    minWidth: 0,
  },
  columnDivider: {
    width: 0,
  },
  sectionBlock: {
    minWidth: 0,
    borderRadius: Radius.card,
    padding: 12,
  },
  sectionCard: { borderWidth: 1 },
  sectionBlockWithDivider: {
    borderTopWidth: 1,
    borderStyle: 'solid',
    paddingTop: 12,
    marginTop: 10,
  },
  section: {
    paddingBottom: 2,
  },
  sectionTitle: {
    fontWeight: '600',
    textAlignVertical: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  sectionHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  tipButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  envList: {
    // 纵向列表：每一行要放得下「名字 + 衰减曲线 + RT60」，
    // 横向换行排不下
    flexDirection: 'column',
    gap: 2,
    marginBottom: 8,
  },
  // 房间画像与上方选项列表、下方增益滑块之间的间距走 Gap.section，
  // 与 layout.ts 的间距体系保持一致
  roomProfile: {
    marginBottom: 16,
  },
  roomProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomProfileTitle: {
    fontWeight: '600',
  },
  roomReadouts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomReadoutValue: {
    // 型号读数用等宽数字，切换房间时数值不左右跳动
    fontVariant: ['tabular-nums'],
  },
  roomSpecs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    marginLeft: 26,
  },
  roomProfileNote: {
    marginTop: 6,
    lineHeight: 16,
  },
  placeholderCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 34,
    paddingHorizontal: 9,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: Radius.control,
    gap: 5,
  },
  placeholderGroup: {
    gap: 8,
  },
  placeholderSliderItem: {
    gap: 5,
  },
  placeholderSliderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  placeholderValue: {
    width: 48,
    textAlign: 'right',
    textAlignVertical: 'center',
  },
  tip: {
    marginTop: 10,
  },
  equalizerGrid: {
    marginBottom: 10,
  },
  // 曲线与下方滑块之间用 section 级的间距，和 layout.ts 的 Gap 体系一致
  eqCurveWrap: {
    marginBottom: 14,
  },
  equalizerRow: {
    flexDirection: 'row',
  },
  equalizerItem: {
    flex: 1,
    marginBottom: 8,
  },
  equalizerSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  equalizerLabel: {
    width: 30,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  equalizerValue: {
    width: 46,
    textAlign: 'right',
    textAlignVertical: 'center',
  },
  stackedEqualizerList: {
    marginBottom: 10,
  },
  stackedEqualizerItem: {
    marginBottom: 6,
  },
  presetList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  presetButton: {
    minHeight: 34,
    paddingHorizontal: 11,
    borderRadius: Radius.control,
    marginRight: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetAddButton: {
    minWidth: 34,
    minHeight: 34,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetAddText: {
    lineHeight: 15,
    fontWeight: '600',
  },
  sliderWrap: {
    flex: 1,
    minWidth: 0,
  },
})

/**
 * 离线分析卷积混响 IR，产出 src/plugins/player/soundEffect/reverbProfile.ts
 *
 * 为什么必须离线：这些 .wav 一共约 6MB，不能让设备在运行时解析。
 * 真正需要显示的只有每条 IR 的「衰减包络」和 RT60——几百个数字，编译进包即可。
 *
 * RT60 用 ISO 3382-1 的 Schroeder 反向积分法，不是估算：
 *   1. 每样点能量 e[n] = 各声道平方和
 *   2. 反向累积并转 dB，得到混响衰减曲线
 *   3. 取下降 5 dB 与 25 dB 的两个时刻，线性外推到 60 dB
 *
 * 用法: node scripts/analyze-reverb.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FILTER_DIR = resolve(ROOT, 'src/resources/medias/filters')
const OUT = resolve(ROOT, 'src/plugins/player/soundEffect/reverbProfile.ts')

/** 包络采样点数。48 点在手机上足够画出衰减形状，又不至于把包撑大 */
const ENVELOPE_POINTS = 48
/** 参与 RT60 测量的最长时长（秒）。超过 3s 的尾巴对听感影响已很小 */
const RT60_WINDOW = 3
/** 包络下限（dB）。人耳在此以下基本听不见，再画只是噪声 */
const ENVELOPE_FLOOR = -60

const parseWav = (buf) => {
  if (buf.toString('ascii', 0, 4) !== 'RIFF') throw new Error('不是 RIFF 文件')
  if (buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('不是 WAVE 文件')

  let offset = 12
  let fmt = null
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4)
    const size = buf.readUInt32LE(offset + 4)
    const body = offset + 8
    if (id === 'fmt ') {
      fmt = {
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bitsPerSample: buf.readUInt16LE(body + 14),
      }
    } else if (id === 'data') {
      if (!fmt) throw new Error('data 块出现在 fmt 之前')
      return { ...fmt, dataOffset: body, dataSize: size }
    }
    // WAV 的块按 2 字节对齐
    offset = body + size + (size % 2)
  }
  throw new Error('没有找到 data 块')
}

/** 某帧所有声道的平方和（能量） */
const frameEnergy = (buf, wav, frame) => {
  const { channels, bitsPerSample, dataOffset } = wav
  const bytes = bitsPerSample / 8
  let sum = 0
  for (let c = 0; c < channels; c++) {
    const p = dataOffset + (frame * channels + c) * bytes
    const s = buf.readInt16LE(p) / 32768
    sum += s * s
  }
  return sum
}

const analyze = (buf) => {
  const wav = parseWav(buf)
  if (wav.bitsPerSample !== 16) {
    throw new Error(`暂只支持 16bit，实为 ${wav.bitsPerSample}`)
  }

  const { channels, sampleRate, dataOffset, dataSize } = wav
  const bytesPerFrame = (wav.bitsPerSample / 8) * channels
  const frameCount = Math.floor(dataSize / bytesPerFrame)
  const duration = frameCount / sampleRate

  // ---- RT60：Schroeder 反向积分 ----
  const windowFrames = Math.min(frameCount, Math.floor(RT60_WINDOW * sampleRate))
  const decayDb = new Float64Array(windowFrames)
  let acc = 0
  for (let i = windowFrames - 1; i >= 0; i--) {
    acc += frameEnergy(buf, wav, i)
    decayDb[i] = 10 * Math.log10(acc + 1e-20)
  }
  const peakDb = decayDb[0]
  const timeAtDrop = (dropDb) => {
    const target = peakDb - dropDb
    for (let i = 0; i < windowFrames; i++) {
      if (decayDb[i] <= target) return i / sampleRate
    }
    return null
  }
  const t5 = timeAtDrop(5)
  const t25 = timeAtDrop(25)
  const rt60 = t5 != null && t25 != null && t25 > t5 ? (t25 - t5) * 3 : null

  // ---- 显示用衰减包络：Schroeder 衰减曲线，等时间取点 ----
  //
  // 用 Schroeder 曲线而不是「每桶平均能量」：后者会把短瞬态平均掉
  // （1s 分 48 桶 = 每桶 20.8ms，一个 1ms 的直接声被平均掉约 26dB，
  // 读起来像是从 -31dB 起步）。Schroeder 曲线是累积量，构造上必然
  // 从 0dB 起步且单调下降，而且它正是声学里画混响衰减的标准图——
  // RT60 的 T5/T25 取点也就在这条曲线上，显示与测量用的是同一份数据。
  //
  // 等时间取点：那样尾部长度在图上直接可见，也就是 RT60 的直观含义。
  const fullDecay = new Float64Array(frameCount)
  let fullAcc = 0
  for (let i = frameCount - 1; i >= 0; i--) {
    fullAcc += frameEnergy(buf, wav, i)
    fullDecay[i] = 10 * Math.log10(fullAcc + 1e-20)
  }
  const fullPeak = fullDecay[0]
  const bucketFrames = Math.max(1, Math.floor(frameCount / ENVELOPE_POINTS))
  const envelope = []
  for (let b = 0; b < ENVELOPE_POINTS; b++) {
    const at = Math.min(b * bucketFrames, frameCount - 1)
    const db = fullDecay[at] - fullPeak
    envelope.push(Math.round(Math.max(ENVELOPE_FLOOR, db) * 10) / 10)
  }

  return {
    sampleRate,
    channels,
    duration: Math.round(duration * 1000) / 1000,
    rt60: rt60 == null ? null : Math.round(rt60 * 100) / 100,
    envelope,
  }
}

const FILES = [
  'filter-telephone.wav',
  's2_r4_bd.wav',
  'bright-hall.wav',
  'cinema-diningroom.wav',
  'dining-living-true-stereo.wav',
  'living-bedroom-leveled.wav',
  'spreader50-65ms.wav',
  's3_r1_bd.wav',
  'matrix-reverb1.wav',
  'matrix-reverb2.wav',
  'cardiod-35-10-spread.wav',
  'tim-omni-35-10-magnetic.wav',
  'feedback-spring.wav',
]

const profiles = {}
for (const name of FILES) {
  try {
    profiles[name] = analyze(readFileSync(resolve(FILTER_DIR, name)))
  } catch (error) {
    console.error(`  ! ${name}: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// 三方一致性检查
//
// filters/ 目录里的 .wav、assets.ts 注册的资源、音效选项里引用的 source，
// 必须是同一批。少任何一环都会出问题：
//   - 文件在目录但没注册 → App 加载不到，原生静默回退到出厂预设，
//     而这里仍然会给它算出 RT60 并显示在面板上
//   - 注册了但文件不在 → 同上，而且分析脚本会直接读不到文件
//   - 注册了但没有选项 → 永远不会用到，属于死数据
// 这三张表目前是一致的，但那是巧合，不是保证——所以在这里钉死。
// ---------------------------------------------------------------------------
const consistencyProblems = []

const readRegistered = (file, pattern) => {
  const src = readFileSync(resolve(ROOT, file), 'utf8')
  const found = new Set()
  const re = new RegExp(pattern, 'g')
  let m
  while ((m = re.exec(src)) !== null) found.add(m[1])
  return found
}

const onDisk = new Set(FILES)
const registered = readRegistered(
  'src/plugins/player/soundEffect/assets.ts',
  "'([\\w.-]+\\.wav)'",
)
const referenced = readRegistered(
  'src/plugins/player/soundEffect/constants.ts',
  "source: '([\\w.-]+\\.wav)'",
)

for (const name of onDisk) {
  if (!registered.has(name)) {
    consistencyProblems.push(`${name} 在 filters/ 里但未在 assets.ts 注册`)
  }
  if (!referenced.has(name)) {
    consistencyProblems.push(`${name} 未被任何音效选项引用`)
  }
}
for (const name of registered) {
  if (!onDisk.has(name)) consistencyProblems.push(`${name} 已注册但文件不存在`)
  if (!referenced.has(name)) consistencyProblems.push(`${name} 已注册但没有选项引用`)
}
for (const name of referenced) {
  if (!registered.has(name)) consistencyProblems.push(`${name} 被选项引用但未注册`)
}

if (consistencyProblems.length) {
  console.error('三方一致性检查未通过：')
  for (const problem of consistencyProblems) console.error(`  ! ${problem}`)
  console.error('这些 IR 若无法被 App 加载，原生会静默回退到系统预设，')
  console.error('而面板仍会显示这里算出的 RT60。已中止生成。')
  process.exit(1)
}
console.log(
  `三方一致性通过：${onDisk.size} 个 wav 在目录、注册表与音效选项中完全一致`,
)

const lines = [
  '/**',
  ' * 本文件由 scripts/analyze-reverb.mjs 生成，请勿手改。',
  ' *',
  ' * 卷积混响 IR 的声学画像：时长、RT60、衰减包络。',
  ' * RT60 用 ISO 3382-1 的 Schroeder 反向积分法测得，不是估算值。',
  ' *',
  ` * envelope 是相对峰值的 dB，截到 ${ENVELOPE_FLOOR}（人耳在此以下基本听不见，`,
  ' * 再画下去只是噪声）。等时间分桶，所以尾部长度在图上直接可见——',
  ' * 那正是 RT60 的直观含义。',
  ' */',
  'export interface ReverbProfile {',
  '  /** 采样率（Hz） */',
  '  sampleRate: number',
  '  /** 声道数 */',
  '  channels: number',
  '  /** 脉冲响应总时长（秒） */',
  '  duration: number',
  '  /** 混响衰减时间（秒）：60dB 衰减所需时间。测不出时为 null */',
  '  rt60: number | null',
  '  /** 衰减包络（dB，相对峰值，等时间分桶） */',
  '  envelope: number[]',
  '}',
  '',
  'export const REVERB_PROFILES: Readonly<Record<string, ReverbProfile>> = {',
]
for (const [name, p] of Object.entries(profiles)) {
  lines.push(`  '${name}': {`)
  lines.push(`    sampleRate: ${p.sampleRate},`)
  lines.push(`    channels: ${p.channels},`)
  lines.push(`    duration: ${p.duration},`)
  lines.push(`    rt60: ${p.rt60},`)
  lines.push(`    envelope: [${p.envelope.join(', ')}],`)
  lines.push('  },')
}
lines.push('} as const', '')

writeFileSync(OUT, lines.join('\n'), 'utf8')

console.log(`已分析 ${Object.keys(profiles).length} 个 IR`)
console.log(`输出: ${OUT.replace(ROOT + '\\', '')}`)
for (const [name, p] of Object.entries(profiles)) {
  const rt = p.rt60 == null ? '—' : `${p.rt60.toFixed(2)}s`
  console.log(
    `  ${name.padEnd(32)} ${String(p.duration).padStart(6)}s  ` +
    `${p.sampleRate}Hz/${p.channels}ch  RT60 ${rt.padStart(7)}`,
  )
}

/**
 * 图表几何核验：直接 import 发货的那份实现（src/utils/curves.ts），
 * 不另写一份复现。
 *
 * 为什么坚持这一点：本项目在对比度脚本上栽过一次——Python 的 round() 是银行家舍入、
 * JS 的 Math.round() 是四舍五入，两份实现让色阶差了 1 而没人发现。
 * 图表几何如果也用「Python 验一遍、TS 发一版」，等于把同一个坑再挖一次。
 *
 * 运行：npm run check:curves
 *   （需要 Node 22+ / 24+ 的类型剥离；本脚本用 --experimental-strip-types 启动）
 */

import { pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { buildEqGeometry, buildDecayBars, downsampleEnvelope } =
  await import(pathToFileURL(resolve(ROOT, 'src/utils/curves.ts')).href)

const FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
const MIN = -15
const MAX = 15
const HEIGHT = 88
const WIDTH = 300

let failures = 0
const check = (label, actual, expected, tolerance = 0.01) => {
  const ok = Math.abs(actual - expected) <= tolerance
  if (!ok) failures++
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(42)} ${actual.toFixed(3)}  (期望 ${expected.toFixed(3)})`)
}
const assert = (label, condition, detail = '') => {
  if (!condition) failures++
  console.log(`  ${condition ? 'ok  ' : 'FAIL'} ${label}${detail ? `  ${detail}` : ''}`)
}

const flat = Object.fromEntries(FREQUENCIES.map(f => [f, 0]))

console.log('=== 对数频率轴：等距是精确的 ===')
const flatGeo = buildEqGeometry({
  gains: flat, frequencies: FREQUENCIES, min: MIN, max: MAX, width: WIDTH, height: HEIGHT,
})
const steps = flatGeo.points.slice(1).map((p, i) => p.x - flatGeo.points[i].x)
const stepSpread = Math.max(...steps) - Math.min(...steps)
assert('10 段 x 步长完全一致', stepSpread < 1e-9, `步长 ${steps[0].toFixed(3)}px`)
assert('端点圆点完整可见（左右各留 4px）',
  flatGeo.points[0].x >= 3.5 && WIDTH - flatGeo.points.at(-1).x >= 3.5,
  `首点 ${flatGeo.points[0].x} / 末点 ${flatGeo.points.at(-1).x}`)

console.log('\n=== 纵轴：0dB 居中，上下界贴边 ===')
check('全 0dB 时 y', flatGeo.points[0].y, HEIGHT / 2)
const atMax = buildEqGeometry({
  gains: Object.fromEntries(FREQUENCIES.map(f => [f, MAX])),
  frequencies: FREQUENCIES, min: MIN, max: MAX, width: WIDTH, height: HEIGHT,
})
const atMin = buildEqGeometry({
  gains: Object.fromEntries(FREQUENCIES.map(f => [f, MIN])),
  frequencies: FREQUENCIES, min: MIN, max: MAX, width: WIDTH, height: HEIGHT,
})
check('+15dB 时 y（应贴顶）', atMax.points[0].y, 0)
check('-15dB 时 y（应贴底）', atMin.points[0].y, HEIGHT)
check('0dB 基线位置', flatGeo.zeroY, HEIGHT / 2)

console.log('\n=== 网格线：排除 0 与上下界 ===')
assert('网格数量为 4（±5 / ±10）', flatGeo.gridYs.length === 4, `实际 ${flatGeo.gridYs.length}`)
assert('全部严格落在 (0, 图高) 内', flatGeo.gridYs.every(y => y > 0 && y < HEIGHT))
assert('不与基线重合', flatGeo.gridYs.every(y => Math.abs(y - flatGeo.zeroY) > 1))

console.log('\n=== 极端输入不越界 ===')
const extremes = [
  ['全 +15', MAX], ['全 -15', MIN], ['交替', null],
]
for (const [name, value] of extremes) {
  const gains = Object.fromEntries(FREQUENCIES.map((f, i) => [
    f, value ?? (i % 2 === 0 ? MAX : MIN),
  ]))
  const geo = buildEqGeometry({
    gains, frequencies: FREQUENCIES, min: MIN, max: MAX, width: WIDTH, height: HEIGHT,
  })
  assert(`${name} 不越界`,
    geo.points.every(p => p.y >= 0 && p.y <= HEIGHT && p.x >= 0 && p.x <= WIDTH))
}

console.log('\n=== 旋转绕左端点：长度与角度 ===')
const tilted = buildEqGeometry({
  gains: Object.fromEntries(FREQUENCIES.map((f, i) => [f, i === 9 ? 15 : 0])),
  frequencies: FREQUENCIES, min: MIN, max: MAX, width: WIDTH, height: HEIGHT,
})
const last = tilted.segments.at(-1)
const p = tilted.points[8]
const q = tilted.points[9]
const expectedLength = Math.hypot(q.x - p.x, q.y - p.y)
check('末段长度', last.style.width, expectedLength)
assert('末段 translateX 一正一负且绝对值相等',
  last.style.transform[0].translateX === -last.style.transform[2].translateX,
  `±${(last.style.transform[0].translateX).toFixed(3)}px`)

console.log('\n=== 退化输入 ===')
const empty = buildEqGeometry({
  gains: {}, frequencies: [], min: MIN, max: MAX, width: WIDTH, height: HEIGHT,
})
assert('频点为空时不产生几何', empty.points.length === 0 && empty.segments.length === 0)
const zeroWidth = buildEqGeometry({
  gains: flat, frequencies: FREQUENCIES, min: MIN, max: MAX, width: 0, height: HEIGHT,
})
assert('宽度为 0 时不产生几何（首帧布局未完成）', zeroWidth.points.length === 0)

console.log('\n=== 混响衰减柱 ===')
const env = [0, -5, -12, -24, -40, -60]
const bars = buildDecayBars(env, 300, 72, -60)
check('柱数 = 采样点数', bars.length, env.length)
check('首柱 top（0dB 在顶）', bars[0].top, 0)
check('末柱 top（-60dB 在底）', bars.at(-1).top, 72)
assert('每根柱子都落在图内', bars.every(b => b.top >= 0 && b.top <= 72))
assert('首柱从左边缘起', Math.abs(bars[0].left) < 1e-9)
assert('末柱右边缘抵达绘图区右边缘',
  Math.abs(bars.at(-1).left + bars.at(-1).width - 300) < 1e-6)
const evenGaps = bars.slice(1).map((b, i) => b.left - (bars[i].left + bars[i].width))
assert('相邻柱无缝隙也无重叠',
  evenGaps.every(g => g >= -0.6 && g <= 0.6), `最大间隙 ${Math.max(...evenGaps).toFixed(3)}px`)

console.log('\n=== 包络降采样（最近邻，不做平均）===')
const long = Array.from({ length: 48 }, (_, i) => -(i * 1.3))
const small = downsampleEnvelope(long, 16)
check('输出列数', small.length, 16)
check('首列取首点', small[0], long[0])
// long 末点是 -61.1，低于 floor=-60，会被钳位——这是有意的：
// 人耳在 -60dB 以下基本听不见，再画只是噪声。
check('末列被钳到下限', small.at(-1), -60)
assert('钳位后仍不低于下限', small.every(v => v >= -60))

// 用一条不触底的包络，单独验证「最近邻」本身
const shallow = Array.from({ length: 48 }, (_, i) => -(i * 0.5))
const shallowSmall = downsampleEnvelope(shallow, 16)
assert('不触底时末列取到末点',
  Math.abs(shallowSmall.at(-1) - shallow.at(-1)) < 1e-9)
assert('最近邻取值严格来自原包络，不会插值出中间值',
  shallowSmall.every((v, i) =>
    shallow.includes(v) && v === shallow[Math.round((i / 15) * 47)]))
assert('列数多于采样点时不越界', downsampleEnvelope([0, -10], 16).length === 16)
assert('空包络返回空数组', downsampleEnvelope([], 16).length === 0)
assert('单列时取首点', downsampleEnvelope([0, -10, -20], 1)[0] === 0)

console.log(`\n合计 ${failures} 项失败`)
process.exit(failures ? 1 : 0)

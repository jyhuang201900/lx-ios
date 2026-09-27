/**
 * 生成毛玻璃视觉所需的位图资源（零依赖，仅用 Node 内置 zlib）。
 *
 * 背景知识：React Native 没有 backdrop-filter，也没有线性/径向渐变组件。
 * 于是用「径向渐变的透明 PNG + Image tintColor」来伪造柔光光斑，
 * 用「半透明噪点 PNG + resizeMode=repeat」来伪造磨砂玻璃的细微颗粒。
 *
 * 运行： node scripts/gen-glass-assets.js
 * 输出： src/resources/images/glass-glow.png / glass-noise.png
 */
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const crcTable = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

const crc32 = (buf) => {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

/** 把 RGBA 像素数组编码成 PNG Buffer */
const encodePng = (width, height, pixels) => {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filter: none
    pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** 白色径向柔光：中心不透明，向边缘三次方衰减 */
const buildGlow = (size) => {
  const pixels = Buffer.alloc(size * size * 4)
  const c = (size - 1) / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - c) / c
      const dy = (y - c) / c
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy))
      const alpha = Math.round(Math.pow(1 - d, 3) * 255)
      const i = (y * size + x) * 4
      pixels[i] = 255
      pixels[i + 1] = 255
      pixels[i + 2] = 255
      pixels[i + 3] = alpha
    }
  }
  return encodePng(size, size, pixels)
}

/** 磨砂颗粒：白/黑噪点混合，整体 alpha 很低，平铺后形成细微霜感 */
const buildNoise = (size) => {
  const pixels = Buffer.alloc(size * size * 4)
  let seed = 20260928
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  for (let i = 0; i < size * size; i++) {
    const v = Math.round(rand() * 255)
    const o = i * 4
    pixels[o] = v
    pixels[o + 1] = v
    pixels[o + 2] = v
    pixels[o + 3] = 26
  }
  return encodePng(size, size, pixels)
}

const outDir = path.join(__dirname, '..', 'src', 'resources', 'images')
fs.writeFileSync(path.join(outDir, 'glass-glow.png'), buildGlow(96))
fs.writeFileSync(path.join(outDir, 'glass-noise.png'), buildNoise(48))
console.log('glass assets written to', outDir)

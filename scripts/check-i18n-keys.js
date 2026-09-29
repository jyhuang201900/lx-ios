const fs = require('fs')
const path = require('path')

const languageDir = path.resolve(__dirname, '../src/lang')
const locales = fs.readdirSync(languageDir)
  .filter(file => file.endsWith('.json'))
  .map(file => path.basename(file, '.json'))
  .sort()

const readKeys = locale => {
  const filePath = path.join(languageDir, `${locale}.json`)
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  return new Set(Object.keys(content))
}

if (locales.length < 2) {
  console.error('[i18n] expected at least two locale files')
  process.exit(1)
}

const baseLocale = locales.includes('zh-cn') ? 'zh-cn' : locales[0]
const baseKeys = readKeys(baseLocale)
let hasError = false

for (const locale of locales) {
  if (locale == baseLocale) continue
  const keys = readKeys(locale)
  const missing = [...baseKeys].filter(key => !keys.has(key))
  const extra = [...keys].filter(key => !baseKeys.has(key))

  if (missing.length || extra.length) {
    hasError = true
    console.error(`[i18n] ${locale} is inconsistent`)
    if (missing.length) console.error(`  missing: ${missing.join(', ')}`)
    if (extra.length) console.error(`  extra: ${extra.join(', ')}`)
  }
}

if (hasError) process.exit(1)

/**
 * 校验「代码里引用的 key 确实存在」。
 *
 * 上面那圈只比较各语言之间是否一致，查不出另一类问题：
 * 代码里写了 t('foo')，但三个语言包里从没有过 foo。
 * 而 i18n.ts 的 getMessage 对缺失 key 曾经静默返回空串——
 * 于是这类漏网之鱼在界面上就是一个来路不明的空白控件。
 * 真机上就出现过：歌单页顶栏的音源选择器是个空白色块。
 *
 * 只扫静态字符串字面量。含 ${} 的模板串（音源名之类按运行期值拼出来的）
 * 无法静态判断，跳过——宁可漏报也不误报，否则这个检查会被直接忽略。
 */
const srcDir = path.resolve(__dirname, '../src')
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name)
  if (entry.isDirectory()) return walk(full)
  return /\.(ts|tsx|js|jsx)$/.test(entry.name) ? [full] : []
})

const referenced = new Map()
for (const file of walk(srcDir)) {
  if (file.includes(`${path.sep}lang${path.sep}`)) continue
  // 先剥注释：注释掉的代码不构成引用，扫到它们全是误报。
  // 检查一旦有误报就会被直接忽略，那还不如不做。
  const stripped = fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, m2 => '\n'.repeat(m2.split('\n').length - 1))
    .replace(/\/\/[^\n]*/g, '')
  const lines = stripped.split('\n')
  lines.forEach((line, index) => {
    const re = /\b(?:i18n\.)?(?:t|getMessage)\(\s*'([^'$`]+)'/g
    let m
    while ((m = re.exec(line)) !== null) {
      const key = m[1]
      if (!referenced.has(key)) referenced.set(key, [])
      referenced.get(key).push(`${path.relative(srcDir, file)}:${index + 1}`)
    }
  })
}

const undefinedKeys = [...referenced.keys()].filter(key => !baseKeys.has(key))
if (undefinedKeys.length) {
  hasError = true
  console.error('[i18n] 以下 key 被代码引用但语言包中未定义:')
  for (const key of undefinedKeys) {
    console.error(`  ${key}  ← ${referenced.get(key).join(', ')}`)
  }
} else {
  console.log(`[i18n] 代码引用的 ${referenced.size} 个 key 均已定义`)
}

if (hasError) process.exit(1)

console.log(`[i18n] keys OK: ${locales.length} locales, ${baseKeys.size} keys`)

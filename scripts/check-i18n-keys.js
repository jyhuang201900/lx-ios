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

console.log(`[i18n] keys OK: ${locales.length} locales, ${baseKeys.size} keys`)

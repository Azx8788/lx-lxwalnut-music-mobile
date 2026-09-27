/**
 * 生成内置音源数据文件
 *
 * 用法: node scripts/generate-builtin-user-api.js <音源脚本目录> [输出目录]
 *
 * 读取目录下的所有 .js 音源脚本，生成 src/resources/userApiSources/ 下的数据文件：
 *  - script-NN.ts: 每个脚本一个文件（字符串字面量）
 *  - index.ts: 汇总导出（含内置版本号）
 *
 * 内置版本号由全部脚本内容计算得出，脚本集变化时版本号自动变化，
 * 应用端据此判断是否需要对内置音源做同步（补充/更新）。
 */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const srcDir = process.argv[2]
if (!srcDir) {
  console.error('usage: node scripts/generate-builtin-user-api.js <dir-of-js-scripts> [outDir]')
  process.exit(1)
}
const outDir = process.argv[3] || path.join(__dirname, '../src/resources/userApiSources')

const files = fs
  .readdirSync(srcDir)
  .filter((f) => f.endsWith('.js') && fs.statSync(path.join(srcDir, f)).isFile())
  .sort()

if (!files.length) {
  console.error('no .js scripts found in', srcDir)
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })

// 清理旧的生成文件
for (const f of fs.readdirSync(outDir)) {
  if (/^script-\d+\.ts$/.test(f) || f === 'index.ts') {
    fs.unlinkSync(path.join(outDir, f))
  }
}

const hash = crypto.createHash('md5')
const entries = []

files.forEach((file, i) => {
  const content = fs.readFileSync(path.join(srcDir, file), 'utf8')
  const id = 'user_api_builtin_' + crypto.createHash('md5').update(file, 'utf8').digest('hex').slice(0, 8)
  const idx = String(i + 1).padStart(2, '0')
  // JSON.stringify 生成合法的 JS 字符串字面量；\u2028/\u2029 需转义以兼容旧解析器
  const literal = JSON.stringify(content).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
  fs.writeFileSync(
    path.join(outDir, `script-${idx}.ts`),
    `// 自动生成，请勿手动编辑。源文件：${file}\nexport default ${literal}\n`,
    'utf8'
  )
  hash.update(file, 'utf8').update('\u0000', 'utf8').update(content, 'utf8').update('\u0000', 'utf8')
  entries.push({ id, fileName: file, varName: `script${idx}` })
})

const version = hash.digest('hex').slice(0, 12)

let index = `// 自动生成，请勿手动编辑（由 scripts/generate-builtin-user-api.js 生成）\n`
index += `// 内置音源版本号：脚本集变化时自动变化，应用端据此同步内置音源\n`
index += `export const builtinUserApiVersion = '${version}'\n\n`
entries.forEach((e) => {
  index += `import ${e.varName} from './script-${e.varName.replace('script', '')}'\n`
})
index += `\n`
index += `export const builtinUserApiSources: ReadonlyArray<{\n  id: string\n  fileName: string\n  script: string\n}> = [\n`
entries.forEach((e) => {
  index += `  { id: '${e.id}', fileName: ${JSON.stringify(e.fileName)}, script: ${e.varName} },\n`
})
index += `]\n`

fs.writeFileSync(path.join(outDir, 'index.ts'), index, 'utf8')

console.log(`generated ${files.length} scripts -> ${outDir}`)
console.log(`builtin version: ${version}`)

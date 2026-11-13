import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { renderPosterBatch } from '../core/posters/render.mjs'

const [inputPath, outputDir = 'data/posters'] = process.argv.slice(2)
if (!inputPath) {
  console.error('用法：node scripts/render-poster.mjs input.json [output-dir]')
  process.exit(1)
}
const parsed = JSON.parse(await readFile(inputPath, 'utf8'))
const items = Array.isArray(parsed) ? parsed : parsed.items
if (!Array.isArray(items)) throw new Error('输入 JSON 必须是数组或包含 items 数组的对象')
const posters = renderPosterBatch(items, { theme: parsed.theme || 'warm-paper' })
await mkdir(outputDir, { recursive: true })
const outputs = []
for (const poster of posters) {
  const path = join(outputDir, `poster-${String(poster.index + 1).padStart(2, '0')}.svg`)
  await writeFile(path, poster.svg, 'utf8')
  outputs.push({ path, scene: poster.scene })
}
console.log(JSON.stringify({ input: basename(inputPath), count: outputs.length, outputs }, null, 2))

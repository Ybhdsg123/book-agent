import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

test('poster:render CLI 实际写出 SVG 文件', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'book-agent-poster-'))
  const input = join(dir, 'input.json')
  const output = join(dir, 'output')
  try {
    await writeFile(input, JSON.stringify({ items: [{ title: '成长札记', quote: '阅读让人看见更大的世界', author: '测试作者' }] }))
    const run = spawnSync(process.execPath, [resolve('scripts/render-poster.mjs'), input, output], { encoding: 'utf8' })
    assert.equal(run.status, 0, run.stderr)
    const svg = await readFile(join(output, 'poster-01.svg'), 'utf8')
    assert.match(svg, /<svg/)
    assert.match(svg, /阅读让人看见更大的世界/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

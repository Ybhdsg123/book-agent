import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadEnvFile } from '../core/config/env.mjs'

test('读取 .env、忽略注释并保留已有环境变量', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'book-agent-env-'))
  const path = join(dir, '.env')
  const target = { EXISTING: 'system-value' }
  try {
    await writeFile(path, '# comment\nA=hello\nB="two words"\nC=three # inline\nEXISTING=file-value\nexport D=quoted\\nline\n')
    const result = await loadEnvFile({ path, target })
    assert.deepEqual(result, { loaded: true, count: 4 })
    assert.equal(target.A, 'hello')
    assert.equal(target.B, 'two words')
    assert.equal(target.C, 'three')
    assert.equal(target.EXISTING, 'system-value')
    assert.equal(target.D, 'quoted\nline')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('不存在 .env 时不报错', async () => {
  assert.deepEqual(await loadEnvFile({ path: '/tmp/no-such-book-agent-env-file' }), { loaded: false, count: 0 })
})

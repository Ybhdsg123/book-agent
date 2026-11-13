import { readFile } from 'node:fs/promises'

export async function loadEnvFile({ path = '.env', target = process.env } = {}) {
  let source
  try { source = await readFile(path, 'utf8') }
  catch (error) {
    if (error.code === 'ENOENT') return { loaded: false, count: 0 }
    throw error
  }
  let count = 0
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue
    const [, key] = match
    if (target[key] !== undefined) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
      if (match[2].trim().startsWith('"')) value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
    } else {
      value = value.replace(/\s+#.*$/, '').trim()
    }
    target[key] = value
    count += 1
  }
  return { loaded: true, count }
}

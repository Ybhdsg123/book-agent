import { normalizeTrend } from './normalize.mjs'

/**
 * Adapter contract:
 * { id, platform, collect({ since, limit }) => Promise<rawTrend[]> }
 * Each platform connector owns its access method and failure handling.
 */
export async function collectFromAdapters(adapters, options = {}) {
  if (!Array.isArray(adapters)) throw new TypeError('adapters 必须是数组')
  const collectedAt = options.collectedAt || new Date().toISOString()
  const results = await Promise.all(adapters.map(async (adapter) => {
    const id = adapter?.id || adapter?.platform || 'unknown', platform = adapter?.platform
    if (typeof adapter?.collect !== 'function') return { adapter: id, platform, status: 'failed', count: 0, error: '缺少 collect 函数', items: [] }
    try {
      const rawItems = await adapter.collect(options)
      if (!Array.isArray(rawItems)) throw new Error('collect 必须返回数组')
      const items = [], rejected = []
      for (const raw of rawItems) {
        try { items.push(normalizeTrend(raw, { platform, collectedAt, adapter: id })) }
        catch (error) { rejected.push({ title: raw?.title || '', reason: error.message }) }
      }
      return { adapter: id, platform, status: rejected.length && !items.length ? 'failed' : rejected.length ? 'partial' : 'success', count: items.length, rejected, items }
    } catch (error) {
      return { adapter: id, platform, status: 'failed', count: 0, error: String(error?.message || error).slice(0, 500), items: [] }
    }
  }))
  return {
    collectedAt, total: results.reduce((sum, result) => sum + result.count, 0),
    successCount: results.filter((result) => result.status === 'success').length,
    partialCount: results.filter((result) => result.status === 'partial').length,
    failedCount: results.filter((result) => result.status === 'failed').length,
    results, items: results.flatMap((result) => result.items),
  }
}

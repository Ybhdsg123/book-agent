import { stableKey } from './normalize.mjs'

export function deduplicateTrends(trends, { similarityThreshold = 0.72 } = {}) {
  if (!Array.isArray(trends)) throw new TypeError('trends 必须是数组')
  if (similarityThreshold < 0 || similarityThreshold > 1) throw new RangeError('similarityThreshold 必须在 0 到 1 之间')
  const sorted = [...trends].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const clusters = []
  for (const trend of sorted) {
    const key = stableKey(trend.title), url = normalizeUrl(trend.url)
    const match = clusters.find((cluster) => {
      if (url && cluster.items.some((item) => normalizeUrl(item.url) === url)) return true
      return cluster.items.some((item) => {
        const other = stableKey(item.title)
        return key && other && similarity(key, other) >= similarityThreshold
      })
    })
    if (match) match.items.push(trend)
    else clusters.push({ representative: trend, items: [trend] })
  }
  return clusters.map((cluster) => ({
    ...cluster.representative, clusterSize: cluster.items.length,
    platforms: [...new Set(cluster.items.map((item) => item.platform))],
    sources: cluster.items.map(({ platform, url, sourceUrl, evidenceLevel, collectedAt }) => ({ platform, url, sourceUrl, evidenceLevel, collectedAt })),
  }))
}
function normalizeUrl(value) {
  if (!value) return ''
  try { const url = new URL(value); url.hash = ''; url.search = ''; return url.toString().replace(/\/$/, '') }
  catch { return '' }
}
function similarity(a, b) {
  if (a === b) return 1
  const left = bigrams(a), right = bigrams(b)
  if (!left.size || !right.size) return 0
  let intersection = 0
  for (const token of left) if (right.has(token)) intersection += 1
  return (2 * intersection) / (left.size + right.size)
}
function bigrams(value) {
  const chars = [...value]
  if (chars.length === 1) return new Set(chars)
  const result = new Set()
  for (let i = 0; i < chars.length - 1; i += 1) result.add(chars[i] + chars[i + 1])
  return result
}

const PLATFORMS = new Set(['douban', 'wechat', 'weibo', 'xiaohongshu', 'bilibili', 'x', 'web'])
const EVIDENCE_LEVELS = new Set(['official_api', 'public_page', 'third_party', 'search_result', 'manual'])

function numberOrNull(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function normalizeTrend(item, { platform, collectedAt = new Date().toISOString(), adapter = 'unknown' } = {}) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new TypeError('热点条目必须是对象')
  const sourcePlatform = String(item.platform || platform || '').toLowerCase()
  if (!PLATFORMS.has(sourcePlatform)) throw new Error(`不支持的平台：${sourcePlatform || '(empty)'}`)
  const title = String(item.title || '').replace(/\s+/g, ' ').trim()
  if (!title) throw new Error('热点标题不能为空')
  const evidenceLevel = EVIDENCE_LEVELS.has(item.evidenceLevel) ? item.evidenceLevel : 'third_party'
  const metrics = item.metrics && typeof item.metrics === 'object' ? item.metrics : {}
  const collected = new Date(collectedAt)
  if (Number.isNaN(collected.getTime())) throw new Error('collectedAt 必须是有效时间')
  return {
    id: String(item.id || `${sourcePlatform}:${stableKey(title)}`),
    platform: sourcePlatform, title, url: safeUrl(item.url), author: clean(item.author),
    category: clean(item.category), summary: clean(item.summary), publishedAt: validDate(item.publishedAt),
    collectedAt: collected.toISOString(), adapter, evidenceLevel,
    sourceUrl: safeUrl(item.sourceUrl) || safeUrl(item.url),
    metrics: {
      rank: numberOrNull(metrics.rank), rankTotal: numberOrNull(metrics.rankTotal),
      heat: numberOrNull(metrics.heat), views: numberOrNull(metrics.views), likes: numberOrNull(metrics.likes),
      comments: numberOrNull(metrics.comments), shares: numberOrNull(metrics.shares),
      favorites: numberOrNull(metrics.favorites), growthRate: numberOrNull(metrics.growthRate),
    },
    editorialSignals: normalizeSignals(item.editorialSignals), raw: item.raw ?? null,
  }
}

export function normalizeSignals(signals = {}) {
  const result = {}
  for (const key of ['resonance', 'expansion', 'accountFit', 'timeliness']) {
    const value = numberOrNull(signals?.[key])
    result[key] = value === null ? null : Math.max(0, Math.min(5, value))
  }
  return result
}
export function stableKey(value = '') {
  return String(value).toLowerCase().replace(/[\p{P}\p{S}\s_]+/gu, '')
}
function clean(value) { return typeof value === 'string' ? value.trim() : '' }
function safeUrl(value) {
  if (!value) return ''
  try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '' }
  catch { return '' }
}
function validDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export const RECENCY_WINDOWS = Object.freeze([
  { id: 'day', label: '最近一天', days: 1, googleWhen: '1d' },
  { id: 'week', label: '最近一周', days: 7, googleWhen: '7d' },
  { id: 'month', label: '最近一月', days: 30, googleWhen: '30d' },
])

export function filterRecentTrends(items, { now = new Date(), days } = {}) {
  const end = new Date(now).getTime()
  const start = end - days * 24 * 60 * 60 * 1000
  return items.filter((item) => {
    const published = new Date(item.publishedAt || '').getTime()
    return Number.isFinite(published) && published >= start && published <= end
  })
}

export function selectQualifiedTrends(items, { minimumScore = 60, minimumCoverage = 50, minimumConfidence = 40 } = {}) {
  return items.filter((item) =>
    Number.isFinite(item.score) &&
    item.score >= minimumScore &&
    item.scoreCoverage >= minimumCoverage &&
    item.evidenceConfidence >= minimumConfidence &&
    item.scoreBand !== 'insufficient_data'
  )
}

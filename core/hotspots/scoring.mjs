import { stableKey } from './normalize.mjs'

const WEIGHTS = Object.freeze({ reach: 25, growth: 20, resonance: 20, expansion: 15, accountFit: 15, timeliness: 5 })
const EVIDENCE_CONFIDENCE = Object.freeze({ official_api: 1, public_page: 0.9, third_party: 0.7, search_result: 0.55, manual: 0.6 })

export function scoreTrend(trend, { now = new Date() } = {}) {
  if (!trend || typeof trend !== 'object') throw new TypeError('trend 必须是对象')
  const signals = trend.editorialSignals || {}
  const metrics = trend.metrics || {}
  const dimensions = {
    reach: reachSignal(metrics), growth: growthSignal(metrics.growthRate),
    resonance: clampSignal(signals.resonance), expansion: clampSignal(signals.expansion),
    accountFit: clampSignal(signals.accountFit), timeliness: freshnessSignal(trend, now),
  }
  const missing = Object.entries(dimensions).filter(([, value]) => value === null).map(([key]) => key)
  const weighted = Object.entries(WEIGHTS).reduce((sum, [key, weight]) => sum + ((dimensions[key] ?? 0) / 5) * weight, 0)
  const availableWeight = Object.entries(WEIGHTS).reduce((sum, [key, weight]) => sum + (dimensions[key] === null ? 0 : weight), 0)
  const score = Math.round(weighted)
  const evidenceConfidence = calculateEvidenceConfidence(trend, missing)
  return {
    ...trend, score,
    scoreBand: score >= 85 ? 'priority' : score >= 75 ? 'candidate' : score >= 60 ? 'observe' : 'skip',
    dimensions, missingDimensions: missing, evidenceConfidence,
    scoreNote: missing.length ? `缺少${missing.length}项评分信号；总分按已提供维度折算，需补充证据` : '六项评分信号完整',
  }
}
export function rankTrends(trends, options = {}) {
  return [...trends].map((trend) => scoreTrend(trend, options))
    .sort((a, b) => b.score - a.score || b.evidenceConfidence - a.evidenceConfidence)
}
function reachSignal(metrics) {
  const rank = finite(metrics.rank), total = finite(metrics.rankTotal)
  if (rank !== null && total !== null && total > 0 && rank > 0) return clamp5(5 * (1 - (rank - 1) / total))
  const value = finite(metrics.heat) ?? finite(metrics.views) ?? finite(metrics.likes)
  if (value === null || value < 0) return null
  return clamp5(Math.log10(value + 1))
}
function growthSignal(value) {
  const rate = finite(value)
  return rate === null ? null : clamp5((rate + 50) / 30)
}
function clampSignal(value) { const n = finite(value); return n === null ? null : clamp5(n) }
function freshnessSignal(trend, now) {
  const collected = new Date(trend.collectedAt || '')
  if (Number.isNaN(collected.getTime())) return null
  const ageHours = Math.max(0, (new Date(now).getTime() - collected.getTime()) / 3600000)
  if (ageHours <= 2) return 5
  if (ageHours <= 6) return 4
  if (ageHours <= 12) return 3
  if (ageHours <= 24) return 2
  if (ageHours <= 48) return 1
  return 0
}
function calculateEvidenceConfidence(trend, missing) {
  const base = EVIDENCE_CONFIDENCE[trend.evidenceLevel] ?? 0.5
  const hasSource = Boolean(trend.sourceUrl || trend.url), hasTimestamp = Boolean(trend.collectedAt)
  const completeness = Math.max(0.35, 1 - missing.length * 0.08)
  return Math.round(100 * base * (hasSource ? 1 : 0.8) * (hasTimestamp ? 1 : 0.8) * completeness)
}
function finite(value) { const n = Number(value); return Number.isFinite(n) && value !== null && value !== '' ? n : null }
function clamp5(value) { return Math.max(0, Math.min(5, value)) }
export const HOTSPOT_SCORE_WEIGHTS = WEIGHTS

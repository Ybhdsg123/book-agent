import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeTrend } from '../core/hotspots/normalize.mjs'
import { scoreTrend } from '../core/hotspots/scoring.mjs'
import { deduplicateTrends } from '../core/hotspots/dedupe.mjs'
import { collectFromAdapters } from '../core/hotspots/collector.mjs'

const now = '2026-11-13T10:00:00.000Z'
test('统一标准化平台热点并拒绝无效标题/平台', () => {
  const trend = normalizeTrend({ title: '  一个值得研究的热点  ', url: 'https://example.com/story', metrics: { rank: 3, rankTotal: 50, views: '12000' }, evidenceLevel: 'public_page' }, { platform: 'weibo', collectedAt: now, adapter: 'test' })
  assert.equal(trend.platform, 'weibo')
  assert.equal(trend.title, '一个值得研究的热点')
  assert.equal(trend.metrics.views, 12000)
  assert.equal(trend.evidenceLevel, 'public_page')
  assert.throws(() => normalizeTrend({ title: ' ' }, { platform: 'weibo' }), /标题不能为空/)
  assert.throws(() => normalizeTrend({ title: 'x' }, { platform: 'unknown' }), /不支持的平台/)
})
test('评分输出分项、缺失项和证据置信度', () => {
  const trend = normalizeTrend({ title: '热点标题', url: 'https://example.com', evidenceLevel: 'official_api', metrics: { rank: 1, rankTotal: 20, growthRate: 40 }, editorialSignals: { resonance: 4, expansion: 5, accountFit: 5 } }, { platform: 'weibo', collectedAt: now })
  const result = scoreTrend(trend, { now })
  assert.equal(result.score, 88)
  assert.equal(result.scoreBand, 'priority')
  assert.equal(result.evidenceConfidence, 100)
  assert.deepEqual(result.missingDimensions, [])
})
test('缺少指标时明确标注缺失项', () => {
  const trend = normalizeTrend({ title: '信息不全的热点' }, { platform: 'bilibili', collectedAt: now })
  const result = scoreTrend(trend, { now })
  assert.ok(result.missingDimensions.includes('reach'))
  assert.ok(result.missingDimensions.includes('growth'))
  assert.ok(result.evidenceConfidence < 100)
})
test('跨平台近似标题合并并保留来源', () => {
  const items = [
    { platform: 'weibo', title: '普通人如何用AI改变生活', score: 90, url: 'https://a.example/1' },
    { platform: 'bilibili', title: '普通人如何用 AI 改变生活', score: 80, url: 'https://b.example/2' },
    { platform: 'douban', title: '另一条完全不同的读书话题', score: 70, url: 'https://c.example/3' },
  ]
  const result = deduplicateTrends(items)
  assert.equal(result.length, 2)
  assert.equal(result[0].clusterSize, 2)
  assert.deepEqual(result[0].platforms, ['weibo', 'bilibili'])
})
test('一个平台失败不影响其他平台', async () => {
  const result = await collectFromAdapters([
    { id: 'weibo-public', platform: 'weibo', collect: async () => [{ title: '微博热点' }] },
    { id: 'x-search', platform: 'x', collect: async () => { throw new Error('授权失效') } },
  ], { collectedAt: now })
  assert.equal(result.total, 1)
  assert.equal(result.successCount, 1)
  assert.equal(result.failedCount, 1)
  assert.equal(result.results[1].error, '授权失效')
})

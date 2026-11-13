import test from 'node:test'
import assert from 'node:assert/strict'
import { filterRecentTrends, RECENCY_WINDOWS, selectQualifiedTrends } from '../core/hotspots/recency.mjs'

const now = new Date('2026-11-13T12:00:00.000Z')

test('搜索窗口按一天、一周、一月递进', () => {
  assert.deepEqual(RECENCY_WINDOWS.map(({ id, days }) => [id, days]), [
    ['day', 1], ['week', 7], ['month', 30],
  ])
})

test('只保留发布时间处于当前窗口内的条目，缺失日期也排除', () => {
  const items = [
    { title: '今天', publishedAt: '2026-11-13T08:00:00.000Z' },
    { title: '昨天', publishedAt: '2026-11-12T13:00:00.000Z' },
    { title: '八天前', publishedAt: '2026-11-05T12:00:00.000Z' },
    { title: '无日期' },
  ]
  assert.deepEqual(filterRecentTrends(items, { now, days: 1 }).map((item) => item.title), ['今天'])
  assert.deepEqual(filterRecentTrends(items, { now, days: 7 }).map((item) => item.title), ['今天', '昨天'])
  assert.deepEqual(filterRecentTrends(items, { now, days: 30 }).map((item) => item.title), ['今天', '昨天', '八天前'])
})

test('仅输出评分不低于60且证据覆盖达标的候选', () => {
  const items = [
    { title: '达标', score: 60, scoreCoverage: 50, evidenceConfidence: 40, scoreBand: 'candidate' },
    { title: '低于门槛', score: 59, scoreCoverage: 100, evidenceConfidence: 100, scoreBand: 'skip' },
    { title: '覆盖不足', score: 90, scoreCoverage: 25, evidenceConfidence: 90, scoreBand: 'insufficient_data' },
    { title: '证据不足', score: 90, scoreCoverage: 80, evidenceConfidence: 39, scoreBand: 'candidate' },
  ]
  assert.deepEqual(selectQualifiedTrends(items).map((item) => item.title), ['达标'])
})

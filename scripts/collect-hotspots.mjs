import { collectFromAdapters } from '../core/hotspots/collector.mjs'
import { createDefaultRssAdapters, createRssAdapter } from '../core/hotspots/rss.mjs'
import { rankTrends } from '../core/hotspots/scoring.mjs'
import { deduplicateTrends } from '../core/hotspots/dedupe.mjs'
import { mkdir, writeFile } from 'node:fs/promises'

const customFeeds = (process.env.HOTSPOT_RSS_FEEDS || '').split(',').map((value) => value.trim()).filter(Boolean)
const adapters = [
  ...createDefaultRssAdapters(),
  ...customFeeds.map((url, index) => createRssAdapter({ id: `custom-rss-${index + 1}`, url })),
]
const collected = await collectFromAdapters(adapters, { limit: 30 })
const ranked = rankTrends(collected.items)
const unique = deduplicateTrends(ranked)
const report = {
  generatedAt: collected.collectedAt,
  disclaimer: '本报告来自公开 RSS/搜索发现，不代表各平台原生热榜；搜索结果不等于原文已核验。',
  collection: {
    total: collected.total, successCount: collected.successCount,
    partialCount: collected.partialCount, failedCount: collected.failedCount,
    adapters: collected.results.map(({ adapter, platform, status, count, error }) => ({ adapter, platform, status, count, error })),
  },
  candidates: unique.slice(0, 30),
}
await mkdir('data/reports', { recursive: true })
const stamp = collected.collectedAt.replace(/[:.]/g, '-')
const jsonPath = `data/reports/hotspots-${stamp}.json`
const markdownPath = `data/reports/hotspots-${stamp}.md`
await writeFile(jsonPath, JSON.stringify(report, null, 2) + '\n')
const lines = [
  '# 公开热点发现报告', '',
  `- 生成时间：${report.generatedAt}`,
  `- 采集条目：${report.collection.total}`,
  `- 成功/部分成功/失败：${report.collection.successCount}/${report.collection.partialCount}/${report.collection.failedCount}`,
  '', '> 本报告来自公开 RSS/搜索发现，不代表各平台原生热榜；搜索结果不等于原文已核验。', '',
  ...report.candidates.map((item, index) => `## ${index + 1}. ${item.title}（${item.score} 分）\n- 来源：${item.author || item.platform}\n- 发布时间：${item.publishedAt || '未知'}\n- 证据：${item.evidenceLevel}；置信度 ${item.evidenceConfidence}；评分覆盖率 ${item.scoreCoverage}%\n- 链接：${item.url || '无'}\n- 摘要：${item.summary || '无'}\n`),
]
await writeFile(markdownPath, lines.join('\n') + '\n')
console.log(JSON.stringify({ ...report.collection, jsonPath, markdownPath, candidates: report.candidates.length }, null, 2))
if (!collected.total) process.exitCode = 1

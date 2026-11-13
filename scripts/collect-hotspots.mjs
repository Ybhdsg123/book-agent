import { collectFromAdapters } from '../core/hotspots/collector.mjs'
import { createDefaultRssAdapters, createRssAdapter } from '../core/hotspots/rss.mjs'
import { createRssHubAdapters } from '../core/hotspots/rsshub.mjs'
import { rankTrends } from '../core/hotspots/scoring.mjs'
import { deduplicateTrends } from '../core/hotspots/dedupe.mjs'
import { evaluateTrendsWithDeepSeek } from '../core/research/deepseek.mjs'
import { buildDingTalkMarkdown, sendDingTalkMarkdown } from '../core/integrations/dingtalk.mjs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { loadEnvFile } from '../core/config/env.mjs'

await loadEnvFile()

let bookCatalog = []
try {
  const catalogPath = process.env.BOOK_CATALOG_PATH || 'books/catalog.json'
  bookCatalog = JSON.parse(await readFile(catalogPath, 'utf8'))
  if (!Array.isArray(bookCatalog)) throw new Error('书库文件必须是 JSON 数组')
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
const customFeeds = (process.env.HOTSPOT_RSS_FEEDS || '').split(',').map((value) => value.trim()).filter(Boolean)
const rssHubRoutes = process.env.RSSHUB_ROUTES ? JSON.parse(process.env.RSSHUB_ROUTES) : undefined
const adapters = [
  ...createDefaultRssAdapters(),
  ...createRssHubAdapters({ baseUrl: process.env.RSSHUB_BASE_URL, routes: rssHubRoutes }),
  ...customFeeds.map((url, index) => createRssAdapter({ id: `custom-rss-${index + 1}`, url })),
]
const collected = await collectFromAdapters(adapters, { limit: 30 })
const discovered = deduplicateTrends(collected.items)
let research = { status: 'skipped_no_api_key', evaluatedCount: 0 }
let enriched = discovered
if (process.env.DEEPSEEK_API_KEY && discovered.length) {
  try {
    const result = await evaluateTrendsWithDeepSeek(discovered.slice(0, 30), { bookCatalog })
    enriched = [...result.items, ...discovered.slice(30)]
    research = { status: 'success', evaluatedCount: result.evaluatedCount }
  } catch (error) {
    research = { status: 'failed', evaluatedCount: 0, error: String(error?.message || error).slice(0, 300) }
  }
}
const ranked = rankTrends(enriched)
const unique = ranked
const recommendations = unique.filter((item) => item.scoreCoverage >= 50 && item.evidenceConfidence >= 40 && item.scoreBand !== 'insufficient_data').slice(0, 3)
const report = {
  generatedAt: collected.collectedAt,
  disclaimer: '本报告来自公开 RSS/搜索发现，不代表各平台原生热榜；搜索结果不等于原文已核验。',
  aiResearch: research,
  notification: { status: process.env.DINGTALK_BOT_WEBHOOK ? 'pending' : 'skipped_no_webhook' },
  collection: {
    total: collected.total, successCount: collected.successCount,
    partialCount: collected.partialCount, failedCount: collected.failedCount,
    adapters: collected.results.map(({ adapter, platform, status, count, error }) => ({ adapter, platform, status, count, error })),
  },
  candidates: unique.slice(0, 30),
  recommendations,
}
await mkdir('data/reports', { recursive: true })
const stamp = collected.collectedAt.replace(/[:.]/g, '-')
const jsonPath = `data/reports/hotspots-${stamp}.json`
const markdownPath = `data/reports/hotspots-${stamp}.md`
let notification = { status: process.env.DINGTALK_BOT_WEBHOOK ? 'skipped_insufficient_evidence' : 'skipped_no_webhook' }
if (process.env.DINGTALK_BOT_WEBHOOK && recommendations.length) {
  try {
    notification = await sendDingTalkMarkdown({
      markdown: buildDingTalkMarkdown(recommendations, { generatedAt: collected.collectedAt }),
    })
  } catch (error) {
    notification = { status: 'failed', error: String(error?.message || error).slice(0, 300) }
  }
}
report.notification = notification
await writeFile(jsonPath, JSON.stringify(report, null, 2) + '\n')
const lines = [
  '# 公开热点发现报告', '',
  `- 生成时间：${report.generatedAt}`,
  `- 采集条目：${report.collection.total}`,
  `- 成功/部分成功/失败：${report.collection.successCount}/${report.collection.partialCount}/${report.collection.failedCount}`,
  `- 钉钉推送：${notification.status}`,
  '', '> 本报告来自公开 RSS/搜索发现，不代表各平台原生热榜；搜索结果不等于原文已核验。', '',
  ...report.candidates.map((item, index) => `## ${index + 1}. ${item.title}（${item.score} 分）\n- 来源：${item.author || item.platform}\n- 发布时间：${item.publishedAt || '未知'}\n- 证据：${item.evidenceLevel}；置信度 ${item.evidenceConfidence}；评分覆盖率 ${item.scoreCoverage}%\n- 链接：${item.url || '无'}\n- 摘要：${item.summary || '无'}\n`),
]
await writeFile(markdownPath, lines.join('\n') + '\n')
console.log(JSON.stringify({ ...report.collection, jsonPath, markdownPath, candidates: report.candidates.length, recommendations: report.recommendations.length, notification: report.notification }, null, 2))
if (!collected.total) process.exitCode = 1

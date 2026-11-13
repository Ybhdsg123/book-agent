import { collectFromAdapters } from '../core/hotspots/collector.mjs'
import { createDefaultRssAdapters, createRssAdapter } from '../core/hotspots/rss.mjs'
import { createRssHubAdapters } from '../core/hotspots/rsshub.mjs'
import { rankTrends } from '../core/hotspots/scoring.mjs'
import { deduplicateTrends } from '../core/hotspots/dedupe.mjs'
import { evaluateTrendsWithDeepSeek } from '../core/research/deepseek.mjs'
import { buildDingTalkMarkdown, sendDingTalkMarkdown } from '../core/integrations/dingtalk.mjs'
import { filterRecentTrends, RECENCY_WINDOWS, selectQualifiedTrends } from '../core/hotspots/recency.mjs'
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
const generatedAt = new Date().toISOString()
const windowAttempts = []
let selectedWindow = null
let collected = null
let ranked = []
let recommendations = []
let research = { status: 'skipped_no_api_key', evaluatedCount: 0 }

for (const window of RECENCY_WINDOWS) {
  const adapters = [
    ...createDefaultRssAdapters({
      queries: ['图书 阅读 心理成长', '作家 书评 读书', '女性成长 人际关系 自我提升']
        .map((query) => `${query} when:${window.googleWhen}`),
    }),
    ...createRssHubAdapters({ baseUrl: process.env.RSSHUB_BASE_URL, routes: rssHubRoutes }),
    ...customFeeds.map((url, index) => createRssAdapter({ id: `custom-rss-${index + 1}`, url })),
  ]

  const round = await collectFromAdapters(adapters, { limit: 30, collectedAt: generatedAt })
  const recentItems = filterRecentTrends(round.items, { now: generatedAt, days: window.days })
  const discovered = deduplicateTrends(recentItems)
  let enriched = discovered
  let roundResearch = { status: 'skipped_no_api_key', evaluatedCount: 0 }

  if (process.env.DEEPSEEK_API_KEY && discovered.length) {
    try {
      const result = await evaluateTrendsWithDeepSeek(discovered.slice(0, 30), { bookCatalog })
      enriched = [...result.items, ...discovered.slice(30)]
      roundResearch = { status: 'success', evaluatedCount: result.evaluatedCount }
    } catch (error) {
      roundResearch = { status: 'failed', evaluatedCount: 0, error: String(error?.message || error).slice(0, 300) }
    }
  }

  const scored = rankTrends(enriched)
  const qualified = selectQualifiedTrends(scored)
  windowAttempts.push({
    window: window.id,
    label: window.label,
    collected: round.total,
    withinWindow: recentItems.length,
    deduplicated: discovered.length,
    qualified: qualified.length,
  })

  collected = round
  ranked = scored
  recommendations = qualified.slice(0, 3)
  research = roundResearch

  if (recommendations.length) {
    selectedWindow = window
    break
  }
}

const report = {
  generatedAt,
  searchPolicy: {
    windows: RECENCY_WINDOWS.map(({ id, label, days }) => ({ id, label, days })),
    minimumScore: 60,
    fallbackOrder: '1天 → 1周 → 1月；每个时间范围只在没有合格选题时才扩大',
    stopWhenNoQualifiedCandidate: true,
  },
  selectedWindow: selectedWindow ? { id: selectedWindow.id, label: selectedWindow.label, days: selectedWindow.days } : null,
  status: recommendations.length ? 'found' : 'not_found',
  message: recommendations.length ? '找到达到评分门槛的近期选题' : '最近一月内没有找到达到评分门槛的选题，停止搜索',
  windowAttempts,
  disclaimer: '仅保留发布时间可核验且处于当前时间窗口内的条目；公开 RSS/搜索发现不代表各平台原生热榜。',
  aiResearch: research,
  notification: { status: process.env.DINGTALK_BOT_WEBHOOK ? 'pending' : 'skipped_no_webhook' },
  collection: {
    total: collected?.total || 0,
    successCount: collected?.successCount || 0,
    partialCount: collected?.partialCount || 0,
    failedCount: collected?.failedCount || 0,
    adapters: (collected?.results || []).map(({ adapter, platform, status, count, error }) => ({ adapter, platform, status, count, error })),
  },
  candidates: ranked,
  recommendations,
}

await mkdir('data/reports', { recursive: true })
const stamp = generatedAt.replace(/[:.]/g, '-')
const jsonPath = `data/reports/hotspots-${stamp}.json`
const markdownPath = `data/reports/hotspots-${stamp}.md`
let notification = { status: process.env.DINGTALK_BOT_WEBHOOK ? 'skipped_no_qualified_candidate' : 'skipped_no_webhook' }
if (process.env.DINGTALK_BOT_WEBHOOK && recommendations.length) {
  try {
    notification = await sendDingTalkMarkdown({
      markdown: buildDingTalkMarkdown(recommendations, { generatedAt }),
    })
  } catch (error) {
    notification = { status: 'failed', error: String(error?.message || error).slice(0, 300) }
  }
}
report.notification = notification
await writeFile(jsonPath, JSON.stringify(report, null, 2) + '\\n')

const lines = [
  '# 近期热点发现报告', '',
  `- 生成时间：${generatedAt}`,
  `- 最终时间范围：${selectedWindow?.label || '最近一月内未找到合格选题'}`,
  `- 最低评分：60 分`,
  `- 搜索状态：${report.status}`,
  `- 钉钉推送：${notification.status}`,
  '',
  '## 时间窗口递进结果',
  ...windowAttempts.map((attempt) => `- ${attempt.label}：采集 ${attempt.collected} 条；窗口内 ${attempt.withinWindow} 条；去重后 ${attempt.deduplicated} 条；达到门槛 ${attempt.qualified} 条`),
  '',
  report.message,
  '',
  ...recommendations.map((item, index) => `## ${index + 1}. ${item.title}（${item.score} 分）\\n- 来源：${item.author || item.platform}\\n- 发布时间：${item.publishedAt || '未知'}\\n- 证据：${item.evidenceLevel}；置信度 ${item.evidenceConfidence}；评分覆盖率 ${item.scoreCoverage}%\\n- 链接：${item.url || '无'}\\n- 摘要：${item.summary || '无'}\\n`),
]
await writeFile(markdownPath, lines.join('\\n') + '\\n')
console.log(JSON.stringify({
  ...report.collection, selectedWindow: report.selectedWindow, status: report.status,
  windowAttempts, recommendations: recommendations.length, jsonPath, markdownPath, notification,
}, null, 2))
if (!collected?.total) process.exitCode = 1

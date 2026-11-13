import test from 'node:test'
import assert from 'node:assert/strict'
import { buildGoogleNewsRssUrl, parseRss, createRssAdapter } from '../core/hotspots/rss.mjs'

const fixture = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[读书与成长：一个故事]]></title><link>https://example.com/story?a=1&amp;b=2</link><description><![CDATA[这是一段 <b>测试</b> 摘要。]]></description><pubDate>Thu, 13 Nov 2026 08:00:00 GMT</pubDate><source>示例媒体</source></item></channel></rss>`

test('Google News RSS URL 对查询参数正确编码', () => {
  const url = new URL(buildGoogleNewsRssUrl('图书 阅读'))
  assert.equal(url.hostname, 'news.google.com')
  assert.equal(url.searchParams.get('q'), '图书 阅读')
})

test('解析 RSS 标题、链接、摘要、来源和发布时间', () => {
  const [item] = parseRss(fixture, { feedUrl: 'https://news.google.com/rss' })
  assert.equal(item.title, '读书与成长：一个故事')
  assert.equal(item.url, 'https://example.com/story?a=1&b=2')
  assert.equal(item.author, '示例媒体')
  assert.equal(item.summary, '这是一段 测试 摘要。')
  assert.equal(item.evidenceLevel, 'search_result')
})

test('RSS Adapter 使用 fetch 并拒绝 HTTP 错误', async () => {
  const adapter = createRssAdapter({ query: '测试', fetchImpl: async () => ({ ok: true, text: async () => fixture }) })
  const items = await adapter.collect()
  assert.equal(items.length, 1)
  const failing = createRssAdapter({ query: '测试', fetchImpl: async () => ({ ok: false, status: 503 }) })
  await assert.rejects(failing.collect(), /HTTP 503/)
})

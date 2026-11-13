const DEFAULT_QUERIES = ['图书 阅读 心理成长', '作家 书评 读书', '女性成长 人际关系 自我提升']

export function buildGoogleNewsRssUrl(query, { language = 'zh-CN', country = 'CN', edition = 'CN:zh-Hans' } = {}) {
  const params = new URLSearchParams({ q: query, hl: language, gl: country, ceid: edition })
  return `https://news.google.com/rss/search?${params.toString()}`
}

export function parseRss(xml, { sourceName = 'Google News RSS', feedUrl = '' } = {}) {
  if (typeof xml !== 'string') throw new TypeError('RSS 内容必须是字符串')
  const entries = [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)]
  return entries.map(([, type, body]) => {
    const title = readTag(body, 'title')
    const link = type.toLowerCase() === 'entry'
      ? (body.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || readTag(body, 'link'))
      : readTag(body, 'link')
    const description = readTag(body, type.toLowerCase() === 'entry' ? 'summary' : 'description') || readTag(body, 'content')
    const publishedAt = readTag(body, 'pubDate') || readTag(body, 'published') || readTag(body, 'updated')
    const source = readTag(body, 'source') || sourceName
    if (!title || !link) return null
    return {
      title: stripMarkup(decodeXml(title)), url: decodeXml(link.trim()), sourceUrl: feedUrl,
      author: stripMarkup(decodeXml(source)), summary: stripMarkup(decodeXml(description)).slice(0, 1200),
      publishedAt, evidenceLevel: 'search_result', category: '公开网络资讯',
      metrics: {}, raw: { discoverySource: sourceName, feedUrl },
    }
  }).filter(Boolean)
}

export function createRssAdapter({ id = 'google-news-rss', query, url, fetchImpl = globalThis.fetch, timeoutMs = 12000, limit = 30 } = {}) {
  if (!query && !url) throw new Error('RSS Adapter 必须提供 query 或 url')
  return {
    id, platform: 'web',
    async collect() {
      const feedUrl = url || buildGoogleNewsRssUrl(query)
      const parsed = new URL(feedUrl)
      if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('RSS 地址只允许 HTTP(S)')
      if (typeof fetchImpl !== 'function') throw new Error('当前运行环境不支持 fetch')
      const response = await fetchImpl(feedUrl, { headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(timeoutMs) })
      if (!response.ok) throw new Error(`RSS 请求失败：HTTP ${response.status}`)
      const xml = await response.text()
      return parseRss(xml, { sourceName: id, feedUrl }).slice(0, limit)
    },
  }
}

export function createDefaultRssAdapters({ queries = DEFAULT_QUERIES, fetchImpl, limit = 30 } = {}) {
  return queries.map((query, index) => createRssAdapter({ id: `google-news-query-${index + 1}`, query, fetchImpl, limit }))
}

function readTag(xml, name) {
  const match = xml.match(new RegExp(`<(?:[\\w.-]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${name}\\s*>`, 'i'))
  return match?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, '').trim() || ''
}
function decodeXml(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, code) => {
    const key = code.toLowerCase()
    if (key === 'amp') return '&'
    if (key === 'lt') return '<'
    if (key === 'gt') return '>'
    if (key === 'quot') return '"'
    if (key === 'apos') return "'"
    const point = key.startsWith('#x') ? Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10)
    return Number.isFinite(point) && point >= 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity
  })
}
function stripMarkup(value) { return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() }

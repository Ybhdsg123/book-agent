import { createRssAdapter } from './rss.mjs'

export const DEFAULT_RSSHUB_ROUTES = Object.freeze({
  weibo: ['/weibo/search/hot'],
  bilibili: ['/bilibili/hot-search', '/bilibili/popular/all'],
  douban: ['/douban/list/book_fiction_hot_weekly', '/douban/list/book_nonfiction_hot_weekly'],
})

export function createRssHubAdapters({ baseUrl, routes = DEFAULT_RSSHUB_ROUTES, fetchImpl, limit = 30 } = {}) {
  if (!baseUrl) return []
  const base = new URL(baseUrl)
  if (!['https:', 'http:'].includes(base.protocol)) throw new Error('RSSHub 地址只允许 HTTP(S)')
  const adapters = []
  for (const [platform, paths] of Object.entries(routes || {})) {
    if (!Array.isArray(paths)) throw new TypeError(`RSSHub 路由必须是数组：${platform}`)
    for (const [index, path] of paths.entries()) {
      const route = new URL(path, base)
      if (route.origin !== base.origin) throw new Error('RSSHub 路由不得跳转到其他域名')
      adapters.push(createRssAdapter({
        id: `rsshub-${platform}-${index + 1}`, url: route.toString(),
        platform, evidenceLevel: 'third_party', fetchImpl, limit,
      }))
    }
  }
  return adapters
}

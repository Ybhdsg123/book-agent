import { normalizeSignals } from '../hotspots/normalize.mjs'

const ENDPOINT = 'https://api.deepseek.com/chat/completions'

export async function evaluateTrendsWithDeepSeek(trends, {
  apiKey = process.env.DEEPSEEK_API_KEY,
  model = 'deepseek-chat',
  fetchImpl = globalThis.fetch,
  timeoutMs = 30000,
} = {}) {
  if (!apiKey) throw new Error('缺少 DEEPSEEK_API_KEY')
  if (!Array.isArray(trends)) throw new TypeError('trends 必须是数组')
  if (!trends.length) return { items: [], evaluatedCount: 0 }
  if (typeof fetchImpl !== 'function') throw new Error('当前运行环境不支持 fetch')

  const input = trends.map((trend) => ({
    id: trend.id, title: trend.title, summary: trend.summary || '',
    author: trend.author || '', category: trend.category || '',
    publishedAt: trend.publishedAt || '',
  }))
  const response = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model, temperature: 0.1, response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: '你是图书类微信公众号的选题研究员。只根据输入的标题、摘要和来源信息评估，不得补造事实、传播数据或书籍出处。内容证据不足时对应维度必须返回 null。评分范围为 0 到 5，可为整数或小数。账号定位：图书、阅读、女性成长、心理成长、生活观察与个人成长。',
        },
        {
          role: 'user',
          content: `请评估这些候选内容，并只返回 JSON 对象：{"results":[{"id":"原样返回","resonance":0到5或null,"expansion":0到5或null,"accountFit":0到5或null,"reason":"简短中文理由"}]}。resonance=情绪共鸣潜力；expansion=与书籍观点/作者故事/阅读体验结合的延展性；accountFit=是否符合账号定位。没有摘要时不要仅凭标题臆测具体内容。输入：${JSON.stringify(input)}`,
        },
      ],
    }),
  })
  if (!response.ok) throw new Error(`DeepSeek 请求失败：HTTP ${response.status}`)
  const payload = await response.json()
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('DeepSeek 未返回有效文本')
  let parsed
  try { parsed = JSON.parse(content.replace(/^\s*```(?:json)?\s*|\s*```$/g, '')) }
  catch { throw new Error('DeepSeek 返回内容不是有效 JSON') }
  if (!Array.isArray(parsed.results)) throw new Error('DeepSeek JSON 缺少 results 数组')

  const byId = new Map(parsed.results.filter((item) => item && typeof item.id === 'string').map((item) => [item.id, item]))
  let evaluatedCount = 0
  const items = trends.map((trend) => {
    const result = byId.get(trend.id)
    if (!result) return trend
    const signals = normalizeSignals({
      resonance: result.resonance, expansion: result.expansion, accountFit: result.accountFit,
    })
    if (Object.values(signals).some((value) => value !== null)) evaluatedCount += 1
    return {
      ...trend,
      editorialSignals: { ...(trend.editorialSignals || {}), ...signals },
      editorialRationale: typeof result.reason === 'string' ? result.reason.slice(0, 500) : '',
      researchModel: model,
    }
  })
  return { items, evaluatedCount }
}

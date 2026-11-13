import { createHmac } from 'node:crypto'

export function buildDingTalkMarkdown(candidates, { generatedAt = new Date().toISOString() } = {}) {
  const lines = [
    '# 今日图书公众号选题候选',
    `生成时间：${generatedAt}`,
    '',
    '> 以下为公开资讯发现结果，关联书籍与内容形式需在深度研究后确认。',
    '',
  ]
  for (const [index, item] of candidates.slice(0, 3).entries()) {
    lines.push(
      `## ${index + 1}. ${item.title}`,
      `- 来源/作者：${item.author || '未知'}`,
      `- 关联书籍：待深度研究匹配`,
      `- 建议形式：待内容策划确定`,
      `- 计划图片数：待内容策划确定`,
      `- 评分：${item.score ?? '待评估'}（覆盖率 ${item.scoreCoverage ?? 0}%）`,
      `- 推荐理由：${item.editorialRationale || item.summary || '公开来源发现，需进一步核验原文与传播表现。'}`,
      `- 来源链接：[查看原文](${item.url || item.sourceUrl || '#'})`,
      '',
    )
  }
  if (!candidates.length) lines.push('本轮没有采集到可推送的候选内容。')
  return lines.join('\n')
}

export async function sendDingTalkMarkdown({
  webhook = process.env.DINGTALK_BOT_WEBHOOK,
  secret = process.env.DINGTALK_BOT_SECRET,
  title = '今日图书公众号选题候选',
  markdown,
  fetchImpl = globalThis.fetch,
  now = Date.now(),
  timeoutMs = 12000,
} = {}) {
  if (!webhook) return { status: 'skipped', reason: 'missing_webhook' }
  if (typeof markdown !== 'string' || !markdown.trim()) throw new Error('钉钉 Markdown 内容不能为空')
  if (typeof fetchImpl !== 'function') throw new Error('当前运行环境不支持 fetch')
  const target = new URL(webhook)
  if (target.protocol !== 'https:') throw new Error('钉钉机器人 Webhook 必须使用 HTTPS')
  if (secret) {
    const timestamp = String(now)
    const sign = createHmac('sha256', secret).update(`${timestamp}\n${secret}`).digest('base64')
    target.searchParams.set('timestamp', timestamp)
    target.searchParams.set('sign', sign)
  }
  const response = await fetchImpl(target.toString(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({ msgtype: 'markdown', markdown: { title, text: markdown } }),
  })
  if (!response.ok) throw new Error(`钉钉 Webhook 请求失败：HTTP ${response.status}`)
  const result = await response.json()
  if (result.errcode !== 0) throw new Error(`钉钉机器人返回错误：${result.errmsg || result.errcode}`)
  return { status: 'sent', messageId: result.messageId || null }
}

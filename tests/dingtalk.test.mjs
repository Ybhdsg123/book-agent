import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { buildDingTalkMarkdown, sendDingTalkMarkdown } from '../core/integrations/dingtalk.mjs'

test('钉钉消息包含来源、书籍待核验提示和前三条候选', () => {
  const markdown = buildDingTalkMarkdown([
    { title: '候选一', topicTitle: '策划选题一', author: '媒体A', bookTitle: '书名', bookAuthor: '作者', contentFormat: 'quote_cards', plannedImageCount: 5, score: 88, scoreCoverage: 100, url: 'https://example.com/1', summary: '推荐理由' },
    { title: '候选二' }, { title: '候选三' }, { title: '候选四' },
  ])
  assert.match(markdown, /策划选题一/)
  assert.match(markdown, /书名（作者）/)
  assert.match(markdown, /金句贴图/)
  assert.match(markdown, /计划图片数：5/)
  assert.match(markdown, /关联书籍：待深度研究匹配/)
  assert.match(markdown, /推荐理由/)
  assert.doesNotMatch(markdown, /候选四/)
})

test('钉钉 Webhook 支持签名并检查响应', async () => {
  let sent
  const result = await sendDingTalkMarkdown({
    webhook: 'https://oapi.dingtalk.com/robot/send?access_token=demo',
    secret: 'sign-secret', now: 123456, markdown: '# 测试',
    fetchImpl: async (url, options) => {
      sent = { url: new URL(url), body: JSON.parse(options.body) }
      return { ok: true, json: async () => ({ errcode: 0, messageId: 'm1' }) }
    },
  })
  const expected = createHmac('sha256', 'sign-secret').update('123456\nsign-secret').digest('base64')
  assert.equal(sent.url.searchParams.get('timestamp'), '123456')
  assert.equal(sent.url.searchParams.get('sign'), expected)
  assert.equal(sent.body.msgtype, 'markdown')
  assert.equal(result.status, 'sent')
})

test('未配置 Webhook 时安全跳过，失败响应会报错', async () => {
  assert.deepEqual(await sendDingTalkMarkdown({ webhook: '', markdown: 'test' }), { status: 'skipped', reason: 'missing_webhook' })
  await assert.rejects(sendDingTalkMarkdown({
    webhook: 'https://example.com/hook', markdown: 'test',
    fetchImpl: async () => ({ ok: true, json: async () => ({ errcode: 310000, errmsg: 'invalid token' }) }),
  }), /invalid token/)
})

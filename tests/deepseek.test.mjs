import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateTrendsWithDeepSeek } from '../core/research/deepseek.mjs'

const trend = { id: 'web:test', title: '一本书如何改变人的生活', summary: '一篇讨论阅读与成长的文章。' }

test('DeepSeek 评估器要求 API Key', async () => {
  await assert.rejects(evaluateTrendsWithDeepSeek([trend], { apiKey: '' }), /DEEPSEEK_API_KEY/)
})

test('DeepSeek 结构化结果回填三项编辑信号', async () => {
  let request
  const result = await evaluateTrendsWithDeepSeek([trend], {
    apiKey: 'test-key',
    fetchImpl: async (url, options) => {
      request = { url, options }
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({
          results: [{ id: 'web:test', resonance: 4.5, expansion: 4, accountFit: 5, reason: '与阅读成长主题相关。' }],
        }) } }] }),
      }
    },
  })
  assert.equal(request.url, 'https://api.deepseek.com/chat/completions')
  assert.equal(request.options.headers.authorization, 'Bearer test-key')
  assert.equal(result.evaluatedCount, 1)
  assert.deepEqual(result.items[0].editorialSignals, { resonance: 4.5, expansion: 4, accountFit: 5 })
  assert.equal(result.items[0].editorialRationale, '与阅读成长主题相关。')
})

test('DeepSeek 错误状态和无效 JSON 会明确失败', async () => {
  const failing = () => evaluateTrendsWithDeepSeek([trend], {
    apiKey: 'test-key', fetchImpl: async () => ({ ok: false, status: 429 }),
  })
  await assert.rejects(failing(), /HTTP 429/)
  const invalid = () => evaluateTrendsWithDeepSeek([trend], {
    apiKey: 'test-key', fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'not-json' } }] }) }),
  })
  await assert.rejects(invalid(), /有效 JSON/)
})

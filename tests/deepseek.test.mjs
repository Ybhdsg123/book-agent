import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateTrendsWithDeepSeek } from '../core/research/deepseek.mjs'

const trend = { id: 'web:test', title: '一本书如何改变人的生活', summary: '一篇讨论阅读与成长的文章。' }

test('DeepSeek 评估器要求 API Key', async () => {
  await assert.rejects(evaluateTrendsWithDeepSeek([trend], { apiKey: '' }), /DEEPSEEK_API_KEY/)
})

test('DeepSeek 结构化结果回填选题策划字段，书名只能从书库匹配', async () => {
  const bookCatalog = [{ title: '被讨厌的勇气', author: '岸见一郎、古贺史健', edition: '示例版' }]
  const result = await evaluateTrendsWithDeepSeek([trend], {
    apiKey: 'test-key', bookCatalog,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({
        results: [{
          id: 'web:test', resonance: 4.5, expansion: 4, accountFit: 5,
          topicTitle: '为什么越想被所有人喜欢，越容易失去自己',
          bookTitle: '被讨厌的勇气', contentFormat: 'quote_cards', plannedImageCount: 5,
          reason: '与阅读成长主题相关。',
        }],
      }) } }] }),
    }),
  })
  assert.equal(result.evaluatedCount, 1)
  assert.equal(result.items[0].bookTitle, '被讨厌的勇气')
  assert.equal(result.items[0].bookAuthor, '岸见一郎、古贺史健')
  assert.equal(result.items[0].contentFormat, 'quote_cards')
  assert.equal(result.items[0].plannedImageCount, 5)
  assert.equal(result.items[0].topicTitle, '为什么越想被所有人喜欢，越容易失去自己')
})

test('不在书库中的模型书名不得进入选题结果', async () => {
  const result = await evaluateTrendsWithDeepSeek([trend], {
    apiKey: 'test-key',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({
        results: [{ id: 'web:test', bookTitle: '模型随意编造的书名', plannedImageCount: 99, contentFormat: 'unknown' }],
      }) } }] }),
    }),
  })
  assert.equal(result.items[0].bookTitle, '')
  assert.equal(result.items[0].plannedImageCount, null)
  assert.equal(result.items[0].contentFormat, '')
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

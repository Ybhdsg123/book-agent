import test from 'node:test'
import assert from 'node:assert/strict'
import { createVisualBrief, generatePosterWithFallback } from '../core/posters/production.mjs'

test('Visual Brief extracts scene and preserves a consistent series style', () => {
  const brief = createVisualBrief({
    text: '读书让人保持清醒，也让人更有勇气面对生活。',
    contentType: 'quote-card',
    imageIndex: 1,
    imageCount: 3,
  })
  assert.equal(brief.visual.scene, 'open-book')
  assert.equal(brief.series.style, 'warm-editorial-illustration')
  assert.equal(brief.series.imageCount, 3)
  assert.match(brief.visual.textSafeArea, /中文/)
})

test('AI provider success uses AI engine', async () => {
  const brief = createVisualBrief({ text: '一段可排版的金句' })
  const result = await generatePosterWithFallback({
    brief,
    aiRenderer: async () => ({ bytes: 'image-data' }),
  })
  assert.equal(result.engine, 'ai')
  assert.equal(result.status, 'generated')
})

test('missing or failed AI provider falls back to code renderer', async () => {
  const brief = createVisualBrief({ text: '成长需要勇气' })
  const missing = await generatePosterWithFallback({ brief, codeRenderer: () => '<svg>fallback</svg>' })
  assert.equal(missing.engine, 'code')
  assert.equal(missing.status, 'fallback')
  assert.match(missing.fallbackReason, /未配置/)

  const failed = await generatePosterWithFallback({
    brief,
    aiRenderer: async () => { throw new Error('provider timeout') },
    codeRenderer: () => '<svg>fallback</svg>',
  })
  assert.equal(failed.engine, 'code')
  assert.equal(failed.fallbackReason, 'provider timeout')
  assert.match(failed.result, /fallback/)
})

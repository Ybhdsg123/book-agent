import test from 'node:test'
import assert from 'node:assert/strict'
import { chooseScene, renderPosterBatch, renderQuotePoster, wrapText } from '../core/posters/render.mjs'

test('代码生成 3:4 SVG 贴图，正文和书籍信息可见', () => {
  const svg = renderQuotePoster({
    title: '成长札记', quote: '读书不是为了逃离生活，而是为了更清醒地走进生活。',
    author: '作者', book: '书名',
  })
  assert.match(svg, /<svg/)
  assert.match(svg, /viewBox="0 0 900 1200"/)
  assert.match(svg, /读书不是为了逃离生活/)
  assert.match(svg, /书名/)
  assert.match(svg, /open-book|sunrise|window/)
})

test('SVG 文本会转义，空正文和无效画布尺寸会报错', () => {
  const svg = renderQuotePoster({ quote: 'A < B & C' })
  assert.match(svg, /A &lt; B &amp; C/)
  assert.throws(() => renderQuotePoster({ quote: '' }), /不能为空/)
  assert.throws(() => renderQuotePoster({ quote: '正文', width: 100 }), /尺寸无效/)
})

test('自动场景选择、长文本换行和批量统一风格', () => {
  assert.equal(chooseScene('关于阅读和书籍的思考'), 'open-book')
  assert.equal(chooseScene('孤独时学会独处'), 'window')
  assert.ok(wrapText('一二三四五六七八九十', 4).length >= 3)
  const batch = renderPosterBatch([
    { quote: '阅读让人保持清醒' },
    { quote: '成长需要勇气' },
  ])
  assert.equal(batch.length, 2)
  assert.equal(batch[0].scene, 'open-book')
  assert.equal(batch[1].scene, 'sunrise')
  assert.ok(batch.every((item) => item.svg.includes('#F6F0E6')))
  const sage = renderQuotePoster({ quote: '一段话', theme: 'sage-paper' })
  assert.match(sage, /#EEF0E7/)
})

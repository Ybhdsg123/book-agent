import { renderScene } from './scenes.mjs'

export const POSTER_THEMES = Object.freeze({
  'warm-paper': { background: '#F6F0E6', paper: '#FBF8F1', ink: '#38342E', muted: '#82786C', accent: '#A86F50', border: '#D9CEBD' },
  'sage-paper': { background: '#EEF0E7', paper: '#F8F9F3', ink: '#343A33', muted: '#727D6D', accent: '#788A70', border: '#CBD2C3' },
  'clay-paper': { background: '#F2E7DE', paper: '#FBF5EF', ink: '#40342F', muted: '#89756B', accent: '#B4775E', border: '#DCC8B9' },
  'blue-paper': { background: '#EAF0F0', paper: '#F7FAF8', ink: '#303A3D', muted: '#6D7C7D', accent: '#6D8C91', border: '#C8D5D4' },
})

export function chooseScene(text = '') {
  const value = String(text)
  if (/书|阅读|读书|知识|学习/.test(value)) return 'open-book'
  if (/成长|改变|开始|希望|未来|勇气/.test(value)) return 'sunrise'
  if (/孤独|独处|安静|边界|自我/.test(value)) return 'window'
  if (/关系|朋友|陪伴|爱|沟通/.test(value)) return 'bridge'
  if (/坚持|努力|目标|一步|路/.test(value)) return 'stairs'
  if (/温柔|照顾|生活|日常/.test(value)) return 'plant'
  if (/思考|灵感|夜晚|时间/.test(value)) return 'lamp'
  return 'reading-chair'
}

export function wrapText(value, maxChars = 20) {
  const paragraphs = String(value).split(/\r?\n/)
  const lines = []
  for (const paragraph of paragraphs) {
    const chars = Array.from(paragraph.trim())
    if (!chars.length) { lines.push(''); continue }
    for (let index = 0; index < chars.length; index += maxChars) lines.push(chars.slice(index, index + maxChars).join(''))
  }
  return lines
}

export function renderQuotePoster({
  title = '阅读札记',
  quote,
  body,
  author = '',
  book = '',
  theme = 'warm-paper',
  scene = 'auto',
  width = 900,
  height = 1200,
} = {}) {
  const text = String(quote || body || '').trim()
  if (!text) throw new Error('贴图正文不能为空')
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 300 || height < 400) throw new Error('画布尺寸无效')
  const palette = POSTER_THEMES[theme] || POSTER_THEMES['warm-paper']
  const lines = wrapText(text, 20)
  const fontSize = lines.length > 10 ? 28 : lines.length > 7 ? 34 : 42
  const lineHeight = Math.round(fontSize * 1.48)
  const startY = Math.max(310, Math.round((height - lines.length * lineHeight) / 2) - 20)
  const quoteLines = lines.map((line, index) => `<tspan x="450" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join('')
  const selectedScene = scene === 'auto' ? chooseScene(text) : scene
  const sceneMarkup = renderScene(selectedScene, { x: 286, y: height - 300, scale: 0.92 })
  const footer = [book, author].filter(Boolean).join(' · ')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">
  <rect width="100%" height="100%" fill="${palette.background}"/>
  <rect x="34" y="34" width="${width - 68}" height="${height - 68}" rx="8" fill="${palette.paper}" stroke="${palette.border}" stroke-width="2"/>
  <path d="M92 142H808" stroke="${palette.border}" stroke-width="2"/>
  <text x="92" y="112" font-family="Noto Serif SC, Songti SC, serif" font-size="22" letter-spacing="4" fill="${palette.muted}">${escapeXml(title)}</text>
  <text x="92" y="250" font-family="Georgia, serif" font-size="112" fill="${palette.accent}" opacity=".75">“</text>
  <text x="450" y="${startY}" text-anchor="middle" font-family="Noto Serif SC, Songti SC, serif" font-size="${fontSize}" font-weight="500" fill="${palette.ink}">${quoteLines}</text>
  <path d="M370 ${height - 330}H530" stroke="${palette.accent}" stroke-width="3" stroke-linecap="round"/>
  ${sceneMarkup}
  <text x="450" y="${height - 94}" text-anchor="middle" font-family="Noto Sans SC, sans-serif" font-size="19" fill="${palette.muted}">${escapeXml(footer || '读书 · 思考 · 生活')}</text>
  <text x="450" y="${height - 62}" text-anchor="middle" font-family="Georgia, serif" font-size="13" letter-spacing="3" fill="${palette.border}">READING NOTES</text>
</svg>`
}

export function renderPosterBatch(items, { theme = 'warm-paper' } = {}) {
  if (!Array.isArray(items)) throw new TypeError('items 必须是数组')
  return items.map((item, index) => ({
    index, scene: item.scene === 'auto' || !item.scene ? chooseScene(item.quote || item.body || '') : item.scene,
    svg: renderQuotePoster({ ...item, theme }),
  }))
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

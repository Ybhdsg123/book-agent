import { renderQuotePoster } from './render.mjs'

/**
 * Build a reusable visual brief for one image in a consistent content series.
 * The brief is engine-neutral: both AI and code renderers consume the same plan.
 */
export function createVisualBrief({
  title = '阅读札记',
  text,
  contentType = 'quote-card',
  seriesStyle = 'warm-editorial-illustration',
  palette = 'warm-paper',
  aspectRatio = '3:4',
  scene = 'auto',
  subject = '',
  mood = '',
  imageIndex = 0,
  imageCount = 1,
} = {}) {
  const copy = String(text || '').trim()
  if (!copy) throw new Error('visual brief 正文不能为空')
  const resolvedScene = scene === 'auto' ? inferScene(copy, contentType) : scene
  return Object.freeze({
    title,
    text: copy,
    contentType,
    series: { style: seriesStyle, palette, imageIndex, imageCount },
    visual: {
      scene: resolvedScene,
      subject: subject || resolvedScene,
      mood: mood || inferMood(copy),
      composition: contentType === 'quote-card' ? '文字为主，插画辅助，保留明确文字安全区' : '主体清晰，环境服务于内容',
      material: '纸张肌理、克制手绘插画、柔和自然光',
      aspectRatio,
      textSafeArea: '画面上部或中部预留完整中文排版区域',
    },
    avoid: ['错误中文', '水印', '无关装饰', '拥挤构图', '系列画风突变', '未经核实的书籍封面或人物肖像'],
  })
}

/**
 * AI renderer is injected by a provider adapter. If it is missing or fails,
 * the existing deterministic SVG renderer is used with the same visual brief.
 */
export async function generatePosterWithFallback({
  brief,
  aiRenderer,
  codeRenderer = renderQuotePoster,
  codeOptions = {},
} = {}) {
  if (!brief?.text) throw new Error('缺少有效 visual brief')
  if (typeof aiRenderer === 'function') {
    try {
      const result = await aiRenderer(brief)
      if (result) return { engine: 'ai', status: 'generated', result, brief, fallbackReason: null }
      throw new Error('AI Provider 未返回图片结果')
    } catch (error) {
      const fallbackReason = error instanceof Error ? error.message : String(error)
      const result = codeRenderer({
        title: brief.title,
        quote: brief.text,
        theme: brief.series?.palette || 'warm-paper',
        scene: brief.visual?.scene || 'auto',
        ...codeOptions,
      })
      return { engine: 'code', status: 'fallback', result, brief, fallbackReason }
    }
  }
  const result = codeRenderer({
    title: brief.title,
    quote: brief.text,
    theme: brief.series?.palette || 'warm-paper',
    scene: brief.visual?.scene || 'auto',
    ...codeOptions,
  })
  return {
    engine: 'code',
    status: 'fallback',
    result,
    brief,
    fallbackReason: '未配置可用的 AI 图像 Provider',
  }
}

function inferScene(text, type) {
  if (type === 'knowledge-explainer') return 'diagram'
  if (/书|阅读|读书|知识|学习/.test(text)) return 'open-book'
  if (/成长|改变|开始|希望|未来|勇气/.test(text)) return 'sunrise'
  if (/孤独|独处|安静|边界|自我/.test(text)) return 'window'
  if (/关系|朋友|陪伴|爱|沟通/.test(text)) return 'bridge'
  if (/坚持|努力|目标|一步|路/.test(text)) return 'stairs'
  if (/温柔|照顾|生活|日常/.test(text)) return 'plant'
  return 'reading-chair'
}

function inferMood(text) {
  if (/孤独|失去|遗憾|难过/.test(text)) return '安静、克制、略带沉思'
  if (/希望|成长|勇气|开始/.test(text)) return '温暖、明亮、有希望'
  if (/爱|陪伴|温柔|关系/.test(text)) return '柔和、亲近、有人情味'
  return '平静、清醒、有余味'
}

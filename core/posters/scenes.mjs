const line = 'fill="none" stroke="#8C7966" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"'
const accent = '#B77B5A'
const leaf = '#8C9B7B'

export const SCENE_NAMES = Object.freeze(['window', 'open-book', 'plant', 'lamp', 'stairs', 'bridge', 'sunrise', 'reading-chair'])

const renderers = {
  window: () => `<g ${line}><rect x="72" y="22" width="180" height="132" rx="4"/><path d="M162 22v132M72 88h180"/><path d="M93 58c22-30 48-30 68 0M181 116c18-25 38-25 54 0" stroke="${leaf}"/><path d="M50 170h225" stroke="#C8BBA8"/></g>`,
  'open-book': () => `<g ${line}><path d="M38 58c42-14 82-8 124 18v94c-42-26-82-32-124-18z" fill="#E8DDCC"/><path d="M286 58c-42-14-82-8-124 18v94c42-26 82-32 124-18z" fill="#F0E7D9"/><path d="M162 76v94M57 83c27-6 54-1 82 12M57 108c27-6 54-1 82 12M267 83c-27-6-54-1-82 12M267 108c-27-6-54-1-82 12" stroke="#B9A993"/><path d="M32 178c72-18 125-7 130 0 5-7 58-18 130 0" stroke="${accent}"/></g>`,
  plant: () => `<g ${line}><path d="M158 174V58M158 110c-52 2-76-25-68-55 35 1 62 17 68 55z" fill="#DCE2D2" stroke="${leaf}"/><path d="M158 92c10-47 43-65 74-53 1 33-22 56-74 53z" fill="#E7EBDD" stroke="${leaf}"/><path d="M158 133c-34-25-58-18-66 6 20 22 45 25 66-6z" fill="#DCE2D2" stroke="${leaf}"/><path d="M121 174h74l-9 28h-56z" fill="#D8BBA3" stroke="${accent}"/></g>`,
  lamp: () => `<g ${line}><path d="M152 34h28l36 66h-100z" fill="#E7D8C5" stroke="${accent}"/><path d="M166 100v66M136 166h60" /><path d="M114 112c-10 15-14 30-14 45M218 112c10 15 14 30 14 45" stroke="#C8A27E" stroke-dasharray="4 8"/><path d="M128 202h76" stroke="#C8BBA8"/></g>`,
  stairs: () => `<g ${line}><path d="M42 178h58v-28h58v-28h58V94h58" /><path d="M42 178v-22h58v-28h58v-28h58V72h58" stroke="${accent}"/><path d="M42 178h250" stroke="#C8BBA8"/><circle cx="264" cy="48" r="14" fill="#E8D2B9" stroke="${accent}"/></g>`,
  bridge: () => `<g ${line}><path d="M35 156c48-72 92-72 130 0 38-72 82-72 130 0" /><path d="M35 156h260M82 156v-30M122 156v-48M202 156v-48M242 156v-30" stroke="${accent}"/><path d="M28 178h274" stroke="#C8BBA8"/><path d="M75 78c16-15 33-15 49 0M202 72c17-17 35-17 52 0" stroke="${leaf}"/></g>`,
  sunrise: () => `<g ${line}><circle cx="162" cy="98" r="42" fill="#EAD4B8" stroke="${accent}"/><path d="M35 166c42-42 82-42 124 0 42-42 82-42 124 0" stroke="${leaf}"/><path d="M28 180h270M55 70l-16-12M270 70l16-12M162 30V10" stroke="#C8BBA8"/></g>`,
  'reading-chair': () => `<g ${line}><path d="M92 82h118v74H92z" fill="#E5D8C8"/><path d="M82 156h138v24H82z" fill="#D6C2AD" stroke="${accent}"/><path d="M100 180v22M203 180v22M91 82V55c0-14 10-22 23-22h74c13 0 22 8 22 22v27" /><path d="M128 104c15-12 31-12 46 0v35h-46z" fill="#F3EBDD" stroke="#B9A993"/><path d="M139 116h24" stroke="${accent}"/></g>`,
}

export function renderScene(name = 'window', { x = 0, y = 0, scale = 1 } = {}) {
  const renderer = renderers[name] || renderers.window
  return `<g transform="translate(${x} ${y}) scale(${scale})" aria-label="${name} illustration">${renderer()}</g>`
}

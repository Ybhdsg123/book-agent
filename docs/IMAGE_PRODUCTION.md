# 公众号图片生产：AI 优先 + 代码兜底

本项目吸收了归藏材质插画 Skill 中值得复用的方法：先理解内容、判断图像类型、建立统一视觉规范、为每张图写 Visual Brief、最后执行 QA。我们只借鉴通用工作流思想，不复制其素材或默认视觉风格。

## 生产链路

`内容输入 → 内容理解 → 图像类型路由 → 系列视觉规范 → 逐张 Visual Brief → AI Provider → 代码兜底 → 中文排版 → QA → 产物与元数据`

### 引擎策略

- AI 生图可用时优先调用 AI Provider。
- 没有 Provider、没有 Key、超时、限流、额度不足或服务报错时，切换现有 SVG 代码渲染器。
- 两种引擎使用同一份 Visual Brief，避免 AI 与代码生成各做各的。
- 中文长文案由排版层叠加，避免模型生成错字。
- 当前仓库已有确定性 SVG 引擎；尚未配置真实 AI 图像 Provider。因此当前运行默认会走代码兜底，不会假称 AI 图片已生成。

## 代码入口

- Skill 规范：`skills/image-production/SKILL.md`
- 视觉方案：`core/posters/production.mjs` 的 `createVisualBrief()`
- 引擎选择与兜底：`generatePosterWithFallback()`
- 现有代码渲染器：`core/posters/render.mjs`
- CLI：`npm run poster:render -- input.json output-dir`

AI Provider 通过函数注入：`aiRenderer(brief)`。接入具体模型时，应新增独立 Provider Adapter，将模型响应转换为统一图片结果；不要把某家模型、Key 或 endpoint 写死在贴图业务逻辑中。

## QA 验收项

1. 输出比例和像素尺寸符合目标平台要求。
2. 中文文字准确、没有乱码、没有溢出或遮挡。
3. 主要主体完整，不被裁切；文字与主体保持安全距离。
4. 同一选题字体、色彩关系、材质语言和留白规则一致。
5. 每张图有语义差异，避免同一场景机械复用。
6. 无水印、无无关元素、无虚构书籍信息。
7. 记录引擎、Provider、模型、Visual Brief、fallback 原因和 QA 结果。

## 当前能力边界

目前已实现引擎无关的 Visual Brief 和 AI 失败时的代码兜底编排；真实 AI 生图 Provider 尚未接入，因此不能把本次提交描述为 AI 生图 API 已打通。当前默认代码引擎仍是 SVG。

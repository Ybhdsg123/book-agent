# Book Agent

面向图书类微信公众号的内容研究与创作 Agent。目标是把公开信息发现、来源核验、选题评分、内容二创、贴图生成和人工审核串成可运行流程。

## 当前可运行能力

- 统一热点数据结构、独立 Adapter 采集、跨来源去重和评分。
- Google News RSS 公开信息发现 Adapter（真实网络请求，非模拟数据）。
- SVG 代码贴图生成：暖纸感、鼠尾草、陶土、雾蓝 4 种克制配色主题，包含轻量语义场景组件。
- 图片生产采用 **AI 生图优先、代码生成兜底** 的可插拔设计；当前已有 SVG 代码引擎和统一 Visual Brief/兜底编排，真实 AI 图像 Provider 尚未接入，因此当前默认使用代码引擎。
- 可选 DeepSeek 结构化研究：为候选补充情绪共鸣、内容延展性、账号适配度，并保留理由；缺少 API Key 时自动跳过。
- 每轮生成 JSON + Markdown 报告，保留来源链接、采集时间、证据级别、评分覆盖率。
- Node.js 内置测试和 GitHub Actions CI。

## 图片生产

图片生产先理解内容、判断图像类型、建立系列视觉规范，再为每张图片生成 Visual Brief。AI Provider 可用时优先调用；未配置、Key 缺失、超时、限流或服务异常时自动回退 SVG 代码渲染。中文长文案由统一排版层负责，避免生图模型直接写中文产生错字。

- Skill 规范：`skills/image-production/SKILL.md`
- 工作流与验收：`docs/IMAGE_PRODUCTION.md`
- Visual Brief 与引擎兜底：`core/posters/production.mjs`
- SVG 渲染器：`core/posters/render.mjs`

默认视觉倾向温暖纸张、克制编辑式插画、轻手绘质感和留白；同一选题保持风格家族一致，但场景根据每句内容变化。知识解释图可以使用材质化 3D/结构图，不把所有图书内容强行做成 3D 图解。

## 环境要求

- Node.js 20+。本地可复制 `.env.example` 为 `.env`，脚本会自动读取；`.env` 已加入 Git 忽略规则。
- npm（当前无第三方运行时依赖）

## 运行

```bash
npm test
npm run hotspots:collect
npm run poster:render -- ./input.json ./data/posters
```

报告写入 `data/reports/`。配置 `RSSHUB_BASE_URL` 后可启用 RSSHub 路由（默认包含微博热搜、B站热搜/综合热门、豆瓣图书榜；需自建或可信实例）；可用 `RSSHUB_ROUTES` JSON 覆盖路由。将确认过的书籍信息维护在 `books/catalog.json`（参考 `books/catalog.example.json`）；DeepSeek 只能从该书库中匹配书名，不能凭空生成书籍。配置 `DEEPSEEK_API_KEY` 后会调用 DeepSeek 做内容维度分析；配置 `DINGTALK_BOT_WEBHOOK`（加签机器人同时配置 `DINGTALK_BOT_SECRET`）后会将前三条候选推送到钉钉群机器人。以上均通过 GitHub Actions Secrets 配置，不写入仓库。GitHub Actions 的每日任务按北京时间 09:00 运行，并将报告保存为 14 天有效的工作流 Artifact。默认搜索图书、阅读、心理成长、作家、书评等主题。可通过 `HOTSPOT_RSS_FEEDS` 增加自定义 RSS URL（多个 URL 用英文逗号分隔）。

## 证据边界

当前 RSS Adapter 从 Google News RSS 搜索公开网页资讯，条目统一标记为 `platform: web`、`evidenceLevel: search_result`。它不是微博、豆瓣、微信公众号、小红书、B站或 X 的原生热榜 API，也不代表这些平台的真实热度。原始网页仍需在深度研究阶段打开核验。RSS 不提供的阅读量、播放量、互动量和增长率保持为空，不编造。

六个平台的官方/授权 Connector、钉钉审核交互、微信公众号草稿箱写入和发布后数据回流尚未接通；RSSHub 仅是第三方公开 RSS 适配层，不能等同官方 API。需要对应平台 API 权限、服务凭据和部署环境后才能验收。每日 09:00 当前会生成 GitHub Actions 报告 Artifact；配置钉钉机器人 Secret 后可发送候选摘要。由于当前还未接入书籍匹配与内容形式策划，消息会明确标注关联书籍、内容形式和图片数待研究确定，不会编造。不要把 RSS 发现结果描述为平台原生热榜。

## 安全

不要把 `.env`、API Key、Cookie 或账号凭据提交到仓库。后续需要模型 API 时，通过部署环境 Secret 注入。

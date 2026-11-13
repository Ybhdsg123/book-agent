# Book Agent

面向图书类微信公众号的内容研究与创作 Agent。目标是把公开信息发现、来源核验、选题评分、内容二创、贴图生成和人工审核串成可运行流程。

## 当前可运行能力

- 统一热点数据结构、独立 Adapter 采集、跨来源去重和评分。
- Google News RSS 公开信息发现 Adapter（真实网络请求，非模拟数据）。
- 每轮生成 JSON + Markdown 报告，保留来源链接、采集时间、证据级别、评分覆盖率。
- Node.js 内置测试和 GitHub Actions CI。

## 环境要求

- Node.js 20+
- npm（当前无第三方运行时依赖）

## 运行

```bash
npm test
npm run hotspots:collect
```

报告写入 `data/reports/`。默认搜索图书、阅读、心理成长、作家、书评等主题。可通过 `HOTSPOT_RSS_FEEDS` 增加自定义 RSS URL（多个 URL 用英文逗号分隔）。

## 证据边界

当前 RSS Adapter 从 Google News RSS 搜索公开网页资讯，条目统一标记为 `platform: web`、`evidenceLevel: search_result`。它不是微博、豆瓣、微信公众号、小红书、B站或 X 的原生热榜 API，也不代表这些平台的真实热度。原始网页仍需在深度研究阶段打开核验。RSS 不提供的阅读量、播放量、互动量和增长率保持为空，不编造。

六个平台的官方/授权 Connector、LLM 深度研究、钉钉交互、微信公众号草稿箱写入、每日 09:00 部署任务和发布后数据回流尚未接通；需要对应平台 API 权限、服务凭据和部署环境后才能验收。不要把 RSS 发现结果描述为平台原生热榜。

## 安全

不要把 `.env`、API Key、Cookie 或账号凭据提交到仓库。后续需要模型 API 时，通过部署环境 Secret 注入。

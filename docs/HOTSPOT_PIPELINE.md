# 热点采集与选题评分

## 当前真实实现

- `core/hotspots/normalize.mjs`：统一字段、平台名、时间、链接、互动指标和证据级别。
- `core/hotspots/collector.mjs`：并行调用独立 Adapter，分别记录成功、部分成功、失败和无效条目。
- `core/hotspots/rss.mjs`：Google News RSS 公开资讯发现；真实 HTTP 请求，来源归类为 web/search_result。
- `core/hotspots/rsshub.mjs`：可选 RSSHub 适配层，默认包含微博热搜、B站热搜/综合热门、豆瓣图书榜；标记为 third_party。需要设置自建或可信 RSSHub 实例地址。
- `core/hotspots/dedupe.mjs`：按规范化 URL 和标题相似度聚类，保留多来源。
- `core/hotspots/scoring.mjs`：输出总分、分项、缺失信号、覆盖率和证据置信度。
- `core/research/deepseek.mjs`：可选调用 DeepSeek 评估共鸣、延展性和账号适配度，并生成选题标题、内容形式与图片数建议；关联书籍只能从 `books/catalog.json` 精确匹配，未命中则留空。书库条目结构为 `title`、`author`、`edition`、`isbn`，只添加已核对的书籍；示例文件默认为空数组。
- `scripts/collect-hotspots.mjs`：运行采集、研究、评分、去重并生成 JSON/Markdown 报告。

## 评分维度

| 维度 | 权重 | 评分依据 |
|---|---:|---|
| 平台内传播表现 | 25 | 榜单名次、阅读/播放/互动数据 |
| 增长趋势 | 20 | 不同采集时点的热度/互动变化 |
| 情绪共鸣 | 20 | 根据原始内容判断 |
| 内容延展性 | 15 | 能否与书籍观点、作者故事、阅读体验结合 |
| 公众号适配度 | 15 | 是否符合图书/成长/生活观点账号定位 |
| 时效性 | 5 | 采集时间与发布时间 |

每项 0–5 分，按已提供维度折算；同时输出 scoreCoverage。覆盖率低于 50% 标记为 insufficient_data，不进入钉钉推荐，避免单一时效信号造成虚高排序。缺失维度不填猜测值。平台热度原始值不跨平台直接比较；榜单名次只在同一平台榜单范围内解释。

## 证据级别

official_api、public_page、third_party、search_result、manual。搜索结果仅用于发现线索，不能替代原文核验。RSS 搜索结果不得伪装成某平台原生榜单。DeepSeek 只分析已提供的标题/摘要，不得生成缺失的事实、热度指标或书籍出处；模型信号与原始来源证据分开保留。

## RSS Adapter

```js
import { createRssAdapter } from './core/hotspots/rss.mjs'
const adapter = createRssAdapter({ id: 'my-feed', url: 'https://example.com/rss.xml' })
```

## 代码贴图生成

`core/posters/render.mjs` 与 `core/posters/scenes.mjs` 提供 3:4 SVG 贴图渲染和 8 种简约场景组件。通过 `npm run poster:render -- input.json data/posters` 批量生成 SVG；同一批次默认共享 warm-paper 主题，场景按文案语义自动选择。

## 尚未接入

豆瓣、微信公众号、微博、小红书、B站、X 的平台原生/授权 Connector；DeepSeek 内容研究；钉钉审核交互；微信公众号草稿箱写入；小红书与微信公众号的通用热榜采集；发布数据回流。小红书 RSSHub 路由目前是用户笔记/收藏订阅而非通用热榜，且可能需要 Cookie/浏览器运行环境；微信公众号 RSSHub 路由依赖新榜账号配置；X/Twitter Trends 路由依赖开发者 API 配置。不要把这些配置要求包装成开箱即用。接入时优先官方 API、公开页面和用户授权，不实现验证码绕过、Cookie 池、账号轮换或规避访问控制。

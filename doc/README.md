# 项目文档索引

> 先看这页，再翻具体文件。代码里的令牌以 `src/theme/layout.ts` 为准，文档只解释“为什么”。

## 产品与设计

| 文件 | 内容 |
|---|---|
| `play-detail-tokens.md` | 播放页设计令牌表（封面 338 / 圆角 20 / 播放键 70 / 工具行 42·24），含“封面必须量容器”的实测数据 |
| `ios-ui-review-2026-09-29.md` | 早前的 iOS UI 评审与多轮 craft 记录（对比度、玻璃层级、图标尺寸） |
| `planning/` | 规划与进度留档：`task_plan.md`、`findings.md`、`progress.md`（会话历史，不是规范） |

## 设计探索（`../design-demos/`）

| 文件 | 内容 |
|---|---|
| `direction-approved.md` | 三方向门记录、用户选定 A、落地进度表 |
| `header-decision.md` | 顶栏 V1/V2/V3 对比与取舍（当前实现：返回 · 歌名 · 倍速 · 规格胶囊 · …） |
| `toolbar-decision.md` | 工具行「图标架 vs 芯片」取舍（保留 8 图标 + 发丝线） |
| `shots/` | 三方向与两份研究的 1x 截图 |

## 工程

| 位置 | 内容 |
|---|---|
| `npm run check` | tsc + 三语 i18n 键一致性，CI（`ios-ipa.yml`）已接入 |
| `npm run lint` | ESLint |
| `scripts/check-contrast.py` | 对比度实算（含自定义背景图的既有豁免项） |
| `src/screens/PlayDetail/components/controls/` | 播放页共享按钮 + 度量上下文（竖 42/24/0，横 32/22/7） |

## 只保留 iOS

- `android/`、安卓流水线与安卓脚本已删除；`babel.config.js` 只保留 `.ios.*` 解析后缀。
- 发布走 `.github/workflows/ios-ipa.yml`（未签名 IPA + 可选签名）。
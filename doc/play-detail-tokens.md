# 播放页设计令牌（方向 A · 光学玻璃）

> 改播放页之前先看这页。所有数值都有唯一出处，不要在组件里写死。

## 1. 令牌表

| 令牌 | 值 | 出处 | 用在哪 |
|---|---|---|---|
| `Radius.hero` | 20 | `src/theme/layout.ts` | 播放页封面（338pt 大图用 12pt 会像被裁切的矩形） |
| `Radius.card` | 12 | 同上 | 列表卡、面板 |
| `Radius.sheet` | 16 | 同上 | 底部弹层 |
| `PlayMetrics.coverInset` | 26 | 同上 | 封面左右留白（宽度 = 屏宽 − 52） |
| `PlayMetrics.coverHeightRatio` | 0.46 | 同上 | 短屏兜底：封面不超过可用高度的 46% |
| `PlayMetrics.playSize/Min/Max` | 70 / 62 / 74 | 同上 | 播放键直径，随全局字号联动后被上下限夹住 |
| `ControlMetrics.size` | 竖 42 / 横 32 | `screens/PlayDetail/components/controls/Metrics.tsx` | 工具行按钮命中区 |
| `ControlMetrics.iconSize` | 竖 24 / 横 22 | 同上 | 工具行图标原始尺寸 |
| `ControlMetrics.marginBottom` | 竖 0 / 横 7 | 同上 | 横屏侧栏的行间距 |
| `Typography.page/body/compact/sub` | 17 / 15 / 13 / 12 | `layout.ts` | 页面标题 / 正文 / 紧凑 / 次要 |
| `TabularNums` | `font-variant-numeric` | `layout.ts` | 时间、码率、进度读数 |

## 2. 三条使用规则

1. **封面尺寸只从 `PlayMetrics` 取**。不要在组件里写 `winWidth * 0.8`：百分比会让留白随机型漂移，390 上是 39pt、430 上是 43pt，视觉重心跟着跑。
   **高度上限必须量容器**（`Pic.tsx` 的 `onLayout`），不能用「窗口高 − 状态栏 − 顶栏」推算：播放器区在短屏上占掉约 346pt，推算值会比真实分页区高 47pt（375×667 实测：推算 278 vs 实际 231），封面会压到进度条上。
2. **圆角跟控件高度走**：小控件 8、按钮 10、卡片 12、封面 20、弹层 16、正圆 999。同一行里的控件必须落在同一档，否则一行里同时出现“胶囊”和“方角输入框”，读起来是两套设计。
3. **工具行尺寸只能通过 Provider 改**。竖屏与横屏共用一份实现（`controls/` 六个按钮 + `Btn`），差异只有 `METRICS` 那三个数；直接改组件里的数值会让另一端跟着变。

## 3. 层级顺序（竖屏）

```
Header（玻璃条）→ 封面/歌词分页 → 指示条 → StreamInfo → PreviewLyric
→ Progress → ControlBtn → ── 发丝线 ── → MoreBtn
```

依据：`design-demos/direction-approved.md`（用户选定 A）。改顺序前先看那页，别只改一处。

## 4. 已知边界

- 播放页读数区只显示**真实已有**的数据（音源、音质档、体积）；采样率/位深属于原生 STREAMINFO，尚未透出到 JS，**不拿档位名冒充码率**。
- 自定义背景图主题下正文对比度存在既有豁免（见 `scripts/check-contrast.py` 输出），不是本轮引入。
- 工具行保留 8 个图标而非芯片组，理由与推翻条件在 `design-demos/toolbar-decision.md`。
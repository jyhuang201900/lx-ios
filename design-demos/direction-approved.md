# 方向确认（Gate）

- 项目：听歌（lx-music-mobile-ios-adaptation，仅保留 iOS）
- 会话：2026-11-12
- 展示内容：三个方向的完整播放页
  - A · 光学玻璃 — `design-demos/direction-a-optics.html` · 截图 `design-demos/shots/direction-a-optics.png`
  - B · 唱片档案 — `design-demos/direction-b-archive.html` · 截图 `design-demos/shots/direction-b-archive.png`
  - C · 声场仪表 — `design-demos/direction-c-instrument.html` · 截图 `design-demos/shots/direction-c-instrument.png`
  - 展示板 — `design-demos/index.html`
- 用户选择原话：`A · 光学玻璃（推荐）`
- 决定：播放页按 A 实现；其余页面不换语言，只做与 A 同源的令牌与控件收敛。
- 说明：本次不再重新探索方向。后续如需改语言，重新走三方向门。

## 落地进度（2026-11-12）

| 项 | 状态 | 证据 |
|---|---|---|
| 仅保留 iOS | 完成 | 删除 `android/`、3 条安卓流水线、8 条安卓脚本；`tsc`/i18n 通过 |
| 封面 338 / 圆角 20 / 光晕 0.10 | 完成 | `Pic.tsx` · `Radius.hero` · `PlayMetrics` |
| 封面短屏自适应（量容器） | 完成 | `Pic.tsx` `onLayout`；375×667：推算 278 → 实测 231 |
| 播放键 70（62–74） | 完成 | `ControlBtn.tsx` |
| 进度 2pt + 光点、时间 11pt | 完成 | `ProgressBar.tsx` · `PlayInfo.tsx` |
| 层级：进度 → 控制 → 发丝线 → 工具行 | 完成 | `Vertical/Player/index.tsx` |
| 两行歌词预览 | 完成 | `PreviewLyric.tsx` |
| 采样率/位深真实读数 | 完成 | 原生 `emitState` → `streamingFlac` → `StreamInfo`（值为 0 不显示） |
| 工具行共享实现 + 度量 | 完成 | `controls/`（6 按钮 + `Btn` + `Metrics`），删除 11 个重复文件 |
| 顶栏：返回/歌名/倍速/胶囊/… | 完成 | `Header.tsx`；音效/定时/设置进面板 |
| 顶栏 V2 原案（倍速也进「…」） | 暂缓 | `Menu` 只有平铺项，二级需改菜单 API；倍速是下拉选择器，暂留顶栏 |
| 真机/模拟器视觉复核 | 未做 | 本机无 iOS 模拟器；以 390×844 镜像截图 + 常量核算代替 |
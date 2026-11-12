# 版式镜像：没有 Mac 也能看真实画面

## 为什么要有这个目录

iOS 模拟器只有 macOS 上有二进制（Xcode 的一部分）。Linux 和 Windows 上没有
等价物：这个仓库是 iOS-only 分支，连 `android/` 工程都没有，所以 Ubuntu
既跑不了 iOS 模拟器，也不能退一步跑 Android 模拟器。

结果是过去每改一行 UI 都要等 GitHub Actions 的 macos runner，一次 30 分钟起，
拉 20MB 的 artifact 又是十几分钟——迭代一圈的成本比改动本身还高。

这个目录把循环拆成两段：

| 阶段 | 在哪跑 | 耗时 | 验什么 |
|---|---|---|---|
| 版式迭代 | 本机 / Ubuntu，Chromium 截图 | 秒级 | 间距、字重、截断、对齐、层级 |
| 真机复核 | GitHub Actions 的 macos runner | 一次几十秒~几分钟（已缩图） | SF Pro 字面、safe area、滚动回弹、玻璃叠色 |

## 用法

```bash
# Windows（PowerShell 7）
./mirror/shoot.ps1                 # 402×874 @3x（iPhone 16 Pro）
./mirror/shoot.ps1 -Device se      # 375×667 @2x（SE 三）
./mirror/shoot.ps1 -Only home,chart

# Ubuntu
sudo apt install -y chromium-browser fonts-noto-cjk
./mirror/shoot.sh                  # 同上，参数照抄
./mirror/shoot.sh se
```

输出在 `mirror/shots/`（已 gitignore）。浏览器按顺序找 Chrome、Edge、Chromium。

## 这里的东西从哪来

`base.css` 里的每个数值都对着 `src/theme/layout.ts` 抄，不是随手调的：

| CSS 变量 | 源 |
|---|---|
| `--radius-*` | `src/theme/layout.ts:23-41` |
| `--gap-*` | `src/theme/layout.ts:88-94` |
| `--gutter` / `--toolbar-h` / `--control-h` | `src/theme/layout.ts:100-105` |
| `--fs-*` | `src/theme/layout.ts:216-223` |
| `--cover-inset` / `--play-size` | `src/theme/layout.ts:116-123` |
| 主题色 | `src/theme/themes/createThemes.js:7-24`（green） |

改了 `layout.ts` 就得同步改 `base.css`，否则镜像会骗人。这是这个目录唯一的
维护负担，也是它唯一的失效方式。

## 页面

| 文件 | 对应真机页 | 主要验什么 |
|---|---|---|
| `home.html` | 首页（搜索空态） | 工具栏四控件挤压、空态居中、迷你条双行、TabBar 选中态 |
| `chart.html` | 排行榜 | 音质 chip 定宽后歌手列是否对齐、行高与分割线 |
| `songlist.html` | 歌单三列 | 卡片 meta 拆两行后是否还截断 |
| `play-detail.html` | 播放详情 | 空封面 ♪ 与封面的比例、控制键与进度条节奏 |

## 它验证不了什么

- **字体**：Windows 退到 Microsoft YaHei，Ubuntu 退到 Noto Sans CJK，都不是
  SF Pro / PingFang。字面宽度和字重观感会有偏差，所以"某行刚好卡住/刚好不卡"
  这类临界判断必须回真机确认。
- **safe area 与状态栏**：镜像里状态栏只是 59pt 的空占位。
- **原生行为**：滚动回弹、FlatList 虚拟化、Modal 转场、玻璃材质在真机上的叠色。

结论：镜像用来"把明显不对的排掉"，真机用来"确认最后的临界值"。
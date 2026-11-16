# iOS 截图矩阵

模拟器截图回归的页面清单、进入方式和每页的验证目标。
**唯一事实来源是 `.github/workflows/ios-screenshots.yml` 里的 `shoot` 调用**（下表的「wf 行」列给出行号）；
本文档只是把它摊开成人能读的表，改了 workflow 记得回来同步。

## 1. 一张图是怎么来的

```
workflow_dispatch / push shoot 分支
  → macos-15 上 xcodebuild Release 打包（L99-114）
  → 逐机启动模拟器，装包，逐页冷启拍照（L118-374）
  → sips 统一缩到高 1748、转 q90 JPEG（L378-393）
  → artifact ios-screenshots + 推到 shots 分支（L395-446）
  → 本地 git fetch --depth 1 origin shots，解到 shots-gh/runNN/
```

- 默认两台机型（L143-147）：`iPhone 16 Pro`、`iPhone SE (3rd generation)`。
  小屏那份是专门为了看挤压和截断——同一套版式在两种宽度下才试得出来。
- 落地图统一高 1748（`sips -Z 1748`），宽度随机型：大屏 **804×1748**，SE **982×1748**。
  所以**只有同机型的两轮截图能逐像素比**，跨机型尺寸不同，`diff-check.py` 会走 `size` 分支而不是 `max`。
- 文件名 = `{机型 slug}-{页码}-{页名}.jpg`。slug 由 [ios-screenshots.yml:301](.github/workflows/ios-screenshots.yml) 生成：
  `tr ' ()/' '----' | tr -s '-' | tr 'A-Z' 'a-z'` →
  `iphone-16-pro` / `iphone-se-3rd-generation`（注意 SE 的 slug 后面是**两个**连字符再跟页码，因为 `(3rd generation)` 的括号也被换成 `-`）。

## 2. 每一页的共同前提

每页都是**冷启动**一次、拍完就杀进程，避免上一页的状态串到下一页（L250-269）。

| 项 | 值 | 出处 |
| --- | --- | --- |
| 基础设置 | `{"version":"2.0","common.isAgreePact":true,"common.langId":"zh_cn"}` | L193 `BASE_SETTING` |
| 首启弹窗 | `@cheat_tip:"true"`（绕开「谨防被骗」与许可协议两道闸门） | L187 |
| 每页先清 | `@list__demo` / `@play_info` / `@search_history_list` 三个 key 删掉再写 | L187 |
| 写入位置 | `.../RCTAsyncLocalStorage_V1/manifest.json` | L166-175 |
| 状态栏 | 时间 9:41、电量 100% 充电、WiFi 3 格、信号 4 格（消掉时间/信号造成的假差异） | L308-310 |
| 系统外观 | `simctl ui appearance dark`，但应用默认不跟随系统（`common.isAutoTheme=false`），浅色页仍是浅色 | L307、L348-350 |
| 落位方式 | 模拟器上点不了，只能靠预置存储：`common.startupNavId` 决定冷启落在哪个 Tab，`player.startupPushPlayDetailScreen` 决定是否直接推播放详情 | L191-192 |
| 空屏自检 | 截图 < 60000 B 视为黑屏/白屏，5 秒后重拍一次 | L259-267 |
| 启动失败处理 | `simctl launch` 没拿到 pid 就重试，最多 3 次 | L235-249 |

### 2.1 这些键在代码里读在哪

预置进存储只是写数据，真正让它生效的是下面这几处读取。改 key 名时两边一起看，否则截图会静默跑回默认页。

| 设置键 | 读取点 | 作用 |
| --- | --- | --- |
| `common.startupNavId` | [src/core/init/index.ts:66-69](src/core/init/index.ts) | 冷启时把 TabBar 选中项设成该 id（要求 id 在 `NAV_MENUS` 里） |
| `player.startupPushPlayDetailScreen` | [src/screens/Home/index.tsx:23](src/screens/Home/index.tsx) | 首页挂载后是否直接推播放详情 |
| `player.startupAutoPlay` | [src/core/init/player/playInfo.ts:17](src/core/init/player/playInfo.ts) | 冷启是否自动起播；截图里一律设 `false`，只塞状态不拉地址 |
| `common.startupSearchText` | [src/screens/Home/Views/Search/index.tsx:33,51](src/screens/Home/Views/Search/index.tsx) | 搜索页预填关键词（`searchState.searchText` 为空时才用），预填会自动触发搜索 → 结果页 |
| `search.isShowHotSearch` / `search.isShowHistorySearch` | [src/screens/Home/Views/Search/BlankView/index.tsx:25-53](src/screens/Home/Views/Search/BlankView/index.tsx) | 决定搜索页空态里挂热词还是历史。两个都 `false` 就是 01-home 那句「搜我所想」 |
| `theme.id` | [src/theme/themes/index.ts:250-260](src/theme/themes/index.ts)、默认 `'green'` 见 [src/config/defaultSetting.ts:100](src/config/defaultSetting.ts) | `'black'` 才是暗色；`'auto'` 才跟随系统，所以 workflow 里 `simctl ui appearance dark` 对浅色页没有影响 |

## 3. 页面矩阵

「冷启设置」列是**在 BASE_SETTING 之上追加的增量**，不是完整 JSON。

| # | 页名后缀 | 冷启设置（增量） | settle | 额外种子 | 这一页在验证什么 | wf 行 |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | `01-home` | `player.startupPushPlayDetailScreen:false` | 12s | — | 首页 / 聚合搜索的**空态**：顶部「聚合大会」入口、搜索框占位「搜我所想…」、中间空态插画与「搜我所想」文案、底部迷你播放条停在「未在播放 · 从搜索或歌单挑一首开始」、TabBar 五项齐全且不被安全区顶掉 | L331 |
| 02 | `02-home-settled` | 不重新 seed，沿用 01 的进程 | +5s | — | 同一屏**再等 5 秒**：首页背景（极光/几何层）与异步内容落定后是否和 12 秒那一帧一致。专门抓「12 秒还没稳定」的抖动 | L333（`simctl io` 直接拍，不是 `shoot`） |
| 03 | `03-play-detail` | `player.startupPushPlayDetailScreen:true` | 14s | — | 播放详情**无歌态**：返回箭头、标题「未在播放」、1.00x、大封面占位（♪）、进度条 00:00/00:00、播放/上一首/下一首、底部收藏/下载/评论/列表/排序图标 | L336 |
| 04 | `04-songlist` | `common.startupNavId:"nav_songlist"` | 10s | — | 歌单页**已加载态**：顶部「小蜗音乐 / 最新」双 Tab、「默认」筛选、卡片网格的封面/标题/副标题/播放量。**当前 workflow 已删掉这一行**，见 §4 | 已删（commit `7f84965`，原在 L339 前） |
| 05 | `05-chart` | `common.startupNavId:"nav_top"` | 12s | — | 排行榜：顶部「小蜗音乐 / 热歌榜」双 Tab、「播放全部」按钮、榜单行（名次、歌名、SQ/24bit 角标、来源、时长、更多） | L340 |
| 06 | `06-love` | `common.startupNavId:"nav_love"` | 10s | — | 我的喜欢：空列表态与标题栏，验证空态文案不会和 TabBar / 迷你条挤在一起 | L341 |
| 07 | `07-local` | `common.startupNavId:"nav_local"` | 10s | — | 本地音乐：空态引导与列表面板 | L342 |
| 08 | `08-setting` | `common.startupNavId:"nav_setting"` | 10s | — | 设置页：顶部 5 个 Tab（基本设置/播放设置/桌面歌词/搜索设置/列表）、整排复选行（启动后自动播放音乐、启动后打开播放详情页、显示返回桌面按钮、显示退出应用按钮…）、主题颜色色块——**整排勾选框最容易在换宽度时错位** | L343 |
| 09 | `09-search` | `common.startupNavId:"nav_search"`、`search.isShowHotSearch:true` | 16s | — | 搜索页**热词态**：热门搜索标签流（每页约 40 个词）的换行与间距、搜索框、取消按钮。热词是接口内容，每轮都在变，比对时天然有差异 | L346 |
| 10 | `10-home-dark` | `theme.id:"black"` | 12s | — | **暗色**首页：极光背景在暗底上的遮罩强度、搜索框与「聚合大会」按钮的边框可见度、迷你条与 TabBar 的对比度 | L351 |
| 11 | `11-play-detail-dark` | `theme.id:"black"`、`player.startupPushPlayDetailScreen:true` | 14s | — | 暗色播放详情：封面占位 ♪ 的玻璃层、标题与时间戳在暗底上是否糊成一片 | L352 |
| 12 | `12-songlist-dark` | `theme.id:"black"`、`common.startupNavId:"nav_songlist"` | 10s | — | 暗色歌单列表：卡片玻璃层与分隔线。浅色下定好的对比度换暗底最容易消失 | L355 |
| 13 | `13-chart-dark` | `theme.id:"black"`、`common.startupNavId:"nav_top"` | 12s | — | 暗色排行榜：名次徽标、SQ 角标、青色歌名在暗底上的可读性 | L356 |
| 14 | `14-setting-dark` | `theme.id:"black"`、`common.startupNavId:"nav_setting"` | 10s | — | 暗色设置：整排勾选框、分组标题、右侧箭头的对比度 | L357 |
| 15 | `15-player-song` | `player.startupAutoPlay:false` | 12s | 演示曲 | 首页**有歌态**：迷你播放条要显示曲名「午夜霓虹」、歌手、播放/下一首；封面走 ♪ 占位（`meta.picUrl` 故意留 `null`）。前 14 页全是空列表，这一屏才是真实使用中最常看的 | L361 |
| 16 | `16-play-detail-song` | `player.startupAutoPlay:false`、`player.startupPushPlayDetailScreen:true` | 14s | 演示曲 | 播放详情**有歌态**：封面占位、进度 0/222 秒、曲名与歌手、播放键状态（`startupAutoPlay:false` 保证只塞状态、不去请求播放地址） | L362 |
| 17 | `17-search-history` | `common.startupNavId:"nav_search"`、`search.isShowHistorySearch:true` | 12s | 6 条历史 | 搜索页**历史态**：`@search_history_list` 六条词条（周杰伦/晴天/告白气球/稻香/夜曲/七里香）的标签换行、清空与删除图标。不用模拟键盘就能拍到「有内容」的搜索页 | L363 |
| 18 | `18-search-result` | `common.startupNavId:"nav_search"`、`common.startupSearchText:"周杰伦"` | 16s | — | 搜索页**结果态**：结果行（名次、歌名、SQ 角标、来源名「小蜗音乐」、歌手、时长、更多）。commit `1e4a577` 修的就是结果行里缺来源名的问题，这页专防它回潮 | L364 |
| 19 | `19-songlist-loading` | `common.startupNavId:"nav_songlist"` | 2s | — | 歌单页**首帧加载态**：settle 压到 2 秒，抓接口回来之前的封面骨架/占位与行高。和 04 是同一页的同一设置，只差 settle（2s vs 10s），差的正是「数据回来前后」 | L339 |

拍摄顺序不是页码顺序：实际是 `01 → 02 → 03 → 19 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18`。
19 紧跟在 03 之后拍，因为它和 04 共用 `nav_songlist` 这一个落位，连着拍省一次冷启；04 删掉后就只剩它。

## 4. `04-songlist` 为什么还在图里

commit `7f84965`（2026-11-15，「stop shooting a page that is already loaded」）把这一行删了：

```diff
- shoot "$UDID" "shots/${SLUG}-04-songlist.png" '{"common.startupNavId":"nav_songlist"}' 10
  shoot "$UDID" "shots/${SLUG}-19-songlist-loading.png" '{"common.startupNavId":"nav_songlist"}' 2
```

同一页拍两遍、只差 settle 秒数，19 秒那版已经能覆到，所以停拍。
但 `shots-gh/run32`、`run33` 里仍留着这张图（删除前跑出来的），所以比对时它照样会出现在报告里；
**下一轮跑完就没有了**，`diff-check.py` 会把它算进「只在单侧出现」。文档保留这一行是为了解释这类「图还在、workflow 里没有」的疑惑。

顺带一提：run32 的 SE 版 `04-songlist` 是一张纯黑截图（mean 0.6），run33 才恢复正常——正是当年「35KB 纯黑」那个问题的遗留物。

## 5. 拿这两组图做回归

```bash
# 文本结论：每页 max / mean / changed>8
py -3 shots-gh/diff-check.py shots-gh/run32 shots-gh/run33

# 单文件 HTML 报告：每页一卡，旧/新并排 + 差异区标注 + 顶部三分类汇总
py -3 shots-gh/diff-check.py shots-gh/run32 shots-gh/run33 --html shots-gh/report.html

# 想把某几页拼成一张大图贴给同事看
py -3 shots-gh/compare.py shots-gh/run32 shots-gh/run33 --out shots-gh/compare-r32-r33
```

判定口径（写死在 `diff-check.py` 顶部，改之前先想清后果）：

- `changed` = 单通道差值 > 8 的像素占比。8 这条线是留给 JPEG 量化的，1~2 的抖动不算「变了」。
- 汇总三分类：`max == 0` → 逐像素一致；`0 < changed ≤ 1%` → 只差网络内容（热词、封面、榜单条目这一类每轮都换的）；`changed > 1%` → 真变了。
- 报告每张卡还给了「差异区」外接框占画面的比例：铺满整屏基本就是黑屏或整块重绘，只占一角多半是内容换了。这是给人判断用的，不参与分类。

## 6. 改页面清单时要同步的地方

1. `.github/workflows/ios-screenshots.yml` —— 唯一的真来源。
2. 本文档的 §3 表格（含行号）。
3. `shots-gh/diff-check.py` 里的 `PAGE_TITLES`（报告上那行中文页名）。
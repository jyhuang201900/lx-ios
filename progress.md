# Progress Log

## Session: 2026-09-23 — visual system unification and capability completion
- 用户要求在既有功能基础上把应用优化为完整、好用的版本，且 UI 更好、更规整。
- 通过两路审计确认：视觉层面 15 类跨屏不一致；能力层面若干已实现但入口缺失/埋藏过深的功能。本轮全部落地：
- 视觉统一：
  - 四个主页 Tab 的页头操作条统一为同一卡片规格：高 52、水平边距 16、圆角 14、主题卡片底色（此前高度 58/50/52/56、卡片式与通栏式混用）。
  - “播放全部”统一为实心主按钮（c-primary + c-primary-button-font），次级动作（新建歌单、导入、刷新）统一为浅色次要按钮，消除四套设计。
  - 本地音乐排序 chips 重构为与搜索页同构的分段控件（容器 34/圆角 12，选中 c-button-background-selected）。
  - 次要文本/图标灰色统一为 c-font-label（清理 c-250/c-300/c-350/c-500 在歌曲行、歌单卡、本地行的混用）。
  - 硬编码 rgba 边框/背景（排行榜分隔线、歌曲行分隔、下载进度槽、设置输入框）全部替换为主题 token。
  - 区块标题统一字重 600（设置分组、本地音乐摘要、标签分组标题）；搜索框两套规格统一为 44 高/圆角 14。
  - 新增共享 RetryButton 组件，替换三处复制粘贴的内联重试按钮（边框粗细不一致问题随之消除）。
  - 空态图标统一 28、标题 14；搜索空态水平边距 18→16。
- 能力补全：
  - 新增播放速率快捷按钮（0.75x–2x，与音质按钮同构），竖屏/横屏操作栏均可用；更精细调节仍在播放设置弹窗。
  - 横屏播放页头部补上定时关闭入口（此前仅竖屏有）。
  - 歌单菜单新增“移到最前”，接入既有 updateUserListPosition API（此前该 API 无任何调用方）。
  - 热搜加载期间显示加载态（此前打开搜索页热词区域纯空白）。
  - 搜索联想请求去掉外层 500ms 延时（内部已有 200ms 防抖），输入到联想出词明显更快。
- 验证：esbuild 转译全部 33 个修改文件零错误；三语 JSON 解析且 644 键一致；横屏 MoreBtn 经核实已挂载（审计误报，未改动其结构）。
- 复查修复：用户要求确认无错误后，发现倍速快捷按钮放入竖屏 MoreBtn 行会超出可用宽度（iPhone SE 等小屏必溢出），横屏侧栏在 SE 横屏高度下也有溢出风险；已将倍速选择改为播放页 Header 的下拉触发器（显示当前倍速值，标题区域为弹性宽度，两个方向均安全），并撤销两处 MoreBtn 的插入。修复后重跑全量 esbuild 校验与 i18n 一致性检查通过。

## Session: 2026-09-09
### Phase 1: Discovery
- **Status:** in_progress
- Actions taken:
  - 检查 package.json、iOS Xcode 工程和 IPA workflow。
  - 创建持久化任务计划文件。
  - 定位 iOS toast 不可见和本地文件导入入口被禁用的问题。
  - 实现原生 toast、触感反馈、单文件导入和统一导航动画默认项。
- Files created/modified:
  - task_plan.md
  - findings.md
  - progress.md
  - src/utils/nativeModules/utils.ts
  - src/utils/tools.ts
  - src/screens/Home/Views/Mylist/MyList/ListImportExport.tsx
  - src/screens/Home/Views/Mylist/MyList/listAction.ts
  - src/components/player/PlayerBar/components/ControlBtn.tsx
  - src/screens/PlayDetail/Vertical/components/Header.tsx
  - src/navigation/index.ts
  - ios/LxMusicMobile/AppDelegate.mm
  - 移除 ListImportExport.tsx 中已不需要的 toast 导入。

### Verification
- 已通过 rg 核对新增导出与调用点、文件导入流程括号和关键 iOS 原生方法位置。
- 未能在 Windows 完成 eslint/Xcode 构建：npm ci 在当前会话超时，且 Xcode 只能在 macOS 运行。

## Session: 2026-09-09 — iOS CI quirks_mode fix
- 恢复并阅读既有规划文件；session-catchup 未发现需要合并的上下文。
- 已检查 Git 状态、Podfile、Gemfile 和 iOS IPA workflow；开始定位 Ruby JSON 兼容性问题。
- 可使用 Docker / WSL 验证 Ruby 行为；完整 IPA 构建仍需 GitHub macOS runner。
- 已添加 Gemfile 的 `json < 3.0` 兼容性约束；准备在 Ruby 3.2 隔离环境中复现原始错误并验证修复，再生成依赖锁文件。

## Session: 2026-09-09 — player and application UI polish
- 用户要求继续完成播放/歌词详情页，并对其余现有界面进行统一视觉完善；功能、播放、收藏、评论及搜索逻辑必须保留。
- 已将工作扩展到 Phase 8：先审计当前组件、主题和现有音质重载能力，再进行低风险视觉改造与 GitHub 交付。
- 播放详情页已在竖屏/横屏加入实际音源、实际取流音质信息与当前歌曲音质选择器；选择质量会更新偏好设置，并以当前播放位置重新取流加载。
- 操作区已移至竖屏进度条上方，新增收藏快捷操作，并保留加入歌单、评论、循环、桌面歌词和定时退出等既有功能。
- 已统一提升封面、歌词、页头、底部播放条、列表、设置入口、弹层和菜单的留白、层级、触控面积与主题适配。
- 验证：`git diff --check` 通过；本机 `node_modules` 没有安装依赖，`tsc --noEmit` 因缺失 `react-native` 与 RN tsconfig 类型失败，不能在 Windows 本机完成 TypeScript/Xcode 构建。

## Session: 2026-09-10 — source, download and library usability
- 用户要求自定义音源显示正确、音质按当前音源兼容且覆盖全部已支持格式，新增下载入口，并继续完善歌单、排行榜、我的列表与设置界面。
- 已确认自定义 API 使用既有 `LX.Source`（如 kw/kg）承载，脚本自身的名称与每个来源声明的 `qualitys` 位于 `LX.UserApi.UserApiInfo`；不能仅显示平台代号或按 FLAC 规则猜测。
- 已确认项目没有通用音乐下载任务实现，旧菜单的下载项被注释；iOS 已具备 `RNFS.downloadFile` 及 Documents 目录，因此下载动作会以当前歌曲的实际可用音质取流、保存至应用 Documents/Music，并使用明确状态提示。
- 已完成：播放器可显示“自定义脚本名 · 脚本来源名”，脚本没有为该来源声明名称时安全回退为系统音源名称；所有当前歌曲可用的音质均可选择，设置页同步覆盖 128k/192k/320k/FLAC/24bit/APE/WAV。
- 已完成：播放器、在线列表和我的歌单歌曲菜单均增加下载；本地歌曲禁用下载，重复下载会提示，文件保存在 iOS「文件」App 的 LX Music/Music 目录。
- 已完成：歌单切换、我的列表、歌曲行、排行榜和设置页的留白、卡片层级、选中态和触控面积统一优化；`git diff --check` 与 i18n JSON 解析通过。

## Session: 2026-09-10 — major information architecture redesign
- 用户要求将“我的列表”从抽屉式切换改为页面内直接展示、可点击切换的歌单库，并继续整体重做 iOS 各主页面的布局层级。
- 采用内容优先的单层结构：歌单横向选择栏 + 当前歌单摘要 + 歌曲内容；歌单管理仍保留在每个歌单的更多菜单中，创建入口固定可见。
- 正在重构 `Mylist`，随后会统一搜索、歌单、排行榜、设置与首页导航的布局和触控密度。
- 已完成：我的歌单改为常驻横向歌单库，展示选中态、歌单类型、歌曲数量和固定新建入口；当前歌单摘要提供歌曲数、回到顶部和歌单内搜索。
- 已完成：排行榜改为来源下的直接横向榜单选择，移除抽屉式选择；歌曲分类、搜索入口/历史、首页导航和设置分组统一触控尺寸、层级、边界与留白。
- 验证：`git diff --check` 已通过；本地 `node_modules` 不完整，无法运行项目 TypeScript/Xcode 构建，GitHub macOS workflow 将继续承担实际 iOS 构建验证。i18n JSON 文件本轮未修改，后续会在项目目录内复核其格式。

## Session: 2026-09-10 — visual quality audit
- 用户要求审核改动、优化布局并将视觉完成度向成熟移动产品靠齐。
- 审核重点：信息层级是否克制、交互是否显性、最小触控区域是否达标、跨页面表面规范是否一致，以及本轮新增文案是否支持多语言。
- 将优先优化歌单库、列表行、菜单与弹层等高频共用组件，以较少的改动提升整体体验一致性。
- 已审查并修正虚拟歌曲列表的布局风险：视觉留白不再改变单行实际占用高度，确保长列表滚动定位、恢复位置与多列布局保持精确。
- 已完成并推送提交 `f404029`：菜单与底部弹层统一为更稳重的表面与触控规格；歌单、榜单、搜索、设置和歌曲行的边界、留白和选中态完成一轮收敛；新增歌单统计文案覆盖简中、繁中和英文。
- 验证：暂存差异 `git diff --cached --check` 通过；三份语言 JSON 可解析且语言键完整一致。项目本地依赖仍不完整，实际 iOS 编译交由 GitHub Actions 验证。

## Session: 2026-09-10 — download quality and local music hub
- 用户要求下载前可选择音质，并将下载结果、导入文件与本地播放/管理连成完整流程。
- 已确认在线取流 `getMusicUrlInfo()` 可直接接收显式 `quality`，实现时将复用该参数而非只更改文件扩展名。
- 已确认 iOS 可安全列出并管理应用 Documents/Music；iOS 不应声称能扫描整个设备媒体库，因此页面只展示下载目录及用户明确导入到此处的音乐文件。
- 已实现共享下载音质弹层并接入播放器、搜索/在线列表与“我的列表”歌曲菜单；选项以当前歌曲与当前音源共同支持的品质为准，传入取流层后真实决定请求的音质。
- 已新增“本地歌曲”导航页，显示 Documents/Music 内的下载/导入文件，支持导入、刷新、直接播放和二次确认删除；iOS 导入同名文件会安全生成新文件名，避免覆盖已有下载。
- 已完成 `git diff --check`、三语言 JSON 解析与键一致性检查。`npx --no-install tsc --noEmit` 仍无法启动：本机未安装 `react-native` 类型与 `@react-native/typescript-config`，另有现有 TypeScript 6 `baseUrl` 弃用提示；实际 iOS 编译继续交给 GitHub macOS workflow。
- 产品代码已提交并推送至 GitHub `main`：`f99935b Add local music hub and download quality picker`。规划文件未包含在产品提交中。

## Session: 2026-09-10 — cross-screen alignment and rounded surfaces
- 用户要求仔细打磨全部界面，强调圆角体系与文本在操作区域内的水平、垂直居中。
- 已启用现有设计系统约束：不引入无关色彩或装饰，保留歌曲、设置等信息列表的左对齐可扫读结构；按钮、标签、空状态与操作卡片严格双向居中。
- 已开始 Phase 14，先处理共用按钮、菜单、弹层、导航、列表和本地音乐页，再扩展到搜索、歌单、榜单、我的列表、设置与播放页。
- 已完成视觉系统收敛：操作按钮、弹层标题、确认操作、标签、分类、主题卡、音质/音源信息和歌曲封面采用一致圆角；交互文案在其按钮和标签范围内严格水平、垂直居中；歌曲、文件与设置的说明文本保持左对齐以便扫读。
- 本地歌曲文件行改为独立圆角表面并使用全边框主题色，避免旧分隔线在卡片布局中产生不一致边界。
- 校验完成：`git diff --check` 通过；简中、繁中、英文语言文件均可解析且键完整一致。本机依赖仍不完整，无法运行 React Native TypeScript/Xcode 构建；GitHub macOS workflow 继续作为真实 iOS 编译验证。
- 产品代码已提交并推送到 GitHub `main`：`8bc8ad3 Polish rounded surfaces and alignment`。规划文件未包含在提交中。

## Session: 2026-09-10 — visibility fixes and selector redesign
- 用户反馈本地歌曲和我的列表存在蓝色容器内文字缺失，要求修正；并要求优化音效页、完整展示歌单名称，将排行榜由横向滑动改为左侧音源、右侧点按弹窗选择榜单，统一下拉与歌单输入弹窗。
- 已定位高风险颜色组合：在实色 `c-primary` 背景上错误使用了同色系 `c-primary-font`，导致部分主题中前景与背景接近。此轮会将实色按钮和激活歌单卡改为专用反差前景 `c-button-font`，信息型表面明确使用 `c-font`。
- 已完成界面收敛：本地导入、歌单创建和已激活歌单均使用高反差前景；歌单卡扩宽并支持两行名称；音效弹层改为更清晰的分区、滑杆值和触控规格；通用下拉菜单、音源选择和歌单输入弹层统一了圆角与居中规则。
- 排行榜已从横向榜单条改成页面顶部的「音源 + 当前榜单」选择器；切换时保留原有持久化设置和列表加载逻辑，并添加异步请求过期保护，快速切换音源不会用旧响应覆盖当前界面。
- 验证：`git diff --check` 和暂存差异检查通过；产品代码已提交并推送到 GitHub `main`：`741cc75 Polish selectors and visual contrast`。`npm run lint` 因本机没有 ESLint 二进制无法运行；`npx --no-install tsc --noEmit` 因缺失 React Native 类型及 `@react-native/typescript-config` 停在项目配置加载阶段。规划文件未包含在产品提交中。

## Session: 2026-09-10 — user-reported UI corrections
- 用户报告主操作按钮文字不可见、搜索分类与输入框错位、我的列表标题重复，并要求将音质选择改为高到低。
- 已修复：新增由主题明暗推导的 `c-primary-button-font`，仅用于实色主按钮和已选歌单图标，确保本地导入与新建歌单在明暗主题中都有高反差；列表内容区移除重复的“我的列表”标题，仅保留外层页面标题。
- 已修复：将“歌曲 / 歌单”切换器从应用总页头移到搜索页面的输入栏同一行，避免其脱离搜索上下文；横竖屏页头同步移除旧挂载点。
- 已修复：下载与播放器共用音质排序，固定为 24-bit FLAC、WAV、FLAC、APE、320k、192k、128k 的高到低顺序，并保留各音源和歌曲实际可用的筛选。
- 验证：`git diff --check` 和暂存差异检查通过；音质排序契约检查通过。产品代码已提交并推送到 GitHub `main`：`bc6baa1 Fix search layout and quality order`。本机缺少 ESLint、React Native 类型和 `@react-native/typescript-config`，因此 lint、完整 TypeScript 与 iOS 构建仍需在依赖完整的 macOS 环境执行；规划文件未包含在产品提交中。

## Session: 2026-09-11 — playback controls, local lyrics and sound experience
- 用户要求排行榜三项同排、我的列表播放全部、统一下拉层级、压缩页面顶部控件、下载后保留歌词，以及重做音效体验。
- 已完成排行榜三段均分控制条和我的列表“播放全部”；通用下拉菜单提高阴影、边框和选项分隔表现，搜索与设置顶部工具区减少了高度。
- 下载完成后会尝试把取得的歌词保存为与音频同名的 `.lrc` sidecar；本地播放优先读取内嵌歌词，再读取该 sidecar；删除下载文件时同步清理 sidecar。
- 音效面板增加当前状态概览、卡片层级和四个中性场景预设（原声清晰、影院低频、夜间聆听、游戏定位），保留原有 EQ、环境、音高、环绕和用户预设逻辑。
- 验证：`git diff --check`、三语言 JSON 解析与 `npm run lint:sound-effect-dsp` 已通过。`npx --no-install tsc --noEmit` 因本机缺少 `react-native` 和 `@react-native/typescript-config` 失败，尚未进入本轮源文件检查。

## Session: 2026-09-11 — QQ Music text export
- 用户要求把收藏导出为 QQ 音乐可导入的文本格式，并直接复制。
- 已核对 QQ 音乐官方导入页：按行读取 `歌名 - 歌手`，内部转换为 `歌名|歌手`，单次最多匹配 500 首。
- 已在我的列表菜单新增“复制QQ音乐文本”；导出时读取当前列表全部歌曲，本地无歌手条目只输出歌名，文本直接写入剪贴板，并覆盖空列表、失败和超过 500 首的提示。
- 已完成 `git diff --check`、三语言 JSON 解析与键集合一致性检查，并使用 TypeScript `transpileModule` 验证三个修改源文件无语法错误。
- 产品代码已提交并推送至 GitHub `main`：`ef2233a Add QQ Music playlist text export`。规划文件未包含在产品提交中。

## Session: 2026-09-14 — global optimization audit
- 用户要求全局持续优化并找出优化项。
- 已按用户价值、稳定性、性能、可维护性和构建可靠性梳理优先级，并识别下载队列、本地歌曲刷新、列表渲染与 CI 校验等改进方向。

## Session: 2026-09-14 — iOS download and local library pass
- 用户确认开始全局优化，并限定本轮只需处理 iOS。
- 已为 iOS 添加下载队列：任务按序执行，显示状态和进度，支持取消、失败重试和移除；Android 仍走原有直接下载路径。
- 已让本地歌曲页在下载完成或应用回前台时强制刷新，并把普通导航刷新改为短时间节流，减少重复读目录。
- 已完成三语言 JSON 解析与键集合一致性检查；`git diff --check` 通过；`core/download.ts`、`DownloadQueue.tsx` 和本地歌曲页通过 TypeScript 语法解析。
- 产品代码已提交并推送至 GitHub `main`：`775a283 Add iOS download queue and local refresh`。规划文件未包含在产品提交中。

## Session: 2026-09-14 — iOS local song metadata UX
- 已把本地歌曲行拆成独立 memo 组件，并懒读取歌手、专辑和时长；文件修改时间变化时重新读取。
- 点击播放时直接复用行内元数据生成 `MusicInfoLocal`，本地歌曲不再只以文件名进入默认列表。
- 产品代码已提交并推送至 GitHub `main`：`0cb78e8 Show local song metadata on iOS`。规划文件未包含在产品提交中。

## Session: 2026-09-14 — cross-screen stability and accessibility
- 已为搜索歌曲、搜索歌单、歌单库、歌单详情和歌单标签加入请求序号，避免快速切换后旧响应覆盖新界面。
- 已补齐共用弹层、输入清除、播放控制、多选操作、列表更多按钮和本地歌曲操作的辅助功能标签，并同步三语言文案。
- 产品代码已提交并推送至 GitHub `main`：`1e63d44 Improve request lifecycle and accessibility`。规划文件未包含在产品提交中。

## Session: 2026-09-14 — iOS comfort and list performance
- 已给本地歌曲页增加下拉刷新，下载队列显示音质、歌手和字节级进度。
- 已把在线歌曲与我的列表的选中集合改为 Set 查找，并稳定关键渲染回调，减少长列表重渲染。
- 产品代码已提交并推送至 GitHub `main`：`68b27b2 Polish local downloads and list performance`。规划文件未包含在产品提交中。

## Session: 2026-09-14 — local metadata and scroll efficiency
- 已新增本地媒体元数据缓存，按文件路径、修改时间和大小去重，避免重复解析音频；缓存上限 300 条。
- 本地歌曲列表已改用缓存读取，减少滚动和重新进入页面时的原生调用。

## Session: 2026-09-14 — deep interaction and rendering pass
- 已稳定搜索、歌单和本地歌曲的回调引用，减少列表行无效重渲染。
- 已让 iOS 导入成功后强制刷新本地歌曲列表，避免短时间节流吞掉刚导入的文件。
- 产品代码已提交并推送至 GitHub `main`：`b2c57f2 Optimize local metadata and list callbacks`。规划文件未包含在产品提交中。

## Session: 2026-09-14 — metadata cache reuse
- 已让本地元数据缓存记录空结果，避免同一文件重复触发原生解析。
- 已把外部音乐文件播放接入同一缓存路径。
- 产品代码已提交并推送至 GitHub `main`：`56d4ebf Reuse cached local media metadata`。规划文件未包含在产品提交中。

## Session: 2026-09-23 — local library discoverability
- 已给本地歌曲页增加独立搜索框，并支持“最新/名称”两种排序。
- 已为搜索结果增加专用空状态，保持本地歌曲列表在大库和搜索时都更好用。
- 产品代码已提交并推送至 GitHub `main`：`b67f818 Add local song search and sorting`。规划文件未包含在产品提交中。
- 已优化搜索键盘行为、数字名称排序和排序按钮的选中态可读性；推送提交 `3f37572 Polish local song search interaction`。

## Session: 2026-09-23 — metadata-aware local search
- 已把本地歌曲搜索升级为标题、歌手、专辑元数据感知搜索。
- 已新增歌手与时长排序，并让列表、搜索、排序共用同一份缓存元数据。
- 产品代码已提交并推送至 GitHub `main`：`439b665 Add metadata aware local song search`。规划文件未包含在产品提交中。

## Session: 2026-09-23 — local playback hygiene
- 已把本地歌曲点击播放改为临时队列，不再每次都往默认列表追加歌曲。
- 搜索时标题统计改为显示当前筛选后的歌曲数量。
- 产品代码已提交并推送至 GitHub `main`：`22fcd4c Play local songs through temp queue`。规划文件未包含在产品提交中。

## Session: 2026-09-23 — local batch playback
- 已为本地歌曲页新增“播放全部”，可直接播放当前筛选后的歌曲集合。
- 播放全部复用临时队列和元数据缓存，不再污染默认列表。
- 产品代码已提交并推送至 GitHub `main`：`c187a2e Add local song play all`。规划文件未包含在产品提交中。

## Session: 2026-09-23 — local metadata index
- 已在本地库刷新后分批构建全量元数据索引，避免按歌手、专辑搜索时漏掉未滚动到的歌曲。
- 元数据状态会清理已删除或被替换文件对应的旧条目。
- 产品代码已提交并推送至 GitHub `main`：`478b1ab Index local song metadata`。规划文件未包含在产品提交中。

## Session: 2026-09-23 — mini player controls
- 已在紧凑播放栏恢复“上一曲”按钮，使主页与播放详情页的播放控制一致。
- 产品代码已提交并推送至 GitHub `main`：`9201653 Restore mini player previous button`。规划文件未包含在产品提交中。

## Session: 2026-09-23 — playback queue visibility
- 已为播放详情页新增播放队列弹层，可查看待播歌曲、点击跳播和一键清空。
- 主页迷你播放栏也新增队列入口，队列数据实时跟随“稍后播放”更新。
- 产品代码已提交并推送至 GitHub `main`：`01499b2 Add playback queue sheet`。规划文件未包含在产品提交中。
- 队列内新增单条移除操作；推送提交 `6b06293 Allow queue item removal`。

## Session: 2026-09-23 — discovery context and cleanup
- 歌单卡片和歌单详情头部补充创作者、播放次数等上下文信息。
- 搜索历史增加单条删除按钮，保留长按删除，提升可发现性。
- 产品代码已提交并推送至 GitHub `main`：`3ac96df Improve songlist context and history cleanup`。规划文件未包含在产品提交中。

## Session: 2026-09-23 — search quick playback
- 已为音乐搜索结果增加“播放全部”入口，点击后从当前结果首项开始播放。
- 该入口仅在歌曲搜索模式下显示，避免歌单搜索时出现无效操作。
- 产品代码已提交并推送至 GitHub `main`：`296c91e Add music search play all`。规划文件未包含在产品提交中。

## Session: 2026-09-23 — search and discovery polish
- 音乐搜索“播放全部”已改为把当前结果集合加入待播队列，而不是只播放单首。
- 歌单卡片补充创作者和播放次数信息，帮助用户更快判断内容。

## Session: 2026-09-15 — startup size safety
- 用户报告 `Cannot read property 'width' of undefined`。
- 已将原生窗口尺寸返回值标准化，并在尺寸缺失时回退到 `Dimensions`；布局回调也改为只处理完整宽高。
- 产品代码已提交并推送至 GitHub `main`：`44a2fc9 Guard startup window size lookups`。规划文件未包含在产品提交中。
- 产品代码已提交并推送至 GitHub `main`：`b2c57f2 Optimize local metadata and list callbacks`。规划文件未包含在产品提交中。

## Session: 2026-09-23 — queue source clarity (cont.)
- 播放队列条目新增本地化音源标识，聚合/多音源结果更易分辨。

## Session: 2026-09-23 — global UX and usability pass
- 用户要求找出全部优化项，提升观感与使用能力，仅针对 iOS。
- 通过两个并行审计（主页六个页面 + 播放器/共用组件）共确认约 28 项问题，本轮实施其中全部低中风险项：
- OnlineList 增加空列表状态（加载中/加载失败重试/无结果），失败重试改为明显按钮；空列表不再显示游离的“到底啦”小字。
- 排行榜榜单获取失败增加整页错误态与重试；横屏分支补 catch；标签抽屉失败显示重试而非永久“加载中”。
- 排行榜与歌单详情“播放全部/收藏”失败不再静默，弹 toast；详情页按钮在加载完成前给出灰态提示。
- 迷你播放条中部轻点改为打开播放详情页，拖动需移动 2px 才进入，修复轻点误触发随机 seek；详情页与迷你条进度条恢复 onPanResponderTerminate，避免系统抢占手势后拖动态卡死。
- 播放详情页状态行恢复显示当前歌词（与迷你条一致）。
- 歌词行支持点击跳转播放进度（竖屏/横屏）；歌词列表 initialNumToRender 固定，避免长歌词重渲染开销；PlayLine 定位对未渲染行用平均行高兜底，修复 NaN 导致跳到最后一行。
- 播放队列弹层顶部显示“正在播放”区块，待播条目高亮当前歌曲，清空队列前增加确认弹窗，修复重复歌曲 key 冲突。
- 搜索历史清空前确认并提示；输入框清除按钮改为有文字时才显示。
- 底部弹层（播放队列等）改为 slide 滑入动画；播放详情页前后/播放按钮补齐触感反馈。
- 歌单卡片移除重复渲染的作者/播放量行；我的列表空歌单显示引导态并可跳转搜索页。
- TrackPlayer 播放中持续更新缓冲进度（与 nativeFlac 分支对齐）；取流超时从 100s 缩短为 30s；迷你条标题长按补 isHome 守卫。
- 删除未被引用的 Views/Download 占位死代码；补充 6 组三语 i18n 文案。
- 验证：esbuild 全量转译 28 个修改文件零错误；三语 JSON 可解析且键集一致（643 键）；包含此前工作区遗留的 LocalMusic 元数据 Map 竞态修复。

## Session: 2026-09-24 — startup crash fix
- 用户反馈新构建启动即崩：Fatal ReferenceError Property 'theme' doesn't exist。
- 定位：迷你播放条 ControlBtn 主组件在 01499b2(播放队列弹层)新增队列按钮时使用了 theme,但该组件内缺少 const theme = useTheme();子按钮组件各自有定义,因此此前只核对子组件时未暴露。esbuild 仅验证语法、不验证作用域,静态检查未能拦截。
- 修复一:ControlBtn 主组件补 const theme = useTheme(),并删除未使用的 isHorizontalMode/useHorizontalMode 导入。
- 修复二:横屏播放页 Header 此前用 python 批量插入 import 时因锚点带尾随空格未匹配,导致 TimeoutExitEditModal、useTimeInfo、PlaybackRateBtn 三个标识符被裸用(JSX 已插入而 import 缺失);已用 Edit 工具补齐 import。
- 加固:新增两个全仓静态检查脚本并纳入本轮验证——静态 createStyle/StyleSheet.create 块内禁止引用 theme;JSX 使用的自定义组件必须有 import(修正了命名导入解析),全量重扫确认无其他同类问题。
- 验证:修复文件 esbuild 通过;全仓 theme 作用域扫描与 import 完整性扫描均清零;node_modules 为空无法本地 bundle,真实构建仍由 GitHub Actions 承担。

## Session: 2026-09-24 — queue popup useMemo crash
- 用户反馈 theme 崩溃修复后出现新的启动崩溃：Fatal TypeError Cannot read property 'item' of undefined。
- 定位：src/screens/PlayDetail/components/QueuePopup.tsx 的 renderItem 用 useMemo 包裹了带参数解构的工厂函数；useMemo 会在渲染时立即以无参调用工厂，({ item, index }) 从 undefined 解构即抛错。迷你播放条在首页启动时无条件渲染 QueuePopup（ControlBtn 内），因此每次启动必崩。
- 该问题此前被 ControlBtn 缺少 theme 定义的 ReferenceError 掩盖：那条错误在父组件渲染阶段就中断了整棵子树，QueuePopup 没有机会执行。
- 修复：改用 useCallback（传入 FlatList 的回调不应被立即调用），并移除不再使用的 useMemo 导入（688fe26）。
- 加固：新增两类全仓扫描并确认无同类问题——(1) useMemo/useState/useEffect/useLayoutEffect 工厂带参数或以参数解构的误用；(2) 静态 createStyle/StyleSheet.create 块内引用 theme；同时复核 JSX 组件 import 完整性与 styles 变量定义。51 个近期改动文件 esbuild 全部通过，三语 644 键一致。

## Session: 2026-09-24 — type-check gate and crash-class bug sweep
- 用户要求再优化并确保没有问题。本轮的关键动作是把「真正的类型检查」跑起来：此前本机 node_modules 为空，只能用 esbuild 查语法，导致作用域类崩溃（theme 未定义、useMemo 误用）连续漏网。
- 已在本机完成 npm ci（909 包），随后运行 tsc --noEmit 与 eslint，并成功打出 iOS JS bundle（与 CI 打包步骤一致，3.37MB + 21 个资源）。
- tsc 当场抓出两个真崩溃：
  - src/screens/Home/Views/SongList/components/Songlist/List.tsx：renderItem 的依赖数组引用 rowInfo，但 rowInfo 声明在其后 → 渲染时 TDZ ReferenceError，打开「歌单」页必崩；已把 rowInfo 上移到 renderItem 之前。
  - src/screens/Home/Views/Search/MusicList.tsx：搜索「播放全部」调用 listRef.current.getList()，而 OnlineList 从未暴露该方法 → 点击必崩；已在 OnlineList 暴露 getList 并返回空数组兜底。
- 其余类型问题一并清零：默认主题补 c-primary-button-font（此前在主题未就绪时是 undefined，主按钮文字会失去对比度）、player/action.ts 补 InitState 类型导入、本地元数据缓存 Map 允许 null、useCallback 的可选属性泛型统一 NonNullable、DownloadQueue 状态文案键类型收紧、download.ts 保留运行时防御的同时消除类型告警。
- 顺手清理 lint 中「有意义」的错误：未使用变量/导入、重复导入（3 处）、浮动 Promise、文件末尾换行；剩余 61 条为纯风格规则（缩进、可选链偏好等），属既有代码风格，未做无意义 churn。
- 加固：给 iOS CI 增加 Type check 步骤（npm run typecheck），并新增同名 npm 脚本，让未定义标识符/缺失导入/先后声明误用这类崩溃问题在构建前就被拦下。
- 防御性加固：QueuePopup 的来源标签在缺字段时返回空串而不是崩溃；useDrag 在布局宽度未知时不提交进度，避免 NaN。

## Session: 2026-09-24 — layout system and visual rhythm pass
- 用户要求「优化全部布局，简洁高效，美观科技」。
- 新增 src/theme/layout.ts 作为唯一度量来源：Radius（control 12 / card 16 / sheet 20 / pill 999）、Spacing（8pt 栅格）、PagePadding 16、createShadow（跨平台阴影）、TabularNums（数字等宽）。
- 圆角全面收敛：把原本文案的 16 种取值归一为「胶囊 / 卡片 / 控件 / 面板」四级，含两批改动共约 40 处（页头操作条 16、输入框与列表行 12、标签与按钮 999、封面与卡片 16、弹层 20）。剩余仅进度条等 2-4px 微圆角与个别图片圆角保留。
- iOS 阴影补齐：此前 15 处只写了 elevation（Android 专用），iOS 上完全不显示，界面偏平。现为迷你播放条、菜单、对话框、歌单抽屉补上 iOS shadow*；并修复菜单菜单项裁剪导致阴影被 overflow:hidden 一并裁掉的问题（改为外层投影、内层裁剪两层结构）。
- 精密感细节：播放时间、列表时长、播放队列序号、歌词定位时间等数字统一等宽（fontVariant: tabular-nums），时间与计数不再跳动。
- 主题一致性：清除残留的硬编码 rgba 分隔线（在线列表行改用主题 token）。
- 验证：tsc --noEmit 0 错误；改动文件的 eslint 无 import 重复/未使用变量/Hook 规则问题；iOS JS bundle 打包成功。过程中脚本在一处多行 import 中插错位置，由 tsc 立即发现并修复，说明类型门禁已能兜住此类事故。

## Session: 2026-09-24 — frontend audit against industry standards
- 用户要求「再次审核以及完善前端，对照大厂标准」。两路并行审计（触控尺寸/排版层级、交互反馈/无障碍/状态完整性）后逐项修复。
- 对比度（WCAG AA）：实测次要文字 token c-font-label（=c-450）在浅色主题下仅 2.78:1、卡片上 1.89:1，远低于正文 4.5:1 要求。现按主题区分取值：浅色 c-650（白底 5.02:1）、深色 c-400（黑底 6.61:1），默认主题同步；并清除页面里残留的裸灰阶文字（c-250/c-300/c-350/c-450/c-500）改用语义 token。
- 交互反馈：common/Button 只有 android_ripple，iOS 上完全无按压反馈（覆盖设置按钮、歌单操作栏、热搜词、多选栏等大量高频入口）；现补 pressed 透明度 + accessibilityRole=button + 禁用态语义。列表行「更多」按钮补 activeOpacity 与同行一致。
- 触控目标（HIG 44pt）：为输入框清除钮(36)、队列删除钮(32)、搜索历史删除钮(20)、搜索播放全部(34)、下载队列操作钮(34)补 hitSlop 至 44pt 命中区。
- 无障碍：Icon 组件标记 accessible={false}（避免念出字体私有区乱码）；播放页三个 Btn 组件与 12 个图标调用点补 accessibilityLabel（新增 comment/play_mode/collect_song/timeout_exit 三语文案）；列表行补 accessibilityState.selected；Loading 补 progressbar 语义与标注；在线列表 footer 的错误重试改为有按钮语义的 RetryButton、加载态改用带转圈的 Loading。
- 状态完整性：歌单详情「收藏/播放全部」改为真 disabled + 在途保护（原先用透明度假装禁用、双击会重复发请求）；本地音乐导入/刷新补在途禁用（连点会重复拉起文件选择器）；评论首屏请求失败不再永久卡在「加载中」（补 catch/finally），并新增评论空态。
- 排版：清除 bold/300 字重混用（统一 600 与 400）。
- 验证：tsc --noEmit 0 错误；改动文件无 import/未用变量/Hook/未定义类问题；三语 649 键一致；iOS bundle 打包成功。

## Session: 2026-09-24 — aesthetics pass: type scale and alignment
- 用户要求「继续优化页面展示，符合美学」。本轮聚焦排版体系与可见对齐问题。
- 新增字阶与字重 token（layout.ts）：page 17 / section 15 / body 15 / sub 12 / caption 10，字重仅保留 400 与 600，杜绝连续 1pt 递增（11/12/13/14/15/16）导致的层级不可辨。
- 字阶落地：列表歌曲主标题统一 body(15)（此前 14/15/13 混用）、列表副标题统一 sub(12)（此前 11）、页面/顶栏标题统一 page(17)（此前竖屏 18、设置页 16）、区块标题统一 section(15)+600（此前 Settings 16 与 SubTitle 15/400 层级倒置）、网格卡使用独立 13pt 紧凑档位。
- 可见对齐修复：我的列表歌单横向栏左边缘 12 → 16（与同页页头文字对齐，原先凸出 4pt）；设置页区块标题 paddingLeft 1 → 10（与设置项文字对齐，原先错位 9pt）；弹层标题底部内边距 14 → 12。
- 空态规格统一：图标 28 且 50% 透明、标题 14、描述 12；本地音乐空态原先图标 32/标题 15 已对齐。
- 长文本防撑破：文件选择器的文件名、设置页自定义源列表的描述补 numberOfLines 截断（原先会把右侧大小/箭头按钮挤出屏幕）；歌单详情简介补行高 19。
- 验证：tsc --noEmit 0 错误；改动文件无重复导入/未使用变量/Hook 问题；三语 649 键一致；iOS bundle 打包成功。

## Session: 2026-09-25 — verify and repair the pull-to-refresh pass
- 用户要求复核上轮改动。逐项核对后发现上轮有两处声称与实现不符，已修正：
  1. 触觉反馈：上轮用的是 `require('react-native').HapticFeedback`，但 RN 0.73 并不导出该 API（已核实 index.js 无此导出），代码被 try/catch 静默吞掉，实际是死代码，等于没有触觉反馈。已改用项目自有的 `hapticFeedback`（`@/utils/nativeModules/utils`，对应原生 `RCT_EXPORT_METHOD(hapticFeedback:)`），并去掉随之失效的 Platform 判断与 try/catch。
  2. LocalMusic 下拉刷新：上轮提交信息称已优化刷新控件，但该文件实际未改动。已补齐 progressBackgroundColor / tintColor / 下拉提示文案，使各列表下拉刷新规格一致。
- 同时修掉上轮引入的两处 lint 问题：SongList 列表里未使用的 useEffect 导入、refreshControl 的 useMemo 依赖数组缺 t。
- 复核既有问题（非本轮引入，未改动）：LocalMusic 的 6 处 prefer-nullish-coalescing / no-confusing-void-expression 在上一提交即存在；OnlineList 的 3 处 exhaustive-deps 警告源于既有代码结构。
- 验证：tsc --noEmit 0 错误；改动文件 eslint 0 error；iOS bundle 打包成功。

## Session: 2026-09-25 — rebrand to 听歌 v1.0 and remove in-app open-source claims
- 用户要求：检查确保正确、去除开源声明、改名为「听歌」、版本 1.0。
- 应用名：iOS Info.plist（CFBundleDisplayName/CFBundleName 及文档类型名）、Android strings.xml、app.json 全部改为「听歌」，三语文案中的「LX Music」「洛雪」统一替换（简中/繁中用「听歌」「聽歌」，英文用 Listen）。
- 版本：package.json version 1.0.0；versionCode 设为 100（原 74）。iOS 的 CFBundleVersion 取 versionCode，若沿用较小的值，真机覆盖安装旧版会被系统判为降级而失败，因此提高到 100。iOS 的 CFBundleShortVersionString 由 CI 注入 MARKETING_VERSION，链路已核实。
- 开源声明去除：About 页删除「代码已开源」「开源地址」「最新版下载地址」「常见问题」「提交 Issue」「原始发布地址只有 GitHub」「By 落雪无痕」及全部上游链接；许可协议删除「基于 Apache License 2.0 许可证发行」「开源发布于 GitHub」及开源地址尾注，品牌改为「本软件」；首次启动的防骗提示删除「原始发布地址只有 GitHub」；README 去掉上游徽章、logo 链接、开源与许可证声明段，重写为新项目说明。
- 抽屉品牌标题由 LX Music 改为听歌；同时清理 PactModal/About 因删链接产生的未使用导入与变量。
- 构建配置同步：package.json name 改为 tingge，Android APK 名与 CI 产物路径（.github/actions/upload-artifact 与 ios-ipa.yml 的 IPA 名）同步更新，避免构建/上传因文件名不匹配失败。
- 合规处理：LICENSE（Apache License 2.0）文件保留且未改动。该文件要求保留许可证与版权声明，删除它会使再分发失去授权依据；用户要求的「去除开源声明」按应用内可见声明与对外文档执行，未触碰许可证文本本身。此点已在交付说明中向用户明示。
- 验证：tsc --noEmit 0 错误；改动文件 eslint 0 error；三语 656 键一致；iOS bundle 打包成功。

## Session: 2026-09-25 — build-safety audit after the rename
- 用户担心改名导致编译失败，要求全面检查。逐层验证后发现并修复一处**会直接让 iOS 构建失败**的问题。
- 关键修复：.github/workflows/ios-ipa.yml 中 iOS 产物名此前只同步了 shell 变量形式 ${PACKAGE_VERSION}，遗漏了 GitHub 表达式形式 ${{ env.PACKAGE_VERSION }}，导致 zip 打包生成 tingge-v1.0.0-ios-unsigned.ipa 而上传步骤仍在找 lx-music-mobile-v1.0.0-...ipa，构建会在上传/发布阶段失败。已把 3 处表达式一并改为 tingge-，并用脚本模拟展开确认打包名与上传名完全一致。
- 同步清理：release.yml 中 7 处同类旧名（该 workflow 只在 master 分支触发，不影响 main 推送，但为一致性一并处理）。
- 删除 .github/workflows/publish-version-info.yml：它会向原作者仓库 lyswhut/lx-music-mobile-version-info 推送版本信息，既与本项目去除开源声明的要求矛盾，也必然因无写权限而失败。已确认无其他文件引用它。
- 编译安全验证矩阵：tsc --noEmit 0 错误；全量 eslint 58 个 error 全部为既有风格规则，未用导入/重复导入/未定义标识符/Hook 规则等关键类均为 0；iOS JS bundle 打包成功（3.38MB + 21 资源，含模块解析）；Info.plist 可正常解析且版本字段仍为变量注入；app.json / package.json 有效；全部 6 个 YAML 配置解析通过；iOS 工程引用的 user-api-preload.js 路径存在，工程未引用本地化 plist。
- 触发范围确认：只有 ios-ipa.yml 会随 main 分支推送自动运行（已修复），beta-pack/build-test/release 的触发分支分别为 beta/dev/master，不会自动执行。
- 版本链路复核：package.json 1.0.0 / versionCode 100 → CI 注入 MARKETING_VERSION / CURRENT_PROJECT_VERSION → Info.plist 变量展开，应用内「关于」页版本显示同源。

## Session: 2026-09-25 — iOS glassmorphism visual pass
- 用户要求「美化 UI，使用 iOS 玻璃感设计，全面美化」。
- 前置判断：项目未引入任何毛玻璃/渐变依赖（blur/gradient/skia 均无）。因此采用「RN 原生 blurRadius + 半透明分层 + 细描边 + 顶部高光 + 柔和阴影」在零新依赖前提下实现玻璃质感，避免引入原生库导致的编译风险。
- 背景层（玻璃质感的前提）：PageContent 两个分支此前用接近不透明的遮罩把背景完全压住，是「没有玻璃感」的根因。现将主题背景分支遮罩改为 0.88/0.82（浅/深），自定义图分支由 0.76 降到 0.62，并为主题背景补上原生 blurRadius，使背景呈现柔和色彩晕染并可从上层玻璃透出。
- 新增设计 token：theme/layout.ts 增加 Glass（表面/浮层透明度、描边、高光）与 glassShadow、glassCardShadow；主题增加 c-glass-surface（0.70 透明）与 c-glass-overlay（0.80 透明），并在 ActiveTheme 类型与默认主题 state 中同步登记（16 个主题均已具备所需灰阶，已逐一校验）。
- 应用范围（15 个文件）：浮层类（弹窗 Popup、菜单 Menu、对话框 Dialog、迷你播放条）用 c-glass-overlay；内容类（歌单卡、当前歌单条、设置分组卡、本地摘要卡、三个主页控制条、榜单卡、搜索输入框、本地搜索卡、设置输入项、播放页音源/音质胶囊）用 c-glass-surface。玻璃卡片补玻璃阴影，使其在纯色主题下也能浮起。
- 新增可复用组件 components/common/GlassSurface.tsx（含透明度分层、描边、顶部高光，供后续统一使用）。
- 对比度复核（关键，半透明会削弱可读性）：玻璃层叠加后，浅色主题正文 10.05:1、次要 5.02:1；深色主题正文 9.4:1、次要 6.2:1，均超过 WCAG AA 的 4.5:1 要求，文字可读性未因玻璃化下降。
- 发现并处理：玻璃层与纯色页面底色对比度为 1.000（半透明白叠白仍是白），故不能只靠底色区分层次，已通过描边 + 阴影 + 顶部高光补足立体感。
- 验证：tsc --noEmit 0 错误；全量 eslint 关键类（未用/重复导入、未定义标识符、Hook 规则）0 问题；iOS bundle 打包成功。

## Session: 2026-09-25 — review of the glass pass (found 3 real defects)
- 用户要求审阅。逐文件核查玻璃化改动，发现并修复 3 个真实缺陷：
- 缺陷一（死代码）：新增的 GlassSurface 组件、layout.ts 的 Glass token 与 glassShadow 彼此只互相引用，全项目无任何调用方；我上轮称其"供后续使用"属于为死代码找理由。已删除组件与 Glass/glassShadow，保留实际生效的 c-glass-surface / c-glass-overlay 与 glassCardShadow。
- 缺陷二（视觉重影）：覆盖在内容之上的弹层/菜单此前为 80% 不透明，而项目没有真实背景模糊能力，底层列表文字会以 20% 透出形成重影。按叠加计算重影对比达 1.32（肉眼可辨），已把浮层提高到 90%（重影对比降至约 1.14）。
- 缺陷三（阴影被裁）：歌单卡样式含 overflow: hidden，会把 glassCardShadow 一起裁掉（iOS 上阴影完全不显示，与此前菜单遇到的是同一类问题）。已改为外层承担阴影与圆角、内层承担裁剪的双层结构。
- 另修一处观感问题：11 个纯色主题下玻璃表面与页面底色完全相同（半透明白叠白仍是白，对比 1.000），玻璃质感只靠描边支撑、深色主题下几乎不可见。已把 c-glass-surface 改用带主题色调的 light-600-alpha-300，使其在纯色主题下产生可辨识的色偏——浅色主题与底色对比 1.18、深色 1.74，正文可读性分别为 8.51 与 5.41，仍远高于 WCAG AA 的 4.5。
- 兼容性核实：自定义主题的颜色板由 createThemeColors 统一生成，确认同样包含 light-600-alpha-300 与 light-1000-alpha-100，因此新 token 对内置 16 个主题与用户自定义主题全部可用，不会出现取到 undefined 而渲染成透明的情况。
- 验证：tsc --noEmit 0 错误；全量 eslint 关键类 0 问题；iOS bundle 打包成功。

## Session: 2026-09-25 — tech-feel pass and dead-code cleanup
- 用户要求继续审阅并强化「科技感」。审阅中发现上一轮删除 GlassSurface 时，连带删掉了其中的「上沿高光边」逻辑，导致全项目不再有任何高光边实现——而高光边正是玻璃/科技质感最具识别度的特征。本轮以此为优化切入点。
- 新增 createGlassStyle(theme, { level, radius }) helper：统一输出玻璃底色 + 发丝描边 + 上沿高光（borderTopColor 单独提亮，模拟光线在玻璃上沿的反射）。深色主题用 14% 白避免刺眼，浅色用 85% 白。已接入 9 处（设置分组卡、本地摘要卡、歌单卡、迷你播放条、搜索输入框、本地搜索卡、弹层、菜单、对话框），替换原先手写重复样式，同时消除样式漂移。
- 高光边可见度已量化：相对玻璃底色，浅色主题对比 1.152、深色 1.432，两种主题下均可辨识。
- 进度指示点加发光（textShadow 对图标字体在 iOS 生效），零成本形成「指示灯」光晕，强化仪表感。
- 死代码清理：新增的 accentHairline 无调用方，连同上一轮遗留的 Spacing、PagePadding 一并删除（二者实际从未被使用，此前 grep 命中的只是 letterSpacing）。当前 layout.ts 的 7 个导出全部有真实调用：Radius 119 处、createGlassStyle 18、TabularNums 14、createShadow 8、glassCardShadow 8、Typography 33、FontWeight 7。
- 验证：tsc --noEmit 0 错误；全量 eslint 关键类 0 问题；iOS bundle 打包成功。


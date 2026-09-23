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

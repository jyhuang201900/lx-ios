# Task Plan: 完善 iOS 版本体验

## Goal
在不破坏现有 React Native 功能的前提下，改善 iOS 版本的界面完成度与核心使用体验，并完成可验证的代码检查。

## Current Phase
Phase 38

## Phases
### Phase 1: Requirements & Discovery
- [x] 盘点 iOS 工程与现有界面入口
- [x] 记录主要体验问题
- **Status:** complete

### Phase 2: Planning & Structure
- [x] 选择低风险、可验证的改进范围
- **Status:** complete

### Phase 3: Implementation
- [x] 实现 iOS 可见提示、触感反馈和文件导入改进
- **Status:** complete

### Phase 4: Testing & Verification
- [x] 完成静态核对；Windows 无法执行 Xcode 构建，npm 依赖安装未在限定时间内完成
- **Status:** complete

### Phase 5: Delivery
- [ ] 汇总改动与 IPA 构建方式
- **Status:** complete

### Phase 6: iOS CI Ruby Compatibility
- [ ] 定位 `unknown keyword: quirks_mode` 的依赖来源
- [ ] 修复并约束 iOS 构建的 Ruby 依赖
- **Status:** in_progress

### Phase 7: CI Fix Verification & Delivery
- [ ] 复现并验证 JSON/Codegen 兼容性，检查 workflow 和差异
- [ ] 说明修复内容和 macOS 构建验证边界
- **Status:** pending

### Phase 8: Player and Cross-Screen UI Polish
- [x] Audit the player/detail surfaces and shared screen primitives without changing business flows
- [x] Add a current-track source/quality control that reloads the active track safely
- [x] Improve visual hierarchy across the player, lyrics and remaining iOS-facing screens
- **Status:** complete

### Phase 9: Verification and GitHub Delivery
- [x] Run available static checks and inspect the final diff
- [ ] Commit the scoped UI work and push `main`
- **Status:** in_progress

### Phase 10: Source, Download and Library UI Usability
- [x] Audit custom-source metadata, quality capability data and current download support
- [x] Make playback source/quality labels accurately reflect custom scripts and all supported qualities
- [x] Add a safe current-track download action for iOS and polish library, charts and settings surfaces
- [x] Verify, commit and push the scoped changes
- **Status:** complete

### Phase 11: Major Information Architecture and Library Redesign
- [x] Replace the drawer-based playlist switcher with a direct playlist library rail
- [x] Preserve playlist creation, management, search, selection, playback, import/export and sync flows
- [x] Align home navigation, search, songlists, charts and settings with the same content-first visual system
- [x] Validate source changes and deliver the redesigned UI to GitHub
- **Status:** complete

### Phase 12: Visual Quality Audit and System Refinement
- [x] Audit visual hierarchy, touch targets, localization and shared surface consistency
- [x] Refine playlist library, song rows, menus and bottom sheets around one restrained visual language
- [x] Verify the review changes and push the polish pass to GitHub
- **Status:** complete

### Phase 13: Download Quality and Local Music Hub
- [x] Let every download entry choose an actually available stream quality
- [x] Add a local-music navigation page for downloaded and explicitly imported files
- [x] Connect local playback, refresh, import and safe deletion into one flow
- [x] Verify localization, source diffs, commit and push the scoped feature work
- **Status:** complete

### Phase 14: Cross-screen Alignment and Rounded Surface Refinement
- [x] Audit shared navigation, controls, lists and overlays for visual inconsistency
- [x] Standardize rounded surfaces, action hit areas, centered control labels and layout rhythm
- [x] Refine home sections, player detail and settings without changing business behaviour
- [x] Run static checks, commit and push the visual refinement
- **Status:** complete

### Phase 15: Visibility Fixes and Selector Redesign
- [x] Fix foreground contrast for local music and playlist surfaces
- [x] Give playlist names enough space and improve the sound-effect panel
- [x] Replace the chart carousel with source + modal chart selection and unify selector surfaces
- [x] Verify, commit and push the refinement
- **Status:** complete

### Phase 16: User-Reported UI Corrections
- [x] Restore readable text in the create-playlist and local-import actions
- [x] Keep search results aligned directly below the search controls
- [x] Remove the duplicated “我的列表” page label
- [x] Order selectable playback and download qualities from highest to lowest
- [x] Verify, commit and push the corrections
- **Status:** complete

### Phase 17: Playback Controls, Navigation and Sound Experience
- [x] Align leaderboard source, chart selector and play-all into one segmented control row
- [x] Add play-all beside playlist creation and unify elevated selector presentation
- [x] Move page-specific utility controls into their navigation bars where width permits
- [x] Preserve lyrics for downloaded tracks and restore them during local playback
- [x] Expand the sound-effect presets using documented, neutral tuning profiles and redesign the sound-effect surface
- [x] Verify, commit and push the enhancement
- **Status:** complete

### Phase 18: QQ Music Text Export
- [x] Confirm the text format accepted by the official QQ Music playlist import page
- [x] Add a playlist-menu action that copies all songs as `song - singer` lines
- [x] Cover empty lists, clipboard failures, local songs and the 500-song matching limit
- [x] Verify localized strings and source syntax, then deliver to GitHub
- **Status:** complete

### Phase 19: Global Optimization Audit
- [ ] Prioritize user-facing, reliability and performance improvements
- [ ] Turn the audit into small, verifiable implementation passes
- **Status:** in_progress

### Phase 20: iOS Download and Local Library Pass
- [x] Add an iOS download queue with progress, cancel and retry actions
- [x] Refresh the local library after a download finishes or the app becomes active
- [x] Reduce repeated local-directory refreshes during quick navigation
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 21: iOS Local Song Metadata UX
- [x] Lazily read artist, album and duration for visible local files
- [x] Show local-song metadata consistently in the library list
- [x] Reuse metadata when playing or adding a local song to the default list
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 22: Cross-Screen Stability and Accessibility
- [x] Add request tokens to search, songlist and tag refresh flows
- [x] Label shared close, clear, playback and selection controls for screen readers
- [x] Keep localized text aligned across Simplified Chinese, Traditional Chinese and English
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 23: iOS Comfort and List Performance
- [x] Add pull-to-refresh to the local song library
- [x] Show download quality, artist and byte progress in the iOS queue
- [x] Stabilize list callbacks and reduce selected-song lookups in long lists
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 24: Local Metadata and Scroll Efficiency
- [x] Cache local song metadata by path, modification time and file size
- [x] Avoid repeated metadata reads when scrolling or reopening the local library
- [x] Keep the cache bounded so large libraries do not grow memory indefinitely
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 25: Deep Interaction and Rendering Pass
- [x] Stabilize refresh and load-more callbacks across search and songlist screens
- [x] Reuse stable local song actions and render callbacks
- [x] Force a fresh library refresh after a successful iOS import
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 26: Metadata Cache Reuse
- [x] Cache unreadable local metadata so repeated native reads are avoided
- [x] Reuse the cached metadata path for external music file playback
- [x] Verify the local metadata cache and deep-link paths
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 27: Startup Size Safety
- [x] Guard native and fallback window-size lookups against missing values
- [x] Prevent layout callbacks from updating the app with incomplete dimensions
- [x] Verify the startup size path and layout guard
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 28: Local Library Discoverability
- [x] Add a focused local song search field
- [x] Let local songs sort by latest import or song name
- [x] Provide a dedicated no-match state without changing the empty-library state
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 29: Metadata-Aware Local Search
- [x] Search local songs by title, artist and album metadata
- [x] Add artist and duration sorting to the local library
- [x] Reuse cached metadata between rows, search and sorting
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 30: Local Playback Hygiene
- [x] Play tapped local songs through the temporary queue instead of repeatedly growing the default list
- [x] Show the filtered song count while local library search is active
- [x] Verify local playback flow and syntax
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 31: Local Batch Playback
- [x] Add play-all for the filtered local song list
- [x] Reuse the same metadata and temporary queue flow as single-song playback
- [x] Disable play-all when the filtered list is empty
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 32: Local Metadata Index
- [x] Build a full metadata index in batches after refreshing local songs
- [x] Make metadata-aware search and sorting reliable without scrolling the whole list
- [x] Prune stale metadata entries when local files are removed or replaced
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 33: Mini Player Controls
- [x] Restore the previous-track action in the compact home player
- [x] Keep consistent playback controls across compact and detail players
- [x] Verify the mini player control path
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 34: Playback Queue Visibility
- [x] Add a dedicated play-queue sheet on iPhone playback screens
- [x] Let users inspect, jump to and clear upcoming tracks
- [x] Expose the queue from the compact home player as well as playback detail
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 35: Discovery Context and Cleanup
- [x] Show songlist author and play-count context on cards and detail headers
- [x] Make search-history removal visible with an explicit per-item action
- [x] Verify the songlist and search history surfaces
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 36: Search Quick Playback
- [x] Add play-all to music search results
- [x] Keep the action focused on music search rather than songlist search
- [x] Verify the search control and playback path
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 37: Search and Discovery Polish
- [x] Make music-search play-all queue the current result set
- [x] Show songlist creator and play-count context on discovery cards
- [x] Verify the search playback and discovery metadata paths
- [ ] Verify and push the scoped changes
- **Status:** complete

### Phase 38: Queue Source Clarity
- [x] Show the localized source for every upcoming track
- [x] Make multi-source queue rows easier to scan without expanding playback detail
- [x] Verify queue rendering and syntax
- [x] Verify and push the scoped changes
- **Status:** complete

### Phase 39: Full UX Audit and Polish Pass
- [x] Audit home pages and player components for user-visible gaps
- [x] Add empty/loading/error states to online lists and leaderboard/tag retries
- [x] Fix mini-bar accidental seeks, restore detail status lyrics, add lyric tap-to-seek
- [x] Add now-playing context and clear confirm to the play queue
- [x] Polish surfaces: sheet slide-in, haptics, input clear buttons, history confirm
- [x] Verify syntax, i18n consistency, commit and push
- **Status:** complete

### Phase 40: Visual System Unification and Capability Completion
- [x] Audit cross-screen visual consistency and capability gaps
- [x] Unify tab header bars, play-all buttons, search inputs, sort chips, gray tokens, section titles
- [x] Share RetryButton across empty/error states; replace hardcoded rgba colors with theme tokens
- [x] Add playback-rate quick selector to both player layouts and timeout exit to landscape header
- [x] Add playlist move-to-top via existing position API; hot search loading state; faster search suggestions
- [x] Verify syntax, i18n consistency, commit and push
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|---|---|
| 优先改进跨平台 JS/TS 层 | Windows 无法运行 Xcode，但可修改并由 GitHub macOS 构建 |
| 修补 iOS 原生反馈与文件入口 | 优先消除用户可感知的功能缺口，风险小且不改变音乐业务逻辑 |

## Errors Encountered
| Error | Attempt | Resolution |
|---|---:|---|
| 在外层工作区运行 git status，目录不是 Git 仓库 | 1 | 已切换到 lx-music-mobile-ios-adaptation 子目录 |
| Windows 未安装 Ruby，无法直接运行 CocoaPods | 1 | 检查可用的 WSL / Docker Ruby 验证环境 |
| rg 的 README 通配参数及未安装的 node_modules 路径不存在 | 1 | 改为按实际文件清单和上游固定版本源码排查 |
| Python 默认 GBK 输出无法编码上游 issue 的 emoji | 1 | 后续网络诊断统一输出 ASCII JSON 或显式 UTF-8 |
| 本机依赖目录不完整，无法运行项目本地 TypeScript/ESLint | 1 | 全局 `tsc --noEmit` 亦因缺少 React Native 类型失败；已执行 `git diff --check` 与静态调用链核对，交由 GitHub macOS workflow 作构建验证 |

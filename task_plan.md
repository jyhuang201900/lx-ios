# Task Plan: 完善 iOS 版本体验

## Goal
在不破坏现有 React Native 功能的前提下，改善 iOS 版本的界面完成度与核心使用体验，并完成可验证的代码检查。

## Current Phase
Phase 59

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

### Phase 41: HIG Audit and Redesign Pass
- [x] Audit against HIG with a script that recomputes the real layer compositing stack; establish 33/112 AA failures as the measured baseline
- [x] Fix brand-as-text-color across all 16 themes; raise 10pt captions to the 11pt iOS floor and unblock Dynamic Type
- [x] Move glass out of the content layer into the floating functional layer; add opaque `c-control-surface` for content controls
- [x] Turn the tab bar into an edge-to-edge monochrome bar with 44pt targets, and delete the unreachable duplicate drawer
- [x] Confine the animated aurora to the play detail screen and remove the redundant `GlassSheen`
- [x] Honor `reduceTransparency` and `boldText`; replace fixed row heights with `minHeight` and drop `getItemLayout`
- [x] Verify contrast, tsc, eslint, i18n and DSP checks
- **Status:** complete

## Notes on Phase 41
RN 0.73 does not expose iOS `darkerSystemColors`, so Increase Contrast cannot be read.
Contrast compliance therefore lives in the default palette (all 16 themes pass AA 4.5:1),
which is the substantive requirement in `accessibility.md`. See
`doc/ios-ui-review-2026-09-29.md` and `scripts/check-contrast.py`.

### Phase 42: Overlay Surfaces, Sheet Interaction and Craft Pass
- [x] Extend the contrast checker to overlays; find and fix 4 more failures in sheets, menus and headers
- [x] Remove the now-dead `c-glass-surface` token and the `level` parameter so content-layer glass cannot return
- [x] Add swipe-to-dismiss to bottom sheets, attached to the header only so list scrolling keeps working
- [x] Introduce an `IconSize` scale and raise close/remove affordances from 10-12pt to 18pt
- [x] Fix the third instance of the hardcoded dark-scrim-plus-white-text pattern in the songlist play count
- [x] Consolidate three divergent copies of the specular edge into one `createSpecularEdge` token
- [x] Make the search tip backdrop mask follow the appearance
- [x] Verify contrast, tsc, eslint, i18n and DSP checks
- **Status:** complete

### Phase 43: Instrument Readout and Touch-Reactive Motion
- [x] Reframe the tech direction: move the signature from decoration to information, since glass and ambient loops are already correctly placed
- [x] Turn the play page source/quality pills into a three-column instrument readout with real file size
- [x] Add spec names (FLAC 24BIT / ATMOS+ / HI-RES / MASTER) distinct from the friendly labels, and keep them out of i18n
- [x] Add `usePressEmphasis` so motion is triggered by touch, as real Liquid Glass does, instead of self-looping
- [x] Respect Reduce Motion by snapping to the pressed state instead of animating
- [x] Extract `TabItem` so six independent press states do not put a Hook inside a map
- [x] Verify contrast, tsc, eslint, i18n and DSP checks
- **Status:** complete

## Notes on Phase 43
HIG `motion.md` describes real Liquid Glass as responding to direct touch with greater
emphasis. That is the HIG-sanctioned substitute for the ambient loops removed in
Phase 41: motion triggered by the user rather than by the interface. Press feedback
must stay paired with haptics — HIG is explicit that motion must not be the only
carrier of feedback.

### Phase 44: Equalizer Curve
- [x] Verify the DSP values are real before drawing anything; the ISO third-octave bands and live `previewGains` make a true curve possible
- [x] Draw the 10-band curve with rotated Views, since the project has no react-native-svg and adding a native dep cannot be verified here
- [x] Establish that equal x-spacing is mathematically exact on a log axis, not an approximation
- [x] Label the chart as a settings curve, not a measured frequency response
- [x] Move the dB axis into its own column so labels stop covering the curve start, and position them off `zeroY`
- [x] Add `c-chart-baseline` after finding `c-border-background` is only 1.17:1 on overlays
- [x] Verify geometry numerically and run contrast, tsc, eslint, i18n and DSP checks
- **Status:** complete

## Notes on Phase 44
The equalizer chart answers "what shape are the current settings", not "how does
this actually sound". That distinction is stated in the component, because a
plausible-looking response curve would otherwise read as measured data.
`c-chart-baseline` uses the 3:1 non-text threshold from WCAG 1.4.11, not the
4.5:1 used for text.

### Phase 45: Cover Backdrop on the Play Screen
- [x] Reverse course: move toward visual tech character instead of more information density
- [x] Use the track cover as a full-bleed page backdrop, the clear-glass-over-media case HIG names explicitly
- [x] Scrub the cover with the theme's own base color rather than fixed black/white, so contrast stays predictable
- [x] Drop the aurora when a cover is present; two color sources fight each other
- [x] Verify against 8 adversarial cover values × 2 text roles × 16 themes (256 combinations)
- [x] Document the pre-existing nested `PageContent` in the landscape layout, which blocks the cover there
- [x] Verify contrast, tsc, eslint, i18n and DSP checks
- **Status:** complete

## Notes on Phase 45
The tightest number in this pass: secondary text on light themes with a pure-black
cover lands at 4.74:1 against the 4.5:1 requirement. Any future change to glass
opacity should re-check that case first.

### Phase 46: Live EQ Instrument
- [x] Add ±5/±10 dB gridlines, excluding 0 (has its own baseline) and the min/max edges (would only draw a border)
- [x] Tween the curve between shapes on preset switch so the change itself carries information
- [x] Drive ten bands from a single `Animated.Value` rather than ten drivers
- [x] Trigger the tween from preset identity, not from `previewGains` or the handlers
- [x] Keep slider drags at 1:1 and snap to the end state under Reduce Motion
- [x] Apply to both the stacked and split `EqualizerSection` call sites
- [x] Verify grid geometry numerically and run contrast, tsc, eslint, i18n and DSP checks
- **Status:** complete

## Notes on Phase 46
Two wrong triggers were tried first. Bumping the counter inside the handlers fires
before `reset` has propagated through `updateSetting`, so the tween would target a
stale value. Triggering on `previewGains` makes slider drags tween too, which
leaves the curve lagging the finger. Watching preset identity gets both right.

### Phase 47: Reverb Room Profiles
- [x] Stop assuming spectrum/oscilloscope data is unavailable and actually check the repo
- [x] Parse the 13 convolution IRs offline and measure RT60 with ISO 3382-1 Schroeder integration
- [x] Display the Schroeder decay curve, RT60, sample rate, channels and impulse length per room
- [x] Normalize on the envelope rather than the instantaneous peak, after the first attempt read wrong
- [x] Switch the plotted curve to Schroeder so display and measurement share one dataset
- [x] Wire the analyzer into npm scripts for reproducibility
- [x] Verify analysis, contrast, tsc, eslint, i18n and DSP checks
- **Status:** complete

## Notes on Phase 47
The measured RT60 values corroborate their filenames: `filter-telephone` 0.00s,
`living-bedroom-leveled` 0.53s, `feedback-spring` 2.73s, `bright-hall` 3.40s.
That agreement is the reason to trust the numbers.

### Phase 48: Per-Room Decay Rows
- [x] Show every room's measured decay curve and RT60 in the selector, not only the selected one
- [x] Downsample the mini curve to 16 columns so 48 points do not blur at phone width
- [x] Reject a shared time axis: `bright-hall` would show the shortest tail despite the longest RT60
- [x] Use per-IR normalized x for shape, and let RT60 and duration carry magnitude
- [x] Mark RT60 as a lower bound (`≥`) when it exceeds the impulse length
- [x] Verify the 13 sparklines are mutually distinct and rank consistently with RT60
- [x] Verify contrast, tsc, eslint, i18n and DSP checks
- **Status:** complete

## Notes on Phase 48
All 13 rooms produce distinct sparkline shapes, and those shapes rank in the
same order as their RT60. `bright-hall` is the one room whose RT60 (3.40s)
exceeds its file length (1.49s), so it displays `≥3.40s`; stretching its curve
to a common 4s axis would have invented samples that do not exist.

### Phase 49: Harden the Verification Foundation
- [x] Stop assuming the 16 built-in themes cover the color space and sweep user-theme primaries instead
- [x] Find that the fixed `c-primary-dark-500` derivation fails for 180 of 384 possible primary colors
- [x] Replace the fixed step with a self-correcting search that cannot fail on an arbitrary primary
- [x] Make the checker self-verify by reproducing all 16 palettes bit-for-bit before sweeping
- [x] Fix banker's rounding in the Python reimplementation to match JS `Math.round`
- [x] Fix the inverted shade direction for dark themes: both appearances walk the dark ramp
- [x] Read the candidate step lists out of the implementation so script and code cannot drift
- [x] Verify contrast, tsc, eslint, i18n and DSP checks
- **Status:** complete

## Notes on Phase 49
Without the self-verification step the reimplementation would have silently
disagreed with the real color math, and the dark-theme shade inversion (443
failing combinations) would have been easy to misread as "the sweep is strict".
`c-primary-font` is shared by the EQ curve, the RT60 readout, the progress bar
and the tab glow, so a 47% failure rate there undermined most of the previous
rounds. After the fix the worst case across 1800 combinations is 4.50:1.

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
rounds. After the fix the worst case across 1800 combinations is 4.50:1.

### Phase 50: Make the Instrument Truthful
- [x] Check whether the sound-effect parameters actually reach the audio path
- [x] Find that `updateNativeSoundEffectConfig` returns silently when unsupported and no UI read `isSupported`
- [x] Have `SoundEffectControl` state the limitation instead of rendering inert instruments
- [x] Hide the play-page sound-effect button entirely when unsupported, in both orientations
- [x] Place the guard after all hooks so the early return cannot break the Rules of Hooks
- [x] Confirm there is no settings-page entry that would bypass the guard
- [x] Verify contrast, tsc, eslint, i18n, DSP and reverb analysis
- **Status:** complete

## Notes on Phase 50
On Android the panel used to render a live EQ curve, 13 measured room decay
curves and RT60 readouts while `updateNativeSoundEffectConfig` returned
immediately — the interface reported acoustics that were not being applied.
That is decoration impersonating measurement, and it is worse than having no
instrument, because it looks trustworthy.

### Phase 51: Bound the Room Profile Claim
- [x] Read the native AVAudioEngine graph and confirm the DSP chain is real
- [x] Find the silent fallback to `AVAudioUnitReverb` factory presets
- [x] Enumerate the four conditions that make `refreshConvolutionEngineLocked` return NO
- [x] Map which Apple preset each IR degrades to
- [x] Add a note bounding what the RT60 and decay figures actually describe
- [x] Leave `AppDelegate.mm` untouched — no Xcode here to verify a compile
- [x] Verify contrast, tsc, eslint, i18n, DSP and reverb analysis
- **Status:** complete

## Notes on Phase 51
Same class of problem as Phase 50, one layer deeper. On Android nothing was
applied; on iOS the right room is applied *unless* the IR fails to load, in which
case `bright-hall` becomes `.largeHall` and the panel still reports 3.40s. A
proper fix needs the native side to report which path is active so the UI can
decide whether to show exact figures — that needs a macOS build to verify, so it
was not attempted here.

### Phase 52: Close the Remaining Link
- [x] Verify the native equalizer frequencies match the JS ones item for item
- [x] Verify gain semantics match and the dB-to-filter mapping is a correct RBJ peaking biquad
- [x] Add a three-way consistency check between `filters/`, `assets.ts` and the effect options
- [x] Make the analyzer abort when a profile would be computed for an unloadable asset
- [x] Negative-test the check by unregistering an asset and confirming a non-zero exit
- [x] Verify contrast, tsc, eslint, i18n, DSP and reverb analysis
- **Status:** complete

## Notes on Phase 52
The analyzer reads `.wav` files from `filters/`, but the app loads whatever
`assets.ts` registers. Those agreed by coincidence, not by construction — add a
wav and re-run the analyzer without registering it and the panel would report
RT60 for a room the app can never play, while the native side quietly falls back
to a factory preset. The check now fails loudly instead.

### Phase 53: One Implementation for Curve Geometry
- [x] Notice the curve geometry was verified in Python but shipped as TypeScript
- [x] Extract `buildEqGeometry` / `buildDecayBars` / `downsampleEnvelope` into `src/utils/curves.ts`
- [x] Point all three chart components at the shared module
- [x] Add `npm run check:curves`, which imports the shipped `.ts` via Node type stripping
- [x] Fix a real 0.5px overshoot the new check found on the last decay bar
- [x] Correct three test assertions that were themselves wrong
- [x] Verify curves, reverb, contrast, tsc, eslint, i18n and DSP
- **Status:** complete

## Notes on Phase 53
This is the second time two implementations of the same math drifted apart; the
first was `round()` versus `Math.round()` in the contrast checker. Both times
the symptom was invisible in the app. The fix is structural rather than a patch:
the component and the test now call the same function, so they cannot disagree.

### Phase 54: Lyric Readability
- [x] Audit the lyric view, the largest surface in the app and previously untouched
- [x] Measure lyric colors against the large-text threshold, including the translation line's smaller size
- [x] Find non-current lines at 2.01:1 across 15 of 16 themes
- [x] Identify the `opacity: 0.72` de-emphasis as the cause rather than the gray itself
- [x] Replace opacity-based de-emphasis with font weight, which costs no contrast
- [x] Reuse the self-correcting `c-primary-font` for played words
- [x] Apply the same change to the landscape lyric view
- [x] Add lyric checks to the contrast script and note their opacity blind spot
- [x] Verify curves, reverb, contrast, tsc, eslint, i18n and DSP
- **Status:** complete

## Notes on Phase 54
The lyric text looked fine. It was `c-450` at `0.6` opacity, which composites
to 2.01:1 — the floor of "visible but not legible". Most of the screen is
non-current lines, so most of the screen was below the large-text threshold.
Font weight carries the current-line state for free, and it also satisfies the
HIG rule that state must not be conveyed by color alone.

### Phase 55: Text Token Hygiene Sweep
- [x] Generalize the Phase 54 failure shape and sweep every text color token in the app
- [x] Find seven raw-palette tokens used as text, the worst at 1.17:1
- [x] Inspect each call site before changing, since light-on-dark can be correct
- [x] Replace all of them with the derived `c-primary-font` / `c-font-label`
- [x] Find the dialog title rendering at 1.61:1 — white on a light tint that does not flip with appearance
- [x] Drop the fake semantic background and group with a hairline instead
- [x] Add a text-token hygiene check and negative-test it
- [x] Verify curves, reverb, contrast, tsc, eslint, i18n and DSP
- **Status:** complete

## Notes on Phase 55
`QueuePopup` used 2.40:1 for the row that is *currently playing* — the one
row a user looks at most. The dialog title was white on a light tint that does
not flip with appearance, so every confirmation dialog in the app had an
invisible title. Neither would be caught by eye. The hygiene check now makes
raw-palette-as-text a build-time failure rather than a per-theme surprise.

### Phase 56: Close the Remaining Token Bypasses
- [x] Extend the hygiene scan to `style.color` and `<Icon color>`, not just `<Text>`
- [x] Measure meaningful icons against the 3:1 non-text threshold
- [x] Fix the progress bar playhead at 1.71:1, the smallest but most important mark on the play screen
- [x] Fix clear/close affordances in the search field, dialogs and history rows
- [x] Fix the now-playing indicator in the queue
- [x] Add a documented allowlist for the four remaining raw-palette uses
- [x] Negative-test the icon path
- [x] Verify curves, reverb, contrast, tsc, eslint, i18n and DSP
- **Status:** complete

## Notes on Phase 56
The three phases 9, 15 and 16 are the same bug at different depths: the
semantic token layer was fixed while the bypasses around it kept producing
the same failure. Closing one entry point is not the same as closing the class,
so the check now covers all three render paths and carries an allowlist where
each entry has to justify itself.

### Phase 57: Button Foreground/Background Pairing
- [x] Test the button type scale against the background it actually sits on
- [x] Find that 13-15 of 16 themes fail, the primary button at 1.08:1
- [x] Identify the cause: brand text on a brand-tint background, same hue and lightness
- [x] Compare three candidate designs and pick the one that passes while keeping the light character
- [x] Redefine `c-button-font` / `c-button-font-selected` / `c-primary-button-font` onto the self-correcting ramp
- [x] Hoist `primaryFont` / `primaryFontActive` into locals so both share one computation
- [x] Fix the play button icon in both orientations
- [x] Teach the checker constant resolution, fg/bg pairing and a usage guard
- [x] Verify curves, reverb, contrast, tsc, eslint, i18n and DSP
- **Status:** complete

## Notes on Phase 57
`c-button-font` (brand at 90%) on `c-button-background` (brand tint) cannot
work at any opacity: they share a hue and a lightness. The fix was a design
decision, not a token swap, and it reused the self-correcting ramp from
Phase 9. A permanently failing check was replaced with a usage check, because
a check that is always red teaches people to ignore it.

### Phase 58: Generalize Pairing Checks
- [x] Replace the hand-listed pairings with a cross-product scan of every co-occurring text/background pair
- [x] Correct the method: meaningful graphics need 3:1 (WCAG 1.4.11), not the 4.5:1 text threshold
- [x] Find that a solid `c-primary` fill cannot carry text in any direction
- [x] Add `c-primary-solid` for filled brand buttons and `c-on-solid` for content on them
- [x] Convert all four solid-brand buttons, leaving the three decorative uses alone
- [x] Strengthen the now-playing row tint so it can carry text
- [x] Add a usage guard that only flags solid `c-primary` when a Text or Icon shares the block
- [x] Verify curves, reverb, contrast, tsc, eslint, i18n and DSP
- **Status:** complete

## Notes on Phase 58
Two of my own assumptions were wrong this round and the measurements corrected
them: pressed state *raises* button contrast (RN's opacity composites the whole
subtree), and the play button and progress playhead were fine all along at the
3:1 threshold that actually applies to meaningful graphics. The solid-brand
fills were the real defect, and the fix was a new token rather than eight edits.

### Phase 59: Song Row Design
- [x] Close the last checker gap: colors passed as props to other components
- [x] Teach the checker `var(x)` indirection and `#rrggbb` hex, which it could not read at all
- [x] Design the song row, the most-repeated element and previously untouched
- [x] Turn the 9pt badge into a real chip with a readable tiered fill
- [x] Replace the 0.5-opacity "unsupported source" fade with an explicit label
- [x] Raise the row's overflow icon to the shared 18pt affordance scale
- [x] Grow the checker to 21 checks and 13 pairings
- [x] Verify curves, reverb, contrast, tsc, eslint, i18n and DSP
- **Status:** complete

## Notes on Phase 59
The badge was the least readable text in the app — 9pt, no background, 1.75:1 —
and it sits in the element users see most. The "unsupported source" fade was
also a category error: the row stays fully tappable, so it is a warning, not a
disabled state, and warnings should say what they mean rather than get dimmer.

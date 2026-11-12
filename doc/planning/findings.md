# Findings

## Requirements
- 用户希望完善 iOS 版本，当前只要求未签名 IPA。
- “功能太差、界面不完善”尚未指定具体页面，因此先做通用且高收益的 iOS 体验改进。

## Research Findings
- 项目是 React Native 0.73.11，iOS 工程位于 `ios/`，已有 GitHub Actions 未签名 IPA 流程。
- 主要入口和导航代码位于 `src/navigation/`，组件位于 `src/components/`。
- 原有 `toast()` 在 iOS 上只输出到控制台；所有导入、同步、播放等操作提示对用户不可见。
- iOS 已有 UIDocumentPicker 原生模块，但“添加本地音乐”入口要求选目录，因而直接被禁用。

## Open Questions
- 这轮先不重做视觉设计，后续可根据真机截图迭代配色、间距与具体页面。

## 2026-09-10: User-reported UI corrections
- The visible “create playlist” and “import local music” actions already use `c-button-font`, but that token is derived from a theme alpha color and can remain too close to the solid primary background in some themes. The corrective change should use an explicit contrast token shared by primary actions.
- The vertical home entry renders `Mylist` in two locations, one in the active pager and one as a second direct child, which accounts for the duplicate page appearance.
- Search has dedicated `MusicList` and `SonglistList` surfaces; their layout needs inspection before moving them so the search header and result state remain coupled.
- Quality selection is centralized in utility/picker paths, so ordering can be fixed once and applied to both playback and download choices.

## 2026-09-09: iOS CI quirks_mode failure
- 用户报告 `bundle exec pod install --repo-update` 在生成 React-Codegen.podspec.json 时失败，报 `unknown keyword: quirks_mode`。
- 日志中 LXLibFLAC.xcframework 已成功生成；`float.o has no symbols` 警告未中断构建。
- `.github/workflows/ios-ipa.yml` 使用 macos-14、Ruby 3.2 和 ruby/setup-ruby 的 bundler-cache。
- Gemfile 仅约束 CocoaPods 为 `~> 1.12`，项目没有 Gemfile.lock，也没有 JSON 依赖约束。
- 本轮开始时 Git 工作树干净；Windows 未安装 Ruby，node_modules 中没有可用的 React Native 源码；Docker 服务及 Ubuntu WSL 可用。
- RubyGems API 显示当前 JSON 最新版本为 3.0.2（2026-09-09 发布）、cocoapods-core 为 1.17.0；需要核对主版本兼容性，不能假定旧版本报错原因。
- 当前分支为 main；iOS workflow 的 push 触发器只包含 ios-adaptation，另支持 workflow_dispatch 手动触发。
- JSON 3.0 官方变更记录确认：未知参数从忽略改为抛出 ArgumentError；3.0.0 于 2026-09-07 发布。来源：https://github.com/ruby/json/blob/v3.0.2/CHANGES.md
- React Native 0.73.11 在打印 `[Codegen] Generating ...` 后调用 `spec.to_json`，与用户失败位置一致。来源：https://github.com/facebook/react-native/blob/v0.73.11/packages/react-native/scripts/cocoapods/codegen_utils.rb
- 已有同类 CocoaPods/ActiveSupport 调用 quirks_mode 导致 JSON 3 不兼容的公开报告；本轮使用 `json < 3.0` 约束，继续实测实际解析和序列化调用链。

## 2026-09-11: Playback, lyric and sound-effect refinement
- 排行榜现有 `handlePlay()` 会先播放当前已载入列表、随后补齐完整榜单，因此“播放全部”复用它并从索引 0 开始，不改变原有临时队列语义。
- 本地播放优先读取音频内嵌歌词；下载流程此前只保存音频，因而本地条目无法稳定取得在线歌词。以同名 `.lrc` 保存主歌词及翻译、罗马音、逐字歌词，可沿用现有本地歌词解析器而不扩展数据库结构。
- Apple Music 官方支持文档公开了按音乐类型调整均衡器的功能；Dolby 官方公开强调以内容场景调节沉浸感。新增预设采用“原声清晰、影院低频、夜间聆听、游戏定位”等中性场景名称和自主 EQ 曲线，不以品牌官方算法或预设自居。来源：https://support.apple.com/guide/music/change-the-way-music-sounds-mus1019/mac ，https://www.dolby.com/technologies/dolby-atmos/

## 2026-09-11: QQ Music text export
- QQ 音乐官方歌单导入页 `https://y.qq.com/y/static/mymusic/songlist_import.html` 会按换行拆分粘贴文本，把 `歌名 - 歌手` 规范化为 `歌名|歌手` 后提交匹配。
- 官方页面在一次提交前执行 `slice(0, 500)`，因此超过 500 首时应提示用户分批粘贴。
- 本地歌曲可能没有歌手字段；此时只导出歌名仍可被导入页识别。

## 2026-09-14: Global optimization audit
- 下载链路目前只有 `activeDownloadIds` 内存去重，没有持久任务表，缺少进度、取消、失败重试和后台恢复能力。
- 本地歌曲页会因导航切换反复全量读目录，且没有文件变化监听，可在刷新入口稳定后引入节流或监听。
- 本地歌曲详情依赖导入时的元数据，文件被外部修改后可能过期，刷新时可重新读取元数据。
- 下载只写音频和歌词，不会登记到统一的下载管理状态，用户缺少队列、进度和失败原因入口。
- `core/music/utils.ts` 的换源和歌词链路仍有多处 `any`、控制台日志与重复分支，适合拆成类型化的小模块。
- iOS CI 已约束 `json < 3.0`，但没有本地 Gemfile.lock，仍应通过真实构建或锁定依赖进一步降低 CI 波动。

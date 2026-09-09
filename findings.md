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

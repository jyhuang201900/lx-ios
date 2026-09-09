# Task Plan: 完善 iOS 版本体验

## Goal
在不破坏现有 React Native 功能的前提下，改善 iOS 版本的界面完成度与核心使用体验，并完成可验证的代码检查。

## Current Phase
Phase 6

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

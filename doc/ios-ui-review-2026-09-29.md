# iOS UI 评审与重设计落地记录

范围:`lx-music-mobile-ios-adaptation`,React Native 0.73.11,交付面为竖屏 iOS。

## 核验方法

所有对比度结论都由 `scripts/check-contrast.py` 复刻 `src/components/PageContent.tsx`
的图层合成栈后实算得出,不使用目测或截图估计:

```
c-content-background  →  c-main-background(0.84 浅 / 0.80 深)  →  内容表面 token  →  文字 token
```

脚本用正则从 `src/theme/themes/index.ts` **直接解析** `buildActiveThemeColors` 的派生规则,
而不是在脚本里复刻一份。这样 token 一改,核验结果立刻跟着变——
中途就因为手工复刻出现过一次静默漂移(脚本验 `dark-500`、代码写的是 `dark-300`),
所以改成读实现。

```bash
python scripts/check-contrast.py    # 退出码非 0 即有不达标项
```

## Summary

改造前 **33/112** 项不达标(WCAG AA 4.5:1),改造后 **0/192** 项不达标。

不达标项**高度集中在浅色主题**,不是均匀分布:

| 失败类型 | 涉及主题 | 最差值 |
|---|---|---|
| 品牌色作前景文字(`c-primary-font` / `c-primary-font-active`) | 15/16 | 1.70:1 (orange) |
| 次要文字落在内容层玻璃面上 | 6/16 | 3.99:1 (china_ink) |
| 标签栏选中态压在激活胶囊上 | 16/16 | 1.84:1 (orange) |

评级:**Critical issues** → 已修复并复验。

设计主张本身没问题——「玻璃 + 霓虹 + 极光」是有判断的选择,不是模板默认审美。
问题在于它被放到了 Apple 明确禁止的位置(内容层),并且品牌色被当成了前景文字色。

---

## Critical(已修复)

### 1. 品牌色当文字色,全主题不达标

**What** — `c-primary-font` 直接取 `c-primary`(白底 2.9:1),
`c-primary-font-active` 取 `c-primary-dark-100-alpha-200`(半透明,合成后更低)。
实测 15/16 主题不达标,最低 **1.70:1**(orange 品牌色作文字)。

**Why** — `accessibility.md › Vision`:

> | Text size | Text weight | Minimum contrast ratio |
> | Up to 17 pts | All | 4.5:1 |

**Fix** — 浅色主题压深到 `c-primary-dark-500`(全 16 主题最低 5.09:1),
深色主题取 `c-primary-light-200`;`active` 再拉开一档(浅→`dark-700`,深→`light-100`),
让「当前项」在字色上也有可辨差异。取值由脚本枚举色阶选出,不是手调。

### 2. 字号低于 iOS 下限

**What** — `Typography.caption = 10`,出现在 6 处文字(标签栏、音质、来源、
队列徽章、现在播放、歌单来源标签)。

**Why** — `accessibility.md › Vision`:`| iOS, iPadOS | 17 pt | 11 pt |`

**Fix** — `caption` 提到 11,6 处跟随。标签栏同时去掉 `maxFontSizeMultiplier={1.15}`
——它把 Dynamic Type 锁死在 15%,等于对该项无障碍设置直接失灵。

### 3. 次要文字落在内容层玻璃面上

**What** — 6 个浅色主题的 `c-font-label` 在 `c-glass-surface` 上不达标
(china_ink 3.99、mid_autumn 4.08、happy_new_year 4.28、blue2 4.41、red 4.43、ming 4.43)。
深色主题因为 `isDark` 分支本就取了更深一档的色阶,没有这个问题。

**Fix** — 见下面「玻璃的位置」:内容层不再用玻璃,次要文字回到页面底色上(5.92:1)。

### 4. 固定行高与 Dynamic Type 冲突

**What** — `ITEM_HEIGHT` 固定 54pt×scale,被 7 个 `ListItem` 消费。
行内两行文本在 200% 文字下需约 150pt,固定 64pt 必然截断。

**Why** — `accessibility.md › Vision`:

> **Support larger text sizes.** … Ideally, give people the option to enlarge text by at
> least 200 percent

`typography.md`:

> **Keep text truncation to a minimum as font size increases.** … Avoid truncating text in
> scrollable regions unless people can open a separate view to read the rest of the content.

**Fix** — 7 处 `height` → `minHeight`。行高可变后 `getItemLayout` 不再成立,
7 个列表全部移除该 prop(它要求每行等高,留着会给出错误的滚动偏移)。
`Mylist/MusicList/List.tsx` 用 `scrollToIndex`,补 `onScrollToIndexFailed`:
先用 `averageItemLength` 粗跳,下一帧目标附近已测量后再精跳——RN 对可变行高的标准处理。

### 5. 未接入系统的显示辅助设置

**What** — 已有 `useReduceMotion` 并在 3 处正确使用,但没有任何代码读
`reduceTransparency`。应用的可读性完全依赖半透明玻璃,开了这个开关的人得不到任何收益。

**Why** — `materials.md › Liquid Glass`:

> the appearance of these variants can differ in response to certain system settings, like if
> people choose a preferred look for Liquid Glass in their device's settings, or turn on
> accessibility settings that reduce transparency or increase contrast in the interface

**Fix** — 新增 `src/theme/accessibility.ts`:

- `useDisplaySettings()` 订阅 `reduceTransparency` 与 `boldText`,写入模块级仓库;
- `createGlassStyle` 读取该仓库,降低透明度时降级为不透明底并去掉受光高光;
- 订阅挂在 `ThemeProvider`,设置变化会让 `ThemeContext` 引用变化,从而触发
  所有 `useTheme()` 消费者重渲染并重算样式。样式函数读模块仓库、组件靠 context 感知,
  这样 31 处调用点的 API 不用动。

**关于 Increase Contrast**:RN 0.73 **没有**暴露 iOS 的 `darkerSystemColors`
(只有 reduceMotion / reduceTransparency / boldText / grayscale / invertColors)。
所以对比度的责任必须落在默认色板上——现在 16 主题全部满足 AA,
这正是 `accessibility.md` 对该设置的实质要求。没有假装接入不存在的 API。

---

## Improvements(已修复)

### 6. 玻璃用在了内容层 ★核心

**Why** — `materials.md › Liquid Glass`:

> **Don't use Liquid Glass in the content layer.** Liquid Glass works best when it provides a
> clear distinction between interactive elements and content, and including it in the content
> layer can result in unnecessary complexity and a confusing visual hierarchy. Instead, use
> standard materials for elements in the content layer, such as app backgrounds.

> **Use Liquid Glass effects sparingly.** … overusing this material in multiple custom controls
> can provide a subpar user experience by distracting from that content.

**What** — 31 处 `createGlassStyle` 中有 14 处在内容层:本地歌曲、我的列表卡片、
排序标签、标签组、设置 Section、来源/类型选择器、热门搜索、历史记录、榜单项等。

**Fix** — 新增 `createContentSurface()`(不透明 + 描边),内容层 14 处全部替换。
**玻璃只留给浮动的功能层**:标签栏、迷你播放条、顶栏、sheet / menu / dialog、播放页胶囊。

顺带解决了一个之前没意识到的问题:实算显示 `c-primary-light-1000` 与页面底色的
可区分度是 **1.00:1**——也就是这个内容表面本来就「看不见」,
它唯一的实际作用就是压低文字对比度。去掉它同时修好了对比度和层级。

### 7. 标签栏形态与配色

**Why** — `tab-bars.md`:

> **Avoid applying a similar color to tab labels and content layer backgrounds.** If your app
> already has bright, colorful content in the content layer, prefer a monochromatic appearance
> for tab bars

> A tab bar floats above content at the bottom of the screen.

**Fix** — 三处:

1. **通栏贴边**,去掉 16pt 水平内缩。内缩胶囊是 Material 分段控件的语言。
   迷你播放条同步去掉内缩,两者连成一个底部单元(对应 iOS 26 的合并式浮动组件)。
2. **标签取单色**:选中用 `c-font` + 600 字重,未选中用 `c-font-label`。
   颜色不再承担「当前在哪」,由胶囊底 + 字重承担。
3. 标签字号 11pt,命中区 44pt(`accessibility.md` 默认值),去掉缩放锁。

签名元素(霓虹辉光)只保留在选中胶囊上,未选中项完全静止。

### 8. 同一层级存在两套导航,且其中一套不可达

**What** — 标签栏 6 项与 `Home/Vertical/DrawerNav.tsx` 渲染**同一份** `NAV_MENUS`。

调查发现:打开抽屉只依赖 `changeMenuVisible(true)`,而**全项目只有
`changeMenuVisible(false)` 的发射点**,横屏 Header 里的菜单按钮也一直是注释状态。
也就是说这套重复导航**从未能被打开**——它不是两套并存的导航,是一套死代码。

**Fix** — 删除 `DrawerNav.tsx`,`Content.tsx` 去掉 `DrawerLayoutFixed` 包装。
顶层导航唯一由标签栏承担(`tab-bars.md`:
"Make sure the tab bar is visible when people navigate to different sections")。

歌单页的标签抽屉是另一回事——它是**可达的**筛选器,保留在 `SongList/index.tsx`。
横屏 `Home/Horizontal/Aside.tsx` 是常驻侧栏,也属于合法形态,未动。

### 9. 极光与扫光是常驻装饰

**Why** — `motion.md › Best practices`:

> **In apps, generally avoid adding motion to UI interactions that occur frequently.**

`design-principles.md` 中 `Delight` 一节的告诫:不要把 delight 误当成 decoration。

**What** — `AuroraBackground` 4 个 `Animated.loop` 常驻 9~14.5s 永不停歇,
列表滚动时照跑;`GlassSheen` 另在多处叠加 2.4s 循环。两者表达的是同一件事。

**Fix** — 二选一,不能都留,选了后者:

- **删除 `GlassSheen.tsx`**。它与极光同义,删掉后玻璃语言一点不少,少一个常驻循环。
- 极光加 `animated` 开关,**只有播放详情页传 true**(`PageContent` 的
  `aurora="animated"`)。那里是这个产品唯一的「此刻」,动态光晕为它服务;
  其余页面静态。签名元素因此只出现一次,不再淹没在每一屏的底噪里。
- 光晕从 4 团减到 3 团:静态版是每屏底色,四团互相叠会出脏色。

### 10. 歌单来源标签假设封面总是深色

**What** — `color="#fff"` 硬编码白字压在 `rgba(0,0,0,0.3)` 上。实算:

| 封面 | 合成底色 | 白字 | 结果 |
|---|---|---|---|
| 白色 | `rgb(178,178,178)` | **2.12:1** | FAIL |
| 浅灰 | `rgb(140,140,140)` | **3.36:1** | FAIL |
| 深色 | `rgb(21,21,21)` | 18.26:1 | PASS |

**Fix** — 改为不透明胶囊底 + 跟随主题的文字色,对任意封面都稳定。

### 11. 播放详情页胶囊的底色档位

来源/音质胶囊原本用 `c-glass-surface` / `c-button-background-selected`,
实算次要文字最低 3.99:1、品牌字最低 2.49:1。

**Fix** — 统一改 `c-glass-overlay`。胶囊是浮在内容上的功能层元素,
overlay 档位下三类文字最低 9.81 / 4.83 / 5.92:1,全部通过。
`Home/Horizontal/Header`、`PlayDetail` 两处 Header 同样从 surface 提到 overlay。

### 12. 字阶命名与实际值不符(未改,仅标注)

`Typography.body = 15`,但 iOS 的 body 是 17pt(15pt 是 callout)。
列表主标题实际走的是 callout 层级。改名的收益不覆盖跨文件改动成本,
已在 `layout.ts` 的注释里写明,正文级别的长文本应显式取 17。

---

## Craft notes

**这套设计有观点,但花光了。** 「玻璃 + 霓虹 + 极光」不是模板默认配色,
问题在于它出现在每一屏、每一层、且永不停止。Apple 自己的建议是品牌让位于内容,
签名元素应该只有一处,周围保持安静。

`src/theme/layout.ts` 里的 `Gap` 分层是全项目最好的一处决定:按信息层级分
inline / tight / block / section / page,相邻层级保持 1.6–2 倍落差。
这是判断,不是默认。这部分完整保留,未动一行。

**删掉一件附属品:`GlassSheen`。** 与极光同义,叠在一起只是双倍开销。

**签名元素落在播放详情页。** 那是这个产品唯一的「此刻」——正在听什么、
来自哪个源、什么音质。极光、玻璃、控制密度都为它服务,
而不是在设置页的每个 Section 上重复一遍。

---

## What works(未动,需保住)

- `layout.ts` 的层级化间距体系,有明确理由,不要在后续迭代里被拍平成等差。
- `createShadow` 正确区分 iOS `shadow*` 与 Android `elevation`。
- `useReduceMotion` 已在 3 个动画组件中正确接入,包括直接 `return null` 而非降速。
- 标签栏的 `accessibilityRole="tab"` + `accessibilityState.selected` + `accessibilityLabel` 完整。
- 切页配了 `hapticFeedback('light')`。
- `TabularNums` 用于时间与计数,避免数字跳动。
- 未出现溢出型 tab(`More` tab),6 项在所有宽度下均可见。

---

## 未采纳的建议

**把 6 个 tab 收敛到 5 个**(合并排行榜与歌单为「发现」)。
`tab-bars.md` 确实写了「generally easier to navigate among fewer tabs」,
但它同时写明溢出成 `More` tab 才是真问题,而当前 6 项全部可见、无溢出。
合并 tab 会改动 i18n、导航结构和六个页面的状态保持,属于产品决策而非设计修正,
留给你判断。本轮只修形态(通栏)和配色(单色)这两条硬规则。

---

## 验证结果

```
python scripts/check-contrast.py   →  0/208 失败
tsc --noEmit                      →  exit 0
eslint (45 个改动文件)             →  exit 0
node scripts/check-i18n-keys.js    →  3 locales, 657 keys OK
```

未在真机或模拟器上运行。以上均为静态核验;弹层、气泡、菜单的最终叠放关系
仍需 Accessibility Inspector 在设备上复核。

---

# 第二轮:craft 与弹层

第一轮做完无障碍与平台约定后,还有半件事没做完——**玻璃的另一半我只保留、没验过**。
这一轮把弹层、菜单、弹窗全部纳入核验,顺手清掉几处同一类错误。

## 又找出 4 处对比度失败

第一轮我只给"内容层"和"标签栏"建了检查项,浮层内部的组合全没覆盖。补上后:

| 位置 | 问题 | 最低值 |
|---|---|---|
| `QualityBtn` | 用的是内容层那档浅色玻璃 | 3.99:1 (china_ink) |
| `DownloadQualityPicker` | 同上 | 3.99:1 (china_ink) |
| 菜单选中项 | 品牌字压在品牌底色上,三层叠压 | 4.05:1 (black) / 4.40:1 (china_ink) |
| 三个 Header | 用的是内容层那档浅色玻璃 | 3.99:1 (china_ink) |

全部改为浮层档后通过。菜单那一处值得单说——那块底色上文字色的可选范围极窄:

```
c-font                6.71:1  ✓
c-primary-font        3.30:1  ✗
c-primary-font-active 4.05:1 ✗
c-font-label          4.40:1  ✗
```

品牌色压在自己的浅色底上必然掉到 3~4:1,这正是 `tab-bars.md` 说的
"标签色与内容层底色相近"。而**把底色加实只会更糟**——china_ink 下 `c-font-label`
从 4.40 掉到 3.72。所以选中态只能靠底色 + 字重,不能靠文字颜色。
这段约束写进了 `Menu.tsx` 的注释,免得下次有人"顺手改回品牌色"。

> 检查脚本里**没有**加「菜单选中项 + c-font-label」这一项。它测的是设计里
> 不存在的组合,而一个常挂着失败的检查会让退出码永远是 1,反而训练人忽略它。
> 约束靠代码注释 + 这份文档守住。

## 删掉 `c-glass-surface`

内容层改实色后,`c-glass-surface` 和 `createGlassStyle` 的 `level: 'surface'` 分支
**一个调用方都没有了**。

删掉而不是留空,理由是:这个 token 存在的唯一理由就是"内容层专用玻璃",
而那正是 `materials.md` 禁止的东西。留着它等于给刚修好的 14 处错误留后门——
下一个开发看到 token 在、类型在、注释还在,就会再用一次。

现在 `createGlassStyle` 只有一档,`level` 参数也一并删掉。31 处调用点的语义
从"我要 surface 还是 overlay"变成"这里就是玻璃",少一个可选项就少一个错。

## 弹层:补上 HIG 明说的下滑关闭 ★

**What** — 底部弹层只能靠一个 **12pt** 的 ✕ 图标关闭。这是本项目最高频的交互缺口。

**Why** — `sheets.md`:

> **Support swiping to dismiss a sheet.** People expect to swipe vertically to
> dismiss a sheet instead of tapping a dismiss button.

**Fix** — `Popup` 底部弹层加 `PanResponder` 下滑关闭,三个决定:

1. **只挂在头部**,不挂整块——否则会吃掉内容区的列表滚动。
2. **只响应向下位移**,向上直接不接管——避免和"展开内容"的手势预期打架。
3. **跟手 + 短促回弹**。`motion.md` 要求反馈动作 brief and precise,
   且 "Let people cancel motion":位移不够就弹回,不替用户做决定。

**没有**加 resize grabber。`sheets.md` 明确说 grabber 是给 resizable sheet 的,
而这个弹层并不可调整尺寸——加了就是承诺一个不存在的交互。这条也写进注释了。

## 控件图标:10pt → 18pt

**Why** — `icons.md` 给的不是具体数值,是一致性:

> all interface icons in your app need to use a consistent size, level of detail,
> stroke thickness (or weight)

**What** — 尺寸散在 10~28,其中关闭/移除类控件落在 10~12pt,而命中区是 36~44pt。
实测 10~13 共 27 处,是最密的一档,也是最看不见的一档。

**Fix** — `layout.ts` 新增 `IconSize` 标尺(affordance 18 / disclosure 14),
5 处关闭移除 + 2 处行内 chevron 归位。20~28 的大图标没动——那是封面占位和
空状态插图,属于内容不是控件。

## 同一 bug 的第三处

`SonglistDetail/Header.tsx` 的播放量标签:50% 黑衬 + 硬编码白字压在歌单封面上。
和第一轮修的来源标签是**完全同一个错误**,实算白色封面上 3.95:1。

这是"修一处"不如"归一类"的典型:同一个反模式散在三个文件。统一做法是
不透明胶囊底 + 跟随主题的文字色,现在两处一致。

## 镜面高光边:3 份数值收成 1 个 token

同一个视觉元素在 3 个 Pic 组件里各写一遍,而且两套还不一致:

```
mini player     0.78 / 0.42 / 0.20
播放详情(两份)   0.82 / 0.48 / 0.24
```

收成 `createSpecularEdge(theme, { radius, width, intensity })`。
深浅两套**不是等比关系**(暗色下顶 0.56、左侧 0.42、右侧 0.33),所以逐边写死,
而不是乘一个系数——乘系数复现不出原值,第一版就是这么写错的。

mini player 的 40pt 小图取 `intensity: 0.86` 收一档,这是有意的尺寸差异,
现在它是一个显式参数,而不是第二套设计。

## 一处跟随主题的遮罩

`SearchTipList` 的背景遮罩是 `rgba(0,0,0,0.05)`。深色主题下 5% 黑几乎不可见,
压暗感失效。改为深色下用等效的白色 5%。

---

# 第三轮:科技感

需求是"更科技化"。但前两轮刚把玻璃按回功能层、删光了常驻动画,
所以这里要先想清楚:**科技感不等于加玻璃,也不等于加动画。**

## 科技感其实有两条独立的来源

| 来源 | 做法 | 前两轮的状态 |
|---|---|---|
| **装饰层** | 玻璃、辉光、极光、循环动画 | 已经过载,并被 HIG 按回正确位置 |
| **信息层** | 数字、单位、精度、仪表读数 | **完全没利用** |

这个项目手里握着大量真正的技术数据,却被塞在 10-11pt 的小药丸里:

- `LX.Quality` 本身就是规格语言:`flac24bit` / `hires` / `atmos` / `master`
- `meta._qualitys[quality].size` 有每档的**实际文件体积**
- 音效面板有完整 DSP 链:EQ 分贝、音高、环绕参数
- 音源可能是自定义脚本(星海脚本 · 酷我音乐)

这些是**内容层放得下的信息**,不是装饰。`design-principles.md` 说:

> Does structure encode information? Numbering, eyebrows, dividers, and labels
> should say something true about the content.

所以这轮的主线是:**把装饰层的科技感,换成信息层的科技感。**

## 播放详情页:仪表读数

`StreamInfo` 原来就是两个小药丸(音源 / 音质),11pt,扫一眼读不出来。
改成三列读数:

    ┌──────────────────────────────────────────────┐
    │  音源          格式            体积            │  ← 11pt 标签
    │  网易云音乐    FLAC 24BIT      42.8 MB         │  ← 13pt 读数
    └──────────────────────────────────────────────┘

四个决定:

1. **用规格名而不是友好名**。原来显示 `SQ` / `HQ` / `24bit`——那是给人读的;
    读数用 `FLAC` / `ATMOS+` / `HI-RES` / `MASTER`,即这个档位在音频工程里的真名。
2. **规格名不走 i18n**。这些是格式与标准的专有名称,中英文写法一致
    (FLAC 就是 FLAC)。翻译它们反而会造出一个不存在的东西。
3. **体积列按可得性出现**。本地文件与未知档位没有这个值,此时整列不出现——
    留一个「—」会让人以为这里本该有数据。
4. **等宽数字**。`TabularNums` 已在项目里,切歌时数值不跳动。

## 动效:从"自己循环"换成"被触摸激发"

第二轮把常驻 `Animated.loop` 全删了之后,运动感确实归零。但 HIG 其实给了替代方案,
而且就在 `motion.md` 里:

> the movement of Liquid Glass responds to direct touch interaction with greater
> emphasis to reinforce the feeling of a tactile experience

**真玻璃的动效是被触摸激发的,不是自己在循环。** 这才是"HIG 认可的科技感"。

新增 `src/theme/press.ts` 的 `usePressEmphasis`,按压时轻微收缩 + 辉光加强。
调用形如 `usePressEmphasis({ scale: 0.92, glowBoost: 0.3 })`,返回
`handlers` / `transformStyle` / `glowOpacity` 三件套。

同时满足 `motion.md` 的另外两条:

- **"Aim for brevity and precision in feedback animations."**
  → `bounciness: 0`,不回弹。高频点击回弹会显得黏滞。
- **"Make motion optional."**
  → 减弱动态效果时直接 `setValue` 跳到终态,不做补间。
  去掉的是「动」,不是「按下了」这个信息。

以及 **"avoid using it as the only way to communicate important information"**
——所以按压必须配触感。播放键的 `hapticFeedback('medium')` 保留(标签栏本来就有 `light`)。

用到两处,强度不同:

| 位置 | scale | glowBoost | 理由 |
|---|---|---|---|
| 播放键 | 0.92 | 0.30 | 签名元素,低频,可以给足 |
| 标签栏 | 0.90 | 0.18 | 高频切换导航,动效抢戏会烦人 |

## 一处必要的结构改动

标签栏原来在 `NAV_MENUS.map()` 里内联渲染。要让 6 个标签各有按压状态,
就得调 6 次 `usePressEmphasis`——**Hook 不能写在 map 里**。

所以抽了个 `TabItem` 组件。这是为遵守 Hook 规则而必须的结构调整,不是顺手重构。

## 验证

    python scripts/check-contrast.py   →  0/208 失败
    tsc --noEmit                      →  exit 0
    eslint (60 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 659 keys OK
    check-sound-effect-dsp.js         →  passed

---

# 第七轮:混响房间的声学画像

前几轮我把「频谱 / 示波器 / 波形」以**没有真实数据**为由否掉了。
那句话我从来没验证过——只是默认它们拿不到数据。这次先查。

## 仓库里有真东西

`src/resources/medias/filters/` 下有 **13 个卷积混响 IR**,
全是标准 WAV(44.1k/48kHz、16bit、2 或 4 声道),完全可以解析。

而 **RT60(混响衰减时间)是定义一个空间声学特征的核心指标**——
0.5 秒是卧室,3 秒以上是大厅。这个差别不需要试听,看数就知道。

这正是前面几轮一直缺的:不是装饰,是真的、测出来的、装在仓库里的数据。

## 测量方法:ISO 3382-1,不是估算

`scripts/analyze-reverb.mjs` 离线解析:

1. 每样点能量 e[n] = 各声道平方和
2. **Schroeder 反向积分**并转 dB,得到衰减曲线
3. 取下降 5 dB 与 25 dB 的两个时刻,线性外推到 60 dB

这是声学测量里的标准做法,不是拍脑袋。

测出来的结果物理上完全自洽:

| IR | 时长 | 声道 | RT60 | 听起来应该是 |
|---|---|---|---|---|
| filter-telephone | 1.64s | 2 | **0.00s** | 电话滤波,几乎没有混响 ✓ |
| spreader50-65ms | 1.00s | 4 | **0.08s** | 极短扩散 ✓ |
| cinema-diningroom | 1.48s | 2 | **0.48s** | 餐厅 ✓ |
| living-bedroom-leveled | 1.23s | 2 | **0.53s** | 卧室 ✓ |
| matrix-reverb2 | 2.83s | 2 | **1.79s** | 中等空间 ✓ |
| feedback-spring | 4.00s | 2 | **2.73s** | 弹簧 reverb 以长尾著称 ✓ |
| bright-hall | 1.49s | 4 | **3.40s** | 大厅 ✓ |

数据与文件名互相印证,这才是能拿出去给人看的东西。

## 踩了两次归一化的坑

**第一次**:按**瞬时峰值**归一,但包络是**桶内均值**。两者不同尺度——
滤波器类 IR 的峰值是单点尖峰,用它归一,曲线从 -24dB 起步,读起来是错的。

**第二次**:改成按包络自身最大值归一,起点对了,但 `spreader50-65ms` 仍从 -31.3dB 起。
查下去发现是**桶分辨率**问题:1s 分 48 桶 = 每桶 20.8ms,
一个 1ms 的直接声被平均掉了约 26dB。

**最终解法**:显示改用 **Schroeder 衰减曲线**本身,而不是「每桶平均能量」。
它是累积量,构造上必然从 0dB 起步且单调下降;而且它正是声学里画混响衰减的标准图,
RT60 的 T5/T25 取点也就在这条曲线上——**显示与测量用的是同一份数据**。

实测 13 条全部起点 0、单调下降:

    filter-telephone   0.0 → -60.0   #                    立刻掉
    spreader50-65ms    0.0 → -60.0   ####+..              很快掉
    bright-hall        0.0 → -36.2   ##############+++++  长尾
    feedback-spring    0.0 → -60.0   #####++++++++++....  中长

## UI

选中某个空间后显示:标题 + **RT60 读数** + 衰减曲线 + 规格行(采样率 / 声道 / 脉冲长度)。

RT60 用等宽数字,切换空间时数值不左右跳动。
衰减图用等宽竖条拼填充(48 点铺约 300px,每条约 6px,视觉上连续)——
理由和 EQ 曲线一样:没有 `react-native-svg`,而新增原生依赖无法在本机验证 iOS 构建。

RT60 / dB / kHz / ms / ch 都是通用技术符号,不进 i18n;只有标题「房间声学画像」需要本地化。

## 可复现

脚本挂进了 npm:

    npm run analyze:reverb    # 重新解析 IR 并生成 reverbProfile.ts
    npm run check:contrast    # 16 主题 × 图层合成栈对比度核验

`reverbProfile.ts` 只有 6KB,编译进包无压力——原始 6MB 的 .wav 留在仓库里,不进 App。

## 验证

    npm run analyze:reverb        →  13 个 IR，exit 0
    python scripts/check-contrast.py   →  0/224 + 封面底图 0/256
    tsc --noEmit                      →  exit 0
    eslint (60 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 660 keys OK
    check-sound-effect-dsp.js         →  passed

---

# 第十轮:这台仪器到底接在信号链上了吗

上一轮发现核验地基塌了。这轮沿同样的眼光再扫一遍——
九轮里我**验证过的东西**,还有什么只是我以为验证过。

## 仪器可能根本没插在信号链上

第七、八轮我把 EQ 曲线和 13 条房间衰减曲线当成"真实的声学读数"。
但我从没查过一件事:**这些参数真的作用到声音上了吗?**

查了:

    isSoundEffectSupported = Platform.OS == 'ios' && 原生模块存在

    updateNativeSoundEffectConfig:
      if (!isSoundEffectSupported) return     ← 静默返回，没有任何提示

而控制器明明导出了 `isSupported`,**UI 里没有任何地方读它**。

也就是说在 **Android** 上(而这个项目是同时发安卓包的):

- 播放页的音效按钮照常出现
- 面板完整渲染 EQ 曲线、13 条房间衰减曲线、RT60 读数、全部滑块
- 用户拖动滑块,曲线实时跟随变化
- **而这一切一个都不作用于声音**

界面看上去在报告频响与房间声学,实际只是回显一组没生效的设置。
这正是我前九轮一直在剔除的东西——**装饰冒充信息**——只是这次它伪装成了仪器。

## 修法:让它诚实,不是让它变灰

1. **`SoundEffectControl`** 检查 `soundEffectController.isSupported`。
    不支持时直接说明"当前平台不支持音效处理,下面这些参数不会作用于声音",
    而不是把整块面板灰掉——灰掉仍然让人以为"暂时不可用,等会儿就好了"。

2. **播放页的音效按钮**在不支持时**整个不出现**。
    给一个点了没反应的控件,比没有这个控件更糟——它会让人以为应用坏了。
    竖屏与横屏两处都改。

## 踩到的 Hook 规则问题

第一版把守卫插在 `previewGains` 等 state 之后,结果后面还有 3 个 `useEffect`。
提前 `return` 会让这些 Hook 在不支持时不被调用——**违反 Hook 规则**,
而且这种 bug 只在特定平台出现,极难复现。

守卫必须放在所有 Hook 之后、最终 `return` 之前。

## 顺带确认覆盖完整

搜了一遍 `setting_play_sound_effect` 的所有使用点:只从播放页两个按钮进入,
设置页没有独立入口。所以两处按钮 + 面板本身三道守卫就够,没有漏网的地方。

## 验证

    python scripts/check-contrast.py
      内置 16 主题            →  0/224
      播放页封面底图（对抗性）  →  0/256
      用户自建主题（色相全域）  →  0/1800，自证通过
    tsc --noEmit                      →  exit 0
    eslint (59 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 661 keys OK
    check-sound-effect-dsp.js         →  passed
    analyze-reverb.mjs                →  exit 0

---

# 第十二轮:把"数据 → 显示 → 生效"这条链走完

前两轮在查链。这轮把剩下的最后一环查完,顺手补一个会让链断掉的洞。

## EQ 这条链是通的

查了三处:

**1. 频点一致。** 原生 `LXSoundEffectEqualizerFrequencies`:

    @[@31, @62, @125, @250, @500, @1000, @2000, @4000, @8000, @16000]

与 JS 的 `equalizerFrequencies` **逐项相同**。曲线画在对的频点上。

**2. 增益语义一致。** 两侧都是 dB,没有一边是线性幅度。

**3. dB → 滤波器的映射是正确的。** `LXRealtimeEqualizerProcessor`:

    amplitude = powf(10.0f, gain / 40.0f);   // RBJ peaking EQ 的标准换算
    q = 1.41f;                                // ≈1 倍频程，10 段图示 EQ 的标准带宽

每段一个 biquad 串联(`coeff.isBypass()` 跳过零增益段),外加 `makeHeadroomGain` 防削顶。
这是教科书式的实现,没有问题。

**结论:EQ 曲线是可信的读数。**

## 补一个会让链断掉的洞

链上唯一还能被我打断的地方:**分析脚本读的是 `filters/` 目录里的 .wav,
但 App 真正加载的是 `assets.ts` 里注册的资源。**

两者目前一致(13/13/13),但那是巧合,不是保证。真实的失效场景:

    有人把 bright-hall.wav 放进 filters/,跑了 npm run analyze:reverb,
    忘了在 assets.ts 注册
        ↓
    脚本照常算出 RT60 3.40s 写进 reverbProfile.ts
        ↓
    面板照常显示「明亮大厅 RT60 3.40s」
        ↓
    但 App 加载不到这个资源 → 原生返回 NO → 静默回退到 .largeHall

于是面板报的是一个**根本不会被播放的房间**的声学数据。

## 把它钉死

`analyze-reverb.mjs` 现在在生成前做三方一致性检查:

    filters/ 目录里的 .wav  ≡  assets.ts 注册的资源  ≡  音效选项引用的 source

任一环缺失就**中止生成**并指名道姓地说缺哪个。

## 反向验证:一个从不失败的检查也是装饰

检查通过本身不说明什么。临时删掉 `assets.ts` 里 `bright-hall` 的注册再跑:

    三方一致性检查未通过：
      ! bright-hall.wav 在 filters/ 里但未在 assets.ts 注册
      ! bright-hall.wav 被选项引用但未在 assets.ts 注册
    这些 IR 若无法被 App 加载，原生会静默回退到系统预设，
    而面板仍会显示这里算出的 RT60。已中止生成。
    exit=1

能准确报错、能中止、退出码非 0——检查是真的。文件已还原,`git status` 干净。

## 链的完整状态

| 环节 | 状态 |
|---|---|
| 房间声学数据 | 真实,从 .wav 离线实测,RT60 与文件名互相印证 |
| 频点 / 增益语义 | 两侧逐项一致 |
| dB → 滤波器 | RBJ peaking,标准实现 |
| 数据 ↔ 可加载资源 | 本轮补上硬性检查 |
| Android | 面板直说不支持,按钮不出现 |
| iOS 混响回退 | 已知,文案写明适用范围 |

除 iOS 的静默回退外,链上每个环节都验证过了。剩下那一环需要原生回报状态,
那要一台 Mac。

## 验证

    npm run analyze:reverb        →  13 个 IR + 三方一致性通过，exit 0
    python scripts/check-contrast.py
      内置 16 主题            →  0/224
      播放页封面底图（对抗性）  →  0/256
      用户自建主题（色相全域）  →  0/1800，自证通过
    tsc --noEmit                      →  exit 0
    eslint (59 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 662 keys OK
    check-sound-effect-dsp.js         →  passed

---

# 第十九轮:回到设计——歌曲列表行

十八轮里我一直在查对比度。这轮先补完核验的一个缺口,然后**回到设计**。

## 核验还漏了一条路径

上一轮我得出"列举会漏,枚举不会"。那就按这个结论再推一步:
我那套交叉扫描只认 `<Text>` / `<Icon>` 的 `color` 属性。

**作为 prop 传给其他组件的颜色,完全不在覆盖范围内。** 扫了一遍:

    <Loading color={theme['c-primary']} />   ×1

只有这一处,而且是 loading 转圈的指示色(非文字,WAG 不适用)。
这条路径比预想的干净——但它没被检查过,之前是"碰巧没错"。

核验脚本还因此补了两个能力:`var(xxx)` 间接引用解析、`#rrggbb` 十六进制解析。
此前徽章色写成 `var(c-primary)` 和 `#7fb575` 时,脚本**根本测不了它们**。

## 回到设计:歌曲列表行

十八轮里我设计过的界面:标签栏、播放页、音效面板、弹层、搜索工具条、队列弹窗、设置区。

**歌曲列表行——全应用重复次数最多的元素——一次都没设计过。** 打开看,两个问题。

## 问题一:来源徽章是全应用最不可读的一块文字

    Badge = 无底色的 9pt 纯文字
    颜色 = c-badge-primary / secondary / tertiary（都是无对比度保证的色板色）

    实测  c-badge-primary     1.95:1  @orange
          c-badge-secondary   1.75:1  @orange
          c-badge-tertiary    1.75:1  @orange

而且 **9pt 连 iOS 的 11pt 最小字号都不到**。

改成真正的 chip:tint 底 + `c-primary-font` 字,字号提到 11pt。
三个 tint 深浅区分音质档位:

    来源    c-primary-light-400-alpha-800    4.82:1
    无损    c-primary-light-600-alpha-800    4.93:1
    高品质  c-primary-light-800-alpha-800    4.98:1

三处使用点(我的列表行、在线列表行的音质标与来源标)一次性受益。

## 问题二:"音源不支持"靠变淡表达

    opacity: isSupported ? 1 : 0.5

实测:歌名 2.61:1、歌手行与序号 2.12:1。

**但那一行仍然完全可点**——所以它不是"禁用",是"警告"。
而警告不该靠变淡来表达,理由有两条:

1. 读不清(上面那三个数)
2. 含义含糊——在加载?被禁用?还是灰掉了?

改成显式的「音源不可用」chip,文字保持满对比度。

## 顺手:同一行的更多按钮

`dots-vertical` 是 12pt 字形配 44x44 命中区,和第十六轮那些关闭按钮同一个毛病。
统一到 18pt。

## 核验清单同步扩容

    内置主题检查      18 → 21 项
    前景/背景配对      10 → 13 组
    合计              0/288 → 0/336

## 验证

    npm run analyze:reverb        →  13 IR + 三方一致性，exit 0
    npm run check:curves          →  0 项失败
    python scripts/check-contrast.py
      内置 16 主题               →  0/336（21 项）
      播放页封面底图             →  0/256
      前景/背景配对（13 组）      →  0 失败
      用户自建主题（色相全域）    →  0/1800，自证通过
      token 卫生                 →  通过
      配对用法                   →  通过
    tsc --noEmit                      →  exit 0
    eslint (62 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 663 keys OK
    check-sound-effect-dsp.js         →  passed

---

# 第十八轮:把配对检查推广到全应用

第十七轮我手工列了 7 组按钮配对。这一轮不手工列了——
**枚举全应用组件里实际共存的（文字色, 背景色）组合,做交叉扫描**。

## 先说一个被实测纠正的假设

我以为上一轮刚修好的按钮,按下时会被 `Button` 的 `state.pressed ? 0.72` 再压一次。
实测:

    静止态 普通按钮   4.71:1
    按下态 普通按钮   4.82:1   ← 反而更高

因为 RN 的 `opacity` 作用于**整棵子树**——底色和字一起合成到页面上,
而字远暗于那层 tint,所以一起压反而更接近页面底色、对比度上升。

假设错了。RN 的 opacity 语义也和我最初写反了(我先算成"只压暗底色")。

## 交叉扫描:23 组共存组合,11 组低于 4.5

但**方法本身有个错误**:我把文字的 4.5:1 阈值也套到了图标上。
传达意义的图形按 WCAG 1.4.11 只要 **3:1**。重判后:

    ok   进度条播放头（图形 3.0）        3.10 / 4.12
    ok   迷你条播放键图标（图形 3.0）    3.89
    FAIL 排行榜 播放全部（文字 4.5）      1.15
    FAIL 我的列表 卡片图标（图形 3.0）   1.07
    FAIL 队列 正在播放 标签（文字 4.5）  2.05
    FAIL 队列 正在播放 歌手行（文字 4.5）1.38

另有 3 处是误报(启发式把十几行外的背景归错了,包括我自己写的 ReverbDecay)。

## 根因:实心品牌底在这套色板里撑不住文字

    c-000（白）压 c-primary        1.95:1
    c-1000（近黑）压 c-primary     1.20:1
    c-primary-font 压 c-primary    1.15:1

三个方向全挂。因为这批品牌色**明度居中**,两端都不够。
也就是说:**问题在底色,不在文字**——和第十六轮那个 Dialog 标题一样。

## 修法:新增两个语义 token

先量出可行解:

    实心 c-primary-dark-500 + c-000    16/16 达标，最低 5.09:1
    c-primary-font + c-primary-light-300-alpha-800   4.75 / 4.92

于是:

    c-primary-solid   实心品牌按钮的底色（= c-primary-dark-500）
    c-on-solid       压在它上面的文字/图标色（= c-000）

`c-on-solid` 用 `c-000` 是因为它**随外观翻转**:浅色主题下是纯白(对深底),
深色主题下灰阶反过来变成近黑(对浅底)。两种外观都需要"另一端"。

给它语义名而不是让 8 处直接写 `c-000`,是为了让调用点表达
「压在实心底上」,而不是「用了第 0 档灰」。

## 四处实心按钮全部改掉

不逐个撞——先 `grep backgroundColor: theme['c-primary']` 一次找全,7 处:

    排行榜「播放全部」          → c-primary-solid
    本地音乐「播放全部」        → c-primary-solid
    我的列表「播放全部」        → c-primary-solid
    打开歌单                    → c-primary-solid
    封面后的辉光底 ×2          装饰(封面盖住),不动
    下载进度条填充 ×1          装饰,不动

队列「正在播放」条那个 tint 太弱(标签 2.05 / 歌手 1.38),
加深到 `c-primary-light-300-alpha-800` 后 4.75 / 4.92。

## 计数守卫又拦了一次

批量替换 `color={active ? theme['c-font'] : theme['c-font-label']}` 时我写"期望 1 处",
实际 4 处——同一文件另外三处都在卡片表面上,`c-font` 是对的。
脚本跳过不改动,逐个看完只改了压在深底上的那一处,并在代码里注明
"另外三处不要一起改"。

## 新增用法守卫

    实心 c-primary 当按钮底 → 拦截
    但它在封面辉光底、进度条填充、loading 指示色里合法
    → 只在「同一块里有 <Text> 或 <Icon>」时才判定误用

## 验证

    npm run analyze:reverb        →  13 IR + 三方一致性，exit 0
    npm run check:curves          →  0 项失败
    python scripts/check-contrast.py
      内置 16 主题               →  0/288
      播放页封面底图             →  0/256
      前景/背景配对（10 组）      →  0 失败
      用户自建主题（色相全域）    →  0/1800，自证通过
      token 卫生（三条旁路）      →  通过
      配对用法                   →  通过
    tsc --noEmit                      →  exit 0
    eslint (61 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 662 keys OK
    check-sound-effect-dsp.js         →  passed
---

# 第十七轮:全应用每个按钮的文字都读不出来

前几轮的卫生检查有个明确的盲区:它只拦**原始色板 token**,
不拦**语义 token 用错表面**。

而 `c-button-font` 是全应用第二高频的文字 token(52 处)。

## 疑点

`c-button-font` 是"品牌按钮上的文字色",`c-button-background` 是"按钮底色"。
把它们配在一起实算(按钮文字 12~14pt,阈值 4.5:1):

    A  普通次要按钮    c-button-font on c-button-background            3/16 达标
    B  选中态按钮      c-button-font on c-button-background-selected   1/16 达标
    C  主要按钮        c-primary-button-font on c-primary-background  1/16 达标

分布(不只是个别主题差):

    普通次要按钮   最差 1.71:1 @orange   最高 8.18:1 @china_ink
    选中态按钮     最差 1.43:1 @orange   最高 4.86:1 @china_ink
    主要按钮       最差 1.08:1 @orange   最高 12.45:1 @black/深

**每个按钮的字,在 16 个主题里有 13~15 个不可读。主要按钮最差 1.08:1**
——白色字压在浅色底上,基本等于没有。

## 根因不是选错 token,是配对本身错了

    c-button-background = c-primary-light-400-alpha-700   品牌的浅色 tint
    c-button-font       = c-primary-alpha-100             品牌色本身

**同一个色相、相近明度。** 这两个颜色无论怎么调透明度都不可能有对比度——
它们是同一族颜色。这不是参数问题,是配对逻辑错了。

## 三条路径实测

    A  维持现状（品牌色字 / 品牌浅 tint）      3/16 达标   最差 1.71:1
    B  浅 tint 底 + c-primary-font 字        16/16 达标   最差 4.71:1
    C  实心深品牌底 + 白字（深色主题反向）    未能全部解析

选 **B**。理由不只是它达标:

- 它**保留了这个 App 的轻透气质**——浅色 tint 底还在,只是字改深了
- 它与标签栏选中胶囊是同一套语言(浅底 + 深品牌字),视觉一致
- 改动最小:只换文字 token,底色不动

## 改法:改 token 定义,一次修好 52 处

`c-primary-font` 在第九轮已经被改成"自我纠正"档位。这里直接复用它的成果:

    c-primary-button-font  →  primaryFont
    c-button-font          →  primaryFont
    c-button-font-selected →  primaryFontActive

`primaryFont` / `primaryFontActive` 提成局部常量,算一次共用——
算两次既浪费,也容易让两处漂到不同档位。

## 顺带修:播放键

播放键用的是 `c-button-font` 压在**实心底**上(3.89:1)——
而这是音乐 App 里最重要的控件。改为 `c-button-font-selected`(4.57:1),竖屏横屏都改。

## 一条注定失败的检查项 vs 一条用法检查

我把「`c-button-font` on `c-button-background-selected`」留在对比度表里,结果它永远失败。

一个常红的检查会训练人忽略它。改成**用法级**检查更诚实:
实心底上不许出现普通按钮字色,并在代码里写明该用哪个。

    反向验证：把播放键改回 c-button-font
      ! ControlBtn.tsx:79  c-button-font 出现在 c-button-background-selected 附近
      实心底上只能用 c-button-font-selected（3.89:1 → 4.57:1）
      exit=1

## 核验脚本要跟着长

这轮给 `check-contrast.py` 加了三样东西,因为实现本身也变了:

1. **常量引用解析**——`c-button-font` 现在指向常量 `primaryFont`,
   脚本必须顺着常量定义解析,否则会出现「代码已改、脚本还按旧值算」的静默漂移
   (那正是这个脚本当初要解决的问题)。解析器为此新增了
   `IDENT_REF` / `PICK_BODY`,并保留了 `.slice(1)` 偏移,
   否则 `active` 会落回和 `font` 同一档,「当前项」就没了字色差异
2. **前景/背景配对核验**——文字 token 单独达标没有意义
3. **配对用法检查**——上面那条

## 验证

    npm run analyze:reverb        →  13 IR + 三方一致性，exit 0
    npm run check:curves          →  0 项失败
    python scripts/check-contrast.py
      内置 16 主题               →  0/288
      播放页封面底图             →  0/256
      前景/背景配对（6 组）        →  0 失败
      用户自建主题（色相全域）    →  0/1800，自证通过
      token 卫生（三条旁路）      →  通过
      配对用法                   →  通过
    tsc --noEmit                      →  exit 0
    eslint (61 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 662 keys OK
    check-sound-effect-dsp.js         →  passed

---

# 第十六轮:同一个漏洞的两条旁路

第十五轮加了"原始色板不得用作文字颜色"的卫生检查。
但那只管住了 `<Text>` 一个入口——**同一个漏洞还有别的门**:

- 写在 `style.color` 里的颜色
- 给 `<Icon>` 的颜色

## 扫三条旁路

    [Icon color]   c-primary-light-100            ×2
    [Icon color]   c-300                          ×2
    [Icon color]   c-primary-dark-100             ×2
    [Icon color]   c-primary-light-100-alpha-600  ×1
    [Icon color]   c-primary-dark-500-alpha-500   ×1
    [Icon color]   c-primary-dark-100-alpha-500   ×1
    [Icon color]   c-primary-dark-100-alpha-300   ×1
    [Icon color]   c-600                          ×1
    [Icon color]   c-550                          ×1
    [style.color]  c-primary-light-200-alpha-700  ×1

## 传达意义的图标按 3:1,不是文字的 4.5:1

WCAG 1.4.11 管的是"有意义的图形"。实测十项:

    进度条播放头 full_stop     1.71:1  @ orange   ← 全场最小却最要紧
    Input 清除 ×              1.53:1  @ orange
    路径选择 展开箭头          1.24:1  @ orange
    历史记录 关闭 × / 清空     1.90:1  @ green
    Dialog 关闭 ×              2.05:1  @ orange
    队列 播放中指示 / 音量      2.40:1  @ orange
    评论 更新图标              4.29:1   ok
    播放页工具栏按钮           3.69:1   ok

八个不达标,而且排在最前面的几个都是**用户最需要看清的东西**:
进度条的播放头、搜索框里的清除按钮、弹窗的关闭按钮、队列里"正在播放"的指示。

## 修法

    c-primary-* 用作有意义的图标  →  c-primary-font   （4.83~5.09:1）
    灰色系用作控件图标           →  c-font-label    （5.92:1）

## 白名单:每条都要写理由

检查扩到三条旁路后,剩四处原始色板。其中两处**实测达标**
(`c-600` 4.29、`c-550` 3.69),另两处不承载信息。全部进白名单,
且**每条附理由**:

    c-550                          播放页工具栏按钮，3.69:1 ≥ 3:1；灰阶不随主色变化
    c-600                          评论页更新图标，4.29:1 ≥ 3:1；灰阶不随主色变化
    c-primary-light-200-alpha-700  按钮涟漪，瞬时触摸反馈而非状态指示
    c-primary-dark-100-alpha-300   横屏侧栏的品牌标记，纯装饰

白名单只收**与主色无关**的灰阶,或**不承载信息**的元素。
凡是要随用户主题保证对比度的,一律不准进白名单——那正是第十五轮的教训。

## 反向验证

把进度条的播放头改回 `c-primary-light-100`:

    ! src/components/player/ProgressBar.tsx:111  原始色板 c-primary-light-100 被直接用作 icon 颜色
    ! src/components/player/ProgressBar.tsx:116  原始色板 c-primary-light-100 被直接用作 icon 颜色
    共 2 处   exit=1

行号准确、退出码非 0、文件已完全还原(残留检查无输出)。

## 这一串的共同点

第九轮:`c-primary-font` 档位写死 → 47% 用户主题不达标
第十五轮:多处绕过语义层直接用 `c-primary` 当文字色
第十六轮:同一批旁路换到 `<Icon>` 与 `style.color`

三次都是**同一个病**:语义层的出口修好了,旁路没堵。
修好一个入口不等于解决一个问题——要堵的是整类。

## 验证

    npm run analyze:reverb        →  13 IR + 三方一致性，exit 0
    npm run check:curves          →  0 项失败
    python scripts/check-contrast.py
      内置 16 主题               →  0/288
      播放页封面底图             →  0/256
      用户自建主题（色相全域）    →  0/1800，自证通过
      token 卫生（三条旁路）      →  通过
    tsc --noEmit                      →  exit 0
    eslint (61 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 662 keys OK
    check-sound-effect-dsp.js         →  passed

---

# 第十五轮:把「浅 token + 不透明度」这个形状扫一遍全应用

第十四轮在歌词页发现的 bug 有个通用形状。比起一块块界面去看,
不如把这个形状**扫一遍**。

## 枚举所有「被当作文字颜色」的 token

扫全部 `.tsx`,抓 `<Text ... color={theme['c-xxx']}`,按用量排序:

    104  c-font-label        52  c-button-font        27  c-font
     15  c-primary-font       9  c-primary            8  c-primary-font-active
      8  c-600                5  c-500                4  c-primary-button-font

前三个是**语义 token**(派生时按对比度挑过档位),没问题。
问题全在后面那批——**原始色板**。实测(页面底色,4.5:1 阈值):

    c-primary-light-400-alpha-200    1.24:1  @ orange
    c-primary-alpha-400              1.49:1  @ orange
    c-primary-dark-100-alpha-300     1.83:1  @ orange
    c-primary                        1.95:1  @ orange
    c-primary-dark-100               2.40:1  @ orange
    c-500                            3.19:1  @ green
    c-600                            4.29:1  @ green

## 先看调用点,再决定改不改

不能见浅就改——有些浅色 token 配深色底是合理的。逐个查:

    Image.tsx EmptyPic 的 "LX"          BUG   1.17:1  浅底浅字
    Aside.tsx                          死代码（在 {/* */} 注释里）
    SyncModeModal 6 处等                BUG   4.29:1  差一点
    MusicToggleModal 8 处               BUG   1.95:1  歌曲来源/时长标签
    FontSize 字号预览                    BUG   1.95:1
    PlayInfo 5 处                       BUG   3.19:1  播放页的时间显示
    QueuePopup 2 处                     BUG   2.40:1  正在播放的那一行
    ListItem 1 处                       BUG   1.49:1  当前行的时长

其中 `QueuePopup` 那处值得单说:它是**正在播放**的那一行,
序号和曲名都用了 2.40:1 的颜色——最该被看清的一行反而最看不清。

## 计数守卫拦住了一处

批量替换时我按之前的扫描结果写了「期望 6 处」,实际文件里有 **8 处**——
早先的扫描漏了跨行的两个。脚本断言数量不符就**跳过不改动**,
而不是闷头替换。

## 修法:全部换成语义 token

    c-primary / c-primary-dark-100 / c-primary-alpha-400  →  c-primary-font
    c-500 / c-600                                          →  c-font-label

两个目标 token 都是派生出来的:前者 5.09:1,后者 5.92:1,都过 4.5。

`EmptyPic` 的「LX」用 `c-primary-font`:在那个占位底上实测 4.74:1,
既看得见,又保住了「应用缩写」这个原本的意图。

## 卫生检查抓到了我没预料的一处:Dialog 标题

新加的检查一上来就报了两条。第二条是 `Dialog.tsx:101`:

    标题字 c-primary-light-1000        浅色主题里是纯白
    标题底 c-primary-light-100-alpha-100   一个浅色 tint

**白字压浅色底。** 深色主题更糟——那个底色不随外观切换,
在深色下是浅灰 rgb(159,159,159),而深色主题的文字也是浅的。

    实测标题 1.61:1  ——  连 c-font 落到这个底上也只有 1.86:1

也就是说**每个确认弹窗的标题都是看不见的**(删歌单、删预设、各种确认)。

问题在底色不在文字,所以没有再给这个底色编语义:
去掉底色,改用发丝线做分组(分隔线本就是分组手段),文字回到 `c-font`。

`ModalContent` 里同款底色是个 20px 纯装饰条、里面没有文字,不受对比度约束,未动。

## 加了一道防线

这类错误不该再靠人眼发现。核验脚本新增「文字颜色 token 卫生检查」:
禁止把原始色板 token 直接用作 `<Text>` 的颜色。

反向验证——把 `PlayInfo` 改回 `c-500` 再跑:

    ! …/Vertical/Player/components/PlayInfo.tsx:18  原始色板 c-500 被直接用作文字颜色
    ! …/Vertical/Player/components/PlayInfo.tsx:23  原始色板 c-500 被直接用作文字颜色
    共 2 处
    exit=1

行号准确、退出码非 0、文件已还原。检查同时会跳过 `{/* */}` 与 `//` 注释
(用等量换行替换以保持行号),免得对保留的旧代码误报。

## 验证

    npm run analyze:reverb        →  13 IR + 三方一致性，exit 0
    npm run check:curves          →  0 项失败
    python scripts/check-contrast.py
      内置 16 主题（含歌词 4 项）   →  0/288
      播放页封面底图（含歌词色）    →  0/256
      用户自建主题（色相全域）      →  0/1800，自证通过
      文字颜色 token 卫生          →  通过
    tsc --noEmit                      →  exit 0
    eslint (61 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 662 keys OK
    check-sound-effect-dsp.js         →  passed

---

# 第十四轮:歌词页——全应用最大的表面

前几轮都在查链。这轮回到设计,清点了一遍我**完全没看过**的界面:
搜索页只改过控件底色、队列只动过图标、**歌词页一次都没看**。
而它是播放页最大的整屏表面,用户盯着它的时间比任何页面都长。

## 一眼看过去没问题,一量就塌了

歌词默认 21pt(横屏 22pt),属 WCAG 大字号,阈值 **3:1**。
翻译行是 `size × 0.8 ≈ 17pt`,低于 18pt,阈值回到 **4.5:1**。

原方案的取值:

    当前行已播放   c-primary-dark-200
    当前行未播放   c-450
    非当前行       c-450 × 0.6 不透明度
    翻译行         c-450 × 不透明度

实算:

    非当前行（c-450 × 0.72）  15/16 主题不达标,最差 2.01:1
    当前行已播放字            16/16 主题不达标,最差 2.93:1 (orange)
    封面底图上再降一档        最差 2.64:1

**2.01:1 几乎就是"看得见但不看得清"的地板。** 而屏幕上绝大部分歌词都是非当前行。

## 真正的元凶不是颜色,是不透明度

`c-450` 单独看是 2.78:1——已经不够,但不是元凶。
元凶是那句 `opacity: activeLine == lineNum ? 1 : 0.72`:
它把一个本来就偏浅的灰又乘了 0.72,于是 **2.78 → 2.01**。

而且它承担的是一个本可以免费承担的角色——**标记当前行**。

## 换成字重

当前行改用 `fontWeight: '600'`:

- **零对比度代价**——字重不消耗任何对比度预算
- HIG `accessibility.md` 要求「Convey information with more than color alone」,
  字重正好是颜色之外的第二通道
- 而原来的方案只有颜色 + 不透明度,不透明度本质上还是在削弱颜色本身

新方案(全部 16 主题实测):

    非当前行 21pt      c-650          页面底 5.02:1   封面底最坏 4.77:1   ≥3.0  ✓
    翻译行   17pt      c-650          页面底 5.02:1   封面底最坏 4.77:1   ≥4.5  ✓
    当前行·未播放      c-font-label   页面底 5.92:1   封面底最坏 5.62:1   ≥3.0  ✓
    当前行·已播放      c-primary-font 页面底 5.09:1   封面底最坏 4.84:1   ≥3.0  ✓

最差来源是 orange 主题 + 纯黑封面,仍然全部通过。

注意 `c-primary-font` —— 那是第九轮改成的**自我纠正**档位。
这里直接复用了它的成果:如果当初没修那 47% 的用户主题问题,这里也没法直接用。

## 顺带说一句:非当前行与当前行的亮度台阶很窄

`c-650`(5.02)与 `c-font-label`(5.92)只差 0.9。**所以字重必须是主线索,颜色是辅助。**
这正是当初把不透明度整个去掉的原因——如果保留 0.72,台阶会变成
"非当前行 2.01 vs 当前行 5.92",看起来很明显,但代价是非当前行基本读不了。

## 这套检查的盲点,写进注释了

新增的歌词检查项验的是「token 对底色」,**不含不透明度乘数**。
而原 bug 恰恰藏在乘数里——c-450 单独看 2.78,叠 0.6 才是 2.01。

修复把不透明度整个去掉了,所以这个模型现在才成立。
若将来有人重新给歌词加不透明度降级,这几项**不会报警**,必须重新实算。
这点写进了 `check-contrast.py` 的注释,免得后来人以为检查能覆盖它。

## 验证

    npm run analyze:reverb        →  13 IR + 三方一致性，exit 0
    npm run check:curves          →  0 项失败
    python scripts/check-contrast.py
      内置 16 主题（含歌词 4 项新增）→  0/288
      播放页封面底图（含歌词色）    →  0/256
      用户自建主题（色相全域）      →  0/1800，自证通过
    tsc --noEmit                      →  exit 0
    eslint (61 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 662 keys OK
    check-sound-effect-dsp.js         →  passed

---

# 第十一轮:原生侧其实是对的,但它有一条静默回退

上一轮把"仪器有没有接上"查到了平台层。这轮接着往里走一层:
在 iOS 上,它接的到底是**哪个**房间。

## 引擎图是真的

`AppDelegate.mm` 里是一条完整的 AVAudioEngine 图:

    sourceNode → EQ → reverb → dryMixer / wetMixer → soundEffectMixer → mainMixer

`LXRealtimeConvolutionProcessor` 是自己实现的实时卷积,EQ、pitch shifter 也是自己写的。
这部分实现没有问题。

## 但有一条静默回退

`applySoundEffectConfigLocked`:

    usesTrueConvolution = hasConvolution && [self refreshConvolutionEngineLocked...];
    self.reverbNode.bypass = !hasConvolution || usesTrueConvolution;
    if (hasConvolution && !usesTrueConvolution)
        [self.reverbNode loadFactoryPreset:LXSoundEffectReverbPresetForFileName(...)]

`refreshConvolutionEngineLockedWithAssetUri` 在四种情况下返回 NO:
采样率未就绪 / 声道数为 0 / 资源 URL 解析失败 / IR 解析失败或处理器未就绪。

一旦返回 NO,`AVAudioUnitReverb` 接手,加载的是**苹果出厂预设**:

    bright-hall.wav   → AVAudioUnitReverbPresetLargeHall
    s2_r4_bd.wav      → AVAudioUnitReverbPresetCathedral
    living-bedroom    → AVAudioUnitReverbPresetSmallRoom

那是**另一个房间**,声学性质完全不同。而房间画像面板仍然显示原 IR 的实测值——
比如"明亮大厅 · RT60 3.40s",实际播出的是 `.largeHall`。

## 为什么没有改原生

这台机器没有 Xcode,`AppDelegate.mm` 改完**无法编译验证**。
这个项目的 iOS 包是 GitHub Actions 出的,在这里写一个编译不过的 `.mm`
会直接打断整条构建链——那是比文案不精确严重得多的问题。

所以选择让 **JS 侧的表述精确**,而不是去动一个我验不了的原生文件。
在房间画像底部加了一行:

> 以上为该脉冲响应文件的实测值。若无法应用，会改用系统内置房间预设，实际听感可能不同。

这不能消除回退本身,但它不再让用户以为"我看到的数字就是我听到的"。

## 这一轮的判断

同一类问题连查两层:

| 层 | 问题 | 处理 |
|---|---|---|
| 平台 | Android 上整个面板不生效 | 面板说明 + 按钮消失(上一轮) |
| 引擎 | iOS 上可能静默换房间 | 文案写明适用范围(本轮) |

真正彻底的修法是让原生侧回报"当前走的是哪条路径",JS 据此决定是否显示精确值。
那需要能在 macOS 上编译验证——现在做不到,不该假装做到了。

## 验证

    python scripts/check-contrast.py
      内置 16 主题            →  0/224
      播放页封面底图（对抗性）  →  0/256
      用户自建主题（色相全域）  →  0/1800，自证通过
    tsc --noEmit                      →  exit 0
    eslint (59 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 662 keys OK
    check-sound-effect-dsp.js         →  passed
    analyze-reverb.mjs                →  exit 0

---

# 第九轮:核验地基塌了

这轮没有新设计。回头查了一件前八轮一直**默认成立**的事:
我给核验脚本写了"覆盖全部 16 个主题",但主题表是数据,自建主题不在其中。

## 一个能算出来的漏洞

`c-primary-dark-N` 是**对主色做固定比例的线性压暗**,不管主色本身多亮。
我前几轮把它写死成 `dark-500`——16 个内置主题全部通过,于是我就当它成立了。

但用户可以自建主题(`getUserTheme`),主色任意。遍历 HSL 全域 384 个主色:

    384 个可能主色中，180 个（47%）在 dark-500 上不足 4.5:1
    最差: rgb(255,255,204) → dark-500 = rgb(150,150,121) = 3.02:1

**近一半的用户自建主题里品牌色文字不可读。** 而 `c-primary-font` 被
EQ 曲线、RT60 读数、进度条、标签栏辉光共用——前八轮建的东西有一半
建在了会漏的地基上。

## 修法:让派生自我纠正,而不是调档位

把写死的档位换成"从某档起向下找第一个达标的":深色主题往上找,浅色主题往下找。
调档位只能修好这 16 个;自我纠正在任意主色上都成立。

    修复前  384 个主色中 180 个不达标,最差 3.02:1
    修复后 1800 个（主色 × 明暗）组合全部达标,最低 4.50:1

## 自证机制抓到了两个我自己的错误

核验脚本现在用 Python 重实现色阶生成,扫全域前**先自证**:必须逐位复现
`themes.ts` 里 16 个主题的全部色阶,否则中止。它立刻抓出两件事:

**1. 舍入方向不同。** Python 的 `round()` 是银行家舍入(40.5→40),
JS 的 `Math.round()` 是四舍五入(40.5→41)。色阶链式相乘十次,这 1 会沿档位传下去,
`dark-600` 就差了 1(40 vs 41)。

**2. 我把暗色的色阶方向搞反了。** 扫出 443 个组合失败,全在暗色主题。查 `utils.js`:

    c-primary-dark-N = RGB_Linear_Shade(isDark ? 0.2 : -0.1, ...)

暗色下 `dark` 阶梯是**越走越亮**,`light` 阶梯才是越走越暗。
我给深色文字候选的是 `light-200…1000`——越走越暗,自然找不到可用色。
改成两种外观**都走 dark 阶梯**,只是方向不同。

如果没有那个自证步骤,第二个错误会以"扫描通过"的假象溜过去——
重实现和实现不一致时,扫描结论本身就不可信。

## 顺带排除的一个疑点

我一度担心暗色只测了一个主题(`black`)不全面。查了 `getTheme`:
暗色模式恒定映射到 `'black'`,没有 `darkId` 之类的分支。
所以那 1 个暗色主题**就是**全部暗色场景,覆盖是完整的。这条可以合上。

## 验证

    python scripts/check-contrast.py
      内置 16 主题            →  0/224
      播放页封面底图（对抗性）  →  0/256
      用户自建主题（色相全域）  →  0/1800，自证通过
    tsc --noEmit                      →  exit 0
    eslint (60 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 660 keys OK
    check-sound-effect-dsp.js         →  passed
---

# 第八轮:让每个房间都显示它的声学

第七轮把 RT60 和衰减曲线算出来了,但**只显示选中的那一个**。
列表本身还是 13 个名字的勾选框——数据躺在仓库里,选房间时还是只能凭名字猜。

这一轮把数据摊到每一行上。

## 从「勾选框」变成「按声学特征挑房间」

每行现在是:勾选 + 名字 + **迷你衰减曲线** + **RT60**。

以前"大厅"和"卧室"有什么区别只能靠名字联想,现在曲线直接给答案。
实测 13 个房间产生 **13 种互不相同的曲线形状**,而且形状排序与 RT60 排序**完全一致**:

    明亮大厅  RT60 3.40s   ▁▁▁▁▂▂▂▂▂▃▃▃▄
    弹簧      RT60 2.73s   ▁▁▂▃▄▅▅▆▇▇█████
    教堂      RT60 1.93s   ▂▃▄▅▆▆▇███████
    客厅卧室  RT60 0.53s   ▁▂▄▄▄▅▅▅▅▅▆▆▆▇
    扩散器    RT60 0.08s   ▅█████████████
    电话      RT60 0.00s   ███████████████

曲线降到 16 列——48 点全画在约 100pt 宽里会糊成一片,16 列足够看出形状。

## 共同时间轴是错的

第一反应是让 13 条曲线共用一条时间轴(0–4s),这样长度差异直接可见。
算完发现**会主动误导**:

    bright-hall   RT60 3.40s   文件只有 1.49s

它的脉冲文件在混响衰减完之前就结束了。在共同时间轴上,这个**混响最长**的房间
会显示成**最短的尾巴**,和旁边的数字直接打架。

所以改成:x 轴是**各自时长的归一化位置**,曲线只比**形状**;
绝对量交给 RT60 和毫秒读数。两者分工明确,不互相冒充。

## 一个真问题:曲线和数字自相矛盾

改完之后 `bright-hall` 仍然 RT60 最长(3.40s)而曲线最平——
因为文件里根本没有衰减完的样本。用户扫一眼迷你曲线会以为它混响最少。

查了一下,13 个里只有它一个 RT60 超过文件长度。

修法是标成**下界**:`≥3.40s`。这在数学上就是对的——真实衰减时间只会更长,
因为文件里已经没有更多样本了。附带好处是它**解释了曲线为什么平**:
不是混响少,是样本不够。

    13 个中 1 个 (bright-hall)  RT60 3.40s > 文件 1.49s  →  显示 ≥3.40s

这比强行把曲线拉长到 4s 诚实得多——拉长就等于编造不存在的样本。

## 验证

    python scripts/check-contrast.py   →  0/224 + 封面底图 0/256
    tsc --noEmit                      →  exit 0
    eslint (61 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 660 keys OK
    check-sound-effect-dsp.js         →  passed

---

# 第六轮:把均衡器变成活的仪器

第四轮画了曲线,但它是**死的**——切预设时直接跳变,没有过程。
这一轮补两件事:dB 网格,和预设切换时的曲线形变。

## 网格线:只画 4 条,而且有理由

±15dB 范围内按 5dB 分档,但不是全画:

- **排除 0**——它有独立的基线,画两条只是重复
- **排除 min/max 本身**——那两档正好压在图的上下边缘,画出来等于描了个边框,
  不提供任何定位信息
- 结果只剩 -10 / -5 / +5 / +10 四条

实测:4 条全部严格落在 (0, 88) 内,与基线最小间距 14.67px。
透明度 0.3 对基线 0.7——**网格负责定位,基线负责读数,两者不该一样重**。

## 曲线形变:过程本身携带信息

这不是装饰性动画。切"摇滚"预设时,你能**看出**低频被抬了多少、高频被压了多少;
跳变时看不到。

`motion.md` 的依据:

> **Strive for realistic feedback motion that follows people's gestures and expectations.**

预设切换就是一次手势,曲线形变是这次手势的直接后果,不是凭空加的动画。
260ms、`Easing.out(cubic)`、不回弹——同一份文档要求 "brief and precision"。
减弱动态效果时直接跳终态:去掉的是「动」,没去掉「结果」。

## 触发源选错了两次

**第一次**:在各个处理函数里手动 `setEqTransitionId(id => id + 1)`。

错在**「重置」只调用 `updateSetting`、不直接 `setPreviewGains`**,靠设置回流才生效。
在处理函数里加计数会**早于** gain 更新,动画就补间到了旧值。

**第二次**:以 `previewGains` 变化为触发源。

错在**拖动滑块会持续改 previewGains**,那样曲线会一直补间、滞后于手指。

**最终解法**:监听「预设身份」(`presetId` + `activeEqUserPresetId`)。
它只在整条曲线被替换时才变,而且监听发生在渲染之后,顺序天然正确。

    拖动滑块 → previewGains 变，预设身份不变 → 不补间，1:1 跟手
    切预设   → 预设身份变      → 补间 260ms
    重置     → updateSetting → 设置回流 → 身份变 → 补间

补间用单个 `Animated.Value` 驱动 10 个频点做线性插值,一个 driver 而非 10 个。
因为插值结果参与纵坐标计算(布局而非 transform),所以 `useNativeDriver: false`。

## 踩到的两个实现细节

1. **`EqualizerSection` 有两个调用点**——stacked 和 split 两种布局各渲染一次。
    只改一处会漏掉另一种布局。
2. `useMemo` 的提前 return 和解构都要带上 `gridYs`,否则 TS 报
    "Cannot find name 'gridYs'"。第一次只改了 return,没改解构。

## 验证

    python scripts/check-contrast.py   →  0/224 + 封面底图 0/256
    tsc --noEmit                      →  exit 0
    eslint (59 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 659 keys OK
    check-sound-effect-dsp.js         →  passed

---

# 第十三轮:我把自己的老坑又踩了一遍

第九轮我加的自证机制,逮到过一个 bug:Python 的 `round()` 是银行家舍入,
JS 的 `Math.round()` 是四舍五入,两份实现让色阶差了 1。

然后我回头看自己新写的代码——**又犯了一模一样的错**。

## 同一个错误,第二次

第七、八轮我画 EQ 曲线和房间衰减时,几何是用 Python 验证的:

    # scripts 里的一次性验证
    toY  = lambda g: H - ((g - MIN) / (MAX - MIN)) * H
    step = (W - INSET * 2) / (len(freqs) - 1)

但**发货的代码是 TypeScript**,写在组件的 `useMemo` 里,用的是另一份表达式:

    const span = max - min
    const usable = Math.max(0, width - inset * 2)
    const step = frequencies.length > 1 ? usable / (frequencies.length - 1) : 0
    const toY = (gain: number) => height - ((gain - min) / span) * height

两份实现。当时一致,但**没有任何东西保证它们一直一致**。
我验证的不是我发的那份代码——这在第九轮已经被证明过一次是真问题。

## 修法:合成一份

把几何抽成纯函数模块 `src/utils/curves.ts`:

    buildEqGeometry(...)      均衡器曲线:点、线段、网格、基线
    buildDecayBars(...)      混响衰减柱
    downsampleEnvelope(...)  包络降采样(最近邻)

三个组件都切过去,测试 `npm run check:curves` 用 Node 的类型剥离
**直接 import 这个 `.ts`**——验的就是发的那份,没有第二份实现。

## 这次它立刻抓到了真 bug

接上之后第一次跑就挂了:

    FAIL 末柱右边缘抵达绘图区右边缘

`buildDecayBars` 里每根柱子都 `+0.5`——那是"相邻柱子不留缝"的补偿。
但最后一根也加了,于是**越过绘图区右边缘 0.5px**。

同时另一条断言报出「最大间隙 -0.500px」,两处对上,确认成因。
纯 Python 复现验不出来,因为那份复现写的是 `width: step`,没有 `+0.5`。

修法:中间柱保留补偿,最后一根吸收余量,右边缘精确贴住边界。

## 三处失败里,两处是我测试自己写错

第一版测试报了 3 个失败,逐个查:

| 失败 | 真相 |
|---|---|
| 等分覆盖整宽 | **测试写错**——我写成 `bars[0].left + 0 < 1e-9`,即 `0 < 1e-9`,恒假 |
| 末列取末点 | **测试期望错**——`downsampleEnvelope` 会钳到 floor = -60,那是正确行为 |
| 不高于原包络 | 同上,钳位把 -61.1 抬到 -60,所以不成立 |

修正断言,并把「钳位」本身变成被测项;另加一条不触底的包络,
单独验证「最近邻」而不被钳位干扰。

剩下那一个才是代码的真问题。

## 为什么值得记这一轮

我花了三轮建核验体系(对比度自证、IR 三方一致、几何单实现),
而这一轮的直接触发是**回头看了一眼自己刚写的东西**。

前十二轮的收获大多来自"查我以为成立的事",这一轮来自"查我自己刚声称修好的事"。
后者更难,因为它要求承认刚写的东西可能有问题——而我刚验过它。

## 验证

    npm run analyze:reverb        →  13 IR + 三方一致性，exit 0
    npm run check:curves          →  0 项失败(import 发货的 .ts)
    python scripts/check-contrast.py
      内置 16 主题            →  0/224
      播放页封面底图(对抗性)  →  0/256
      用户自建主题(色相全域)  →  0/1800，自证通过
    tsc --noEmit                      →  exit 0
    eslint (59 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 662 keys OK
    check-sound-effect-dsp.js         →  passed

## 还能往哪走

见下一轮。

---

# 第四轮:均衡器曲线

上一轮留了个前提要先确认:**DSP 真实数值在播放时能不能拿到**。
查了,能——而且数据比预期好。

## 前提确认

`src/plugins/soundEffect/` 里有:

- `equalizerFrequencies` = `[31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]`
  ——标准 **ISO 三倍频程**序列,每段恰好是前一段的两倍(实测 2.0000,仅 125 那档是 2.0161)
- `soundEffectController.buildCurrentEqualizerConfig()` 返回 `{ enabled, gains }`,真实 dB 值
- `previewGains` 在滑块拖动过程中实时更新

所以画的是真曲线,不是编的。

## 关键:横轴等距是精确的,不是近似

三倍频程序列在对数频率轴上等距,而三倍频程本身就是"频率比恒定"。
于是 **x 直接取索引比例,不需要任何 log 计算**——等距横轴在这里是数学精确的,
不是"画起来方便"的近似。这一点值得写进注释,否则下个人会以为要改成 log 插值。

实测校验(300px 绘图区、88px 高、±15dB):

    频比:        [2.0, 2.0161, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0]
    每段步长:    32.44px（10 段完全等距）
    全 0dB → y=  44.0，zeroY=44.0  → 居中
    ±15dB → y=  0.0 / 88.0         → 正好贴边
    极端预设（全+15 / 全-15 / 交替）  → 全部不越界
    分辨率:      2.93 px/dB，典型 ±3dB 起伏 = 17.6px 视觉差

## 一个必须说清的诚实边界

画的是**设置曲线**,不是实测频响。它回答「现在的设置是什么形状」,
不回答「声音实际听起来如何」。这句话写在了组件注释的第一段——

否则一个看起来很专业的频响图,会让用户以为那是麦克风量到的结果。那就是误导。

## 纯 View 画曲线

项目里**没有 react-native-svg**。新增原生依赖要改 CocoaPods 配置,
而本机无法验证 iOS 构建——这是上次 CI 就踩过的坑,不能再踩。

10 个频点只有 9 段,用旋转的细线段拼。RN 的 rotation 绕视图中心,
要实现"绕左端点旋转"需要:

    transform: [
      { translateX: length / 2 },
      { rotate: `${angle}rad` },
      { translateX: -length / 2 },
    ]

第一版我用了 CSS 的 `transformOrigin`,RN 不支持——已改。

## 刻度必须占独立一列

第一版把 `+15` / `0 dB` 用 `position: absolute; left: 0` 定位在绘图区内,
结果**压在曲线起点上**。改成左侧固定 26px 标签列 + `flex: 1` 绘图区。

标签列内部一开始用 `justifyContent: 'space-between'` 分布三个刻度,
结果「0」会偏离基线约 7px——读数不可信。改成按 `zeroY` 精确定位。

## 又抓到一个 1.17:1

0dB 基线原本用 `c-border-background`。实算在浮层上:

    c-border-background   最低 1.17:1 @ orange   ← 基本不可见
    c-500                最低 3.19:1 @ green，最高 4.83:1

而 0dB 基线恰恰是整张图**唯一必须看清**的参考线。

新增语义 token `c-chart-baseline`(浅/深统一取 `c-500`)。没有直接用原始灰阶,
因为那违反「一个颜色只做一件事」——下次有人看到 `c-500` 出现在别处,
不会知道它在这里有特殊含义。

阈值用的是 **3:1 而不是 4.5:1**:它属于 WCAG 1.4.11 的"有意义的图形",
不是文字。这个区分也写进了核验脚本的注释。

## 插在哪里

**曲线放在滑块之前。** 先看形状,再调数值。

而且不加过渡动画——`previewGains` 在拖动时实时更新,曲线直接跟手。
`motion.md` 要的是 "brief and precision",而这里跟手反而最准;
加一层补间只会让它滞后于手指。

## 验证

    python scripts/check-contrast.py   →  0/224 失败（14 项检查）
    tsc --noEmit                      →  exit 0
    eslint (59 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 659 keys OK
    check-sound-effect-dsp.js         →  passed

音效面板确认只出现在 `SoundEffectPopup` 内,而它是 `Popup`(玻璃浮层),
所以对比度是针对正确表面算的。

---

# 第五轮:封面铺满播放页

前三轮做的是"减装饰、加信息"。连着三次被要求"更科技"之后,
这一轮换方向:**往视觉科技感走**,而不是继续往信息密度走。

## 之前没用上的一条 HIG

`materials.md`:

> **The clear variant** is highly translucent, which is ideal for prioritizing the
> visibility of the underlying content … **Use this variant for components that float
> above media backgrounds — such as photos and videos**

封面就是媒体。而播放详情页的控件——顶栏、读数条、播放键——正是浮在它上面的功能层。
这是 HIG 明确点名的用法,前四轮却一直让封面缩成中间一张卡片,
页面底色是主题底图+极光。也就是说,**最该"放飞"的地方恰恰被我收得最紧**。

## 做法

`PageContent` 新增 `cover` 分支:当前封面重模糊后铺成整页底色,
控件浮在上面。三个差异都是被对比度逼出来的,不是审美选择:

1. **模糊 54**（主题底图是 26）。封面要读成一块色彩场,不是图像——细节只会变噪点。
2. **遮罩用 `c-main-background`（主题自己的底色），不用固定黑/白。**
3. **不叠极光。** 封面本身就是色彩来源,两个来源会互相打架。

第 2 点值得展开。RN 没有 `backdrop-filter`,玻璃是**不透明色块模拟**的,
所以封面只能通过玻璃那 10% 的不透明度渗色。于是最坏情况是:

    玻璃合成色 = 主题 light-1000 × 0.9 + 封面残色 × 0.1

如果遮罩用固定黑色,最坏情况被推向"纯黑封面"那一端;浅色主题下次要文字
的余量最薄。用主题底色则把封面往主题基调推,波动收窄,色相仍然保留。

## 对抗性验证

封面是用户内容、颜色不可控,所以核验脚本不是挑一个"典型"颜色——
典型颜色会掩盖最坏情况。而是穷举 8 种对抗性取值(纯黑、纯白、六种饱和原色)
× 2 类文字 × 16 个主题:

    16 主题 × 2 类文字 × 8 封面 = 256 项，失败 0

最坏情况(纯黑封面):

    浅色主题  正文 8.05:1   次要 4.74:1
    深色主题  正文 6.82:1   次要 4.97:1

都过 AA 4.5:1,但浅色主题次要文字的 4.74 余量不厚——这是该方案最脆弱的一处,
记在这里,以后若要调玻璃不透明度,先回来看这个数。

## 一个不改的结构问题

`PlayDetail/Horizontal/index.tsx` **又嵌了一层 `PageContent`**,而父级
`PlayDetail/index.tsx` 已经包过一层。这是改动前就有的。

加了封面底图后,双层模糊与双层遮罩会让横屏明显比竖屏暗。
所以内层**刻意不传 cover**,结果是横屏看不到封面底色——这是已知限制,
不是设计选择。

要修得先确认内层的 SafeAreaView / StatusBar 职责能否上提到父层,
那是结构改动,而本机无法验证横屏布局,不能盲动。已在代码注释里写明。

## 验证

    python scripts/check-contrast.py   →  0/224 + 封面底图 0/256
    tsc --noEmit                      →  exit 0
    eslint (59 个改动文件)             →  exit 0
    check-i18n-keys.js                →  3 locales, 659 keys OK
    check-sound-effect-dsp.js         →  passed

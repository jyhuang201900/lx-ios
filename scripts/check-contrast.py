"""
对比度核验：复刻 PageContent.tsx 的图层合成栈，对派生 token 做实算。

用法: python scripts/check-contrast.py

图层栈（自下而上，见 src/components/PageContent.tsx）:
   1. c-content-background 作为 ImageBackground 的底色
   2. c-main-background 以 0.84（浅）/ 0.80（深）不透明度盖上
   3. 内容表面叠加 token，取决于被检查的表面
   4. FrostFilm 噪点约 4% 颗粒，评估中忽略（远小于判定余量）
"""

import colorsys
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
THEMES = ROOT / "src/theme/themes/themes.ts"
THEME_INDEX = ROOT / "src/theme/themes/index.ts"


def parse(color):
    """把 rgb/rgba 字符串解析为 (r, g, b, a)。"""
    m = re.match(r"rgba?\(([^)]+)\)", color.strip())
    if m:
        parts = [float(p) for p in m.group(1).split(",")]
        return tuple(int(p) for p in parts[:3]), (parts[3] if len(parts) > 3 else 1.0)
    # 徽章色之类会写成 #rrggbb，同样要能测
    h = re.match(r"#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$", color.strip())
    if h:
        v = h.group(1)
        rgb = (int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16))
        alpha = int(h.group(2), 16) / 255 if h.group(2) else 1.0
        return rgb, alpha
    raise ValueError(f"无法解析颜色: {color!r}")


def over(fg_rgb, fg_a, bg_rgb):
    """source-over 合成：把带透明度的前景压到不透明背景上。"""
    return tuple(
        round(fg_rgb[i] * fg_a + bg_rgb[i] * (1 - fg_a)) for i in range(3)
    )


def page_base(theme):
    """页面底色：c-content-background 垫底，c-main-background 盖上。"""
    content_bg, _ = parse(theme["c-content-background"])
    main_rgb, main_a = parse(theme["c-main-background"])
    return over(main_rgb, main_a, content_bg)


def stack(theme, token, surface=None):
    """返回 token 合成到最终像素后的颜色。surface 为 None 时直接是页面底色。"""
    base = page_base(theme)
    if surface:
        s_rgb, s_a = parse(theme[surface])
        base = over(s_rgb, s_a, base)
    t_rgb, t_a = parse(theme[token])
    return over(t_rgb, t_a, base)


def rel_luminance(rgb):
    def channel(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = rel_luminance(a), rel_luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def load_themes():
    """从生成的 themes.ts 中抽出每个主题的原始色板。"""
    src = THEMES.read_text(encoding="utf-8")
    themes = []
    for match in re.finditer(r'\{\s*"id": "([^"]+)"', src):
        start = match.start()
        nxt = src.find('"id": "', start + 10)
        chunk = src[start: nxt if nxt != -1 else len(src)]
        colors = dict(re.findall(r'"([\w-]+)":\s*"([^"]+)"', chunk))
        themes.append((match.group(1), colors, '"isDark": true' in chunk))
    return themes


DERIVED_TOKENS = [
    "c-font",
    "c-font-label",
    "c-primary-font",
    "c-primary-font-active",
    "c-content-background",
    "c-control-surface",
    "c-glass-overlay",
    "c-border-background",
    "c-chart-baseline",
    "c-primary-background-active",
    # 按钮体系：文字色必须与它所坐的背景成对核验，
    # 否则「浅色品牌底上的浅色品牌字」这类错误不会被发现
    "c-button-font",
    "c-button-font-selected",
    "c-button-background",
    "c-button-background-selected",
    "c-primary-button-font",
    "c-primary-background",
    "c-primary-solid",
    "c-on-solid",
]

# 'token': theme.config.themeColors['x']
DIRECT = re.compile(r"'(?P<token>[^']+)':\s*theme\.config\.themeColors\['(?P<key>[^']+)'\]")
# 'token': theme.isDark ? A : B   （A/B 可以是 colors 引用，也可以是字面量）
TERNARY = re.compile(
    r"'(?P<token>[^']+)':\s*theme\.isDark\s*\?\s*"
    r"(?:theme\.config\.themeColors\['(?P<dark>[^']+)'\]|(?P<dark_lit>'[^']*'))"
    r"\s*:\s*"
    r"(?:theme\.config\.themeColors\['(?P<light>[^']+)'\]|(?P<light_lit>'[^']*'))",
    re.S,
)
# 'token': pickAccessible(theme.config.themeColors, theme.isDark ? DARK : LIGHT, surface, AA_TEXT, ...)
PICK = re.compile(
    r"'(?P<token>[^']+)':\s*pickAccessible\(\s*"
    r"theme\.config\.themeColors,\s*"
    r"theme\.isDark\s*\?\s*(?P<dark>\w+)\s*:\s*(?P<light>\w+),\s*"
    r"theme\.config\.themeColors\['(?P<surface>[^']+)'\],\s*AA_TEXT,",
    re.S,
)


def load_derived_rules():
    """从 src/theme/themes/index.ts 解析派生 token 的真实取值规则。

    直接读实现而不是在脚本里复刻一份，是为了让核验结果和代码永远一致——
    之前手工复刻过一次，脚本说 dark-500 通过、代码写的是 dark-300，
    两者静默漂移，等到真机出问题才发现。
    """
    src = THEME_INDEX.read_text(encoding="utf-8")

    # 候选档位序列也直接从实现里读，避免脚本与代码各写一份又悄悄漂移
    for const_name, target in (("LIGHT_TEXT_STEPS", "LIGHT"), ("DARK_TEXT_STEPS", "DARK")):
        m = re.search(
            rf"const {const_name}(?::[^=]+)? = \[(.*?)\] as const",
            src,
            re.S,
        )
        if m:
            steps = re.findall(r"'([^']+)'", m.group(1))
            if target == "LIGHT":
                LIGHT_TEXT_STEPS[:] = steps
            else:
                DARK_TEXT_STEPS[:] = steps

    # 按 token 的位置逐个判定后续写法，而不是对全文跑一堆正则。
    # 派生写法有三种（直接引用 / 条件引用 / pickAccessible），
    # 且条件引用里还能再嵌 pickAccessible——用位置扫描比堆正则稳得多。
    direct, ternary, pick = {}, {}, {}
    for m in DIRECT.finditer(src):
        direct[m.group("token")] = m.group("key")
    for m in TERNARY.finditer(src):
        ternary[m.group("token")] = (
            m.group("dark") or m.group("dark_lit"),
            m.group("light") or m.group("light_lit"),
        )
    for m in PICK.finditer(src):
        pick[m.group("token")] = (
            "pick", m.group("dark"), m.group("light"), m.group("surface"),
        )
    # 条件分支里各自嵌 pickAccessible 的写法（c-primary-font-active 就是这种）
    for token in DERIVED_TOKENS:
        if token in pick or token in direct:
            continue
        anchor = src.find(f"'{token}':")
        if anchor < 0:
            continue
        window = src[anchor: anchor + 600]
        if "pickAccessible(" not in window:
            continue
        is_dark_branch = window.find("DARK_TEXT_STEPS.slice(1)") >= 0
        pick[token] = (
            "pick",
            "DARK_TEXT_STEPS.slice(1)" if is_dark_branch else "LIGHT_TEXT_STEPS.slice(1)",
            "LIGHT_TEXT_STEPS.slice(1)" if is_dark_branch else "DARK_TEXT_STEPS.slice(1)",
            "c-primary-light-1000",
        )

    # 'token': someConst —— 顺着常量定义解析。
    # 不做这一步就会出现「代码里已改、脚本还按旧值算」的静默漂移，
    # 那正是这个脚本当初要解决的问题。
    for m in IDENT_REF.finditer(src):
        token, name = m.group("token"), m.group("name")
        if token in pick or token in direct or token in ternary:
            continue
        cm = re.search(rf"const {re.escape(name)}\s*=\s*([\s\S]*?)(?=\n\n|\n  return)", src)
        if not cm:
            continue
        body = cm.group(1)
        pm = PICK_BODY.search(body)
        if pm:
            pick[token] = ("pick", pm.group("dark"), pm.group("light"), pm.group("surface"))
            continue
        # theme.isDark ? (pickAccessible(… DARK …)) : (pickAccessible(… LIGHT …))
        if "theme.isDark" in body and body.count("pickAccessible(") >= 2:
            dark_side = body.find("DARK_TEXT_STEPS")
            light_side = body.find("LIGHT_TEXT_STEPS")
            if dark_side >= 0 and light_side >= 0:
                # 保留 .slice(n) 偏移：active 必须从 font 的下一档开始，
                # 否则两者会落回同一档，「当前项」就少了字色上的差异
                suffix = ".slice(1)" if ".slice(1)" in body else ""
                pick[token] = (
                    "pick",
                    ("DARK_TEXT_STEPS" if dark_side < light_side else "LIGHT_TEXT_STEPS") + suffix,
                    ("LIGHT_TEXT_STEPS" if dark_side < light_side else "DARK_TEXT_STEPS") + suffix,
                    "c-primary-light-1000",
                )
                continue
        dm = DIRECT.search(body)
        if dm:
            direct[token] = dm.group("key")
            continue
        tm = TERNARY.search(body)
        if tm:
            ternary[token] = (tm.group("dark") or tm.group("dark_lit"), tm.group("light") or tm.group("light_lit"))

    rules = {}
    for token in DERIVED_TOKENS:
        if token in pick:
            rules[token] = pick[token]
        elif token in direct:
            rules[token] = ("fixed", direct[token])
        elif token in ternary:
            rules[token] = ("ternary",) + ternary[token]
        else:
            raise SystemExit(
                f"在 {THEME_INDEX} 中找不到派生 token {token!r}，核验脚本需要同步更新。"
            )
    return rules


def build_active(colors, is_dark, rules):
    """按 index.ts 的真实规则构造 ActiveTheme。"""
    theme = {**colors, "isDark": is_dark}
    # extInfo 里存在 var(xxx) 形式的间接引用（如 c-badge-primary: 'var(c-primary)'）。
    # 实现里会解析它们，脚本也必须解析，否则这些颜色一律测不了。
    for key, value in colors.items():
        if isinstance(value, str) and value.startswith("var(") and value.endswith(")"):
            target = value[4:-1]
            if target in colors:
                theme[key] = colors[target]
    for token, rule in rules.items():
        if rule[0] == "pick":
            _, dark_steps_name, light_steps_name, surface_key = rule
            steps = DARK_TEXT_STEPS if is_dark else LIGHT_TEXT_STEPS
            name = dark_steps_name if is_dark else light_steps_name
            base = name.split(".slice")[0]
            if base not in ("DARK_TEXT_STEPS", "LIGHT_TEXT_STEPS"):
                raise SystemExit(
                    f"派生 token {token} 引用了未知的候选档位序列，核验脚本需同步更新。"
                )
            # active 的候选从 font 的下一档开始（slice(1)），所以"当前项"一定更深/更亮
            if ".slice(1)" in name:
                steps = steps[1:]
            value, _ = pick_accessible(colors, steps, colors[surface_key])
            if value is None:
                # 与实现里的兜底一致：找不到达标档位时退回最保守的一档
                value = colors["c-primary-light-1000" if is_dark else "c-primary-dark-1000"]
            theme[token] = value
        elif rule[0] == "fixed":
            theme[token] = colors[rule[1]]
        else:
            theme[token] = colors[rule[1] if is_dark else rule[2]]
    return theme


CHECKS = [
    # 内容层:文字落在页面底色或内容层控件表面上
    ("正文 @ 页面", "c-font", None, 4.5),
    ("次要 @ 页面", "c-font-label", None, 4.5),
    ("正文 @ 内容控件", "c-font", "c-control-surface", 4.5),
    ("次要 @ 内容控件", "c-font-label", "c-control-surface", 4.5),
    ("品牌文字 @ 内容控件", "c-primary-font", "c-control-surface", 4.5),
    # 浮动的功能层:标签栏、迷你播放条、弹层
    ("次要 @ 浮层", "c-font-label", "c-glass-overlay", 4.5),
    # 标签栏按 HIG tab-bars.md 取单色外观，所以选中标签用的是 c-font 而非品牌色；
    # 胶囊底 + 字重承担"当前在哪"，颜色不承担。
    ("标签未选中", "c-font-label", "c-glass-overlay", 4.5),
    ("标签选中", "c-font", "__tabbar_active__", 4.5),
    # 播放详情页的来源/音质胶囊：浮在内容上的功能层，故取 overlay 档
    ("详情页胶囊 正文", "c-font", "c-glass-overlay", 4.5),
    ("详情页胶囊 品牌字", "c-primary-font", "c-glass-overlay", 4.5),
    ("详情页胶囊 品牌选中", "c-primary-font-active", "c-glass-overlay", 4.5),
    ("详情页胶囊 次要字", "c-font-label", "c-glass-overlay", 4.5),
    # 菜单选中项是三层叠压：页面 → 玻璃浮层 → 品牌底色 → 文字
    # 只测 c-font：这是菜单选中项实际使用的文字色（6.71:1）。
    # 这里刻意不测 c-font-label——它是给页面底色设计的中灰，落到品牌底色上
    # 无全主题解（china_ink 4.40:1），而加实底色只会更差。约束写在 Menu.tsx 里。
    ("菜单选中项 正文", "c-font", "__menu_active__", 4.5),
    # 均衡器曲线的 0dB 基线：属于「有意义的图形」而非文字，
    # 用 WCAG 1.4.11 非文字对比度的 3:1，而不是文字的 4.5:1。
    ("EQ 0dB 基线", "c-chart-baseline", "c-glass-overlay", 3.0),
    # 歌词：默认 21pt（横屏 22pt），属 WCAG 大字号，阈值 3:1；
    # 翻译行是 size×0.8 ≈ 17pt，低于 18pt，阈值回到 4.5:1。
    # 这几项曾经全部不达标：非当前行是 c-450 再乘 0.6 不透明度 → 2.01:1，
    # 而歌词页是全应用最大的表面。
    #
    # 注意：这里验的是「token 对底色」，**不含不透明度乘数**。
    # 这正是原 bug 的藏身处——c-450 单独看是 2.78:1，叠加 0.6 之后才是 2.01:1。
    # 修复方案把不透明度整个去掉了（当前行改用字重标记），所以这个模型现在才成立。
    # 若将来有人重新给歌词加不透明度降级，这几项不会报警，必须重新实算。
    ("歌词·非当前行 21pt", "c-650", None, 3.0),
    ("歌词·翻译行 17pt", "c-650", None, 4.5),
    ("歌词·当前行未播放", "c-font-label", None, 3.0),
    ("歌词·当前行已播放", "c-primary-font", None, 3.0),
    # 列表行：整行不再按 opacity 降级，文字保持满对比度
    ("列表行·歌名", "c-font", None, 4.5),
    ("列表行·歌手行", "c-font-label", None, 4.5),
    ("列表行·序号", "c-font-label", None, 4.5),
    ]


# 前景/背景配对。文字 token 单看达标没有意义——它必须与**实际所坐的那个底色**
# 配对才成立。本项目曾把「品牌色本身」当按钮文字压在「品牌浅 tint」上：
# 同色相、相近明度，16 个主题里 13~15 个不达标，最差 1.08:1。
FG_BG_PAIRS = [
    ("c-button-font", "c-button-background", "普通次要按钮"),
    ("c-button-font-selected", "c-button-background-selected", "选中态按钮"),
    ("c-button-font-selected", "c-button-background", "选中态字 / 普通底"),
    ("c-primary-button-font", "c-primary-background", "主要按钮 ButtonPrimary"),
    ("c-button-font", "c-content-background", "内容层上的按钮"),
    ("c-button-font-selected", "c-primary-background", "播放键图标 / 实心底"),
    # 实心品牌按钮：c-primary 本身明度居中，撑不住文字，必须用 c-primary-solid
    ("c-on-solid", "c-primary-solid", "实心主动作按钮（播放全部等）"),
    ("c-primary-font", "c-primary-background", "浅 tint 底按钮"),
    ("c-primary-font", "c-primary-light-300-alpha-800", "队列「正在播放」条"),
    ("c-font-label", "c-primary-light-300-alpha-800", "同上 · 歌手行"),
    # 列表行的来源 / 音质 chip：三个 tint 深浅区分档位，字统一用 c-primary-font
    ("c-primary-font", "c-primary-light-400-alpha-800", "chip · 来源"),
    ("c-primary-font", "c-primary-light-600-alpha-800", "chip · 无损"),
    ("c-primary-font", "c-primary-light-800-alpha-800", "chip · 高品质"),
]


def resolve_surface(theme, surface):
    """把表面标记解析成最终像素色。支持标签栏激活项这种多层叠压。"""
    base = page_base(theme)
    # 标签栏激活项与菜单选中项的叠压结构相同：玻璃浮层上再压一层品牌底色
    if surface in ("__tabbar_active__", "__menu_active__"):
        overlay = stack(theme, "c-glass-overlay")
        bg_rgb, bg_a = parse(theme["c-primary-background-active"])
        return over(bg_rgb, bg_a, overlay)
    if surface:
        s_rgb, s_a = parse(theme[surface])
        return over(s_rgb, s_a, base)
    return base


# 语义文字 token：派生出来的，档位按对比度挑过
SEMANTIC_TEXT_TOKENS = frozenset({
    "c-font",
    "c-font-label",
    "c-primary-font",
    "c-primary-font-hover",
    "c-primary-font-active",
    "c-primary-button-font",
    "c-button-font",
    "c-button-font-selected",
    "c-primary-solid",
    "c-on-solid",
})

# 原始色板 token：c-500 / c-primary / c-primary-light-400-alpha-200 …
# 它们没有任何对比度保证，直接当文字色就是在赌当前主题
RAW_PALETTE = re.compile(
    r"^c-(?:primary(?:-dark-\d+|-light-\d+)?(?:-\w+-\d+)?|\d{3,4})$",
)

TEXT_COLOR = re.compile(
    r"<Text\b[^>]*?\bcolor=\{[^}]*?['\"](c-[a-z0-9-]+)['\"]",
    re.S,
)

# 'token': someConst  —— 派生 token 引用了一个本文件里算好的常量。
# 这类引用必须顺着常量定义解析，否则会出现「代码里已改、脚本还按旧值算」的静默漂移。
IDENT_REF = re.compile(r"'(?P<token>[^']+)':\s*(?P<name>[A-Za-z_$][\w$]*)\s*[,}]")

CONST_DEF = re.compile(
    r"const\s+(?P<name>[A-Za-z_$][\w$]*)\s*=\s*(?P<body>[\s\S]*?)(?=\n\n|\n  return|;\n)",
)

# 常量体里的 pickAccessible(...) 调用，前面没有 'token': 前缀
PICK_BODY = re.compile(
    r"pickAccessible\(\s*"
    r"theme\.config\.themeColors,\s*"
    r"theme\.isDark\s*\?\s*(?P<dark>\w+)\s*:\s*(?P<light>\w+),\s*"
    r"theme\.config\.themeColors\['(?P<surface>[^']+)'\],\s*AA_TEXT,",
    re.S,
)

# 旁路一：写在 style.color 里的颜色
STYLE_COLOR = re.compile(
    r"\bcolor:\s*theme\[['\"](c-[a-z0-9-]+)['\"]\]",
)

# 旁路二：图标的颜色。传达意义的图标按 WCAG 1.4.11 非文字对比度，阈值 3:1
ICON_COLOR = re.compile(
    r"<Icon\b[^>]*?\bcolor=\{[^}]*?['\"](c-[a-z0-9-]+)['\"]",
    re.S,
)

# 原始色板的例外白名单。每条都必须写明理由，否则一律拦下。
# 只收**与主色无关**的灰阶（用户自建主题不会改变它们），以及不承载信息的元素。
RAW_PALETTE_ALLOWLIST = {
    "c-550": "播放页工具栏按钮，实测最低 3.69:1 ≥ 3:1；灰阶不随主色变化",
    "c-600": "评论页更新图标，实测最低 4.29:1 ≥ 3:1；灰阶不随主色变化",
    "c-primary-light-200-alpha-700": "按钮涟漪，是瞬时触摸反馈而非状态指示，"
                                      "HIG motion.md 的动效不承载信息，不适用对比度",
    "c-primary-dark-100-alpha-300": "横屏侧栏的品牌标记，纯装饰，不传达状态",
}


def check_unsafe_pairings(src_root):
    """拦截「文字 token 配错了底色」这种用法级错误。

    有些 token 组合本身就是不可用的：c-button-font 压在
    c-button-background-selected 上只有 3.89:1（orange），13/16 主题不达标。
    这不是选错 token，而是用错了——在实心底上就该用 c-button-font-selected。
    把它做成用法检查，比在对比度表里留一条注定失败的检查更有用。
    """
    found = []
    for path in sorted(src_root.rglob("*.tsx")):
        source = path.read_text(encoding="utf-8")
        lines = source.split("\n")
        for i, line in enumerate(lines):
            if "c-button-background-selected" not in line:
                continue
            window = "\n".join(lines[max(0, i - 8): i + 8])
            # 窗口内出现了普通按钮字色，且没有出现选中态字色
            if "c-button-font'" in window and "c-button-font-selected" not in window:
                found.append((path.relative_to(ROOT).as_posix(), i + 1))
    # 实心 c-primary 当按钮底：它明度居中，白字与近黑字都不达标。
    # 但它在封面辉光底、进度条填充、loading 指示色里是合法的，
    # 所以只在「同一块里有文字或图标」时才判定为误用。
    for path in sorted(src_root.rglob("*.tsx")):
        source = path.read_text(encoding="utf-8")
        source = re.sub(
            r"\{/\*.*?\*/\}",
            lambda m: "\n" * m.group(0).count("\n"),
            source,
            flags=re.S,
        )
        lines = source.split("\n")
        for i, line in enumerate(lines):
            if "backgroundColor: theme['c-primary']" not in line:
                continue
            window = "\n".join(lines[i: i + 8])
            if "<Text" not in window and "<Icon" not in window:
                continue
            found.append((path.relative_to(ROOT).as_posix(), i + 1))

    for path, line in found:
        print(
            f"  ! {path}:{line}  该处底色或文字配对不可用（见上方说明）"
        )
    if found:
        print("  实心品牌底请用 c-primary-solid；实心底上的字请用 c-button-font-selected")
    else:
        print("  配对用法检查通过：实心底上没有误用普通按钮字色")
    return len(found)


# 用户自定义背景图时，PageContent 的 picComponent 用 0.56 不透明度的
# c-content-background 遮罩压在底图上（见 PageContent.tsx）。
# 这是刻意的产品取舍——注释写着「用户选它就是为了看得见」——但代价是
# 底图仍有 44% 露出来，内容层的对比度不再由主题色板保证。
#
# 这里只做**记录与测量**，不作为失败项：把遮罩提到能达标（0.87+）会让
# 背景图几乎不可见，等于取消这个功能。真正的解法需要产品决策。
def report_custom_bg_limit(themes, rules):
    print()
    print("=== 用户自定义背景图的对比度上限（记录项，非失败）===")
    imgs = [
        ((0, 0, 0), "全黑"), ((255, 255, 255), "全白"),
        ((255, 0, 0), "饱和红"), ((0, 255, 0), "饱和绿"),
        ((124, 252, 0), "电光绿"), ((255, 240, 150), "暖黄"),
    ]
    scrim = 0.56
    for token, label, minimum in (("c-font", "歌名 15pt", 4.5), ("c-font-label", "歌手行 12pt", 4.5)):
        worst = (99, "")
        for tid, colors, is_dark in themes:
            theme = build_active(colors, is_dark, rules)
            page = page_base(theme)
            s, _ = parse(theme["c-content-background"])
            t, ta = parse(theme[token])
            for img, name in imgs:
                bg = tuple(round(s[i] * scrim + img[i] * (1 - scrim)) for i in range(3))
                px = tuple(round(t[i] * ta + bg[i] * (1 - ta)) for i in range(3))
                r = contrast(px, bg)
                if r < worst[0]:
                    worst = (r, f"{tid}{'/深' if is_dark else ''}/{name}")
        verdict = "达标" if worst[0] >= minimum else f"不达标（需 {minimum}）"
        print(f"  {label:<14} 最低 {worst[0]:5.2f}:1  {verdict}  @{worst[1]}")
    print(f"  现状遮罩 {scrim}（PageContent.tsx，刻意保留底图可见度）。")
    print("  实测：次要文字要达到 4.5:1 需遮罩 0.87+，那时背景图几乎不可见。")
    print("  这是产品取舍而非缺陷；要改需先决定是否保留该功能。")
    return 0


def check_text_token_hygiene():
    """禁止把原始色板 token 直接用作文字或图标的颜色。

    这类错误在本项目出现过两次，而且外观都完全正常：
      - 第九轮：c-primary-font 被写死成 c-primary-dark-500，47% 用户主题不达标
      - 第十五轮：多处直接用 c-primary / c-500 / c-600 当文字色，实测低到 1.17:1
      - 第十六轮：同一批旁路换到 <Icon> 与 style.color，进度条播放头 1.71:1
    两者都只有实算才发现，设计评审里挑不出来。

    覆盖三条旁路：<Text color>、style.color、<Icon color>。
    """
    print()
    print("=== 文字颜色 token 卫生检查 ===")
    problems = []
    for path in sorted((ROOT / "src").rglob("*.tsx")):
        source = path.read_text(encoding="utf-8")
        # 先剥掉注释，否则 {/* ... */} 与 // 里保留的旧代码会被当成真实调用点。
        # 用等量换行替换，保持后续的行号不变，报错才不会指错位置。
        source = re.sub(
            r"\{/\*.*?\*/\}",
            lambda m: "\n" * m.group(0).count("\n"),
            source,
            flags=re.S,
        )
        source = re.sub(r"//[^\n]*", "", source)
        for match, kind in (
            [(m, "text") for m in TEXT_COLOR.finditer(source)]
            + [(m, "style") for m in STYLE_COLOR.finditer(source)]
            + [(m, "icon") for m in ICON_COLOR.finditer(source)]
        ):
            token = match.group(1)
            if token in SEMANTIC_TEXT_TOKENS or not RAW_PALETTE.match(token):
                continue
            if token in RAW_PALETTE_ALLOWLIST:
                continue
            line = source[: match.start()].count("\n") + 1
            problems.append((path.relative_to(ROOT).as_posix(), line, token, kind))

    for path, line, token, kind in problems:
        print(f"  ! {path}:{line}  原始色板 {token} 被直接用作 {kind} 颜色")
    pairing_problems = check_unsafe_pairings(ROOT / "src")
    if problems:
        print(f"  共 {len(problems)} 处。改用语义 token（c-font / c-font-label /")
        print("  c-primary-font）——它们的档位是按对比度挑过的。")
    else:
        print("  通过：没有把原始色板 token 直接用作文字颜色")
    return len(problems) + pairing_problems


def main():
    raw = load_themes()
    rules = load_derived_rules()
    print(f"派生规则取自 {THEME_INDEX.relative_to(ROOT)}（直接读实现，非脚本内复刻）")
    failures = 0
    for tid, colors, is_dark in raw:
        theme = build_active(colors, is_dark, rules)
        for label, token, surface, minimum in CHECKS:
            try:
                text = over(*parse(theme[token]), resolve_surface(theme, surface))
                bg = resolve_surface(theme, surface)
            except (KeyError, ValueError) as exc:
                print(f"  ! {tid}/{label}: {exc}")
                failures += 1
                continue
            ratio = contrast(text, bg)
            ok = ratio >= minimum
            if not ok:
                failures += 1
            print(
                f"{'ok  ' if ok else 'FAIL'} {tid:<16} {label:<22} "
                f"{ratio:5.2f}:1 (需 {minimum})  {text} on {bg}"
            )

    print()
    total = len(raw) * len(CHECKS)
    print(f"合计 {len(raw)} 个主题 / {len(CHECKS)} 项检查，失败 {failures}/{total}。")
    failures += check_cover_backdrop(raw, rules)
    failures += check_fg_bg_pairs(raw, rules)
    failures += check_user_theme_space(raw)
    failures += check_text_token_hygiene()
    report_custom_bg_limit(raw, rules)
    return 1 if failures else 0


# ---------------------------------------------------------------------------
# 用户自建主题的色相全域扫描
#
# 内置 16 个主题只是色彩空间里极小的一片，用户可以自建任意主色。
# 下面用 Python 重实现 utils.js 的色阶生成与 index.ts 的 pickAccessible，
# 先**自证忠实**（逐位复现 themes.ts 里的 16 个色阶），再用它扫描 HSL 全域。
# 自证这一步是刻意的：没有它，重实现和实现之间的漂移会让结论不可信——
# 那正是本脚本早先踩过的坑。
# ---------------------------------------------------------------------------


def shade(p, rgb):
    """与 colorUtils.js 的 RGB_Linear_Shade 同算法。"""
    t = 0 if p < 0 else 255 * p
    P = (1 + p) if p < 0 else (1 - p)
    out = []
    for v in rgb:
        # 必须用 half-up 而不是 Python 内建的 round()：
        # Python 的 round() 是银行家舍入（40.5 → 40），JS 的 Math.round() 是四舍五入
        # （40.5 → 41）。色阶链式相乘十次后，这 1 的偏差会沿着档位传下去。
        x = math.floor(v * P + t + 0.5)
        out.append(0 if x < 0 else (255 if x > 255 else x))
    return tuple(out)


def alpha_shade(p, rgb):
    """与 colorUtils.js 的 RGB_Alpha_Shade 同算法。"""
    a = round(1 - p, 2)
    return (*rgb, a)


def build_palette(primary, is_dark):
    """与 utils.js 的 createThemeColors 同算法（只算主色阶，灰阶另算）。"""
    c = {"c-primary": primary}
    pre = primary
    for i in range(1, 11):
        pre = shade(0.2 if is_dark else -0.1, pre)
        c[f"c-primary-dark-{i*100}"] = pre
        for j in range(1, 10):
            c[f"c-primary-dark-{i*100}-alpha-{j*100}"] = alpha_shade(0.1 * j, pre)
            c[f"c-primary-alpha-{j*100}"] = alpha_shade(0.1 * j, primary)
    pre = primary
    for i in range(1, 10):
        pre = shade(-0.1 if is_dark else 0.2, pre)
        c[f"c-primary-light-{i*100}"] = pre
        for j in range(1, 10):
            c[f"c-primary-light-{i*100}-alpha-{j*100}"] = alpha_shade(0.1 * j, pre)
    pre = shade(-0.35 if is_dark else 1, pre)
    c["c-primary-light-1000"] = pre
    for j in range(1, 10):
        c[f"c-primary-light-1000-alpha-{j*100}"] = alpha_shade(0.1 * j, pre)
    return c


def rgb_str(rgb):
    # alpha 档是四元组，别把它们当成三元组渲染成非法的 rgb() 串
    if len(rgb) == 4:
        return f"rgba({rgb[0]}, {rgb[1]}, {rgb[2]}, {rgb[3]})"
    return f"rgb({rgb[0]}, {rgb[1]}, {rgb[2]})"


LIGHT_TEXT_STEPS = [
    "c-primary-dark-500", "c-primary-dark-600", "c-primary-dark-700",
    "c-primary-dark-800", "c-primary-dark-900", "c-primary-dark-1000",
]
# 深色主题走的**也是** dark 阶梯：createThemeColors 里
# `c-primary-dark-N = RGB_Linear_Shade(isDark ? 0.2 : -0.1, ...)`，
# 暗色下 dark 阶梯越走越亮，light 阶梯越走越暗。走错阶梯会让
# 深色主色的主题找不到任何可用文字色（实测 443 个组合失败）。
DARK_TEXT_STEPS = [
    "c-primary-dark-100", "c-primary-dark-200", "c-primary-dark-300",
    "c-primary-dark-400", "c-primary-dark-500", "c-primary-dark-600",
    "c-primary-dark-700", "c-primary-dark-800", "c-primary-dark-900",
    "c-primary-dark-1000",
]


def pick_accessible(palette, steps, surface, minimum=4.5):
    # 本文件的 contrast() 收 RGB 元组，而 palette 里存的是颜色字符串
    surface_rgb = parse(surface)[0]
    for key in steps:
        value = palette.get(key)
        if not value:
            continue
        ratio = contrast(parse(value)[0], surface_rgb)
        if ratio >= minimum:
            return value, key
    return None, None


def check_user_theme_space(built_in):
    """先自证重实现的忠实度，再扫 HSL 全域。"""
    print()
    print("=== 用户自建主题：色相全域扫描 ===")

    # ---- 自证：重实现必须逐位复现 themes.ts ----
    mismatches = 0
    for tid, colors, is_dark in built_in:
        primary = parse(colors["c-primary"])[0]
        mine = {k: rgb_str(v) for k, v in build_palette(primary, is_dark).items()}
        for key, mine_str in mine.items():
            theirs = colors.get(key)
            if theirs is None:
                continue
            their_rgb, _ = parse(theirs)
            if tuple(their_rgb) != parse(mine_str)[0]:
                mismatches += 1
    if mismatches:
        print(f"  ! 自证失败：{mismatches} 处色阶与 themes.ts 不符，扫描结论不可信，已中止。")
        return mismatches
    print(f"  自证通过：Python 重实现逐位复现了 {len(built_in)} 个主题的全部色阶")

    # ---- 扫描 ----
    failures = 0
    tested = 0
    worst = (99, None)
    for h in range(0, 360, 10):
        for s in (0.3, 0.5, 0.7, 0.85, 1.0):
            for light in (0.35, 0.5, 0.65, 0.8, 0.92):
                r, g, b = colorsys.hls_to_rgb(h / 360, light, s)
                primary = (round(r * 255), round(g * 255), round(b * 255))
                for is_dark in (False, True):
                    tested += 1
                    pal = {k: rgb_str(v) for k, v in build_palette(primary, is_dark).items()}
                    surface = pal["c-primary-light-1000"]
                    steps = DARK_TEXT_STEPS if is_dark else LIGHT_TEXT_STEPS
                    value, key = pick_accessible(pal, steps, surface)
                    if value is None:
                        failures += 1
                        print(f"  FAIL H{h} S{s} L{light} dark={is_dark} 找不到达标档位")
                        continue
                    ratio = contrast(parse(value)[0], parse(surface)[0])
                    if ratio < 4.5:
                        failures += 1
                    if ratio < worst[0]:
                        worst = (ratio, (h, s, light, is_dark, key))
    print(
        f"  扫描 {tested} 个（主色 × 明暗）组合，最低 {worst[0]:.2f}:1 "
        f"@ H{worst[1][0]} S{worst[1][1]} L{worst[1][2]} dark={worst[1][3]} ({worst[1][4]})"
    )
    print(f"  失败 {failures} 项")
    return failures


# 核验前景文字与它实际所坐背景的配对。
#
# 文字 token 单独达标没有意义——同一色相下，「品牌色」压在「品牌浅 tint」上
# 永远没有对比度。这正是本项目踩过的坑：c-button-font 曾取品牌色本身，
# 压在 c-button-background（品牌浅 tint）上，16 个主题里 13~15 个不达标，
# 最差 1.08:1。所以配对必须成对验。
def check_fg_bg_pairs(themes, rules):
    print()
    print("=== 前景 / 背景配对（文字 12~14pt，阈值 4.5:1）===")
    failures = 0
    for fg, bg, label in FG_BG_PAIRS:
        worst = (99, "")
        for tid, colors, is_dark in themes:
            theme = build_active(colors, is_dark, rules)
            b = over(*parse(theme[bg]), page_base(theme))
            t = over(*parse(theme[fg]), b)
            ratio = contrast(t, b)
            if ratio < worst[0]:
                worst = (ratio, f"{tid}{'/深' if is_dark else ''}")
        ok = worst[0] >= 4.5
        if not ok:
            failures += 1
        print(f"  {'ok  ' if ok else 'FAIL'} {label:<26} 最低 {worst[0]:5.2f}:1  @ {worst[1]}")
    print(f"  合计 {len(FG_BG_PAIRS)} 组配对，失败 {failures}")
    return failures


# 对抗性封面取值：任何真实封面都落在这个区间内
ADVERSARIAL_COVERS = [
    ((0, 0, 0), "纯黑"),
    ((255, 255, 255), "纯白"),
    ((255, 0, 0), "饱和红"),
    ((0, 255, 0), "饱和绿"),
    ((0, 0, 255), "饱和蓝"),
    ((255, 255, 0), "饱和黄"),
    ((0, 255, 255), "饱和青"),
    ((255, 0, 255), "饱和品红"),
]


def check_cover_backdrop(themes, rules):
    """播放详情页把当前封面铺成整页底图时的对比度。

    封面是用户内容、颜色不可控，所以这里用一组对抗性取值穷举边界，
    而不是挑一个「典型」颜色——典型颜色会掩盖最坏情况。

    合成顺序见 PageContent 的 coverComponent 与 createGlassStyle：
      封面 → c-main-background 遮罩(0.76 浅 / 0.72 深) → 玻璃 90% light-1000 → 文字

    最后一步是关键：RN 没有 backdrop-filter，玻璃是不透明的，
    封面只能通过那 10% 的不透明度渗色。所以最坏情况就是
    玻璃色 × 0.9 + 极端封面 × 0.1。
    """
    print()
    print("=== 播放页封面底图（对抗性取值穷举）===")
    failures = 0
    for tid, colors, is_dark in themes:
        theme = build_active(colors, is_dark, rules)
        scrim_a = 0.72 if is_dark else 0.76
        scrim_rgb, _ = parse(theme["c-main-background"])
        glass_rgb, glass_a = parse(theme["c-glass-overlay"])
        for token in (
            "c-font",
            "c-font-label",
            # 歌词页压在封面底图上，也要一起验
            "c-650",
            "c-primary-font",
        ):
            text_rgb, text_a = parse(theme[token])
            for cover_rgb, cover_name in ADVERSARIAL_COVERS:
                scrubbed = over(scrim_rgb, scrim_a, cover_rgb)
                glass = over(glass_rgb, glass_a, scrubbed)
                px = over(text_rgb, text_a, glass)
                ratio = contrast(px, glass)
                if ratio < 4.5:
                    failures += 1
                    print(
                        f"FAIL {tid:<16}{token:<14} 封面={cover_name:<8} "
                        f"{ratio:5.2f}:1 (需 4.5)"
                    )
    total = len(themes) * 2 * len(ADVERSARIAL_COVERS)
    print(
        f"合计 {len(themes)} 主题 × 2 类文字 × {len(ADVERSARIAL_COVERS)} 封面 "
        f"= {total} 项，失败 {failures}。"
    )
    return failures


if __name__ == "__main__":
    sys.exit(main())

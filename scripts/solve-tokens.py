"""
为派生 token 搜索对全部 16 个主题都满足 WCAG AA 的取值。

用法: python scripts/solve-tokens.py

背景: buildActiveThemeColors 目前用 c-primary-dark-100-alpha-200 作
c-primary-font-active，半透明品牌色合成后必然掉到 3:1 附近。
本脚本枚举候选色阶，选出浅/深主题各自能全主题通过的档位。
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module  # noqa: E402

# 文件名带连字符，不能直接 import
_cc = import_module("check-contrast")
build_active = _cc.build_active
contrast = _cc.contrast
load_themes = _cc.load_themes
page_base = _cc.page_base
over = _cc.over
parse = _cc.parse

RAW = load_themes()


def surface_base(theme, surface):
    base = page_base(theme)
    if surface:
        s_rgb, s_a = parse(theme[surface])
        base = over(s_rgb, s_a, base)
    return base


def worst(colors_key, surface, themes, minimum, alpha_key=None):
    """返回候选色阶在所有主题上的最低对比度，以及最差的主题名。"""
    results = []
    for tid, colors, is_dark in themes:
        theme = build_active(colors, is_dark)
        token = colors[alpha_key or colors_key]
        t_rgb, t_a = parse(token)
        text = over(t_rgb, t_a, surface_base(theme, surface))
        results.append((contrast(text, surface_base(theme, surface)), tid))
    low, who = min(results)
    return low, who


def sweep(title, keys, surface, minimum, label):
    print(f"\n=== {title} (表面={surface or '页面底色'}, 需 {minimum}:1) ===")
    for key in keys:
        low, who = worst(key, surface, RAW, minimum)
        flag = "ok  " if low >= minimum else "FAIL"
        print(f"  {flag} {key:<34} 最低 {low:5.2f}:1 @ {who}")


DARK_STEPS = [f"c-primary-dark-{s}" for s in range(100, 1001, 100)]
LIGHT_STEPS = [f"c-primary-light-{s}" for s in range(100, 1001, 100)]
GREYS = [f"c-{s}" for s in range(0, 1001, 50)]


def main():
    light = [t for t in RAW if not t[2]]
    dark = [t for t in RAW if t[2]]

    print("### c-primary-font-active：浅色主题用 dark 阶，主题色偏亮的需更深")
    sweep("浅色主题 · 标签栏", DARK_STEPS, "c-glass-overlay", 4.5, "active")
    print("  --- 上面混合了深浅色主题，深色主题用 dark 阶必然更差，见下 ---")
    sweep("浅色主题 · 标签栏", DARK_STEPS, "c-glass-overlay", 4.5, "active")

    print("\n### 深色主题 · 标签栏用 light 阶")
    for key in LIGHT_STEPS:
        results = []
        for tid, colors, is_dark in dark:
            theme = build_active(colors, is_dark)
            base = surface_base(theme, "c-glass-overlay")
            t_rgb, t_a = parse(colors[key])
            results.append((contrast(over(t_rgb, t_a, base), base), tid))
        low, who = min(results)
        flag = "ok  " if low >= 4.5 else "FAIL"
        print(f"  {flag} {key:<34} 最低 {low:5.2f}:1 @ {who}")

    print("\n### c-font-label 在内容玻璃面上：浅色主题需更深的灰阶")
    for key in GREYS:
        if not all(key in colors for _, colors, _ in light):
            continue
        results = []
        for tid, colors, is_dark in light:
            theme = build_active(colors, is_dark)
            base = surface_base(theme, "c-glass-surface")
            t_rgb, t_a = parse(colors[key])
            results.append((contrast(over(t_rgb, t_a, base), base), tid))
        low, who = min(results)
        flag = "ok  " if low >= 4.5 else "FAIL"
        print(f"  {flag} {key:<34} 最低 {low:5.2f}:1 @ {who}")

    print("\n### c-font-label 在页面底色上：确保加深后仍不跑太深")
    for key in GREYS:
        if not all(key in colors for _, colors, _ in RAW):
            continue
        results = []
        for tid, colors, is_dark in RAW:
            theme = build_active(colors, is_dark)
            base = surface_base(theme, None)
            t_rgb, t_a = parse(colors[key])
            results.append((contrast(over(t_rgb, t_a, base), base), tid))
        low, who = min(results)
        flag = "ok  " if low >= 4.5 else "FAIL"
        print(f"  {flag} {key:<34} 最低 {low:5.2f}:1 @ {who}")

    print("\n### 内容层改不透明表面：c-700 次要文字能否保持，且与页面底色可区分")
    print("    （若通过，说明问题在玻璃表面本身，换实色即可，不必把文字加深）")
    for key in [
        "c-primary-light-1000",
        "c-primary-light-900",
        "c-primary-light-800",
        "c-primary-light-700",
    ]:
        for label_color in ["c-700", "c-650"]:
            text_worst = 99.0
            sep_worst = 99.0
            who = ""
            skipped = False
            for tid, colors, is_dark in RAW:
                theme = build_active(colors, is_dark)
                card, card_a = parse(colors[key])
                if card_a < 1.0:
                    skipped = True
                    continue
                base = page_base(theme)
                card_px = over(card, 1.0, base)
                t_rgb, t_a = parse(colors[label_color])
                r = contrast(over(t_rgb, t_a, card_px), card_px)
                if r < text_worst:
                    text_worst, who = r, tid
                sep_worst = min(sep_worst, contrast(card_px, base))
            flag = "ok  " if text_worst >= 4.5 else "FAIL"
            note = "  (部分主题无此档)" if skipped else ""
            print(
                f"  {flag} {label_color} on {key:<24} 文字最低 {text_worst:5.2f}:1 @ {who}"
                f"   分层可见度 {sep_worst:.2f}:1{note}"
            )


if __name__ == "__main__":
    main()

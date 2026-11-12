#!/usr/bin/env bash
# Ubuntu 侧截图：把 mirror/*.html 用 Chromium 渲成 PNG。
#
# 为什么 Ubuntu 只能做这一步：Xcode 的 iOS 模拟器只有 macOS 上有二进制，
# Linux 上没有等价物；这个仓库又是 iOS-only（没有 android/ 工程），
# 所以「iOS 真机像素」只能在 macOS runner 上拿。但版式（间距、字重、
# 截断、对齐）用同一套 token 的 HTML 镜像就能验证，秒级出图，不用排队等 CI。
#
# 依赖：
#   sudo apt install -y chromium-browser fonts-noto-cjk
#   （Ubuntu 22.04+ 的 chromium 是 snap；若 headless 报 sandbox 错就加 --no-sandbox）
#
# 用法：
#   ./mirror/shoot.sh            # 402×874 @3x
#   ./mirror/shoot.sh se         # 375×667 @2x
#   ./mirror/shoot.sh pro home chart
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
device="${1:-pro}"
shift || true

browser=""
for c in chromium chromium-browser google-chrome google-chrome-stable; do
  if command -v "$c" >/dev/null 2>&1; then browser="$c"; break; fi
done
[ -n "$browser" ] || { echo "没找到 chromium/chrome，先 apt install chromium-browser" >&2; exit 1; }

if [ "$device" = "se" ]; then w=375; h=667; scale=2; suffix=se; else w=402; h=874; scale=3; suffix=pro; fi

mkdir -p "$here/shots"
pages=()
if [ "$#" -gt 0 ]; then
  for name in "$@"; do pages+=("$here/$name.html"); done
else
  while IFS= read -r f; do pages+=("$f"); done < <(find "$here" -maxdepth 1 -name '*.html' ! -name 'index.html' | sort)
fi

for page in "${pages[@]}"; do
  base="$(basename "$page" .html)"
  out="$here/shots/${base}-${suffix}.png"
  "$browser" --headless=new --disable-gpu --hide-scrollbars --no-sandbox \
    --force-device-scale-factor="$scale" --window-size="$w,$h" \
    --screenshot="$out" "file://$page" >/dev/null 2>&1 || true
  [ -f "$out" ] || { echo "截图失败：$base" >&2; exit 1; }
  printf '[%s] %s  %s KB\n' "$suffix" "$(basename "$out")" "$(( $(stat -c%s "$out") / 1024 ))"
done
echo "输出目录：$here/shots"
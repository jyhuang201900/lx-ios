# 用 Chromium 内核把 mirror/*.html 渲成截图。
#
# 为什么要在本机做这件事：iOS 模拟器只有 macOS 上有，Windows / Ubuntu 上都
# 没有等价物（这个仓库是 iOS-only，连 android/ 工程都没有）。
# 所以版式验证走「同度量 HTML 镜像 + Chromium 截图」，秒级出图；
# 每轮改完再让 GitHub Actions 的 macOS 跑一次真机截图做最终确认。
#
# 用法：
#   pwsh mirror/shoot.ps1                 # 402×874 @3x，iPhone 16 Pro
#   pwsh mirror/shoot.ps1 -Device se      # 375×667 @2x，SE 三
#   pwsh mirror/shoot.ps1 -Only home,chart
param(
  [ValidateSet('pro', 'se')][string]$Device = 'pro',
  [string[]]$Only = @()
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path $here 'shots'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$browsers = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ }
if (-not $browsers) { throw '没找到 Chrome / Edge，装一个或把路径加到 $browsers 里' }
$exe = $browsers[0]

if ($Device -eq 'se') { $w = 375; $h = 667; $scale = 2; $suffix = 'se' }
else { $w = 402; $h = 874; $scale = 3; $suffix = 'pro' }

$pages = Get-ChildItem -Path $here -Filter *.html |
  Where-Object { $_.BaseName -ne 'index' }
if ($Only.Count) { $pages = $pages | Where-Object { $Only -contains $_.BaseName } }
if (-not $pages) { throw '没有可截的页面' }

foreach ($page in $pages) {
  $png = Join-Path $outDir ("{0}-{1}.png" -f $page.BaseName, $suffix)
  $uri = ([System.Uri]$page.FullName).AbsoluteUri
  $args = @(
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--default-background-color=00000000',
    "--force-device-scale-factor=$scale",
    "--window-size=$w,$h",
    "--screenshot=$png",
    $uri
  )
  & $exe @args 2>$null | Out-Null
  if (-not (Test-Path $png)) { throw "截图失败：$($page.Name)" }
  # 有些版本的 headless 会把窗口尺寸算上缩放，超出就裁掉多余部分
  $size = "{0:N0} KB" -f ((Get-Item $png).Length / 1KB)
  Write-Host ("[{0}] {1}  {2}" -f $suffix, (Split-Path -Leaf $png), $size)
}

Write-Host "输出目录：$outDir"
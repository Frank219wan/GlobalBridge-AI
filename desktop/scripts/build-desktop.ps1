<#
.SYNOPSIS
  E 的桌面壳构建脚本：检查 .NET 10 SDK → 还原 → 自检导航规则 → 发布单文件产物。

.DESCRIPTION
  只需 .NET 10 SDK（含 WindowsDesktop 工作负载）。WebView2 Runtime 不随包分发，
  由目标机器上的 Evergreen Runtime 提供，脚本会提示缺失情况。

.PARAMETER OutputDir
  发布产物目录，默认 desktop/artifacts/publish。

.PARAMETER SkipSelfCheck
  跳过导航规则自检（不建议，仅排障时使用）。
#>
[CmdletBinding()]
param(
    [string]$OutputDir = (Join-Path $PSScriptRoot '..\artifacts\publish'),
    [switch]$SkipSelfCheck
)

$ErrorActionPreference = 'Stop'
$src = Join-Path $PSScriptRoot '..\src\GlobalBridge.Desktop\GlobalBridge.Desktop.csproj'
$check = Join-Path $PSScriptRoot '..\tests\NavPolicyCheck\NavPolicyCheck.csproj'

Write-Host '== 1/4 检查 .NET SDK ==' -ForegroundColor Cyan
$sdks = & dotnet --list-sdks 2>$null
if (-not $sdks) {
    throw '未找到 .NET SDK。请安装 .NET 10 SDK（Windows x64），安装后重试。'
}
if (-not ($sdks | Select-String -SimpleMatch '10.')) {
    Write-Warning "当前 SDK 不含 10.x：`n$($sdks -join "`n")`n请安装 .NET 10 SDK，否则 TargetFramework net10.0-windows 无法编译。"
}
Write-Host $sdks

if (-not $SkipSelfCheck) {
    Write-Host '== 2/4 导航规则自检 ==' -ForegroundColor Cyan
    & dotnet run --project $check --configuration Release
    if ($LASTEXITCODE -ne 0) { throw "导航规则自检未通过（exit $LASTEXITCODE）。" }
}
else {
    Write-Host '== 2/4 已跳过自检 ==' -ForegroundColor Yellow
}

Write-Host '== 3/4 发布 ==' -ForegroundColor Cyan
$OutputDir = [IO.Path]::GetFullPath($OutputDir)
& dotnet publish $src `
    --configuration Release `
    --runtime win-x64 `
    --self-contained false `
    --output $OutputDir
if ($LASTEXITCODE -ne 0) { throw "发布失败（exit $LASTEXITCODE）。" }

Write-Host '== 4/4 结果 ==' -ForegroundColor Cyan
Get-ChildItem $OutputDir -Filter 'GlobalBridgeAI.exe' | ForEach-Object {
    Write-Host ("产物: {0}  ({1:N1} KB)" -f $_.FullName, ($_.Length / 1KB))
}

Write-Host ''
Write-Host '注意：' -ForegroundColor Yellow
Write-Host '  · 目标机器需已安装 WebView2 Evergreen Runtime（Win10 1803+ 多数已自带）。'
Write-Host '  · 首次试装前先改 appsettings.json 的 baseUrl / allowedHosts 为 A 提供的 HTTPS 地址，'
Write-Host '    或用 --url= 与 --allowed-hosts= 参数临时覆盖。'

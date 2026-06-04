$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$launcherPath = (Resolve-Path (Join-Path $PSScriptRoot "open-command-center.ps1")).Path

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "GetKinetik Command Center.lnk"

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcherPath`""
$shortcut.WorkingDirectory = $repoRoot
$shortcut.IconLocation = Join-Path $env:SystemRoot "System32\SHELL32.dll,220"
$shortcut.Description = "Launch local GetKinetik Command Center"
$shortcut.Save()

Write-Output "Shortcut installed:"
Write-Output $shortcutPath

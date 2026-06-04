$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$url = "http://127.0.0.1:5200/"
$startTimeoutSeconds = 45

function Test-CommandCenter {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $url -Method GET -TimeoutSec 2
    return $response.StatusCode -ge 200
  } catch {
    return $false
  }
}

function Start-AppWindow {
  param([string]$AppUrl)

  $candidates = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  )

  foreach ($exe in $candidates) {
    if (Test-Path $exe) {
      Start-Process -FilePath $exe -ArgumentList @("--app=$AppUrl") | Out-Null
      return $true
    }
  }

  Start-Process $AppUrl | Out-Null
  return $false
}

if (-not (Test-CommandCenter)) {
  $command = "Set-Location '$repoRoot'; npm run command-center"
  Start-Process -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", $command) `
    -WindowStyle Minimized | Out-Null

  $started = $false
  for ($i = 0; $i -lt $startTimeoutSeconds; $i++) {
    Start-Sleep -Seconds 1
    if (Test-CommandCenter) {
      $started = $true
      break
    }
  }

  if (-not $started) {
    Write-Error "Command Center did not start within $startTimeoutSeconds seconds."
    exit 1
  }
}

Start-AppWindow -AppUrl $url | Out-Null

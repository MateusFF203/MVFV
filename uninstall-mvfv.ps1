param(
    [string]$InstallDir = "C:\MVFV",
    [switch]$RemoveFolder
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "[MVFV-Uninstall] $Message"
}

function Normalize-PathForCompare {
    param([string]$PathValue)
    return $PathValue.Trim().TrimEnd("\").ToLowerInvariant()
}

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($null -eq $userPath) {
    $userPath = ""
}

$segments = @()
if ($userPath -ne "") {
    $segments = $userPath.Split(";") | Where-Object { $_.Trim() -ne "" }
}

$installDirNormalized = Normalize-PathForCompare -PathValue $InstallDir
$filtered = @()
foreach ($segment in $segments) {
    if ((Normalize-PathForCompare -PathValue $segment) -ne $installDirNormalized) {
        $filtered += $segment
    }
}

$newPath = ($filtered -join ";")
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")
Write-Step "Removed from User PATH: $InstallDir"

$batPath = Join-Path $InstallDir "mvfv.bat"
$jsPath = Join-Path $InstallDir "mvfv.js"

if (Test-Path -LiteralPath $batPath) {
    Remove-Item -LiteralPath $batPath -Force
    Write-Step "Removed: $batPath"
}

if (Test-Path -LiteralPath $jsPath) {
    Remove-Item -LiteralPath $jsPath -Force
    Write-Step "Removed: $jsPath"
}

if ($RemoveFolder -and (Test-Path -LiteralPath $InstallDir)) {
    try {
        Remove-Item -LiteralPath $InstallDir -Recurse -Force
        Write-Step "Removed folder: $InstallDir"
    }
    catch {
        Write-Step "Could not remove folder (possibly not empty): $InstallDir"
    }
}

Write-Step "Uninstall complete."

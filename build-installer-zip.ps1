param(
    [string]$OutputDir = "",
    [string]$FileName = "MVFV-Installer.zip"
)

$ErrorActionPreference = "Stop"

if (-not $OutputDir) {
    $OutputDir = Join-Path $PSScriptRoot "dist"
}

if (-not (Test-Path -LiteralPath $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$tempDir = Join-Path $env:TEMP ("mvfv-installer-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "install-mvfv.bat") -Destination (Join-Path $tempDir "install-mvfv.bat") -Force
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "install-mvfv.ps1") -Destination (Join-Path $tempDir "install-mvfv.ps1") -Force
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "uninstall-mvfv.bat") -Destination (Join-Path $tempDir "uninstall-mvfv.bat") -Force
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "uninstall-mvfv.ps1") -Destination (Join-Path $tempDir "uninstall-mvfv.ps1") -Force
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "README.md") -Destination (Join-Path $tempDir "README.md") -Force
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "payload") -Destination (Join-Path $tempDir "payload") -Recurse -Force

    $zipPath = Join-Path $OutputDir $FileName
    if (Test-Path -LiteralPath $zipPath) {
        Remove-Item -LiteralPath $zipPath -Force
    }

    Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $zipPath -CompressionLevel Optimal
    Write-Host "[MVFV-Installer] Zip generated: $zipPath"
}
finally {
    if (Test-Path -LiteralPath $tempDir) {
        Remove-Item -LiteralPath $tempDir -Recurse -Force
    }
}

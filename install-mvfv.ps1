param(
    [string]$InstallDir = "C:\MVFV",
    [string]$SourceDir = "",
    [switch]$SkipPath,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "[MVFV-Install] $Message"
}

function Normalize-PathForCompare {
    param([string]$PathValue)
    return $PathValue.Trim().TrimEnd("\").ToLowerInvariant()
}

if (-not $SourceDir) {
    $SourceDir = Join-Path $PSScriptRoot "payload"
}

$sourceBat = Join-Path $SourceDir "mvfv.bat"
$sourceJs = Join-Path $SourceDir "mvfv.js"

if (-not (Test-Path -LiteralPath $sourceBat)) {
    throw "Missing installer payload: $sourceBat"
}

if (-not (Test-Path -LiteralPath $sourceJs)) {
    throw "Missing installer payload: $sourceJs"
}

if (-not (Test-Path -LiteralPath $InstallDir)) {
    Write-Step "Creating directory: $InstallDir"
    New-Item -ItemType Directory -Path $InstallDir | Out-Null
}

$destBat = Join-Path $InstallDir "mvfv.bat"
$destJs = Join-Path $InstallDir "mvfv.js"

if ((Test-Path -LiteralPath $destBat) -and -not $Force) {
    throw "File already exists: $destBat (use -Force to overwrite)"
}

if ((Test-Path -LiteralPath $destJs) -and -not $Force) {
    throw "File already exists: $destJs (use -Force to overwrite)"
}

Write-Step "Copying executor files to $InstallDir"
Copy-Item -LiteralPath $sourceBat -Destination $destBat -Force
Copy-Item -LiteralPath $sourceJs -Destination $destJs -Force

if (-not $SkipPath) {
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($null -eq $userPath) {
        $userPath = ""
    }

    $segments = @()
    if ($userPath -ne "") {
        $segments = $userPath.Split(";") | Where-Object { $_.Trim() -ne "" }
    }

    $installDirNormalized = Normalize-PathForCompare -PathValue $InstallDir
    $alreadyExists = $false

    foreach ($segment in $segments) {
        if ((Normalize-PathForCompare -PathValue $segment) -eq $installDirNormalized) {
            $alreadyExists = $true
            break
        }
    }

    if (-not $alreadyExists) {
        $newPath = if ($userPath.Trim() -eq "") { $InstallDir } else { "$userPath;$InstallDir" }
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Step "Added to User PATH: $InstallDir"
    }
    else {
        Write-Step "Install directory already present in User PATH"
    }
}
else {
    Write-Step "Skipping PATH update by request"
}

Write-Step "Installation complete."
Write-Step "Open a new terminal and run: mvfv help"

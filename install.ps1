# Installs the latest libgen-dl release. Re-run to update (close libgen-dl first).
#   irm https://raw.githubusercontent.com/Jaxx497/libgen-dl/master/install.ps1 | iex
# ponytail: the x64 build also runs on Windows on ARM (emulated), so there is only one asset.
$ErrorActionPreference = "Stop"
$dir = Join-Path $env:LOCALAPPDATA "libgen-dl"
New-Item -ItemType Directory -Force $dir | Out-Null
Write-Host "Downloading libgen-dl-windows-x64.exe..."
Invoke-WebRequest "https://github.com/Jaxx497/libgen-dl/releases/latest/download/libgen-dl-windows-x64.exe" -OutFile (Join-Path $dir "libgen-dl.exe")

$path = [Environment]::GetEnvironmentVariable("Path", "User")
if (($path -split ";") -notcontains $dir) {
    [Environment]::SetEnvironmentVariable("Path", "$path;$dir", "User")
    Write-Host "Added $dir to your PATH; open a new terminal to use 'libgen-dl'."
}
# lgd as a second name for it
Set-Content (Join-Path $dir "lgd.cmd") '@"%~dp0libgen-dl.exe" %*'
Write-Host "Installed $dir\libgen-dl.exe"

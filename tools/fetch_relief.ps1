$ErrorActionPreference = 'Stop'
$dataDir = Join-Path $PSScriptRoot 'data'
$archive = Join-Path $dataDir 'NE2_50M_SR.zip'
$extract = Join-Path $dataDir 'NE2_50M_SR'
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
Invoke-WebRequest -Uri 'https://naturalearth.s3.amazonaws.com/50m_raster/NE2_50M_SR.zip' -OutFile $archive
Expand-Archive -LiteralPath $archive -DestinationPath $extract -Force
Write-Host 'Natural Earth II shaded relief is ready. Run: node tools/compile_relief.mjs'

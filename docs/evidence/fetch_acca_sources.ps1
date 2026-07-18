$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Out = Join-Path $Root "official_acca_pdfs"
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$Manifest = Get-Content (Join-Path $Root "sources.json") -Raw | ConvertFrom-Json
$Items = @($Manifest.sources) + @($Manifest.question_sources)
foreach ($Item in $Items) {
    $Target = Join-Path $Out $Item.filename
    Write-Host "Fetching $($Item.title) -> $($Item.filename)"
    Invoke-WebRequest -Uri $Item.url -OutFile $Target
    $Bytes = [System.IO.File]::ReadAllBytes($Target)
    $Magic = [System.Text.Encoding]::ASCII.GetString($Bytes[0..3])
    if ($Magic -ne "%PDF") { throw "Downloaded content is not a PDF: $($Item.title)" }
}
Write-Host "Done. Files saved in: $Out"

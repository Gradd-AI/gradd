$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Out = Join-Path $Root "official_acca_pdfs"
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$Manifest = Get-Content (Join-Path $Root "sources.json") -Raw | ConvertFrom-Json
$Items = @($Manifest.sources) + @($Manifest.examiner_reports) + @($Manifest.syllabus_sources) + @($Manifest.question_sources)
foreach ($Item in $Items) {
    $Target = Join-Path $Out $Item.filename
    Write-Host "Fetching $($Item.title) -> $($Item.filename)"
    Invoke-WebRequest -Uri $Item.url -OutFile $Target -UseBasicParsing
    $Bytes = [System.IO.File]::ReadAllBytes($Target)
    $Magic = [System.Text.Encoding]::ASCII.GetString($Bytes[0..3])
    if ($Magic -ne "%PDF") { throw "Downloaded content is not a PDF: $($Item.title)" }
    # Entries carrying a recorded byte size are page-ref evidence: a size change means the
    # published PDF was re-issued and every cited page number must be re-verified.
    if ($Item.bytes) {
        if ($Bytes.Length -ne $Item.bytes) {
            throw "Size mismatch for $($Item.title): expected $($Item.bytes) bytes, got $($Bytes.Length). The source PDF changed - re-verify all page refs in docs/evidence/ before trusting them."
        }
        Write-Host "  byte-size verified ($($Bytes.Length))"
    }
}
Write-Host "Done. Files saved in: $Out"

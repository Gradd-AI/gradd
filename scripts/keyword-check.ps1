param(
    [Parameter(Mandatory=$true, ValueFromRemainingArguments=$true)]
    [string[]]$Phrases
)

foreach ($phrase in $Phrases) {
    Write-Output ""
    Write-Output "=== $phrase ==="
    $encoded = [Uri]::EscapeDataString($phrase)
    $url = "http://suggestqueries.google.com/complete/search?client=firefox&q=$encoded"
    try {
        $result = Invoke-RestMethod -Uri $url -UseBasicParsing
        $suggestions = $result[1]
        if ($null -eq $suggestions -or $suggestions.Count -eq 0) {
            Write-Output "  (no suggestions returned)"
        } else {
            foreach ($s in $suggestions) {
                Write-Output "  $s"
            }
        }
    } catch {
        Write-Output "  ERROR: $($_.Exception.Message)"
    }
}

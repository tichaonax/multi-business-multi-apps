$port = "\\.\TMUSB001"
$data = [System.IO.File]::ReadAllBytes("test-receipt.bin")

Write-Host "Sending test receipt to TMUSB001..."
Write-Host ("Data size: " + $data.Length + " bytes")

try {
    $stream = New-Object System.IO.FileStream($port, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write)
    $stream.Write($data, 0, $data.Length)
    $stream.Flush()
    $stream.Close()
    Write-Host "SUCCESS: Test receipt sent to TMUSB001"
} catch {
    Write-Host ("ERROR: " + $_.Exception.Message)
    exit 1
}

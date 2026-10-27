[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null

param([string]$ImagePath)

if (-not (Test-Path $ImagePath)) {
    Write-Output "ERROR: File not found: $ImagePath"
    exit 1
}

$fullPath = (Resolve-Path $ImagePath).Path
$asyncOp = [Windows.Storage.StorageFile]::GetFileFromPathAsync($fullPath)
while ($asyncOp.Status -eq 'Started') { Start-Sleep -Milliseconds 10 }
$file = $asyncOp.GetResults()

$asyncOp = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read)
while ($asyncOp.Status -eq 'Started') { Start-Sleep -Milliseconds 10 }
$stream = $asyncOp.GetResults()

$asyncOp = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
while ($asyncOp.Status -eq 'Started') { Start-Sleep -Milliseconds 10 }
$decoder = $asyncOp.GetResults()

$asyncOp = $decoder.GetSoftwareBitmapAsync()
while ($asyncOp.Status -eq 'Started') { Start-Sleep -Milliseconds 10 }
$bitmap = $asyncOp.GetResults()

$ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($null -eq $ocrEngine) {
    Write-Output "ERROR: OcrEngine could not be initialized"
    exit 1
}

$asyncOp = $ocrEngine.RecognizeAsync($bitmap)
while ($asyncOp.Status -eq 'Started') { Start-Sleep -Milliseconds 10 }
$result = $asyncOp.GetResults()

Write-Output $result.Text

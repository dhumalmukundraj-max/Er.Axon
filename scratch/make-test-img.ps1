Add-Type -AssemblyName System.Drawing

$bitmap = New-Object System.Drawing.Bitmap 600, 150
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::FromArgb(24, 24, 28))

$font = New-Object System.Drawing.Font "Consolas", 14
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240, 80, 80))

$graphics.DrawString("Traceback (most recent call last):", $font, $brush, 10, 10)
$graphics.DrawString('  File "app.py", line 42, in <module>', $font, [System.Drawing.Brushes]::White, 10, 35)
$graphics.DrawString("TypeError: unsupported operand type(s) for +: 'int' and 'str'", $font, $brush, 10, 60)

$bitmap.Save("c:\Users\MUKUNDRAJ\Desktop\Er.Axon\scratch\test-traceback.png", [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Image saved to scratch\test-traceback.png"

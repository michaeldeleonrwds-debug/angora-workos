Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile("C:\Users\REYMARK\Documents\Sites\angora\angora_symbol_clean.png")
Write-Output "Size: $($bmp.Width) x $($bmp.Height)"
$bmp.Dispose()

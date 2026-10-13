Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile("C:\Users\REYMARK\Documents\Sites\angora\angora_symbol_clean.png")

# Tight bounding box is [200, 810] x [205, 690]
$cropW = 620
$cropH = 490
$startX = 200
$startY = 205

# 1. Full Tight Clean Symbol
$symTight = New-Object System.Drawing.Bitmap($cropW, $cropH)
$gSym = [System.Drawing.Graphics]::FromImage($symTight)
$gSym.DrawImage($src, [System.Drawing.Rectangle]::new(0, 0, $cropW, $cropH), $startX, $startY, $cropW, $cropH, [System.Drawing.GraphicsUnit]::Pixel)
$gSym.Dispose()
$symTight.Save("C:\Users\REYMARK\Documents\Sites\angora\angora_sym_tight.png", [System.Drawing.Imaging.ImageFormat]::Png)
$symTight.Dispose()

# 2. Extract Left Leg
# Left leg is roughly X < (506 - (Y - 210)*0.1) and follows the left diagonal
# But let's check exact masks or cuts
$src.Dispose()
Write-Output "Tight symbol exported."

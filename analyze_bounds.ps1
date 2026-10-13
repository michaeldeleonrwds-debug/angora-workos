Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile("C:\Users\REYMARK\Documents\Sites\angora\angora_symbol_clean.png")
Write-Output "Image size: $($src.Width) x $($src.Height)"

# Find bounding box of non-transparent pixels
$minX = $src.Width
$maxX = 0
$minY = $src.Height
$maxY = 0

for ($y = 0; $y -lt $src.Height; $y++) {
    for ($x = 0; $x -lt $src.Width; $x++) {
        $c = $src.GetPixel($x, $y)
        if ($c.A -gt 10) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Output "Bounds: X=[$minX, $maxX] (width=$($maxX-$minX+1)), Y=[$minY, $maxY] (height=$($maxY-$minY+1))"
$src.Dispose()

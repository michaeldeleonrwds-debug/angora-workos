Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile("C:\Users\REYMARK\Documents\Sites\angora\angora_sym_tight.png")
$w = $src.Width
$h = $src.Height

# We want:
# 1. angora_ribbon_clean.png: Contains the ribbon (starts at left, curves over to right)
# 2. angora_a_frame_clean.png: Contains the chevron "A" strokes (apex down to bottom-left and bottom-right)
# Let's inspect the ribbon boundary:
# Ribbon upper curve: from left wing (X=90, Y=330) peaking at (X=245, Y=272) down to (X=605, Y=445)
# Ribbon lower curve: from left wing (X=90, Y=330) swooping down to (X=230, Y=355), then arching down to (X=500, Y=460) to tip (X=605, Y=445)

$ribbon = New-Object System.Drawing.Bitmap($w, $h)
$frame = New-Object System.Drawing.Bitmap($w, $h)

# Helper function to test if (x,y) is part of the ribbon
function IsRibbon($x, $y) {
    # If above Y=265, definitely frame
    if ($y -lt 265) { return $false }
    # If Y > 465 and X > 450, below the ribbon tip
    if ($y -gt 465 -and $x -gt 450) { return $false }
    # Upper boundary curve:
    # For X in [85..245]: Y >= 335 - (X - 85)*0.39
    # For X in [245..610]: Y >= 272 + [Math]::Pow(($x - 245)/365.0, 1.25) * 173
    $topY = 0
    if ($x -lt 85) { return $false }
    elseif ($x -le 245) { $topY = 335 - ($x - 85)*0.39 }
    else { $topY = 272 + [Math]::Pow(($x - 245)/365.0, 1.25) * 173 }
    
    if ($y -lt ($topY - 2)) { return $false }

    # Lower boundary curve:
    # Ribbon underbelly goes from X=90, Y=335 -> X=200, Y=355 -> X=350, Y=400 -> X=500, Y=460 -> X=605, Y=445
    # Pixels in the bottom left leg: X < 180 and Y > 380 are left leg, NOT ribbon!
    if ($x -lt 150 -and $y -gt 345) { return $false }
    if ($x -lt 220 -and $y -gt 380) { return $false }
    if ($x -lt 260 -and $y -gt 410) { return $false }

    # Right leg below ribbon:
    # Right leg bottom tip is at X=570, Y=435, but it is BEHIND the ribbon!
    # The ribbon bottom edge on the right is around Y = 445..465
    if ($y -gt 468) { return $false }

    return $true
}

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $c = $src.GetPixel($x, $y)
        if ($c.A -eq 0) { continue }

        if (IsRibbon $x $y) {
            $ribbon.SetPixel($x, $y, $c)
        } else {
            $frame.SetPixel($x, $y, $c)
        }
    }
}

# Now for $frame: In the region where ribbon crossed, interpolate the left leg and right leg strokes so the A is solid!
# Left leg: between Y=280 and Y=380, X between 120 and 260
# Right leg: between Y=300 and Y=440, X between 350 and 520
# Let's clone the frame and fill in the continuity smoothly:
for ($y = 270; $y -lt 400; $y++) {
    # Left leg center slope: X(y) ~ 306 - (y - 5)*(299.0/475.0)
    $centerX = 306.0 - ($y - 5.0)*0.63
    for ($dx = -45; $dx -le 45; $dx++) {
        $x = [int]($centerX + $dx)
        if ($x -ge 0 -and $x -lt $w) {
            $curr = $frame.GetPixel($x, $y)
            if ($curr.A -lt 50) {
                # Sample color from src to get authentic lime gradient
                $srcC = $src.GetPixel($x, $y)
                if ($srcC.A -gt 100) {
                    $frame.SetPixel($x, $y, $srcC)
                }
            }
        }
    }
}

$ribbon.Save("C:\Users\REYMARK\Documents\Sites\angora\angora_ribbon_isolated.png", [System.Drawing.Imaging.ImageFormat]::Png)
$frame.Save("C:\Users\REYMARK\Documents\Sites\angora\angora_frame_isolated.png", [System.Drawing.Imaging.ImageFormat]::Png)

Write-Output "Isolated assets created successfully."
$src.Dispose()
$ribbon.Dispose()
$frame.Dispose()

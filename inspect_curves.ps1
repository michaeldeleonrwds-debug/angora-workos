Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile("C:\Users\REYMARK\Documents\Sites\angora\angora_sym_tight.png")
$w = $src.Width
$h = $src.Height

# We will create:
# 1. angora_ribbon_complete.png
# 2. angora_a_frame_complete.png

$ribbonBmp = New-Object System.Drawing.Bitmap($w, $h)
$frameBmp = New-Object System.Drawing.Bitmap($w, $h)

# The ribbon is bounded by:
# Top curve: from left wing around Y=330, arching over to Y=275 at X=240, down to Y=445 at X=605
# Bottom curve: from bottom-left wing arching along underbelly to Y=465 at X=520 to tip at X=605, Y=445
# Let's inspect the exact pixel colors and alpha

# In angora_sym_tight.png, the ribbon has the distinctive light-lime to yellow-green gradient with a white highlight rim on top
# Let's inspect rows from Y=260 to Y=480

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $c = $src.GetPixel($x, $y)
        if ($c.A -eq 0) { continue }

        # Top apex and upper strokes:
        # Above Y=265: purely the A frame
        # Right leg below Y=265 where X > 340 and Y < 390 is inside the triangular counter of A or upper right stroke
        # Let's check ribbon boundary:
        # The ribbon top edge:
        # For X in [95..240]: Y >= 330 - (X - 95)*0.38  (roughly arch from 330 to 275)
        # For X in [240..605]: Y >= 275 + ((X - 240)/365)^1.2 * 170
        
        # Let's check ribbon bottom edge:
        # For X in [0..140]: left leg continues to bottom
        # Ribbon underbelly starts around X=140, Y=370, goes to X=280, Y=340, then curves down to X=520, Y=465
    }
}

Write-Output "Inspection ready."
$src.Dispose()
$ribbonBmp.Dispose()
$frameBmp.Dispose()

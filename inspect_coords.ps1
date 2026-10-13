Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile("C:\Users\REYMARK\Documents\Sites\angora\angora_sym_tight.png")
$w = $src.Width
$h = $src.Height

# Let's inspect the boundary points of the ribbon:
# The top edge of the ribbon is an arch:
# Starts at left ~ (95, 330)
# Peaks at ~ (250, 275)
# Crosses the center ~ (350, 310)
# Goes down to ~ (480, 400)
# Finishes at tip ~ (605, 445)
# Bottom edge of the ribbon:
# From (7, 480) up along underbelly (140, 370), (280, 340), (450, 440), (520, 465), to tip (605, 445)

Write-Output "Loaded tight symbol: $w x $h"
$src.Dispose()

"""Insère (ou remplace) l'île custom dans le SVG. Usage: insert.py map.svg island.png cx cy land_width"""
import sys, re, base64
from PIL import Image
svg_path, png_path = sys.argv[1], sys.argv[2]
cx, cy, land_w = map(float, sys.argv[3:6])
LAND_PX, PAD = 461, 150
W, H = Image.open(png_path).size
k = land_w / LAND_PX                        # unités SVG par pixel
w, h = W * k, H * k
x, y = cx - w / 2, cy - h / 2
b64 = base64.b64encode(open(png_path, "rb").read()).decode()
tag = (f'<image id="island-custom" x="{x:.3f}" y="{y:.3f}" width="{w:.3f}" height="{h:.3f}" '
       f'preserveAspectRatio="none" xlink:href="data:image/png;base64,{b64}" />')
s = open(svg_path).read()
s = re.sub(r'<image id="island-custom"[^>]*/>', '', s)   # idempotent
anchor = s.index('<image\n     width="467.17993"')       # carte principale : l'île passe dessous
s = s[:anchor] + tag + s[anchor:]
open(svg_path, "w").write(s)
print("→ pense à régénérer les tuiles : python3 scripts/build-tiles.py")
print(f"île: x={x:.1f} y={y:.1f} w={w:.1f} h={h:.1f} (terre ≈ {land_w:.0f} x {504*k:.0f} unités)")

"""Rend l'île découpée dans le style de la carte : terre/routes recolorées + rivage dégradé."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
src, mask_path, out = sys.argv[1:4]
SHORE = (sys.argv[4] if len(sys.argv) > 4 else "shore") == "shore"  # "noshore" = terre seule, comme l'île du sud
im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)[488:1136, 0:515]
mask = np.load(mask_path)
ys, xs = np.nonzero(mask)
y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
P = 150 if SHORE else 4  # marge pour le rivage (px)
H, W = (y1 - y0) + 2 * P, (x1 - x0) + 2 * P
land = np.zeros((H, W), bool); land[P:P + y1 - y0, P:P + x1 - x0] = mask[y0:y1, x0:x1]
rgb = np.zeros((H, W, 3), np.float32); rgb[P:P + y1 - y0, P:P + x1 - x0] = im[y0:y1, x0:x1]

# Terre : niveaux de gris recalés sur la carte (fond 15 -> 31, routes 230 -> 181)
lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
g = np.clip(31 + (lum - 15) * (150 / 215), 31, 200)
land_rgb = np.stack([g, g + 1, g], -1)

# Rivage : profil relevé sur la carte principale (distance en px depuis la côte)
d = ndi.distance_transform_edt(~land)
stops = [  # d, (r,g,b), alpha
    (0,   (214, 219, 224), 154),
    (14,  (190, 198, 207), 153),
    (24,  (148, 166, 173), 153),
    (70,  (142, 160, 167), 153),
    (80,  (88, 107, 117), 105),
    (125, (70, 88, 95), 50),
    (145, (70, 88, 95), 0),
]
ds = np.array([s[0] for s in stops], np.float32)
shore = np.stack([np.interp(d, ds, [s[1][c] for s in stops]) for c in range(3)], -1)
shore_a = np.interp(d, ds, [s[2] for s in stops])
# un peu de bruit pour imiter le relief flou de la carte
rng = np.random.default_rng(1)
noise = ndi.gaussian_filter(rng.standard_normal((H, W)), 6) * 40
shore_a = np.clip(shore_a + noise * (d > 20) * (shore_a > 0), 0, 255)
if not SHORE:
    shore_a[:] = 0

# Composition : terre (bords adoucis) par-dessus le rivage
la = ndi.gaussian_filter(land.astype(np.float32), 0.8)[..., None]
out_rgb = land_rgb * la + shore * (1 - la)
out_a = 255 * la[..., 0] + shore_a * (1 - la[..., 0])
Image.fromarray(np.dstack([out_rgb, out_a]).clip(0, 255).astype(np.uint8), "RGBA").save(out, optimize=True)
print("png", W, "x", H, "| land px", x1 - x0, "x", y1 - y0, "| pad", P)

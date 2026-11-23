import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
crop = im[488:1136, 0:515]
lum = crop @ np.array([0.299, 0.587, 0.114])
dark = lum < float(sys.argv[3]) if len(sys.argv) > 3 else lum < 45
lab, n = ndi.label(dark)
seed = lab[330, 230]  # un point à l'intérieur de l'île (coords du crop)
mask = ndi.binary_fill_holes(lab == seed)
mask = ndi.binary_opening(mask, iterations=2)
ys, xs = np.nonzero(mask)
print("seed label", seed, "area", mask.sum(), "bbox x", xs.min(), xs.max(), "y", ys.min(), ys.max())
dbg = crop.copy(); dbg[~mask] *= 0.25; dbg[~mask] += np.array([180, 0, 0]) * 0.5
Image.fromarray(dbg.clip(0, 255).astype(np.uint8)).save(out)
np.save(out + ".npy", mask)

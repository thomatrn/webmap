"""
Génère les tuiles de la carte (public/tiles/{z}/{x}/{y}.webp) à partir de public/map.svg.

Pourquoi : le SVG (8 Mo, images PNG + masques + filtres) est re-rastérisé par le navigateur à chaque
cran de zoom → zoom saccadé. Avec des tuiles, le navigateur n'affiche que de petites images déjà prêtes.

Ce script reproduit le rendu du SVG en composant ses calques lui-même (pas de dépendance à Inkscape/cairo).
Il connaît la structure du fichier : rect de fond, <image> simples, et groupes
  <g clip-path transform="translate(..)"><g mask><g transform="matrix(a,0,0,d,e,f)"><image/></g></g></g>
où le masque = luminance d'une autre image PNG placée au même endroit.

À relancer après chaque modification de public/map.svg :
    python3 scripts/build-tiles.py
Dépendances : pip install pillow numpy
"""
import base64, hashlib, io, json, math, os, re, shutil, sys
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = os.path.join(ROOT, "public", "map.svg")
OUT = os.path.join(ROOT, "public", "tiles")
TILE = 256
MAX_Z = 4          # 2^4 = 16 px par unité SVG au zoom natif max (la carte a au mieux ~12 px/unité)
QUALITY = 82

NS = {"svg": "http://www.w3.org/2000/svg", "xlink": "http://www.w3.org/1999/xlink"}
HREF = "{http://www.w3.org/1999/xlink}href"
Image.MAX_IMAGE_PIXELS = None


def fnum(v, default=0.0):
    return float(v) if v is not None else default


def load_png(el):
    href = el.get(HREF) or el.get("href")
    data = href.split("base64,", 1)[1]
    data = re.sub(r"\s", "", data)
    return Image.open(io.BytesIO(base64.b64decode(data))).convert("RGBA")


def parse_translate(t):
    m = re.search(r"translate\(\s*([-\d.e]+)[ ,]+([-\d.e]+)", t or "")
    return (float(m.group(1)), float(m.group(2))) if m else (0.0, 0.0)


def parse_matrix(t):
    m = re.search(r"matrix\(([^)]*)\)", t or "")
    a, b, c, d, e, f = [float(v) for v in re.split(r"[ ,]+", m.group(1).strip())]
    assert abs(b) < 1e-9 and abs(c) < 1e-9, "rotation non gérée"
    return a, d, e, f


def rect_of_clip(clip):
    """Rectangle (x0,y0,x1,y1) d'un clipPath fait d'un path rectangulaire 'M x y L ... Z'."""
    path = clip.find("svg:path", NS)
    nums = [float(v) for v in re.findall(r"[-\d.]+(?:e-?\d+)?", path.get("d"))]
    xs, ys = nums[0::2], nums[1::2]
    return min(xs), min(ys), max(xs), max(ys)


class Layer:
    """Une image RGBA posée dans le repère SVG sur le rectangle (x, y, w, h)."""
    def __init__(self, img, x, y, w, h, name):
        self.img, self.x, self.y, self.w, self.h, self.name = img, x, y, w, h, name


def build_layers(root):
    defs = {el.get("id"): el for el in root.iter() if el.get("id")}
    vb = [float(v) for v in root.get("viewBox").split()]
    layers, bg = [], None
    for el in root:
        tag = el.tag.split("}")[1]
        if tag == "rect" and bg is None:
            bg = el.get("fill")
        elif tag == "image":
            img = load_png(el)
            layers.append(Layer(img, fnum(el.get("x")), fnum(el.get("y")),
                                fnum(el.get("width")), fnum(el.get("height")), el.get("id")))
        elif tag == "g":
            tx, ty = parse_translate(el.get("transform"))
            clip = defs[re.search(r"#([^)]+)", el.get("clip-path")).group(1)]
            masked = el.find("svg:g", NS)
            mask = defs[re.search(r"#([^)]+)", masked.get("mask")).group(1)]
            inner = masked.find("svg:g", NS)
            a, d, e, f = parse_matrix(inner.get("transform"))
            content = load_png(inner.find("svg:image", NS))
            # Image de masque : même placement attendu ; masque = luminance sRGB (filtre feColorMatrix)
            mimg_el = mask.find(".//svg:image", NS)
            mg = mask.find(".//svg:g[@transform]", NS)
            ma, md, me, mf = parse_matrix(mg.get("transform"))
            assert max(abs(ma - a), abs(md - d), abs(me - e), abs(mf - f)) < 1e-3, f"masque décalé ({el.get('id')})"
            m = np.asarray(load_png(mimg_el)).astype(np.float32)
            lum = (m[..., 0] * 0.2126 + m[..., 1] * 0.7152 + m[..., 2] * 0.0722) * (m[..., 3] > 0)
            c = np.asarray(content).astype(np.float32).copy()
            c[..., 3] *= lum / 255.0
            # clip-path (repère du groupe, donc avant translate) → coupe en pixels de l'image
            x0, y0, x1, y1 = rect_of_clip(clip)
            H, W = c.shape[:2]
            px0, px1 = (x0 - e) / a, (x1 - e) / a
            py0, py1 = (y0 - f) / d, (y1 - f) / d
            yy, xx = np.mgrid[0:H, 0:W]
            inside = (xx + 0.5 >= px0) & (xx + 0.5 <= px1) & (yy + 0.5 >= py0) & (yy + 0.5 <= py1)
            c[..., 3] *= inside
            img = Image.fromarray(c.clip(0, 255).astype(np.uint8), "RGBA")
            layers.append(Layer(img, e + tx, f + ty, W * a, H * d, el.get("id")))
    return vb, bg, layers


def render_tile(z, tx, ty, bg_rgb, layers):
    s = 2 ** z  # px par unité
    ux0, uy0 = tx * TILE / s, ty * TILE / s
    ux1, uy1 = ux0 + TILE / s, uy0 + TILE / s
    tile = Image.new("RGBA", (TILE, TILE), bg_rgb + (255,))
    for L in layers:
        if L.x >= ux1 or L.x + L.w <= ux0 or L.y >= uy1 or L.y + L.h <= uy0:
            continue
        W, H = L.img.size
        kx, ky = W / L.w, H / L.h  # px source par unité
        # pixel tuile (i,j) → unité (ux0 + i/s) → pixel source ((u - L.x) * kx)
        coeffs = (kx / s, 0, (ux0 - L.x) * kx, 0, ky / s, (uy0 - L.y) * ky)
        down = kx / s > 1.5  # forte réduction : on pré-réduit pour éviter le crénelage
        src = L.img
        if down:
            f = int(kx / s)
            src = L.img.reduce(f)
            coeffs = (coeffs[0] / f, 0, coeffs[2] / f, 0, coeffs[4] / f, coeffs[5] / f)
        part = src.transform((TILE, TILE), Image.AFFINE, coeffs, resample=Image.BILINEAR,
                             fillcolor=(0, 0, 0, 0))
        tile.alpha_composite(part)
    return tile.convert("RGB")


def main():
    tree = ET.parse(SVG)
    vb, bg, layers = build_layers(tree.getroot())
    bg_rgb = tuple(int(bg[i:i + 2], 16) for i in (1, 3, 5))
    vw, vh = vb[2], vb[3]
    print("calques :", ", ".join(f"{L.name} ({L.img.size[0]}x{L.img.size[1]})" for L in layers))

    tmp = OUT + ".tmp"
    shutil.rmtree(tmp, ignore_errors=True)
    total = 0
    for z in range(0, MAX_Z + 1):
        s = 2 ** z
        nx, ny = math.ceil(vw * s / TILE), math.ceil(vh * s / TILE)
        for tx in range(nx):
            os.makedirs(os.path.join(tmp, str(z), str(tx)), exist_ok=True)
            for ty in range(ny):
                render_tile(z, tx, ty, bg_rgb, layers).save(
                    os.path.join(tmp, str(z), str(tx), f"{ty}.webp"), quality=QUALITY, method=4)
                total += 1
        print(f"  zoom {z} : {nx}x{ny} tuiles")

    version = hashlib.md5(open(SVG, "rb").read()).hexdigest()[:10]
    meta = {"version": version, "tileSize": TILE, "minNativeZoom": 0, "maxNativeZoom": MAX_Z,
            "width": vw, "height": vh, "background": bg}
    json.dump(meta, open(os.path.join(tmp, "meta.json"), "w"), indent=2)
    shutil.rmtree(OUT, ignore_errors=True)
    os.rename(tmp, OUT)
    size = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(OUT) for f in fs)
    print(f"✔ {total} tuiles, {size / 1e6:.1f} Mo → public/tiles (version {version})")


if __name__ == "__main__":
    sys.exit(main())

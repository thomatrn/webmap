"""
Régénère src/lib/catalog.ts à partir du seed d'intra-dynasty8 (labels des intérieurs, garages, entreprises).
    python3 scripts/sync-catalog.py ../intra-dynasty8/prisma/seed.ts
"""
import json, os, re, sys

seed = open(sys.argv[1] if len(sys.argv) > 1 else "../intra-dynasty8/prisma/seed.ts", encoding="utf-8").read()
GROUPS = [("INTERIORS", "interiors", "Intérieurs"), ("GARAGES", "garages", "Garages"), ("ENTERPRISES", "enterprises", "Entreprises")]

out = []
for const, key, title in GROUPS:
    m = re.search(rf"const {const}\b[^=]*=\s*\[(.*?)\n\];", seed, re.S)
    if not m:
        sys.exit(f"Tableau {const} introuvable dans le seed")
    labels = re.findall(r'label:\s*"((?:[^"\\]|\\.)*)"', m.group(1))
    out.append({"key": key, "title": title, "labels": labels})
    print(f"{title}: {len(labels)}")

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = os.path.join(root, "src", "lib", "catalog.ts")
with open(path, "w", encoding="utf-8") as f:
    f.write("// Généré par scripts/sync-catalog.py depuis intra-dynasty8/prisma/seed.ts — ne pas modifier à la main.\n\n")
    f.write("export type CatalogGroup = { key: string; title: string; labels: string[] };\n\n")
    f.write("export const CATALOG: CatalogGroup[] = " + json.dumps(out, ensure_ascii=False, indent=2) + ";\n\n")
    f.write("""/** Ordre d'affichage des labels (ordre du catalogue). */
export const LABEL_ORDER = new Map(CATALOG.flatMap((g) => g.labels).map((l, i) => [l, i] as const));

export const sortLabels = (labels: string[]) =>
  [...labels].sort((a, b) => (LABEL_ORDER.get(a) ?? 1e9) - (LABEL_ORDER.get(b) ?? 1e9) || a.localeCompare(b));
""")
print("→", os.path.relpath(path, root))

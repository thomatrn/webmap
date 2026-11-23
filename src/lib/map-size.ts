import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { MapSize } from "./types";

type TilesMeta = { version: string; maxNativeZoom: number; width: number; height: number };

/**
 * Dimensions de la carte + infos des tuiles, lues dans public/tiles/meta.json
 * (généré par `python3 scripts/build-tiles.py` à partir de public/map.svg).
 */
export async function getMapSize(): Promise<MapSize> {
  const file = path.join(process.cwd(), "public", "tiles", "meta.json");
  let meta: TilesMeta;
  try {
    meta = JSON.parse(await readFile(file, "utf8"));
  } catch {
    throw new Error("public/tiles/meta.json introuvable : lance `python3 scripts/build-tiles.py`");
  }
  return {
    width: meta.width,
    height: meta.height,
    // ?v= : change à chaque régénération, pour ne jamais servir d'anciennes tuiles en cache
    tileUrl: `/tiles/{z}/{x}/{y}.webp?v=${meta.version}`,
    maxNativeZoom: meta.maxNativeZoom,
  };
}

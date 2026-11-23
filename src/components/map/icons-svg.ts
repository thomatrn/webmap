import type { MarkerType } from "@/lib/types";

// Style commun : intérieur noir, liseré jaune, contour extérieur noir, "$" vert cerclé de noir.
const K = "#0a0a0a"; // noir
const Y = "#e8d21d"; // jaune
const G = "#2f9e3a"; // vert

/** Forme avec contour noir épais + liseré jaune + remplissage noir. */
const outlined = (shape: string) =>
  `<g stroke-linejoin="round">
    <g fill="${K}" stroke="${K}" stroke-width="11">${shape}</g>
    <g fill="${K}" stroke="${Y}" stroke-width="4">${shape}</g>
  </g>`;

const dollar = `<text x="17" y="38" text-anchor="middle" font-size="40" font-weight="900"
  font-family="Arial Black, Arial, sans-serif" fill="${G}" stroke="${K}" stroke-width="7"
  paint-order="stroke" stroke-linejoin="round">$</text>`;

const squares = (xs: number[], ys: number[], size: number) =>
  ys.flatMap((y) => xs.map((x) => `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="1.5" fill="${Y}"/>`)).join("");

const HOUSE = `<path d="M12 52 L50 20 L88 52 L84 52 L84 88 L16 88 L16 52 Z"/>`;

export const MARKER_SVG: Record<MarkerType, string> = {
  // Garage : maison avec grande porte
  house: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    ${outlined(HOUSE)}
    <rect x="29" y="58" width="42" height="30" fill="${Y}"/>
    ${dollar}</svg>`,

  // Immeuble : bâtiment avec grille de fenêtres et porte
  building: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    ${outlined(`<rect x="22" y="14" width="56" height="74" rx="4"/>`)}
    ${squares([35, 47, 59], [24, 37, 50], 8)}
    <rect x="42" y="68" width="16" height="20" fill="${Y}"/>
    ${dollar}</svg>`,

  // Entrepôt : maison avec cheminée, fenêtres et porte
  factory: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="68" y="8" width="13" height="34" rx="2.5" fill="${K}"/>
    ${outlined(HOUSE)}
    ${squares([36, 46.5, 57], [46, 56.5], 8)}
    <rect x="40" y="70" width="20" height="18" fill="${Y}"/>
    ${dollar}</svg>`,
};

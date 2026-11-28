/** Labels cochables sur les icônes (table Label, gérée depuis /admin/labels). */

export const LABEL_GROUPS = [
  { key: "interiors", title: "Intérieurs" },
  { key: "garages", title: "Garages" },
  { key: "enterprises", title: "Entreprises" },
] as const;

export type LabelGroup = (typeof LABEL_GROUPS)[number]["key"];
export type LabelDTO = { id: string; group: LabelGroup; name: string };

const byName = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" });
const groupIndex = (g: string) => LABEL_GROUPS.findIndex((x) => x.key === g);

/** Ordre d'affichage : par groupe, puis par nom ("Bureau 2" avant "Bureau 10"). */
export const sortLabels = <T extends { group: string; name: string }>(list: T[]) =>
  [...list].sort((a, b) => groupIndex(a.group) - groupIndex(b.group) || byName(a.name, b.name));

/** Trie des noms de labels dans l'ordre du catalogue (noms inconnus à la fin). */
export function sortNames(names: string[], catalog: LabelDTO[]) {
  const order = new Map(catalog.map((l, i) => [l.name, i]));
  return [...names].sort((a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9) || byName(a, b));
}

import L from "leaflet";

/** Geoman s'attend à un `L` global et doit être chargé avant la création de la carte. */
export async function loadGeoman() {
  (window as unknown as { L: typeof L }).L = L;
  await import("@geoman-io/leaflet-geoman-free");
}

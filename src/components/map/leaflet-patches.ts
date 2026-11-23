import L from "leaflet";

/**
 * Leaflet arrondit la position des icônes au pixel entier (Marker.update → .round()).
 * Pendant le zoom continu, la carte est à un zoom fractionnaire et mise à l'échelle sans arrondi :
 * les icônes « tremblent » alors de ±1 px par rapport au fond. On garde la position exacte.
 */
type MarkerInternals = {
  _map?: L.Map;
  _icon?: HTMLElement;
  _latlng: L.LatLng;
  _setPos(pos: L.Point): void;
};

L.Marker.include({
  update(this: MarkerInternals) {
    if (this._icon && this._map) {
      this._setPos(this._map.latLngToLayerPoint(this._latlng));
    }
    return this;
  },
});

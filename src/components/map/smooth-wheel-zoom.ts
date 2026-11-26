import L from "leaflet";

/**
 * Zoom molette continu (remplace le scrollWheelZoom de Leaflet, qui zoome par crans animés séparés).
 * À chaque image, le zoom se rapproche de la cible ; la molette ne fait que déplacer la cible.
 * Le point sous la souris reste fixe. Inspiré de Leaflet.SmoothWheelZoom (MIT).
 */

/** Méthodes internes de L.Map utilisées (non typées par @types/leaflet). */
type MapInternals = L.Map & {
  _stop(): void;
  _move(center: L.LatLng, zoom: number, data?: { pinch?: boolean; round?: boolean }): void;
  _moveStart(zoomChanged: boolean, noMoveStart: boolean): void;
  _moveEnd(zoomChanged: boolean): void;
  _panAnim?: { stop(): void };
};

/** Vitesse : niveaux de zoom par pixel de molette (un cran de souris ≈ 100 px → ½ niveau). */
const SENSITIVITY = 0.005;
/** Lissage : part du chemin restant parcourue à chaque image (0..1). */
const EASING = 0.25;

export const SmoothWheelZoom = L.Handler.extend({
  addHooks(this: SmoothWheelZoomHandler) {
    L.DomEvent.on(this._map.getContainer(), "wheel", this._onWheel, this);
  },

  removeHooks(this: SmoothWheelZoomHandler) {
    L.DomEvent.off(this._map.getContainer(), "wheel", this._onWheel, this);
  },

  _onWheel(this: SmoothWheelZoomHandler, ev: Event) {
    const e = ev as WheelEvent;
    L.DomEvent.preventDefault(e);
    L.DomEvent.stopPropagation(e);
    const map = this._map as MapInternals;

    this._idle = false;
    if (!this._wheeling) {
      this._wheeling = true;
      this._centerPoint = map.getSize().divideBy(2);
      this._mousePoint = map.mouseEventToContainerPoint(e);
      this._mouseLatLng = map.containerPointToLatLng(this._mousePoint);
      this._goalZoom = map.getZoom();
      this._moved = false;
      map._stop();
      map._panAnim?.stop();
      this._frame = requestAnimationFrame(() => this._step());
    }

    // Distance de molette en pixels (souris : ~100 par cran ; trackpad : petits pas nombreux).
    // Pas de _limitZoom : il arrondit au zoomSnap et annulerait les petits pas du trackpad.
    const px = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 800 : e.deltaY;
    const delta = Math.max(-1, Math.min(1, -px * SENSITIVITY));
    this._goalZoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), this._goalZoom + delta));
    const p = map.mouseEventToContainerPoint(e);
    if (!p.equals(this._mousePoint)) {
      // la souris a bougé pendant le zoom : on recale le point d'ancrage
      this._mousePoint = p;
      this._mouseLatLng = map.containerPointToLatLng(p);
    }
    clearTimeout(this._endTimer);
    // molette au repos depuis 150 ms : on termine dès que la cible est atteinte
    this._endTimer = window.setTimeout(() => (this._idle = true), 150);
  },

  _step(this: SmoothWheelZoomHandler) {
    const map = this._map as MapInternals;
    const zoom = map.getZoom();
    const diff = this._goalZoom - zoom;
    if (Math.abs(diff) > 0.001) {
      const next = Math.abs(diff) < 0.005 ? this._goalZoom : zoom + diff * EASING;
      const offset = this._mousePoint.subtract(this._centerPoint);
      const center = map.unproject(map.project(this._mouseLatLng, next).subtract(offset), next);
      if (!this._moved) {
        map._moveStart(true, false);
        this._moved = true;
      }
      // { pinch: true } comme le zoom tactile de Leaflet : pendant le geste, les tuiles déjà affichées
      // sont juste agrandies/réduites (pas de chargement ni de suppression à chaque image, sinon trous et
      // clignotements quand on zoome vite). Les bonnes tuiles sont chargées à la fin (_moveEnd).
      map._move(center, next, { pinch: true, round: false });
    } else if (this._idle) {
      return this._end();
    }
    this._frame = requestAnimationFrame(() => this._step());
  },

  _end(this: SmoothWheelZoomHandler) {
    this._wheeling = false;
    cancelAnimationFrame(this._frame);
    if (this._moved) (this._map as MapInternals)._moveEnd(true);
  },
}) as unknown as new (map: L.Map) => L.Handler;

type SmoothWheelZoomHandler = L.Handler & {
  _map: L.Map;
  _wheeling: boolean;
  _idle: boolean;
  _centerPoint: L.Point;
  _mousePoint: L.Point;
  _mouseLatLng: L.LatLng;
  _goalZoom: number;
  _moved: boolean;
  _frame: number;
  _endTimer: number;
  _onWheel(e: Event): void;
  _step(): void;
  _end(): void;
};

import { layerOpacity, runtime, state } from "./state.js";
import { hiddenCategories } from "./legend.js";
import { radiusText, selectedRadius } from "./radius.js";
import { handleMapClick } from "./selection.js";
import { escapeHTML } from "./presentation.js";
import { row } from "./popups.js";
import { serviceBadges } from "./markers.js";
export function updateRoads() {
  runtime.roadLayers = [];
  if (hiddenCategories.has("road")) return;
  for (const f of runtime.data.roads.features) {
    const geometry = state.selected ? selectedRadius().roads[f.id] : f.geometry;
    if (!geometry) continue;
    const feature = {
      ...f,
      geometry,
    };
    const halo = L.geoJSON(feature, {
      pane: "road-light",
      interactive: false,
      style: {
        color: "#ffffff",
        weight: 10,
        opacity: (layerOpacity.transport / 100) * 0.4,
        className: "road-glow",
      },
    });
    const line = L.geoJSON(feature, {
      pane: "road-light",
      bubblingMouseEvents: false,
      style: {
        color: "#ffffff",
        weight: 3.5,
        lineCap: "round",
        lineJoin: "round",
        opacity: layerOpacity.transport / 100,
        className: "road-axis",
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        layer.bindTooltip(escapeHTML(p.name), {
          sticky: true,
        });
        layer.bindPopup(
          `<div class="popup-tag">AXE ROUTIER STRUCTURANT</div><h3 class="popup-title">${escapeHTML(p.name)}</h3>${row("Repère", p.ref)}<p>Tracé OpenStreetMap du 22 octobre 2026, limité à Suresnes et à une bande de 500 m autour de ses limites${state.selected ? " et au rayon de " + radiusText() : ""}.</p><a href="${escapeHTML(p.source_url)}" target="_blank" rel="noopener noreferrer">© OpenStreetMap · ODbL ↗</a><br><a href="${escapeHTML(p.official_url)}" target="_blank" rel="noopener noreferrer">Repérage : Département des Hauts-de-Seine ↗</a>`,
        );
        layer.on("click", handleMapClick);
      },
    });
    runtime.groups.transport.addLayer(halo);
    runtime.groups.transport.addLayer(line);
    runtime.roadLayers.push({
      id: f.id,
      halo,
      line,
    });
  }
}
// Pixel offsets separate shared L/U tracks without modifying source coordinates.
export const OffsetRail = L.Polyline.extend({
  _project() {
    L.Polyline.prototype._project.call(this);
    const offset = this.options.railOffset || 0;
    if (!offset) return;
    this._rings = this._rings.map((ring) => {
      if (ring.length < 2) return ring;
      const first = ring[0],
        last = ring[ring.length - 1],
        sign =
          first.y === last.y
            ? first.x < last.x
              ? 1
              : -1
            : first.y < last.y
              ? 1
              : -1;
      return ring.map((p, i) => {
        const before = ring[Math.max(0, i - 1)],
          after = ring[Math.min(ring.length - 1, i + 1)],
          dx = after.x - before.x,
          dy = after.y - before.y,
          length = Math.hypot(dx, dy) || 1;
        const moved = L.point(
          p.x - (dy / length) * offset * sign,
          p.y + (dx / length) * offset * sign,
        );
        this._rawPxBounds.extend(moved);
        return moved;
      });
    });
    this._updateBounds();
  },
});
export function updateRail() {
  runtime.railLayers = [];
  for (const f of runtime.data.rail.features) {
    const p = f.properties;
    if (hiddenCategories.has("rail-" + p.id)) continue;
    const geometry = state.selected ? selectedRadius().rail[f.id] : f.geometry;
    if (!geometry) continue;
    const parts = [],
      coords =
        geometry.type === "LineString"
          ? [geometry.coordinates]
          : geometry.coordinates;
    for (const coordinates of coords) {
      const latlngs = coordinates.map(([x, y]) => [y, x]);
      const base = {
        pane: "data-transport",
        opacity: layerOpacity.transport / 100,
        railOffset: p.label === "L" ? -2.3 : p.label === "U" ? 2.3 : 0,
        lineCap: "round",
        lineJoin: "round",
        smoothFactor: 0.3,
      };
      const line = new OffsetRail(latlngs, {
        ...base,
        color: p.color,
        weight: 3,
        interactive: true,
        bubblingMouseEvents: false,
        className: "rail-line rail-" + p.label,
      });
      line.bindTooltip(
        p.mode === "TRAMWAY" ? "Tram " + p.label : "Transilien " + p.label,
        {
          sticky: true,
        },
      );
      line.bindPopup(
        `<div class="popup-tag">LIGNE DE TRANSPORT</div><h3 class="popup-title">${escapeHTML(p.name)}</h3>${serviceBadges([p])}<p>Tracé et couleur officiels Île-de-France Mobilités · 21 octobre 2026.</p><a href="${runtime.sources.rail.url}" target="_blank" rel="noopener noreferrer">Source du tracé ↗</a>`,
      );
      line.on("click", handleMapClick);
      runtime.groups.transport.addLayer(line);
      parts.push(line);
    }
    runtime.railLayers.push({
      id: f.id,
      parts,
    });
  }
}

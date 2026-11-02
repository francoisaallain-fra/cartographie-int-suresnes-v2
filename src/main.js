import { configureMapClickHandler } from "./map-events.js";
import { loadDatasets } from "./data.js";
import { groupFor, runtime, state } from "./state.js";
import { setupMapRotation } from "./rotation.js";
import { $, escapeHTML } from "./presentation.js";
import { layerSpecs, mosColors, officeRetentionColors } from "./catalog.js";
import {
  frameOfficePopup,
  handleMapClick,
  selectOffice,
  selectStation,
} from "./selection.js";
import {
  mixedBuildingPopup,
  mosGroupPopup,
  mosOfficePopup,
  pluOfficeRetentionPopup,
  popup,
} from "./popups.js";
import { featureIcon } from "./markers.js";
import { buildControls } from "./controls.js";
import { bindMarkerColorControls } from "./marker-colors.js";
import { buildSources } from "./sources.js";
import { updateLayers, updateZoneLabels } from "./layers.js";
export async function start() {
  configureMapClickHandler(handleMapClick);
  try {
    runtime.data = await loadDatasets();
    runtime.sources = runtime.data.sources;
    runtime.map = L.map("map", {
      zoomControl: false,
      preferCanvas: false,
      minZoom: 12,
      maxZoom: 20,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      rotate: true,
      dragRotate: false,
      shiftKeyRotate: false,
      touchRotate: false,
      rotateControl: false,
    });
    L.control
      .zoom({
        position: "topright",
      })
      .addTo(runtime.map);
    L.control
      .scale({
        imperial: false,
        position: "bottomleft",
        maxWidth: 120,
      })
      .addTo(runtime.map);
    setupMapRotation();
    let loadedTiles = 0,
      failedTiles = 0;
    runtime.tiles = L.tileLayer(
      "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEROW={y}&TILECOL={x}&TILEMATRIX={z}",
      {
        attribution:
          'Photo © <a href="https://www.ign.fr/">IGN</a> · 2024 | Données : Mos © <a href="https://www.institutparisregion.fr/">L’Institut Paris Region</a>, CSTB/BDNB, Insee/BPE, GPU, IDFM, Éducation, FINESS, Dépt. 92, <a href="https://www.bureauxlocaux.com/">BureauxLocaux</a>, © <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxNativeZoom: 19,
        maxZoom: 20,
      },
    );
    runtime.tiles.on("tileload", () => {
      loadedTiles++;
      $("map-error").hidden = true;
    });
    runtime.tiles.on("tileerror", () => {
      failedTiles++;
      if (loadedTiles === 0 && failedTiles >= 3) $("map-error").hidden = false;
    });
    runtime.tiles.addTo(runtime.map);
    $("retry-tiles").addEventListener("click", () => {
      loadedTiles = 0;
      failedTiles = 0;
      runtime.tiles.redraw();
    });
    L.geoJSON(runtime.data.commune, {
      style: {
        color: "#effff1",
        weight: 2,
        dashArray: "5 5",
        fill: false,
      },
      interactive: false,
    }).addTo(runtime.map);
    runtime.bounds = L.geoJSON(runtime.data["transport-extent"]).getBounds();
    runtime.map.fitBounds(runtime.bounds, {
      padding: [24, 24],
    });
    // Leaflet Rotate keeps imagery and paths in one rotating pane, while it
    // repositions upright markers in a separate non-rotating pane.
    const pathParent = runtime.map.getPanes().overlayPane.parentElement;
    const markerParent = runtime.map.getPanes().markerPane.parentElement;
    for (const s of layerSpecs) {
      runtime.map.createPane("data-" + s.id, pathParent);
      runtime.map.createPane("data-" + s.id + "-markers", markerParent);
    }
    runtime.map.createPane("road-light", pathParent).style.mixBlendMode =
      "screen";
    runtime.groups.plu = L.geoJSON(runtime.data.plu, {
      pane: "data-plu",
      style: {
        color: "#f8d944",
        weight: 1,
        opacity: 0.95,
        fillOpacity: 0.05,
        fillColor: "#ffdf4a",
      },
      onEachFeature: (f, l) => {
        l.bindPopup(
          `<div class="popup-tag">ZONAGE PLU</div><h3 class="popup-title">Secteur ${escapeHTML(f.properties.libelle)}</h3><p>Document 92073_PLU_20240626<br>Publié le 15 janvier 2025</p><p class="popup-notice">Le secteur seul ne détermine pas les droits à construire.</p><a href="${runtime.sources.plu.url}" target="_blank" rel="noopener noreferrer">Consulter les pièces du PLU ↗</a>`,
        );
        l.on("click", handleMapClick);
        const [x, y] = f.properties.label_point;
        runtime.zoneLabels.push({
          area: f.properties.area_m2,
          marker: L.marker([y, x], {
            pane: "data-plu-markers",
            interactive: false,
            keyboard: false,
            icon: L.divIcon({
              className: "zone-label",
              html: escapeHTML(f.properties.libelle),
              iconSize: [46, 16],
              iconAnchor: [23, 8],
            }),
          }),
        });
      },
    });
    const officeRetentionOutline = L.geoJSON(
      runtime.data["plu-maintien-bureaux"],
      {
        pane: "data-pluOfficeRetention",
        interactive: false,
        style: {
          className: "office-retention-outline",
          color: officeRetentionColors.outline,
          weight: 4,
          dashArray: "1 8",
          lineCap: "round",
          opacity: 1,
          fill: false,
        },
      },
    );
    const officeRetentionCenter = L.geoJSON(
      runtime.data["plu-maintien-bureaux"],
      {
        pane: "data-pluOfficeRetention",
        style: {
          className: "office-retention-center",
          color: officeRetentionColors.center,
          weight: 2.5,
          dashArray: "1 8",
          lineCap: "round",
          opacity: 1,
          fill: false,
        },
        onEachFeature: (f, l) => {
          l.bindPopup(pluOfficeRetentionPopup(f));
          l.bindTooltip("PLU · maintien des surfaces de bureau", {
            sticky: true,
          });
          l.on("click", handleMapClick);
        },
      },
    );
    runtime.groups.pluOfficeRetention = L.layerGroup([
      officeRetentionOutline,
      officeRetentionCenter,
    ]);
    runtime.groups.mosOffices = L.geoJSON(runtime.data["mos-offices"], {
      pane: "data-mosOffices",
      style: {
        color: mosColors.offices,
        weight: 1,
        opacity: 1,
        fillColor: mosColors.offices,
        fillOpacity: 0.2,
      },
      onEachFeature: (f, l) => {
        l.bindPopup(mosOfficePopup(f));
        l.bindTooltip("Bureaux · Mos 2025", {
          sticky: true,
        });
        l.on("click", handleMapClick);
      },
    });
    runtime.groups.mixedBuildings = L.geoJSON(runtime.data["mixed-buildings"], {
      pane: "data-mixedBuildings",
      style: {
        color: "#ff9b42",
        weight: 1,
        opacity: 0.98,
        fillColor: "#fa8733",
        fillOpacity: 0.25,
      },
      onEachFeature: (f, l) => {
        l.bindPopup(mixedBuildingPopup(f));
        l.bindTooltip("Mixité bureaux + commerce à confirmer", {
          sticky: true,
        });
        l.on("click", handleMapClick);
      },
    });
    for (const [id, filename, color] of [
      ["mosPavilion", "mos-pavillonnaire", mosColors.pavilion],
      ["mosCollective", "mos-collectif", mosColors.collective],
      ["mosActivities", "mos-activites", mosColors.activities],
    ]) {
      runtime.groups[id] = L.geoJSON(runtime.data[filename], {
        pane: "data-" + id,
        style: {
          color,
          weight: 1,
          opacity: 1,
          fillColor: color,
          fillOpacity: 0.2,
        },
        onEachFeature: (f, l) => {
          l.bindPopup(mosGroupPopup(f));
          l.bindTooltip(`Mos 2025 · ${f.properties.group_name}`, {
            sticky: true,
          });
          l.on("click", handleMapClick);
        },
      });
    }
    for (const id of [
      "transport",
      "equipment",
      "neighborhood",
      "offices",
      "rentalOffices",
    ])
      runtime.groups[id] = L.layerGroup();
    runtime.allPoints = [
      ...runtime.data.transport.features,
      ...runtime.data.schools.features,
      ...runtime.data.nurseries.features,
      ...runtime.data.health.features,
      ...runtime.data.neighborhood.features,
      ...runtime.data.offices.features,
      ...runtime.data["rental-offices"].features,
    ];
    for (const f of runtime.allPoints) {
      const [x, y] = f.geometry.coordinates;
      const marker = L.marker([y, x], {
        pane: "data-" + groupFor(f) + "-markers",
        icon: featureIcon(f),
        title: f.properties.kind === "transport" ? "" : f.properties.name,
        alt: f.properties.name,
        keyboard: true,
        zIndexOffset:
          f.properties.kind === "office"
            ? 900
            : f.properties.kind === "transport"
              ? 1200
              : 0,
      }).bindPopup(
        popup(f),
        f.properties.kind === "transport"
          ? {
              className: "station-card-popup",
              autoPan: false,
            }
          : ["office", "rentalOffice"].includes(f.properties.kind)
            ? { autoPan: false }
            : {},
      );
      if (["office", "rentalOffice"].includes(f.properties.kind))
        marker.on("popupopen", () => frameOfficePopup(marker));
      if (f.properties.kind === "office")
        marker.on("click", () => selectOffice(f));
      if (f.properties.kind === "transport")
        marker.on("click", () => selectStation(f));
      if (f.properties.kind === "transport")
        marker.on("add", () =>
          marker.getElement()?.setAttribute("aria-label", f.properties.name),
        );
      runtime.markers.set(f.id, marker);
    }
    buildControls();
    bindMarkerColorControls();
    buildSources();
    updateLayers();
    runtime.map.on("zoomend", updateZoneLabels);
    runtime.map.on("click", handleMapClick);
    $("loading").hidden = true;
    // A read-only diagnostic snapshot used by the browser acceptance checks.
    window.suresnesDiagnostics = () => ({
      bearing: runtime.map.getBearing(),
      center: [runtime.map.getCenter().lat, runtime.map.getCenter().lng],
      zoom: runtime.map.getZoom(),
      railIds: state.enabled.transport
        ? runtime.railLayers.map((r) => r.id)
        : [],
      roadIds: state.enabled.transport
        ? runtime.roadLayers.map((r) => r.id)
        : [],
      radiusMeters: state.radiusMeters,
      selected: state.selected,
      selectedStations: [...state.selectedStations],
      stationRadiusMeters: Object.fromEntries(
        [...runtime.stationRadiusLayers].map(([id, layer]) => [
          id,
          layer.getRadius(),
        ]),
      ),
      enabled: {
        ...state.enabled,
      },
      counts: Object.fromEntries(
        Object.entries(runtime.groups).map(([k, g]) => [
          k,
          g.getLayers().length,
        ]),
      ),
      visible: Object.fromEntries(
        Object.entries(runtime.groups).map(([k, g]) => [
          k,
          runtime.map.hasLayer(g),
        ]),
      ),
      radius: !!runtime.radiusLayer,
      loadedTiles,
      failedTiles,
      pointIds: runtime.allPoints
        .filter(
          (f) =>
            runtime.map.hasLayer(runtime.groups[groupFor(f)]) &&
            runtime.groups[groupFor(f)].hasLayer(runtime.markers.get(f.id)),
        )
        .map((f) => f.id),
    });
  } catch (error) {
    $("loading").innerHTML =
      '<strong>Les données n’ont pas pu être chargées.</strong><p>Vérifiez la connexion puis rechargez la page.</p><button class="button" onclick="location.reload()">Réessayer</button>';
    console.error("Chargement de la carte", error);
  }
}
export const dialog = $("sources-dialog");
for (const id of ["sources-open", "sources-inline"])
  $(id).addEventListener("click", () => dialog.showModal());
$("sources-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  }
});
start();

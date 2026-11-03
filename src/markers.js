import {
  colors,
  escapeHTML,
  officeScreeningColor,
  svg,
} from "./presentation.js";
import { state } from "./state.js";
import { markerColor, markerInk, officePinFill } from "./marker-colors.js";
const addressPinTip = [1, 39];
const addressPinPath = `M8 1H23C27.4 1 31 4.6 31 9V22C31 26.4 27.4 30 23 30H12L${addressPinTip[0]} ${addressPinTip[1]}V9C1 4.6 4.6 1 8 1Z`;
export function markerAppearance(p) {
  let color = colors[p.kind],
    ink = "#ffffff",
    variant = p.kind,
    icon = p.kind;
  if (p.kind === "school") {
    variant =
      p.category === "Lycée"
        ? "lycee"
        : p.category === "Collège"
          ? "college"
          : "primary";
    color =
      variant === "lycee"
        ? colors.lycee
        : variant === "college"
          ? colors.college
          : colors.school;
    if (variant === "primary") ink = "#173b61";
  } else if (p.kind === "nursery") ink = "#334155";
  else if (["health", "pharmacy"].includes(p.kind)) ink = "#06462c";
  else if (["bakery", "tea"].includes(p.kind)) ink = "#663508";
  else if (p.kind === "transport") {
    const lines = (p.lines || [])
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
    icon = /METRO/.test(lines)
      ? "metro"
      : /TRAM/.test(lines)
        ? "tram"
        : /TRAIN|RER/.test(lines)
          ? "train"
          : "transport";
  }
  return {
    color,
    ink,
    variant,
    icon,
  };
}
export function stationServices(p) {
  return p.services || [];
}
export function isSncfStation(p) {
  return (
    p.kind === "transport" &&
    (p.services || []).some((line) => ["C01740", "C01741"].includes(line.id))
  );
}
export function serviceBadges(services) {
  return services
    .map(
      (line) =>
        `<span class="service-badge" style="--line-color:${line.color}">${escapeHTML(line.label)}</span>`,
    )
    .join("");
}
export function featureIcon(f) {
  const p = f.properties;
  if (p.kind === "transport") {
    return L.divIcon({
      className: "map-pin transport station-icon",
      html: `<div class="pin-disc" style="--color:${colors.transport};color:#fff">${svg("transport")}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [100, 37],
    });
  }
  const a = markerAppearance(p);
  if (["office", "rentalOffice"].includes(p.kind)) {
    a.color = markerColor(f);
    a.ink = markerInk(a.color);
  }
  const addressPin = ["office", "rentalOffice"].includes(p.kind);
  const officeGradientId = `office-pin-gradient-${p.number}`;
  const officeGradient =
    p.kind === "office" && p.officeScreening?.highlighted
      ? `<defs><linearGradient id="${officeGradientId}"><stop offset="50%" stop-color="${officeScreeningColor}"/><stop offset="50%" stop-color="${colors.office}"/></linearGradient></defs>`
      : "";
  const markerBody = addressPin
    ? `<div class="pin-disc" style="--color:${a.color};color:${a.ink}"><svg class="address-pin-shape" viewBox="0 0 32 40" aria-hidden="true">${officeGradient}<path d="${addressPinPath}"${p.kind === "office" ? ` fill="${officePinFill(f)}"` : ""}/></svg><span class="address-pin-label">${p.kind === "office" ? p.number : p.listings.length}</span></div>`
    : `<div class="pin-disc" style="--color:${a.color};color:${a.ink}">${svg(a.icon)}</div>`;
  return L.divIcon({
    className: `map-pin ${p.kind} ${a.variant}${p.audit?.added ? " audit-added" : ""}${p.audit?.doubts?.length ? " audit-doubt" : ""}${state.selected === f.id ? " selected" : ""}`,
    html: `${markerBody}${p.audit?.doubts?.length ? '<span class="audit-question" aria-hidden="true">?</span>' : ""}`,
    iconSize: addressPin ? [32, 40] : [28, 28],
    iconAnchor: addressPin ? addressPinTip : [14, 14],
    popupAnchor: addressPin ? [15, -40] : [0, -15],
  });
}

export const $ = (id) => document.getElementById(id);
export const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
export const symbols = {
  plu: '<path d="M3 5 9 2l6 3 6-3v17l-6 3-6-3-6 3V5Z M9 2v17 M15 5v17"/>',
  transport:
    '<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 11h14M9 3v8M15 3v8M8 21l2-3m6 3-2-3"/><path d="M8 15h1m6 0h1"/>',
  road: '<path d="M7 2 3 22M17 2l4 20M12 3v4m0 4v3m0 4v3"/>',
  metro:
    '<path d="M2 21V11a10 10 0 0 1 20 0v10"/><rect x="7" y="7" width="10" height="11" rx="2"/><path d="M7 12h10M9 21l2-3m4 3-2-3M10 15h.01M14 15h.01"/>',
  tram: '<path d="M9 2h6l-3 3M12 5v2"/><rect x="5" y="7" width="14" height="12" rx="2"/><path d="M5 13h14M12 7v6M8 16h.01M16 16h.01M8 22l2-3m6 3-2-3"/>',
  train:
    '<path d="M6 3h12v12l-6 5-6-5V3ZM6 10h12M9 3v7M15 3v7M8 22l4-2 4 2"/><circle cx="12" cy="14" r="1.5"/>',
  school: '<path d="m2 9 10-5 10 5-10 5-10-5Zm4 3v6c4 3 8 3 12 0v-6M22 9v8"/>',
  nursery:
    '<circle cx="12" cy="13" r="8"/><path d="M12 5c-3-1-3-4-1-4M9 12h.01M15 12h.01M9 16c1.5 2 4.5 2 6 0"/>',
  health:
    '<path d="M5 2v2M11 2v2M5 3H4a1 1 0 0 0-1 1v4a5 5 0 0 0 10 0V4a1 1 0 0 0-1-1h-1M8 13v3a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="3"/>',
  pharmacy: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
  bakery:
    '<path d="M7 21 20 5a3 3 0 0 0-4-4L3 17a3 3 0 0 0 4 4ZM5 14l4 3m0-8 4 3m0-8 4 3"/>',
  office:
    '<path d="M5 21V3h14v18M3 21h18M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1M10 21v-3h4v3"/>',
  mixed:
    '<path d="M3 4h8v17H3zM13 8h8v13h-8zM1 21h22M6 8h2m-2 4h2m-2 4h2m10-4h2m-2 4h2"/>',
};
export const svg = (type) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${symbols[type] || symbols.health}</svg>`;
export const colors = {
  transport: "#707984",
  road: "#a5b0bb",
  nursery: "#ffffff",
  school: "#93d4ff",
  college: "#347fce",
  lycee: "#183f7a",
  health: "#00c86a",
  pharmacy: "#0fff7b",
  bakery: "#f6ad35",
  office: "#d72e83",
  rentalOffice: "#2376b7",
};
export const typeLabels = {
  transport: "Gare / station",
  nursery: "Crèche / multi-accueil",
  school: "Établissement scolaire",
  health: "Structure de soins",
  pharmacy: "Pharmacie",
  bakery: "Boulangerie / pâtisserie",
  office: "Adresse d’immeuble ciblé",
  rentalOffice: "Bureaux annoncés à la location",
};

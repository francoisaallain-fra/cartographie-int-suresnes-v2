import { colors } from "./presentation.js";
export const officeRetentionColors = {
  outline: "#ffff00",
  center: "#ffff00",
};
export const mosColors = {
  offices: "#2878c6",
  pavilion: "#edc448",
  collective: "#ed8652",
  activities: "#0055ff",
};
export const layerSpecs = [
  {
    id: "transport",
    label: "Transports structurants",
    sub: "6 gares · T2, L, U · 4 grands axes",
    icon: "transport",
    color: colors.transport,
  },
  {
    id: "offices",
    label: "Immeubles ciblés",
    sub: "5 adresses · vacance non vérifiée",
    icon: "office",
    color: colors.office,
  },
  {
    id: "rentalOffices",
    label: "Bureaux proposés à la location",
    sub: "27 annonces · 19 adresses géocodées · 03/11/2026",
    icon: "office",
    color: colors.rentalOffice,
  },
  {
    id: "pluOfficeRetention",
    label: "Maintien des surfaces de bureau · PLU",
    sub: "5 périmètres réglementaires · bureaux existants",
    icon: "plu",
    color: officeRetentionColors.center,
  },
  {
    id: "mosPavilion",
    label: "6 · Habitat pavillonnaire · Mos",
    sub: "134 emprises · catégorie 6",
    icon: "plu",
    color: mosColors.pavilion,
  },
  {
    id: "mosCollective",
    label: "7 · Habitat collectif · Mos",
    sub: "314 emprises · catégorie 7",
    icon: "plu",
    color: mosColors.collective,
  },
  {
    id: "mosActivities",
    label: "8 · Activités · Mos",
    sub: "64 emprises · catégorie 8, bureaux inclus",
    icon: "plu",
    color: mosColors.activities,
  },
  {
    id: "mixedBuildings",
    label: "Bâtiments mixtes potentiels",
    sub: "3 candidats · commerce + bureaux à confirmer",
    icon: "mixed",
    color: "#f18b3d",
  },
  {
    id: "mosOffices",
    label: "Bureaux · Mos 2025",
    sub: "25 emprises de bureaux · hors vacance",
    icon: "office",
    color: mosColors.offices,
  },
  {
    id: "plu",
    label: "Zonage PLU",
    sub: "55 secteurs · 21 libellés",
    icon: "plu",
    color: "#be9d22",
  },
  {
    id: "equipment",
    label: "Santé, crèches & établissements scolaires",
    sub: "18 structures de soins · 32 crèches · 30 établissements scolaires",
    icon: "health",
    color: colors.health,
  },
  {
    id: "neighborhood",
    label: "Aménités de quartier",
    sub: "23 épiceries / supérettes · 7 supermarchés · 2 marchés · boulangeries, thé et pharmacies",
    icon: "bakery",
    color: colors.bakery,
  },
];

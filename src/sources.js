import { $, escapeHTML } from "./presentation.js";
import { runtime } from "./state.js";
export function buildSources() {
  const lines = [
    [
      "Épiceries, supérettes et supermarchés",
      "food_osm",
      "30 commerces alimentaires dans Suresnes ; catégories et adresses selon OSM, compléments sourcés",
    ],
    [
      "Marchés alimentaires",
      "markets_suresnes",
      "Zola et Caron · lieux et jours confirmés par l’Office de tourisme, positions OSM",
    ],
    ["Fond photo", "ign", "Flux IGN testé · couverture de la ville"],
    [
      "Maintien des surfaces de bureau · PLU",
      "pluOfficeRetention",
      "5 prescriptions surfaciques officielles du PLU 2024",
    ],
    [
      "Bureaux Mos 2025",
      "mos",
      "25 emprises classées Bureaux (poste 45) dans Suresnes",
    ],
    [
      "Mixité potentielle",
      "bdnb",
      "3 groupes bâtis tertiaires avec un commerce BPE dans une emprise Mos Bureaux",
    ],
    [
      "Commerces du croisement",
      "bpe",
      "203 équipements commerciaux BPE 2025 examinés ; stations de recharge exclues",
    ],
    ["Zonage PLU", "plu", "55 polygones · 21 libellés"],
    [
      "Gares et stations",
      "transport",
      "6 gares : 3 dans Suresnes + Puteaux, Les Coteaux et Le Val d’Or",
    ],
    [
      "Lignes ferrées",
      "rail",
      "Tram T2 · Transilien L et U · couleurs officielles",
    ],
    [
      "Axes routiers",
      "roads",
      "4 axes : quais de Seine, Henri-Sellier / pont, Washington et Franklin-Roosevelt",
    ],
    [
      "Écoles",
      "education",
      "30 établissements : 23 écoles, 5 collèges, 2 lycées",
    ],
    [
      "Petite enfance",
      "childcare",
      "32 établissements : 20 multi-accueils et 12 micro-crèches",
    ],
    [
      "Santé",
      "health",
      "18 structures de soins (13 initiales + 5 ajoutées) ; 13 pharmacies conservées",
    ],
    [
      "Quartier",
      "crosscheck",
      "19 commerces / activités affichés après contrôle Google Maps du 02/11/2026 ; 5 points sans boutique recoupée retirés",
    ],
    [
      "Immeubles ciblés",
      "provided_addresses",
      "5 adresses communiquées et géocodées au numéro dans Suresnes",
    ],
    [
      "Bureaux proposés à la location",
      "rental_offices",
      "57 annonces relevées ; 27 annonces à 19 points BAN au numéro ; 29 sans adresse précise et 1 commerce exclus",
    ],
  ];
  lines.splice(
    3,
    0,
    [
      "6 · Habitat pavillonnaire · Mos",
      "mosGroups",
      "134 emprises, 1 enregistrement sans géométrie",
    ],
    ["7 · Habitat collectif · Mos", "mosGroups", "314 emprises"],
    ["8 · Activités · Mos", "mosGroups", "64 emprises, dont 25 de bureaux"],
  );
  $("sources-table").innerHTML =
    "<table><thead><tr><th>Couche</th><th>Source & accès</th><th>Test & millésime</th></tr></thead><tbody>" +
    lines
      .map(([label, id, result]) => {
        const s =
          id === "rental_offices"
            ? {
                name: "BureauxLocaux · recherche de bureaux à louer à Suresnes",
                url: "https://www.bureauxlocaux.com/recherche/?transaction_type=rental&realty_type=office&location=Suresnes&location_type=city&location_dept=D92&location_zip_code=92150&location_label=Suresnes&ne_lat=48.882764&ne_lng=2.236834&sw_lat=48.859288&sw_lng=2.199785&lat=48.8704428&lng=2.21815&is_fallback_result=false",
                format: "Annonces HTML publiques · relevé ponctuel",
                license:
                  "Source commerciale ; droit de réutilisation non vérifié",
                vintage: "Consultation du 03/11/2026",
                note: "Données déclaratives. Adresses numérotées rapprochées de la BAN/IGN ; aucune preuve de vacance physique ou de lots distincts. Voir le journal de qualité.",
              }
            : runtime.sources[id];
        return `<tr><td>${label}</td><td><a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.name)} ↗</a><small>${escapeHTML(s.format)} · ${escapeHTML(s.license)}</small></td><td>${escapeHTML(result)}<small>${escapeHTML(s.vintage)}</small><small>${escapeHTML(s.note)}</small></td></tr>`;
      })
      .join("") +
    "</tbody></table>";
}

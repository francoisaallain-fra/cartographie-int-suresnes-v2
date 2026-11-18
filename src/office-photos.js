import { localOfficePhotos } from "./photo-storage.js";
import { escapeHTML } from "./presentation.js";

// Exact BAN matches, checked against the listing address and the actual image.
// Remote images retain their publisher's watermark and link; no local copy.
export const officePhotos = {
  "92073_4121_00025": {
    src: "https://jll-global-gdim-res.cloudinary.com/image/upload/f_avif%2Cdpr_auto%2Cw_3840%2Cq_auto/t_main/a_ignore/v1685977728/Major/OFF_REF_PROD84484_DESCRO1.jpg",
    source:
      "https://immobilier.jll.fr/location-bureaux/bureaux-a-louer-suresnes-92150-678486",
    credit: "JLL · River Seine",
    checked: "2026-11-18",
  },
  "92073_4730_00079": {
    src: "https://images1.loopnet.com/i2/U7da6r-Ae_6-UdcwVHT49hbGRH-lL07cTjA05lqqb18/114/image.jpg",
    source:
      "https://www.bureauxlocaux.com/annonce/location-bureau-suresnes-92150--38689963",
    credit: "Cushman & Wakefield · BureauxLocaux",
    checked: "2026-11-18",
  },
  "92073_7160_00030": {
    src: "https://jll-global-gdim-res.cloudinary.com/image/upload/f_avif%2Cdpr_auto%2Cw_3840%2Cq_auto/t_main/a_ignore/v1643195319/Major/OFF_REF_PROD68999_DESCRO1.jpg",
    source:
      "https://immobilier.jll.fr/location-bureaux/bureaux-a-louer-suresnes-92150-645747",
    credit: "JLL · Le Pasteur",
    checked: "2026-11-18",
  },
};
export const photoUploadStates = new Map();
export function officePhoto(feature) {
  if (feature.properties.kind !== "office") return "";
  const id = feature.properties.ban_id;
  const local = localOfficePhotos.get(id);
  const photo = officePhotos[id];
  const src = local || photo?.src;
  const state = photoUploadStates.get(id) || {};
  const visual = src
    ? `<figure class="building-photo"><div class="building-photo-frame"><img class="building-facade" src="${escapeHTML(src)}" alt="Façade — ${escapeHTML(feature.properties.address)}" width="230" height="120" loading="lazy" decoding="async" referrerpolicy="no-referrer"><span class="building-photo-fallback" hidden>Photo momentanément indisponible.</span></div><figcaption>${local ? "Photo personnelle" : `<a href="${escapeHTML(photo.source)}" target="_blank" rel="noopener noreferrer">Photo : ${escapeHTML(photo.credit)} ↗</a>`}</figcaption></figure>`
    : '<p class="building-photo-unavailable">Photo de façade non disponible.</p>';
  return `${visual}<div class="photo-upload-controls"><label class="photo-upload-button">${local ? "Remplacer la photo" : "Importer une photo"}<input type="file" accept="image/jpeg,image/png,image/webp" data-photo-upload="${escapeHTML(id)}" ${state.busy ? "disabled" : ""}></label>${local ? `<button type="button" class="photo-remove" data-photo-remove="${escapeHTML(id)}" ${state.busy ? "disabled" : ""}>Retirer ma photo</button>` : ""}<small>JPG, PNG, WebP · 15 Mo max.<br>Recadrage centré automatique · dans ce navigateur</small><p class="photo-upload-status" role="status" aria-live="polite">${escapeHTML(state.message || "")}</p></div>`;
}
export function setupOfficePhotoFallback() {
  document.addEventListener(
    "error",
    (event) => {
      const img = event.target;
      if (!img.classList?.contains("building-facade")) return;
      img.hidden = true;
      const fallback = img.parentElement.querySelector(
        ".building-photo-fallback",
      );
      if (fallback) fallback.hidden = false;
    },
    true,
  );
}

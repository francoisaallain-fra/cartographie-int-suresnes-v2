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
export function officePhoto(feature) {
  if (feature.properties.kind !== "office") return "";
  const photo = officePhotos[feature.properties.ban_id];
  if (!photo)
    return '<p class="building-photo-unavailable">Photo de façade non disponible.</p>';
  return `<figure class="building-photo"><div class="building-photo-frame"><img class="building-facade" src="${escapeHTML(photo.src)}" alt="Façade — ${escapeHTML(feature.properties.address)}" width="230" height="120" loading="lazy" decoding="async" referrerpolicy="no-referrer"><span class="building-photo-fallback" hidden>Photo momentanément indisponible.</span></div><figcaption><a href="${escapeHTML(photo.source)}" target="_blank" rel="noopener noreferrer">Photo : ${escapeHTML(photo.credit)} ↗</a></figcaption></figure>`;
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

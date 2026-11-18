import { runtime } from "./state.js";
import { popup } from "./popups.js";
import { frameOfficePopup } from "./selection.js";
import { normalizeOfficePhoto } from "./photo-processing.js";
import {
  saveLocalOfficePhoto,
  removeLocalOfficePhoto,
} from "./photo-storage.js";
import { photoUploadStates } from "./office-photos.js";
function refresh(feature) {
  const marker = runtime.markers.get(feature.id);
  if (!marker) return;
  marker.setPopupContent(popup(feature));
  if (marker.isPopupOpen()) frameOfficePopup(marker);
}
async function changePhoto(id, file) {
  const feature = runtime.data.offices.features.find(
    (f) => f.properties.ban_id === id,
  );
  if (!feature || photoUploadStates.get(id)?.busy) return;
  photoUploadStates.set(id, {
    busy: true,
    message: file ? "Préparation de la photo…" : "Retrait de la photo…",
  });
  refresh(feature);
  try {
    if (file) await saveLocalOfficePhoto(id, await normalizeOfficePhoto(file));
    else await removeLocalOfficePhoto(id);
    photoUploadStates.set(id, {
      message: file
        ? "Photo enregistrée dans ce navigateur."
        : "Photo personnelle retirée.",
    });
  } catch (error) {
    photoUploadStates.set(id, { message: error.message });
  }
  refresh(feature);
}
export function setupPhotoUploads() {
  document.addEventListener("change", (event) => {
    const input = event.target;
    if (!input.matches?.("[data-photo-upload]")) return;
    const file = input.files?.[0];
    if (file) void changePhoto(input.dataset.photoUpload, file);
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-photo-remove]");
    if (button) void changePhoto(button.dataset.photoRemove, null);
  });
}

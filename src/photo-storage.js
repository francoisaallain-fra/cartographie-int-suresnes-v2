export const photoDatabase = "suresnes-v2-office-photos";
export const localOfficePhotos = new Map();
let databasePromise;
function database() {
  if (!databasePromise)
    databasePromise = new Promise((resolve, reject) => {
      let settled = false;
      const timer = window.setTimeout(() => fail(), 2500);
      const fail = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(
          new Error("Stockage des photos indisponible dans ce navigateur."),
        );
      };
      try {
        const request = window.indexedDB.open(photoDatabase, 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("photos", { keyPath: "id" });
        request.onerror = fail;
        request.onblocked = fail;
        request.onsuccess = () => {
          if (settled) {
            request.result.close();
            return;
          }
          settled = true;
          window.clearTimeout(timer);
          const db = request.result;
          db.onversionchange = () => {
            db.close();
            databasePromise = null;
          };
          resolve(db);
        };
      } catch {
        fail();
      }
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  return databasePromise;
}
async function transact(mode, operation) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const failure = () =>
      reject(
        new Error(
          "La photo n’a pas pu être enregistrée. Vérifiez l’espace disponible et les autorisations du navigateur.",
        ),
      );
    try {
      const transaction = db.transaction("photos", mode);
      const request = operation(transaction.objectStore("photos"));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = transaction.onerror = failure;
    } catch {
      failure();
    }
  });
}
export async function loadLocalOfficePhotos() {
  try {
    const records = await transact("readonly", (store) => store.getAll());
    for (const record of records) {
      if (
        typeof record.id === "string" &&
        /^92073_[a-zA-Z0-9_]+$/.test(record.id) &&
        record.blob instanceof window.Blob &&
        record.blob.type === "image/jpeg" &&
        record.blob.size <= 2 * 1024 * 1024
      ) {
        localOfficePhotos.set(record.id, URL.createObjectURL(record.blob));
      }
    }
  } catch {
    /* The map remains usable; an attempted upload reports the error. */
  }
}
export async function saveLocalOfficePhoto(id, blob) {
  await transact("readwrite", (store) => store.put({ id, blob }));
  const previous = localOfficePhotos.get(id);
  localOfficePhotos.set(id, URL.createObjectURL(blob));
  if (previous) URL.revokeObjectURL(previous);
}
export async function removeLocalOfficePhoto(id) {
  await transact("readwrite", (store) => store.delete(id));
  const previous = localOfficePhotos.get(id);
  localOfficePhotos.delete(id);
  if (previous) URL.revokeObjectURL(previous);
}

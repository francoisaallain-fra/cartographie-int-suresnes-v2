export const photoWidth = 920;
export const photoHeight = 480;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
/** Preserve proportions and crop equally on opposite sides of the fixed frame. */
export function photoCrop(width, height) {
  const ratio = photoWidth / photoHeight;
  const cropWidth = Math.min(width, height * ratio);
  const cropHeight = cropWidth / ratio;
  return [
    (width - cropWidth) / 2,
    (height - cropHeight) / 2,
    cropWidth,
    cropHeight,
  ];
}
export async function normalizeOfficePhoto(file) {
  if (!acceptedTypes.has(file.type))
    throw new Error("Choisissez une photo JPG, PNG ou WebP.");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("La photo doit peser moins de 15 Mo.");
  let bitmap;
  try {
    bitmap = await window.createImageBitmap(file, {
      imageOrientation: "from-image",
    });
  } catch {
    throw new Error(
      "Cette image est illisible. Essayez un autre fichier JPG, PNG ou WebP.",
    );
  }
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 40000000
    )
      throw new Error("La photo doit contenir au maximum 40 mégapixels.");
    const canvas = document.createElement("canvas");
    canvas.width = photoWidth;
    canvas.height = photoHeight;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, photoWidth, photoHeight);
    context.drawImage(
      bitmap,
      ...photoCrop(bitmap.width, bitmap.height),
      0,
      0,
      photoWidth,
      photoHeight,
    );
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("Impossible de préparer cette photo.")),
        "image/jpeg",
        0.88,
      ),
    );
  } finally {
    bitmap.close();
  }
}

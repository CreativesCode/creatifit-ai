// Reduce una foto en el propio teléfono antes de subirla. Una foto de cámara
// pesa 3-8 MB; redimensionada a 1280 px en JPEG queda en unos 150-300 KB, y la
// miniatura de la lista en menos de 10 KB.

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // Respeta la orientación EXIF (fotos verticales de cámara).
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* formato no soportado por createImageBitmap: probamos con <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image decode failed"));
      img.src = url;
    });
  } finally {
    // La imagen ya está decodificada en memoria; la URL no hace falta.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function draw(
  src: ImageBitmap | HTMLImageElement,
  maxSide: number,
  quality: number
): Promise<Blob | null> {
  const w = src.width;
  const h = src.height;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export interface CompressedPhoto {
  /** Imagen para ver en grande (JPEG, lado mayor <= 1280 px). */
  full: Blob;
  /** Miniatura para listas (JPEG, lado mayor <= 240 px). null si no se pudo. */
  thumb: Blob | null;
}

/** Devuelve null si el navegador no pudo decodificar la imagen. */
export async function compressPhoto(file: Blob): Promise<CompressedPhoto | null> {
  try {
    const src = await loadBitmap(file);
    try {
      const full = await draw(src, 1280, 0.8);
      if (!full) return null;
      const thumb = await draw(src, 240, 0.7);
      return { full, thumb };
    } finally {
      if ("close" in src) src.close();
    }
  } catch {
    return null;
  }
}

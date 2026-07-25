/** Downscale + re-encode an image client-side before uploading. */
export async function downscaleImage(file: File, maxSize = 512): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Kunde inte bearbeta bilden."))),
      "image/jpeg",
      0.85,
    );
  });
}

/** Pixel crop rectangle as reported by react-easy-crop's `onCropComplete`. */
export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // allow canvas export of same-origin/CORS-enabled remote images
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Draws the cropped region of `src` (the uncropped original) to an
 * off-screen canvas and exports it as a Blob, per react-easy-crop's
 * documented crop recipe. Used to turn the on-screen crop selection into a
 * real, uploadable image rather than a CSS-only effect.
 */
export async function cropImageToBlob(src: string, pixelCrop: PixelCrop, mimeType = "image/jpeg"): Promise<Blob> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("content-editor: canvas 2d context unavailable for crop export.");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("content-editor: crop canvas export failed."))),
      mimeType,
      0.92
    );
  });
}

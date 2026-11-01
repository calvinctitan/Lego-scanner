// The AI doesn't need a full 12-megapixel photo. Shrinking it first makes the upload quick and
// keeps it well under the server's size limit.
const MAX_SIDE = 1280;
const QUALITY = 0.7;

export type PreparedPhoto = {
  /** JPEG, base64 without the "data:" prefix: what the server expects. */
  base64: string;
  /** A small local address to show the photo on the page. */
  previewUrl: string;
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file isn’t a photo this browser can open. Try a JPEG or PNG.'));
    img.src = url;
  });
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose a photo.');
  const original = URL.createObjectURL(file);
  try {
    // Browsers turn phone photos the right way up when drawing them, so sideways photos come out straight.
    const img = await loadImage(original);
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser can’t prepare the photo. Try another browser.');
    ctx.fillStyle = '#fff'; // transparent PNGs get a white background instead of black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
    return { base64: dataUrl.replace(/^data:image\/jpeg;base64,/, ''), previewUrl: dataUrl };
  } finally {
    URL.revokeObjectURL(original);
  }
}

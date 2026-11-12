import type { AvatarCrop } from './avatarApi';

export const AVATAR_OUTPUT_SIZE = 1024;

/**
 * Render the crop (in rotated-source pixel space) to a square JPEG with filters baked in.
 * `rotation` is 0/90/180/270 applied around the image centre before cropping.
 */
export async function cropToBlob(
  img: HTMLImageElement,
  crop: AvatarCrop,
  filterCss: string,
  size = AVATAR_OUTPUT_SIZE,
  quality = 0.92,
): Promise<Blob> {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const rot = ((crop.rotation || 0) % 360 + 360) % 360;
  const swap = rot === 90 || rot === 270;
  const rw = swap ? h : w;
  const rh = swap ? w : h;
  const out = Math.min(size, Math.round(crop.width) || size);
  const k = out / crop.width;

  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out, out);
  ctx.imageSmoothingQuality = 'high';
  if (filterCss) ctx.filter = filterCss;
  ctx.translate(-crop.x * k, -crop.y * k);
  ctx.translate((rw / 2) * k, (rh / 2) * k);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(img, (-w / 2) * k, (-h / 2) * k, w * k, h * k);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not export image'))), 'image/jpeg', quality);
  });
}

// Browser-side glue between <canvas> and the pure functions of signature.ts.
import { hasTransparency, inkBounds, removeBackground, type Pixels } from './signature.ts'

const MAX_W = 640
const MAX_H = 320

/** Crops to the ink, scales down, and returns a transparent PNG data URL (null when there is no ink). */
function finish(p: Pixels): string | null {
  const b = inkBounds(p)
  if (!b || b.w < 8 || b.h < 8) return null
  const src = document.createElement('canvas')
  src.width = p.width
  src.height = p.height
  src.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(p.data), p.width, p.height), 0, 0)
  const scale = Math.min(1, MAX_W / b.w, MAX_H / b.h)
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(b.w * scale))
  out.height = Math.max(1, Math.round(b.h * scale))
  const ctx = out.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, b.x, b.y, b.w, b.h, 0, 0, out.width, out.height)
  return out.toDataURL('image/png')
}

export function canvasToSignature(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d')!
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return finish({ data: img.data, width: img.width, height: img.height })
}

/** Reads a picked image file (photo or scan of a signature) and removes its paper background. */
export async function fileToSignature(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bitmap.width * scale)
  c.height = Math.round(bitmap.height * scale)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bitmap, 0, 0, c.width, c.height)
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const px: Pixels = { data: img.data, width: img.width, height: img.height }
  return finish(hasTransparency(px) ? px : removeBackground(px))
}

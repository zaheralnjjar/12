// Signature image processing. Pure functions over RGBA pixels, so they are testable outside the browser.

export type Pixels = { data: Uint8ClampedArray; width: number; height: number }

const lum = (d: Uint8ClampedArray, i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]

/** True when the image already carries real transparency (e.g. a PNG exported from another tool). */
export function hasTransparency(p: Pixels): boolean {
  let clear = 0
  for (let i = 3; i < p.data.length; i += 4) if (p.data[i] < 128) clear++
  return clear > p.data.length / 4 / 10
}

/**
 * Turns a photo or scan of a signature on paper into ink on a transparent background.
 * The paper tone is estimated from the image itself, so grey or yellowish photos work too.
 */
export function removeBackground(p: Pixels): Pixels {
  const n = p.width * p.height
  const hist = new Uint32Array(256)
  for (let i = 0; i < n; i++) hist[Math.round(lum(p.data, i * 4))]++
  // paper = the 80th percentile of brightness (most of a signature image is paper)
  let acc = 0
  let paper = 255
  for (let v = 0; v < 256; v++) {
    acc += hist[v]
    if (acc >= n * 0.8) { paper = v; break }
  }
  paper = Math.max(paper, 40)

  // ink colour = average of the clearly dark pixels
  let r = 0, g = 0, b = 0, count = 0
  for (let i = 0; i < n; i++) {
    const o = i * 4
    if ((paper - lum(p.data, o)) / paper > 0.5) { r += p.data[o]; g += p.data[o + 1]; b += p.data[o + 2]; count++ }
  }
  const ink = count ? [r / count, g / count, b / count] : [20, 30, 90]

  const out = new Uint8ClampedArray(p.data.length)
  for (let i = 0; i < n; i++) {
    const o = i * 4
    const d = (paper - lum(p.data, o)) / paper // 0 = paper, 1 = black
    const t = Math.min(1, Math.max(0, (d - 0.18) / (0.45 - 0.18)))
    const alpha = t * t * (3 - 2 * t) * (p.data[o + 3] / 255)
    out[o] = ink[0]; out[o + 1] = ink[1]; out[o + 2] = ink[2]; out[o + 3] = Math.round(alpha * 255)
  }
  return { data: out, width: p.width, height: p.height }
}

/** Bounding box of the visible ink, or null when the image is empty. */
export function inkBounds(p: Pixels): { x: number; y: number; w: number; h: number } | null {
  let minX = p.width, minY = p.height, maxX = -1, maxY = -1
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      if (p.data[(y * p.width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// Background removal on a synthetic "photo": greyish paper with uneven lighting and a dark blue stroke.
import assert from 'node:assert/strict'
import { hasTransparency, inkBounds, removeBackground } from '../src/lib/signature.ts'

const w = 200, h = 100
const data = new Uint8ClampedArray(w * h * 4)
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4
    const paper = 170 + Math.round((x / w) * 40) + ((x * 7 + y * 13) % 9) // gradient + noise
    const ink = x >= 40 && x < 160 && Math.abs(y - (50 + Math.round(20 * Math.sin(x / 10)))) <= 1
    data[o] = ink ? 25 : paper; data[o + 1] = ink ? 35 : paper; data[o + 2] = ink ? 110 : paper - 6; data[o + 3] = 255
  }
}
const src = { data, width: w, height: h }
assert.equal(hasTransparency(src), false)
const out = removeBackground(src)
let paperLeft = 0, inkKept = 0, inkTotal = 0
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const a = out.data[(y * w + x) * 4 + 3]
    const ink = x >= 40 && x < 160 && Math.abs(y - (50 + Math.round(20 * Math.sin(x / 10)))) <= 1
    if (ink) { inkTotal++; if (a > 200) inkKept++ } else if (a > 0) paperLeft++
  }
}
assert.equal(paperLeft, 0, 'no paper pixel survives')
assert.equal(inkKept, inkTotal, 'all ink stays opaque')
const b = inkBounds(out)
assert.deepEqual([b.x, b.w], [40, 120])
assert.equal(hasTransparency(out), true)
assert.equal(inkBounds({ data: new Uint8ClampedArray(16), width: 2, height: 2 }), null)
console.log('signature test passed')

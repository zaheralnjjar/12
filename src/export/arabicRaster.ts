// Arabic text for PDFs. The standard PDF fonts cannot shape Arabic, so the browser draws it on a canvas
// with an embedded OFL font (Amiri, public/fonts) and the PDF receives the picture.
let loadedFont: Promise<FontFace> | undefined

async function ensureArabicFont(): Promise<void> {
  loadedFont ??= new FontFace('Amiri PDF', 'url(/fonts/Amiri-Regular.ttf)').load()
  const font = await loadedFont
  if (!document.fonts.has(font)) document.fonts.add(font)
}

export type ArabicOptions = {
  width?: number
  fontSize?: number
  lineHeight?: number
  /** How many lines at the top are centred (a title and its number); the first of them is drawn larger. */
  centeredLines?: number
  /** Centre every line (a signature caption). */
  center?: boolean
}

export async function renderArabicLines(lines: string[], options: ArabicOptions = {}): Promise<Uint8Array> {
  await ensureArabicFont()
  const width = options.width ?? 1240
  const fontSize = options.fontSize ?? 34
  const lineHeight = options.lineHeight ?? 54
  const centeredLines = options.centeredLines ?? 0
  const pad = 70
  const canvas = document.createElement('canvas')
  canvas.width = width
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No se pudo preparar el texto árabe')
  const maxWidth = width - pad * 2
  type Row = { text: string; size: number; height: number; center: boolean }
  const rows: Row[] = lines.flatMap((line, index) => {
    const title = index === 0 && centeredLines > 0
    const size = title ? Math.round(fontSize * 1.5) : fontSize
    const height = title ? Math.round(lineHeight * 1.6) : lineHeight
    const center = !!options.center || index < centeredLines
    context.font = `${size}px "Amiri PDF"`
    const out: Row[] = []
    let current = ''
    for (const word of line.split(/\s+/)) {
      const next = current ? `${current} ${word}` : word
      if (current && context.measureText(next).width > maxWidth) { out.push({ text: current, size, height, center }); current = word }
      else current = next
    }
    if (current) out.push({ text: current, size, height, center })
    // a little air after the centred heading block
    if (index === centeredLines - 1 && out.length) out[out.length - 1].height += Math.round(lineHeight * 0.6)
    return out
  })
  canvas.height = pad * 2 + rows.reduce((sum, row) => sum + row.height, 0)
  context.direction = 'rtl'
  context.textBaseline = 'middle'
  context.fillStyle = '#172321'
  let y = pad
  rows.forEach((row) => {
    context.font = `${row.size}px "Amiri PDF"`
    context.textAlign = row.center ? 'center' : 'right'
    context.fillText(row.text, row.center ? width / 2 : width - pad, y + row.height / 2)
    y += row.height
  })
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('No se pudo crear la imagen árabe')), 'image/png'))
  return new Uint8Array(await blob.arrayBuffer())
}

export async function renderArabicName(text: string): Promise<Uint8Array> {
  return renderArabicLines([text], { width: 1000, fontSize: 64, lineHeight: 90 })
}

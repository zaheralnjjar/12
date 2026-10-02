let loadedFont: Promise<FontFace> | undefined

async function ensureArabicFont(): Promise<void> {
  loadedFont ??= new FontFace('Amiri PDF', 'url(/fonts/Amiri-Regular.ttf)').load()
  const font = await loadedFont
  if (!document.fonts.has(font)) document.fonts.add(font)
}

export async function renderArabicLines(lines: string[], options: { width?: number; fontSize?: number; lineHeight?: number } = {}): Promise<Uint8Array> {
  await ensureArabicFont()
  const width = options.width ?? 1240
  const fontSize = options.fontSize ?? 34
  const lineHeight = options.lineHeight ?? 54
  const pad = 70
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = pad * 2 + lines.length * lineHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No se pudo preparar el texto árabe')
  context.font = `${fontSize}px "Amiri PDF"`
  const maxWidth = width - pad * 2
  const wrapped = lines.flatMap((line) => {
    const out: string[] = []
    let current = ''
    for (const word of line.split(/\s+/)) {
      const next = current ? `${current} ${word}` : word
      if (current && context.measureText(next).width > maxWidth) { out.push(current); current = word }
      else current = next
    }
    if (current) out.push(current)
    return out
  })
  canvas.height = pad * 2 + wrapped.length * lineHeight
  context.direction = 'rtl'
  context.textAlign = 'right'
  context.textBaseline = 'middle'
  context.fillStyle = '#172321'
  context.font = `${fontSize}px "Amiri PDF"`
  wrapped.forEach((line, index) => context.fillText(line, width - pad, pad + index * lineHeight + lineHeight / 2))
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('No se pudo crear la imagen árabe')), 'image/png'))
  return new Uint8Array(await blob.arrayBuffer())
}

export async function renderArabicName(text: string): Promise<Uint8Array> {
  return renderArabicLines([text], { width: 1000, fontSize: 64, lineHeight: 90 })
}

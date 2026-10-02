import type { PDFFont } from 'pdf-lib'

/** Replaces code points the selected PDF font cannot encode with a visible fallback. */
export function pdfText(text: string, font: PDFFont): string {
  const characters = new Set(font.getCharacterSet())
  return Array.from(text, (character) => {
    if (character === '\n') return '\n'
    if (character === '\t' || character === '\r') return ' '
    const codePoint = character.codePointAt(0)
    return codePoint !== undefined && characters.has(codePoint) ? character : '?'
  }).join('')
}

export function pdfTextHasUnsupported(text: string, font: PDFFont): boolean {
  const characters = new Set(font.getCharacterSet())
  return Array.from(text).some((character) => {
    if (character === '\n' || character === '\t' || character === '\r') return false
    const codePoint = character.codePointAt(0)
    return codePoint === undefined || !characters.has(codePoint)
  })
}

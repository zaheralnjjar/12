import type { PDFFont } from 'pdf-lib'

/** Replaces code points the selected PDF font cannot encode with a visible fallback. */
export function pdfText(text: string, font: PDFFont): string {
  const characters = new Set(font.getCharacterSet())
  return Array.from(text, (character) => {
    const codePoint = character.codePointAt(0)
    return codePoint !== undefined && characters.has(codePoint) ? character : '?'
  }).join('')
}

export function pdfTextHasUnsupported(text: string, font: PDFFont): boolean {
  const characters = new Set(font.getCharacterSet())
  return Array.from(text).some((character) => {
    const codePoint = character.codePointAt(0)
    return codePoint === undefined || !characters.has(codePoint)
  })
}

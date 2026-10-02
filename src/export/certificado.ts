// The certificate of embracing Islam as a PDF, drawn in the browser from the data the server froze when it was issued.
import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from 'pdf-lib'
import { pdfText, pdfTextHasUnsupported } from './pdfText.ts'
import { conSheij, fechaLarga } from '../lib/labels.ts'
import type { CertificadoCompleto } from '../types.ts'

const GREEN = rgb(0.06, 0.36, 0.29)
const GOLD = rgb(0.78, 0.59, 0.24)
const INK = rgb(0.11, 0.16, 0.15)

/** The text lines of the certificate (kept separate from the drawing so it can be tested). */
export function certificadoTexto(c: CertificadoCompleto, font?: PDFFont): { titulo: string; parrafos: string[]; shahada: string[]; cierre: string; firma: string } {
  const d = c.datos
  const doc = d.numeroDocumento ? `, ${d.tipoDocumento || 'documento'} N.º ${d.numeroDocumento}` : ''
  const nac = d.nacionalidad ? `, de nacionalidad ${d.nacionalidad}` : ''
  const lugar = d.lugarShahada ? `, en ${d.lugarShahada}` : ''
  const parrafos = [
    `Se certifica que ${d.nombre}${nac}${doc}, declaró libre y voluntariamente su ingreso al Islam el día ${fechaLarga(d.fechaShahada)}${lugar}, pronunciando el testimonio de fe (Shahada):`,
  ]
  const shahada = [
    '«Ash-hadu an la ilaha illa Allah, wa ash-hadu anna Muhammadan rasulu Allah»',
    '(Atestiguo que no hay más divinidad que Allah, y atestiguo que Muhammad es el Mensajero de Allah)',
  ]
  const extra = d.nombreIslamico && (!font || !pdfTextHasUnsupported(d.nombreIslamico, font)) ? `Nombre islámico elegido: ${d.nombreIslamico}.` : ''
  const cierre = [extra, `Se expide el presente certificado${d.lugarEmision ? ` en ${d.lugarEmision}` : ''}, el ${fechaLarga(d.fechaEmision)}.`].filter(Boolean).join(' ')
  const firma = c.emisor === 'maestro' ? conSheij(d.emisorTexto) : d.emisorTexto
  return { titulo: 'CERTIFICADO DE CONVERSIÓN AL ISLAM', parrafos, shahada, cierre, firma }
}

export function certificadoArTexto(c: CertificadoCompleto): string[] {
  const d = c.datos
  const feminine = d.sexo === 'F'
  const dateAr = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
    const months = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    return match && months[Number(match[2])] ? `${Number(match[3])} ${months[Number(match[2])]} ${match[1]}` : fechaLarga(value)
  }
  const doc = d.numeroDocumento ? `، حامل${feminine ? 'ة' : ''} الوثيقة ${d.tipoDocumento || 'الهوية'} رقم ${d.numeroDocumento}` : ''
  const nationality = d.nacionalidad ? `، ${d.nacionalidad}` : ''
  const place = d.lugarShahada ? `، في ${d.lugarShahada}` : ''
  const titled = /^(sheij|sheikh|sheik|shaij|jeque|الشيخ)\s/i.test((d.emisorTexto || '').trim())
  const issuer = c.emisor === 'maestro' && d.emisorTexto && !titled ? `الشيخ ${d.emisorTexto}` : d.emisorTexto
  const lines = [
    'شهادة إشهار إسلام',
    `رقم: ${c.numero}`,
    `نشهد بأن ${feminine ? 'السيدة' : 'السيد'}: ${d.nombre}${nationality}${doc}، قد ${feminine ? 'أعلنت إسلامها' : 'أعلن إسلامه'} طوعًا واختيارًا بتاريخ ${dateAr(d.fechaShahada)}${place}،`,
    `${feminine ? 'ونطقت' : 'ونطق'} بالشهادتين: «أشهد أن لا إله إلا الله، وأشهد أن محمدًا رسول الله».`,
  ]
  if (d.nombreIslamico) lines.push(`الاسم الإسلامي المختار: ${d.nombreIslamico}.`)
  lines.push(`وقد ${feminine ? 'أُعطيت هذه الشهادة بناءً على طلبها' : 'أُعطي هذه الشهادة بناءً على طلبه'}${d.lugarEmision ? `، في ${d.lugarEmision}` : ''}، بتاريخ ${dateAr(d.fechaEmision)}.`)
  if (issuer) lines.push(issuer)
  return lines
}

/** Splits text into lines that fit `width` at `size`. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = pdfText(text, font).split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? line + ' ' + w : w
    if (font.widthOfTextAtSize(next, size) <= width) line = next
    else {
      if (line) lines.push(line)
      line = w
    }
  }
  if (line) lines.push(line)
  return lines
}

function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = INK) {
  const safeText = pdfText(text, font)
  const w = font.widthOfTextAtSize(safeText, size)
  page.drawText(safeText, { x: (page.getWidth() - w) / 2, y, size, font, color })
}

async function drawVerificationQr(pdf: PDFDocument, page: PDFPage, verificationUrl: string, labelFont: PDFFont) {
  const QRCode = await import('qrcode')
  const dataUrl = await QRCode.toDataURL(verificationUrl, { errorCorrectionLevel: 'Q', margin: 1, width: 256 })
  const data = Uint8Array.from(atob(dataUrl.split(',')[1]), (char) => char.charCodeAt(0))
  const image = await pdf.embedPng(data)
  const size = 66
  const x = page.getWidth() - size - 30
  const y = 82
  page.drawImage(image, { x, y, width: size, height: size })
  page.drawText('Verificar', { x: x + 8, y: y - 10, size: 6, font: labelFont, color: GREEN })
}

type ArabicRenderer = (lines: string[], options?: { centeredLines?: number; center?: boolean; width?: number; fontSize?: number; lineHeight?: number }) => Promise<Uint8Array>

export async function certificadoPdf(c: CertificadoCompleto, renderArabic?: ArabicRenderer): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Certificado ${c.numero}`)
  pdf.setLanguage('es')
  const page = pdf.addPage([595.28, 841.89]) // A4
  const W = page.getWidth()
  const H = page.getHeight()
  const serif = await pdf.embedFont(StandardFonts.TimesRoman)
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic)
  const sans = await pdf.embedFont(StandardFonts.Helvetica)
  const t = certificadoTexto(c, serif)

  page.drawRectangle({ x: 28, y: 28, width: W - 56, height: H - 56, borderColor: GREEN, borderWidth: 3 })
  page.drawRectangle({ x: 36, y: 36, width: W - 72, height: H - 72, borderColor: GOLD, borderWidth: 1 })

  let y = H - 100
  if (c.orgName) { centered(page, c.orgName, y, sans, 12, GREEN); y -= 46 }
  centered(page, t.titulo, y, serifBold, 22, GREEN)
  y -= 26
  centered(page, `N.º ${c.numero}`, y, sans, 11)
  y -= 50

  const margin = 78
  const width = W - margin * 2
  for (const p of t.parrafos) {
    for (const line of wrap(p, serif, 14, width)) { page.drawText(pdfText(line, serif), { x: margin, y, size: 14, font: serif, color: INK }); y -= 21 }
    y -= 10
  }
  centered(page, t.shahada[0], y, serifBold, 13, GREEN)
  y -= 20
  for (const line of wrap(t.shahada[1], serifItalic, 12, width)) { centered(page, line, y, serifItalic, 12); y -= 17 }
  y -= 18
  for (const line of wrap(t.cierre, serif, 14, width)) { page.drawText(pdfText(line, serif), { x: margin, y, size: 14, font: serif, color: INK }); y -= 21 }

  // signature block
  const sigY = 200
  if (c.firma) {
    try {
      const png = await pdf.embedPng(c.firma)
      const scale = Math.min(180 / png.width, 70 / png.height, 1)
      page.drawImage(png, { x: (W - png.width * scale) / 2, y: sigY + 8, width: png.width * scale, height: png.height * scale })
    } catch { /* a damaged signature file leaves the line blank to sign by hand */ }
  }
  page.drawLine({ start: { x: W / 2 - 110, y: sigY }, end: { x: W / 2 + 110, y: sigY }, thickness: 0.8, color: INK })
  centered(page, t.firma, sigY - 18, serif, 13)

  centered(page, `Registro ${c.datos.conversoId} · Certificado ${c.numero} · Emitido el ${fechaLarga(c.fecha)}`, 60, sans, 8, rgb(0.4, 0.45, 0.43))

  if (c.estado === 'anulado') {
    page.drawText(pdfText('ANULADO', serifBold), { x: 120, y: 330, size: 96, font: serifBold, color: rgb(0.7, 0.1, 0.1), opacity: 0.35, rotate: degrees(35) })
  }
  if (c.verificationUrl) await drawVerificationQr(pdf, page, c.verificationUrl, sans)
  if (c.idioma === 'es_ar') {
    const drawArabic = renderArabic || (await import('./arabicRaster.ts')).renderArabicLines
    const arabicPage = pdf.addPage([595.28, 841.89])
    arabicPage.drawRectangle({ x: 28, y: 28, width: W - 56, height: H - 56, borderColor: GREEN, borderWidth: 3 })
    arabicPage.drawRectangle({ x: 36, y: 36, width: W - 72, height: H - 72, borderColor: GOLD, borderWidth: 1 })
    // the same layout as the Spanish page: heading and text from the top, signature line at the same height
    const lines = certificadoArTexto(c)
    const issuer = lines[lines.length - 1]
    const body = c.datos.emisorTexto ? lines.slice(0, -1) : lines
    const png = await pdf.embedPng(await drawArabic(body, { centeredLines: 2 }))
    const scale = Math.min((W - 115) / png.width, (H - 100 - (sigY + 90)) / png.height)
    const top = H - 70
    arabicPage.drawImage(png, { x: (W - png.width * scale) / 2, y: top - png.height * scale, width: png.width * scale, height: png.height * scale })
    if (c.firma) {
      try {
        const sig = await pdf.embedPng(c.firma)
        const sScale = Math.min(180 / sig.width, 70 / sig.height, 1)
        arabicPage.drawImage(sig, { x: (W - sig.width * sScale) / 2, y: sigY + 8, width: sig.width * sScale, height: sig.height * sScale })
      } catch { /* left blank to sign by hand */ }
    }
    arabicPage.drawLine({ start: { x: W / 2 - 110, y: sigY }, end: { x: W / 2 + 110, y: sigY }, thickness: 0.8, color: INK })
    if (c.datos.emisorTexto) {
      const cap = await pdf.embedPng(await drawArabic([issuer], { center: true, width: 900, fontSize: 40, lineHeight: 60 }))
      // the canvas keeps a transparent margin of 70px around the text: shift it so the text sits right under the line
      const cScale = 300 / cap.width
      arabicPage.drawImage(cap, { x: (W - cap.width * cScale) / 2, y: sigY - 6 - (cap.height - 70) * cScale, width: cap.width * cScale, height: cap.height * cScale })
    }
    if (c.estado === 'anulado') {
      arabicPage.drawText('ANULADO', { x: 180, y: 350, size: 62, font: serifBold, color: rgb(0.7, 0.1, 0.1), opacity: 0.35, rotate: degrees(35) })
    }
    if (c.verificationUrl) await drawVerificationQr(pdf, arabicPage, c.verificationUrl, sans)
  }
  return pdf.save()
}

export async function downloadCertificado(c: CertificadoCompleto) {
  const bytes = await certificadoPdf(c)
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `certificado-${c.numero}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

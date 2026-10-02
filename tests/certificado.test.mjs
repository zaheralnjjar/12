// The certificate text and PDF, built from fictional frozen data.
import assert from 'node:assert/strict'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { certificadoArTexto, certificadoPdf, certificadoTexto } from '../src/export/certificado.ts'

const PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'))

const base = {
  id: 'c1', numero: 'C-2026-0001', conversoId: 'NM-2025-0001', maestroId: 'm1', maestroNombre: 'Ahmad', emisor: 'maestro', idioma: 'es',
  fecha: '2026-10-02', estado: 'valido', anuladoMotivo: '', emitidoPor: 'x@example.com', createdAt: '', firma: null, orgName: 'Centro Islámico',
  datos: { nombre: 'Juan Pérez', nombreIslamico: 'Abdullah', sexo: 'M', nacionalidad: 'Argentina', tipoDocumento: 'DNI', numeroDocumento: '30111222',
    fechaShahada: '2025-05-02', lugarShahada: 'la mezquita', maestroNombre: 'Ahmad', emisorTexto: 'Ahmad', lugarEmision: 'Buenos Aires', fechaEmision: '2026-10-02', conversoId: 'NM-2025-0001' },
}
const t = certificadoTexto(base)
assert.match(t.parrafos[0], /^Se certifica que Juan Pérez, de nacionalidad Argentina, DNI N\.º 30111222, declaró libre y voluntariamente su ingreso al Islam el día 2 de mayo de 2025, en la mezquita/)
assert.equal(t.firma, 'Sheij Ahmad')
assert.equal(certificadoTexto({ ...base, datos: { ...base.datos, emisorTexto: 'Sheij Omar' } }).firma, 'Sheij Omar', 'no double title')
assert.match(t.cierre, /Nombre islámico elegido: Abdullah\. Se expide el presente certificado en Buenos Aires, el 2 de octubre de 2026\./)
const centro = certificadoTexto({ ...base, emisor: 'centro', datos: { ...base.datos, emisorTexto: 'Centro Islámico', numeroDocumento: '', nombreIslamico: '', lugarShahada: '', lugarEmision: '' } })
assert.equal(centro.firma, 'Centro Islámico')
assert.match(centro.parrafos[0], /Argentina, declaró .* 2025, pronunciando/)
assert.equal(centro.cierre, 'Se expide el presente certificado, el 2 de octubre de 2026.')
// the PDF is produced with the standard fonts (every character used must be encodable)
const bytes = await certificadoPdf(base)
assert.equal(String.fromCharCode(...bytes.slice(0, 5)), '%PDF-')
const withQr = await certificadoPdf({ ...base, verificationUrl: 'https://app.example.test/?verify=' + 'a'.repeat(64) })
assert.ok(withQr.length > bytes.length, 'certificate PDF embeds the verification QR image')
const annulled = await certificadoPdf({ ...base, estado: 'anulado' })
assert.ok(annulled.length > 1000)
assert.equal((await PDFDocument.load(annulled)).getPageCount(), 1, 'Spanish certificate remains a single page')
const maleBilingual = { ...base, idioma: 'es_ar', datos: { ...base.datos, nombreIslamico: 'عبد الله' } }
const maleArabic = certificadoArTexto(maleBilingual).join(' ')
assert.match(maleArabic, /السيد/)
assert.match(maleArabic, /أعلن إسلامه/)
assert.match(maleArabic, /ونطق بالشهادتين/)
assert.match(maleArabic, /عبد الله/)
const maleBilingualPdf = await certificadoPdf({ ...maleBilingual, verificationUrl: 'https://app.example.test/?verify=' + 'b'.repeat(64) }, async () => PNG)
assert.equal((await PDFDocument.load(maleBilingualPdf)).getPageCount(), 2, 'bilingual certificate has Spanish and Arabic pages')
const femaleBilingual = { ...base, idioma: 'es_ar', datos: { ...base.datos, sexo: 'F' } }
const femaleArabic = certificadoArTexto(femaleBilingual).join(' ')
assert.match(femaleArabic, /السيدة/)
assert.match(femaleArabic, /أعلنت إسلامها/)
assert.match(femaleArabic, /ونطقت بالشهادتين/)
const annulledBilingual = await certificadoPdf({ ...maleBilingual, estado: 'anulado' }, async () => PNG)
assert.equal((await PDFDocument.load(annulledBilingual)).getPageCount(), 2, 'annulled bilingual certificate marks both pages')
const unicode = { ...base, datos: { ...base.datos, nombreIslamico: 'عبد الله', lugarShahada: 'Mezquita 👍 العربية' } }
const unicodePdf = await certificadoPdf(unicode)
assert.equal(String.fromCharCode(...unicodePdf.slice(0, 5)), '%PDF-', 'unsupported Unicode is replaced safely in the PDF')
const unicodeDoc = await PDFDocument.create()
const standardFont = await unicodeDoc.embedFont(StandardFonts.TimesRoman)
assert.doesNotMatch(certificadoTexto(unicode, standardFont).cierre, /Nombre islámico elegido/, 'unsupported Islamic name is omitted from the Spanish certificate')
console.log('certificado: 26 checks passed')

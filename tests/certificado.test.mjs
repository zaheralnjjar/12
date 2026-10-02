// The certificate text and PDF, built from fictional frozen data.
import assert from 'node:assert/strict'
import { certificadoPdf, certificadoTexto } from '../src/export/certificado.ts'

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
const annulled = await certificadoPdf({ ...base, estado: 'anulado' })
assert.ok(annulled.length > 1000)
console.log('certificado: 10 checks passed')

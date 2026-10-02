import assert from 'node:assert/strict'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { fichaPdf, fichaTexto } from '../src/export/ficha.ts'
import { pdfText } from '../src/export/pdfText.ts'

const textDoc = await PDFDocument.create()
const font = await textDoc.embedFont(StandardFonts.Helvetica)
assert.equal(pdfText('a\nb\tc', font), 'a\nb c')

const detalle = {
  converso: {
    id: 'NM-2026-0001', nombre: 'Juan Pérez', nombreIslamico: 'عبد الله', estado: 'activo', maestroNombre: 'Sheij Ahmad',
    sexo: 'M', nacionalidad: 'Argentina', numeroDocumento: '30111222', resumenVida: 'Línea uno\nLínea dos', extra: { f1: 'Respuesta ficticia 👍 العربية' },
  },
  seguimiento: [{ fecha: '2026-09-01', tipo: 'llamada', resumen: 'Seguimiento ficticio 👍 العربية', proximaAccion: 'Llamar', proximaFecha: '2026-09-08' }],
  progreso: [{ nombre: 'Aprendió a rezar', fecha: '2026-09-02' }],
  documentos: [{ tipo: 'dni_frente', fileName: 'dni-ficticio.png', uploadedAt: '2026-09-01' }],
  certificados: [{ numero: 'C-2026-0001', fecha: '2026-09-03', estado: 'anulado', anuladoMotivo: 'Dato incorrecto' }],
}
const campos = [
  { key: 'nombreIslamico', etiqueta: 'Nombre islámico', tipo: 'text', seccion: 'personal', active: true },
  { key: 'sexo', etiqueta: 'Sexo', tipo: 'sexo', seccion: 'personal', active: true },
  { key: 'nacionalidad', etiqueta: 'Nacionalidad', tipo: 'text', seccion: 'personal', active: true },
  { key: 'numeroDocumento', etiqueta: 'Número de documento', tipo: 'text', seccion: 'documento', active: true },
  { key: 'resumenVida', etiqueta: 'Resumen de vida', tipo: 'textarea', seccion: 'vida', active: true },
  { key: 'respuesta', etiqueta: 'Pregunta ficticia', tipo: 'text', seccion: 'otros', custom: true, active: true },
]
const t = fichaTexto(detalle, campos)
assert.ok(t.secciones.find((s) => s.titulo === 'Datos personales').filas.some((r) => r.valor === 'Masculino'))
assert.ok(t.seguimiento.some((row) => row.includes('Seguimiento ficticio')))
assert.ok(t.progreso.some((row) => row.includes('Aprendió a rezar')))
assert.deepEqual(t.documentos, ['DNI (frente) · 01/09/2026'], 'documents use a readable type and upload date')
assert.equal(t.sheij, 'Sheij Ahmad', 'maestro honorific is not repeated')
assert.ok(t.certificados.some((row) => row.includes('C-2026-0001')))
assert.ok(!JSON.stringify(t).includes('dataUrl'))
assert.ok(t.secciones.some((s) => s.filas.some((f) => f.etiqueta === 'Nombre islámico' && f.valor === 'عبد الله')))
const renderedNames = []
const renderArabicName = async (name) => { renderedNames.push(name); return Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')) }
const pdf = await fichaPdf(detalle, campos, renderArabicName)
assert.equal(String.fromCharCode(...pdf.slice(0, 5)), '%PDF-')
assert.ok(renderedNames.includes('عبد الله'), 'Islamic name is sent to Arabic raster rendering instead of the standard PDF font')
const longDetalle = { ...detalle, seguimiento: Array.from({ length: 8 }, (_, i) => ({
  fecha: '2026-09-01', tipo: 'llamada', resumen: `Nota larga ${i}: ${'contenido ficticio '.repeat(350)}`, proximaAccion: '', proximaFecha: '',
})) }
const longPdf = await fichaPdf(longDetalle, campos, renderArabicName)
assert.ok((await PDFDocument.load(longPdf)).getPageCount() > 1, 'long ficha text continues onto additional pages')
console.log('ficha: 10 checks passed')

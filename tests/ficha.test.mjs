import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'
import { fichaPdf, fichaTexto } from '../src/export/ficha.ts'

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
const pdf = await fichaPdf(detalle, campos)
assert.equal(String.fromCharCode(...pdf.slice(0, 5)), '%PDF-')
const longDetalle = { ...detalle, seguimiento: Array.from({ length: 8 }, (_, i) => ({
  fecha: '2026-09-01', tipo: 'llamada', resumen: `Nota larga ${i}: ${'contenido ficticio '.repeat(350)}`, proximaAccion: '', proximaFecha: '',
})) }
const longPdf = await fichaPdf(longDetalle, campos)
assert.ok((await PDFDocument.load(longPdf)).getPageCount() > 1, 'long ficha text continues onto additional pages')
console.log('ficha: 9 checks passed')

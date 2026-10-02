// A person's case file PDF. It contains text metadata only; attached documents are never embedded.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { pdfText } from './pdfText.ts'
import { conSheij, DIA_LABEL, DOC_LABEL, ESTADO_LABEL, fecha, SECCION_LABEL, SEGUIMIENTO_LABEL, SEXO_LABEL } from '../lib/labels.ts'
import type { Campo, ConversoDetalle, ExtraValue } from '../types.ts'

type Fila = { etiqueta: string; valor: string }
type Seccion = { titulo: string; filas: Fila[] }
export type FichaTexto = {
  nombre: string
  id: string
  estado: string
  sheij: string
  secciones: Seccion[]
  seguimiento: string[]
  progreso: string[]
  documentos: string[]
  certificados: string[]
}

function campoValor(campo: Campo, detalle: ConversoDetalle): string {
  const c = detalle.converso
  const raw: ExtraValue | undefined = campo.custom ? c.extra[campo.key] : c[campo.key]
  if (raw === undefined || raw === null || raw === '') return ''
  if (Array.isArray(raw)) return raw.map((v) => DIA_LABEL[v] || v).join(', ')
  switch (campo.tipo) {
    case 'sexo': return SEXO_LABEL[raw] || raw
    case 'date': return fecha(raw)
    case 'yesno': return raw === '1' ? 'Sí' : 'No'
    case 'dias': return raw.split(',').map((v) => DIA_LABEL[v] || v).join(', ')
    case 'maestro': return c.maestroNombre || ''
    default: return raw
  }
}

export function fichaTexto(detalle: ConversoDetalle, campos: Campo[]): FichaTexto {
  const c = detalle.converso
  const active = campos.filter((f) => f.active && f.key !== 'maestroId')
  const secciones = Object.keys(SECCION_LABEL).flatMap((key) => {
    const filas = active.filter((f) => (f.seccion || 'otros') === key)
      .map((f) => ({ etiqueta: f.etiqueta, valor: campoValor(f, detalle) }))
      .filter((f) => f.valor)
    return filas.length ? [{ titulo: SECCION_LABEL[key], filas }] : []
  })
  return {
    nombre: c.nombre,
    id: c.id,
    estado: ESTADO_LABEL[c.estado] || c.estado,
    sheij: conSheij(c.maestroNombre) || 'Sin sheij asignado',
    secciones,
    seguimiento: detalle.seguimiento.map((s) => [fecha(s.fecha), SEGUIMIENTO_LABEL[s.tipo] || s.tipo, s.resumen,
      s.proximaAccion ? `Próximo paso: ${s.proximaAccion}${s.proximaFecha ? ` (${fecha(s.proximaFecha)})` : ''}` : ''].filter(Boolean).join(' · ')),
    progreso: detalle.progreso.map((p) => `${p.nombre || p.etapaId}${p.fecha ? ` · ${fecha(p.fecha)}` : ''}`),
    documentos: detalle.documentos.map((d) => `${DOC_LABEL[d.tipo] || d.tipo}${d.uploadedAt ? ` · ${fecha(d.uploadedAt)}` : ''}`),
    certificados: detalle.certificados.map((x) => `${x.numero} · ${fecha(x.fecha)} · ${x.estado === 'anulado' ? 'Anulado' : 'Válido'}${x.anuladoMotivo ? ` · Motivo: ${x.anuladoMotivo}` : ''}`),
  }
}

const INK = rgb(0.13, 0.17, 0.16)
const GREEN = rgb(0.06, 0.36, 0.29)
const MUTED = rgb(0.38, 0.42, 0.41)
const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 52

function wrapped(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (!text) return []
  const out: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      out.push(line)
      line = word
    } else line = candidate
  }
  if (line) out.push(line)
  return out
}

export async function fichaPdf(detalle: ConversoDetalle, campos: Campo[]): Promise<Uint8Array> {
  const text = fichaTexto(detalle, campos)
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Ficha · ${text.nombre} · ${text.id}`)
  pdf.setLanguage('es-AR')
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  let page: PDFPage
  let y = 0
  const newPage = () => { page = pdf.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN }
  const ensure = (height: number) => { if (y - height < MARGIN) newPage() }
  const paragraph = (value: string, font: PDFFont = regular, size = 10, indent = 0, color = INK) => {
    const safeValue = pdfText(value, font)
    const lines = safeValue.replace(/\r\n?/g, '\n').split('\n')
      .flatMap((part) => part ? wrapped(part, font, size, PAGE_W - MARGIN * 2 - indent) : [''])
    for (const line of lines) {
      ensure(size + 4)
      y -= size + 4
      if (line) page.drawText(line, { x: MARGIN + indent, y, size, font, color })
    }
  }
  const heading = (value: string) => {
    ensure(28)
    y -= 5
    paragraph(value, bold, 12, 0, GREEN)
    y -= 3
  }

  newPage()
  paragraph('FICHA DE SEGUIMIENTO', bold, 9, 0, MUTED)
  y -= 3
  paragraph(text.nombre, bold, 20, 0, GREEN)
  paragraph(`${text.id} · ${text.estado} · Sheij / maestro: ${text.sheij}`, regular, 10, 0, MUTED)
  for (const seccion of text.secciones) {
    heading(seccion.titulo)
    for (const fila of seccion.filas) paragraph(`${fila.etiqueta}: ${fila.valor}`, regular, 10, 8)
  }
  const blocks: [string, string[]][] = [
    ['Seguimiento', text.seguimiento],
    ['Etapas de aprendizaje', text.progreso],
    ['Documentos', text.documentos],
    ['Certificados', text.certificados],
  ]
  for (const [title, rows] of blocks) {
    heading(title)
    if (rows.length) rows.forEach((row) => paragraph(`• ${row}`, regular, 10, 8))
    else paragraph('Sin registros.', regular, 9, 8, MUTED)
  }
  return pdf.save()
}

export async function downloadFicha(detalle: ConversoDetalle, campos: Campo[]) {
  const bytes = await fichaPdf(detalle, campos)
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `ficha-${detalle.converso.id}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

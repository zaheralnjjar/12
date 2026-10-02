// Local stand-in for the deployed Apps Script web app: runs the real server code over in-memory data
// seeded with FICTIONAL people. Nothing here touches Google.
// Run: npm run dev:server   (then `npm run dev` in another terminal)
import http from 'node:http'
import { loadServer } from './mock-gas.mjs'

const SUP = 'supervisor.demo@example.com'
const M1 = 'maestro.uno@example.com'
const M2 = 'maestro.dos@example.com'
const COL = 'colaborador.demo@example.com'
const s = loadServer({ ownerEmail: SUP })
s.ctx.setup()
const post = (email, action, payload) => {
  const r = s.call(email, action, payload)
  if (!r.ok) throw new Error(action + ': ' + r.error.message)
  return r.data
}
const port = Number(process.env.PORT || 8787)
post(SUP, 'settings.save', { orgName: 'Centro Islámico (demo)', appUrl: process.env.APP_URL || 'http://localhost:5173', lugarEmision: 'Buenos Aires' })
const m1 = post(SUP, 'maestros.save', { nombre: 'Sheij Ahmad (demo)', email: M1, alias: 'Ahmad, Ahmed' })
const m2 = post(SUP, 'maestros.save', { nombre: 'Sheij Omar (demo)', email: M2 })
post(SUP, 'usuarios.save', { email: COL, role: 'colaborador' })
post(SUP, 'campos.save', { etiqueta: 'Idioma preferido para aprender', etiquetaAr: 'لغة التعلم', tipo: 'choice', opciones: ['Español', 'Portugués', 'Inglés'], seccion: 'personal', enEnlace: true, ayuda: 'En qué idioma prefiere recibir las clases.' })
post(SUP, 'campos.save', { etiqueta: 'Se explicó el ghusl', tipo: 'yesno', seccion: 'islam', ayuda: 'Marcar cuando se le explicó el baño ritual y en qué casos es obligatorio.' })

const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10)
const people = [
  ['Lucía', 'Fernández', 'F', 'Argentina', '11 2345 6789', m1.id, daysAgo(40), 'DNI', '35111222'],
  ['Martín', 'Gómez', 'M', 'Argentina', '351 15 123 4567', m1.id, daysAgo(12), 'DNI', '30999888'],
  ['Andrea', 'Pérez', 'F', 'Venezuela', '+58 412 1234567', m2.id, daysAgo(5), 'Pasaporte', 'P1234567'],
  ['Joaquín', 'Silva', 'M', 'Uruguay', '+598 98 123 456', m2.id, daysAgo(300), '', ''],
]
const ids = people.map(([nombres, apellidos, sexo, nacionalidad, whatsapp, maestroId, fechaShahada, tipoDocumento, numeroDocumento]) =>
  post(SUP, 'conversos.create', { data: { nombres, apellidos, sexo, nacionalidad, whatsapp, maestroId, fechaShahada, tipoDocumento, numeroDocumento, consentimientoContacto: true, ciudad: 'Buenos Aires', diasDisponibles: 'viernes' } }).id)
post(M1, 'seguimiento.add', { conversoId: ids[0], tipo: 'clase', resumen: 'Primera clase sobre la oración.', proximaAccion: 'Practicar el wudu', proximaFecha: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10) })
post(M1, 'certificados.issue', { conversoId: ids[0], emisor: 'maestro' })

// the old Google form's response sheet (fictional answers)
const src = s.ctx.SpreadsheetApp.create('Respuestas demo')
const sh = src.insertSheet('Respuestas de formulario 1')
sh.appendRow(['Marca temporal', 'Nombre completo ', 'Edad ', 'Ciudad donde vives ', '¿Qué días tienes posibilidad de acercarte a la mezquita a rezar?', 'WhatsApp ', 'Trabajo', 'Estudio', 'Dni', 'Nacionalidad ', 'Fecha cuando abrazo el islam ', 'Con el sheij ', 'Foto'])
sh.appendRow([new Date('2024-03-10T12:00:00Z'), 'pablo demo', 28, 'Quilmes', 'Los viernes', 1155554444, 'Comercio', 'Secundario', '33.222.111', 'argentino', '10/03/24', 'ahmed', ''])
sh.appendRow([new Date('2024-06-01T12:00:00Z'), 'Sofía Demo', '24 años', 'La Plata', 'sabados', '221 15 444 3333', '', 'Universidad', 41222333, 'Argentina', 'junio 2024', 'Sheij Desconocido', ''])
post(SUP, 'formSync.setSource', { source: src.getId() })

http
  .createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (req.method !== 'POST') { res.end('nuevo-musulman dev server'); return }
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      const out = s.ctx.doPost({ postData: { contents: body } })
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(out._text)
    })
  })
  .listen(port, () => {
    console.log(`dev server on http://localhost:${port}`)
    console.log(`supervisor: ${SUP} · sheij: ${M1}, ${M2} · colaborador: ${COL}`)
  })

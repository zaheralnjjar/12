// Importing the Google form's responses: fictional rows that imitate the patterns seen in the real sheet
// (local phones, DNI with dots, two-digit years, free-text sheikh names, demonyms, a duplicate).
// Run: node tests/formsync.test.mjs
import assert from 'node:assert/strict'
import { loadServer } from './mock-gas.mjs'

const SUP = 'supervisor@example.com'
const MA = 'maestro.ahmad@example.com'
const s = loadServer({ ownerEmail: SUP })
const { call } = s
let n = 0
const ok = (r) => { assert.equal(r.ok, true, JSON.stringify(r.error)); n++; return r.data }
const denied = (r, code) => { assert.equal(r.ok, false, 'expected refusal'); assert.equal(r.error.code, code, r.error.message); n++ }
s.ctx.setup()

const ma = ok(call(SUP, 'maestros.save', { nombre: 'Sheij Ahmad', email: MA, alias: 'Ahmad' }))

// the response sheet, with the real column titles and made-up answers
const src = s.ctx.SpreadsheetApp.create('Respuestas (prueba)')
const linkedFormUrl = src._formUrl
const sh = src.insertSheet('Respuestas de formulario 1')
const nacionalidadChoices = src._form.addListItem('Nacionalidad')
const sheijChoices = src._form.addListItem('Con el sheij')
const unrelatedChoices = src._form.addListItem('Provincia', ['Buenos Aires'])
sh.appendRow(['Marca temporal', 'Nombre completo ', 'Edad ', 'Ciudad donde vives ', '¿Qué días tienes posibilidad de acercarte a la mezquita a rezar?',
  'WhatsApp ', 'Trabajo', 'Estudio', 'Dni', 'Nacionalidad ', 'Fecha cuando abrazo el islam ', 'Con el sheij ', 'Foto', 'Idioma materno'])
const t = (iso) => new Date(iso)
sh.appendRow([t('2023-04-01T13:30:22Z'), 'juan prueba uno', 25, 'Buenos Aires', 'Los viernes', 1123456789, 'Comercio', 'Secundario', 30111222, 'Argentino ', '01/04/2023', 'ahmad ', 'https://drive.google.com/open?id=abc', 'Español'])
sh.appendRow([t('2024-02-10T10:00:00Z'), 'MARÍA PRUEBA DOS', '31 años', 'Córdoba', 'sabado domingo', '+58 412 1234567', '', 'Universidad', '95.123.456', 'venezolana', '5/2/24', 'Sheij Desconocido', '', ''])
sh.appendRow([t('2024-03-01T10:00:00Z'), 'Pedro Prueba Tres', 40, 'Rosario', 'cuando puedo', '351 15 123 4567', 'Docente', '', 'AB123', 'Marroquí', 'marzo 2020', '', '', ''])
sh.appendRow([t('2024-05-01T10:00:00Z'), '', 22, 'La Plata', '', '', '', '', '', '', '', '', '', '']) // no name
sh.appendRow([t('2025-01-15T10:00:00Z'), 'Juan Prueba Uno', 27, 'Buenos Aires', 'viernes', '011 15 2345-6789', '', '', '30.111.222', 'argentina', '01/04/2023', 'Ahmad', '', '']) // same DNI as row 2
sh.appendRow(['', '', '', '', '', '', '', '', '', '', '', '', '', '']) // empty line

// linking checks the sheet before saving it
denied(call(SUP, 'formSync.setSource', { source: 'not a link' }), 'BAD_INPUT')
denied(call(SUP, 'formSync.setSource', { source: src.getId(), tab: 'Hoja que no existe' }), 'BAD_INPUT')
denied(call(MA, 'formSync.setSource', { source: src.getId() }), 'FORBIDDEN')
denied(call(MA, 'formSync.run'), 'FORBIDDEN')
denied(call(MA, 'formSync.updateChoices'), 'FORBIDDEN')
ok(call(SUP, 'usuarios.save', { email: 'colaborador@example.com', role: 'colaborador' }))
denied(call('colaborador@example.com', 'formSync.updateChoices'), 'FORBIDDEN')
denied(call('colaborador@example.com', 'formSync.preview'), 'FORBIDDEN')
ok(call(SUP, 'formSync.setSource', { source: `https://docs.google.com/spreadsheets/d/${src.getId()}/edit#gid=0` }))
assert.equal(ok(call(SUP, 'formSync.status')).configured, true)
const responseRowsBeforeChoices = JSON.stringify(sh._data)
const refreshed = ok(call(SUP, 'formSync.updateChoices'))
assert.deepEqual(JSON.parse(JSON.stringify(refreshed.updated)), { nacionalidad: 1, maestro: 1 })
assert.ok(Array.from(nacionalidadChoices.getChoiceValues()).includes('Argentina'))
assert.deepEqual(Array.from(sheijChoices.getChoiceValues()), ['Sheij Ahmad'])
assert.deepEqual(Array.from(unrelatedChoices.getChoiceValues()), ['Buenos Aires'])
assert.equal(JSON.stringify(sh._data), responseRowsBeforeChoices, 'choice update never writes the response sheet')
src.setFormUrl('')
denied(call(SUP, 'formSync.updateChoices'), 'NOT_CONFIGURED')
src.setFormUrl('https://docs.google.com/forms/d/form_' + 'not-linked' + '/edit')
denied(call(SUP, 'formSync.updateChoices'), 'BAD_INPUT')
src.setFormUrl(linkedFormUrl)

// a custom field whose label matches a new question is filled from it
const campos = ok(call(SUP, 'campos.save', { etiqueta: 'Idioma materno', tipo: 'text', seccion: 'personal' }))
const idioma = campos.find((f) => f.etiqueta === 'Idioma materno')

// the dry run writes nothing
const dataSheet = () => [...s.spreadsheets.values()].find((x) => x.getName() === 'Nuevo Musulmán - datos')
const pre = ok(call(SUP, 'formSync.preview'))
assert.equal(pre.summary.importadas, 3)
assert.equal(pre.summary.errores, 1)
assert.equal(dataSheet()._sheets.get('Conversos')._data.length, 1, 'only the header row')
assert.equal(dataSheet()._sheets.get('FormInbox')._data.length, 1)

const run = ok(call(SUP, 'formSync.run'))
assert.equal(run.summary.leidas, 6)
assert.equal(run.summary.importadas, 3)
assert.equal(run.summary.duplicadas, 1)
assert.equal(run.summary.errores, 1)
assert.equal(run.summary.aRevisar, 2)
assert.deepEqual(run.summary.columnasSinUsar, [])

const list = ok(call(SUP, 'conversos.list', {}))
assert.equal(list.length, 3)
const byName = (q) => ok(call(SUP, 'conversos.get', { id: ok(call(SUP, 'conversos.list', { q }))[0].id })).converso

const juan = byName('prueba uno')
assert.equal(juan.id, 'NM-2023-0001', 'serial in the year of registration')
assert.equal(juan.nombres, 'Juan Prueba Uno')
assert.equal(juan.whatsapp, '+5491123456789')
assert.equal(juan.tipoDocumento, 'DNI')
assert.equal(juan.numeroDocumento, '30111222')
assert.equal(juan.nacionalidad, 'Argentina')
assert.equal(juan.fechaShahada, '2023-04-01')
assert.equal(juan.maestroId, ma.id)
assert.equal(juan.edadAlRegistro, '25')
assert.equal(juan.diasDisponibles, 'viernes')
assert.equal(juan.fotoFormulario, 'https://drive.google.com/open?id=abc')
assert.equal(juan.origen, 'formulario')
assert.equal(juan.createdAt.slice(0, 10), '2023-04-01', 'keeps the date of the response')
assert.equal(juan.extra[idioma.key], 'Español')
assert.equal(juan.revisar, '')

const maria = byName('prueba dos')
assert.equal(maria.nombres, 'María Prueba Dos')
assert.equal(maria.whatsapp, '+584121234567')
assert.equal(maria.numeroDocumento, '95123456')
assert.equal(maria.nacionalidad, 'Venezuela')
assert.equal(maria.fechaShahada, '2024-02-05')
assert.equal(maria.edadAlRegistro, '31')
assert.equal(maria.diasDisponibles, 'sabado,domingo')
assert.equal(maria.maestroId, '')
assert.match(maria.revisar, /Sheij no reconocido: «Sheij Desconocido»/)

const pedro = byName('prueba tres')
assert.equal(pedro.whatsapp, '+5493511234567')
assert.equal(pedro.tipoDocumento, 'Otro')
assert.equal(pedro.diasDisponibles, 'cuando puedo', 'free text kept')
assert.match(pedro.revisar, /Nacionalidad no reconocida: «Marroquí»/)
assert.match(pedro.revisar, /Fecha de shahada no reconocida: «marzo 2020»/)

// a shared WhatsApp with a different document is imported, but flagged
sh.appendRow([t('2025-02-01T10:00:00Z'), 'Esposa Prueba', 26, 'Buenos Aires', '', 1123456789, '', '', 32999888, 'Argentina', '01/02/2025', 'Ahmad', '', ''])
const shared = ok(call(SUP, 'formSync.run'))
assert.equal(shared.summary.importadas, 1)
assert.match(byName('esposa').revisar, /Posible duplicado de NM-2023-0001/)

// running again imports nothing twice
const again = ok(call(SUP, 'formSync.run'))
assert.equal(again.summary.importadas, 0)
assert.equal(again.summary.yaVistas, 6)
assert.equal(ok(call(SUP, 'conversos.list', {})).length, 4)

// a new response arrives later
sh.appendRow([t('2026-09-25T15:15:01Z'), 'Ali Prueba Cuatro', 19, 'Mendoza', 'martes, jueves y viernes', '261 15 555 1234', '', '', '41222333', 'Argentina', '20/09/26', 'Sheij Ahmad', '', ''])
const third = ok(call(SUP, 'formSync.run'))
assert.equal(third.summary.importadas, 1)
assert.equal(byName('cuatro').id, 'NM-2026-0001')
assert.equal(byName('cuatro').fechaShahada, '2026-09-20')

// after adding an alternative spelling, unknown sheikhs are matched again
ok(call(SUP, 'maestros.save', { id: ma.id, nombre: 'Sheij Ahmad', email: MA, alias: 'Ahmad, Sheij Desconocido' }))
assert.deepEqual(ok(call(SUP, 'formSync.rematch')), { asignados: 1, sinReconocer: 0 })
const maria2 = byName('prueba dos')
assert.equal(maria2.maestroId, ma.id)
assert.equal(maria2.revisar, '')
// ...and the sheikh now sees it
assert.ok(ok(call(MA, 'conversos.list', {})).some((c) => c.id === maria2.id))

// the form's sheet was never written to
assert.equal(sh._data.length, 9)
assert.equal(sh._data[0][0], 'Marca temporal')

console.log(`formsync: ${n} checks passed`)

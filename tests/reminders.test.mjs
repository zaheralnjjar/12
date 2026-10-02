import assert from 'node:assert/strict'
import { loadServer } from './mock-gas.mjs'

const SUP = 'supervisor@example.com'
const MA = 'maestro.uno@example.com'
const MB = 'maestro.dos@example.com'
const COL = 'colaborador@example.com'
const s = loadServer({ ownerEmail: SUP })
const { call } = s
const ok = (r) => { assert.equal(r.ok, true, JSON.stringify(r.error)); return r.data }
const denied = (r, code) => { assert.equal(r.ok, false, 'expected refusal'); assert.equal(r.error.code, code, r.error.message) }
s.ctx.setup()
const ma = ok(call(SUP, 'maestros.save', { nombre: 'Sheij Uno', email: MA }))
const mb = ok(call(SUP, 'maestros.save', { nombre: 'Sheij Dos', email: MB }))
ok(call(SUP, 'usuarios.save', { email: COL, role: 'colaborador' }))
const data = (nombre, maestroId, phone) => ({ nombres: nombre, sexo: 'M', nacionalidad: 'Argentina', whatsapp: phone, maestroId })
const uno = ok(call(SUP, 'conversos.create', { data: data('Caso ficticio Uno', ma.id, '11 1111 1111') }))
const dos = ok(call(SUP, 'conversos.create', { data: data('Caso ficticio Dos', mb.id, '11 2222 2222') }))
const today = new Date().toISOString().slice(0, 10)
const due = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
const soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
ok(call(MA, 'seguimiento.add', { conversoId: uno.id, fecha: today, resumen: 'Nota ficticia', proximaAccion: 'Llamar', proximaFecha: due }))
ok(call(MB, 'seguimiento.add', { conversoId: dos.id, fecha: today, resumen: 'Nota ficticia', proximaAccion: 'Clase', proximaFecha: soon }))

denied(call(MA, 'recordatorios.configure', { enabled: true }), 'FORBIDDEN')
denied(call(COL, 'recordatorios.configure', { enabled: true }), 'FORBIDDEN')
denied(call(COL, 'seguimiento.pendientes'), 'FORBIDDEN')
const mine = ok(call(MA, 'seguimiento.pendientes'))
assert.deepEqual(mine.map((item) => item.id), [uno.id], 'maestro sees only his assigned pending record')
assert.equal(mine[0].vencido, true)
assert.deepEqual(ok(call(SUP, 'seguimiento.pendientes')).map((item) => item.id), [uno.id, dos.id])

denied(call(SUP, 'recordatorios.configure', { enabled: true }), 'NOT_CONFIGURED')
ok(call(SUP, 'settings.save', { appUrl: 'https://app.example.test' }))
assert.deepEqual(ok(call(SUP, 'recordatorios.configure', { enabled: true })), { enabled: true })
assert.equal(s.ctx.ScriptApp.getProjectTriggers().length, 1, 'enabling creates one daily trigger')
s.ctx.MailApp._remaining = 1
const limited = s.ctx.sendDailyReminders_()
assert.equal(limited.sent, 1)
assert.equal(limited.skipped, 1, 'remaining daily mail quota is respected')
assert.equal(s.ctx.MailApp._sent.length, 1)
assert.equal(s.ctx.MailApp._sent[0][0], MA)
assert.equal(s.ctx.MailApp._sent[0][2], `Pasos vencidos: 1\nhttps://app.example.test`)
assert.doesNotMatch(s.ctx.MailApp._sent[0][2], /Caso ficticio|Sheij Uno|NM-/)

s.ctx.MailApp._remaining = 2
s.ctx.MailApp._sent.length = 0
const complete = s.ctx.sendDailyReminders_()
assert.equal(complete.sent, 2)
assert.equal(s.ctx.MailApp._sent[1][0], MB)
assert.equal(s.ctx.MailApp._sent[1][2], `Pasos vencidos: 0\nhttps://app.example.test`)
assert.deepEqual(ok(call(SUP, 'recordatorios.configure', { enabled: false })), { enabled: false })
assert.equal(s.ctx.ScriptApp.getProjectTriggers().length, 0, 'disabling removes the trigger')
assert.equal(s.ctx.sendDailyReminders_().disabled, true)
assert.equal(s.ctx.MailApp._sent.length, 2, 'disabled trigger sends no mail')

console.log('reminders: all checks passed')

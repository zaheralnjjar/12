import assert from 'node:assert/strict'
import { duplicateTarget, groupReviewRecords, reviewCorrectionFields, reviewReasonType, reviewReasons } from '../src/lib/revision.ts'

assert.deepEqual(reviewReasons('Fecha no reconocida · Sheij no reconocido'), ['Fecha no reconocida', 'Sheij no reconocido'])
assert.deepEqual(reviewReasons('  ·  '), [])
assert.equal(duplicateTarget('Posible duplicado de NM-2026-0007'), 'NM-2026-0007')
assert.equal(duplicateTarget('Fecha no reconocida'), null)

assert.equal(reviewReasonType('Sheij no reconocido: «ahmed»'), 'Sheij no reconocido')
assert.equal(reviewReasonType('Posible duplicado de NM-2026-0007'), 'Posible duplicado')
assert.deepEqual(reviewCorrectionFields('Sheij no reconocido: «ahmed»'), ['maestroId'])
assert.deepEqual(reviewCorrectionFields('Sin maestro asignado'), ['maestroId'])
assert.deepEqual(reviewCorrectionFields('Fecha de shahada no reconocida: «marzo 2020»'), ['fechaShahada'])
assert.deepEqual(reviewCorrectionFields('Fecha de nacimiento no reconocida: «ayer»'), ['fechaNacimiento'])
assert.deepEqual(reviewCorrectionFields('Nacionalidad no reconocida: «X»'), ['nacionalidad'])
assert.deepEqual(reviewCorrectionFields('WhatsApp no reconocido'), ['whatsapp', 'codigoPais'])
assert.deepEqual(reviewCorrectionFields('Documento no reconocido'), ['tipoDocumento', 'numeroDocumento'])
assert.deepEqual(reviewCorrectionFields('Edad no reconocida: «muchos»'), ['edadAlRegistro'])

const groups = groupReviewRecords([
  { id: 'r1', revisar: 'Fecha de shahada no reconocida: «marzo» · Sheij no reconocido: «ahmed»' },
  { id: 'r2', revisar: 'Sheij no reconocido: «sin coincidencia»' },
  { id: 'r3', revisar: 'Fecha de nacimiento no reconocida: «ayer»' },
  { id: 'r4', revisar: 'Posible duplicado de NM-2026-0007' },
])
assert.deepEqual(groups.map((g) => [g.reason, g.records.map((r) => r.id)]), [
  ['Fecha de nacimiento no reconocida', ['r3']],
  ['Fecha de shahada no reconocida', ['r1']],
  ['Posible duplicado', ['r4']],
  ['Sheij no reconocido', ['r2']],
])
assert.equal(groups.flatMap((group) => group.records).filter((r) => r.id === 'r1').length, 1, 'a record with multiple reasons is listed once')
assert.equal(groups.find((group) => group.reason === 'Fecha de shahada no reconocida').records[0].revisar.split(' · ').length, 2, 'the card retains every reason')
console.log('revision: 18 checks passed')

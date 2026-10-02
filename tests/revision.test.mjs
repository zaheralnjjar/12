import assert from 'node:assert/strict'
import { duplicateTarget, groupReviewRecords, reviewReasons } from '../src/lib/revision.ts'

assert.deepEqual(reviewReasons('Fecha no reconocida · Sheij no reconocido'), ['Fecha no reconocida', 'Sheij no reconocido'])
assert.deepEqual(reviewReasons('  ·  '), [])
assert.equal(duplicateTarget('Posible duplicado de NM-2026-0007'), 'NM-2026-0007')
assert.equal(duplicateTarget('Fecha no reconocida'), null)

const groups = groupReviewRecords([
  { id: 'r1', revisar: 'Fecha no reconocida · Posible duplicado de NM-2026-0007' },
  { id: 'r2', revisar: 'Sheij no reconocido' },
  { id: 'r3', revisar: 'Fecha no reconocida' },
])
assert.deepEqual(groups.map((g) => [g.reason, g.records.map((r) => r.id)]), [
  ['Fecha no reconocida', ['r1', 'r3']],
  ['Posible duplicado de NM-2026-0007', ['r1']],
  ['Sheij no reconocido', ['r2']],
])
console.log('revision: 6 checks passed')

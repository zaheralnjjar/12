// WhatsApp links built in the browser: only digits in the address, the text encoded exactly.
import assert from 'node:assert/strict'
import { waDigits, waLink, waShareLink, whatsappTooLong } from '../src/lib/whatsapp.ts'
assert.equal(waDigits('+54 9 11 2345-6789'), '5491123456789')
assert.equal(waDigits('0054 9 11 2345 6789'), '5491123456789')
assert.equal(waDigits('+58 412 1234567'), '584121234567')
assert.equal(waDigits('123'), null)
assert.equal(waDigits(''), null)
const text = 'Assalamu alaikum, ¿cómo estás?\nLínea & # % «árabe: السلام عليكم»'
assert.equal(new URL(waLink('+5491123456789', text)).searchParams.get('text'), text)
assert.equal(new URL(waShareLink(text)).searchParams.get('text'), text)
assert.equal(waLink('12', text), null)
assert.equal(whatsappTooLong('x'.repeat(1801)), true)
assert.equal(whatsappTooLong('Hola'), false)
console.log('whatsapp: 10 checks passed')

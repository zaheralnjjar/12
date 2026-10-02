import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { getLanguage, localizeError, setLanguage, translate, translatedText, translations } from '../src/lib/locale.ts'

let stored = null
globalThis.localStorage = {
  getItem(key) { assert.equal(key, 'nm.language'); return stored },
  setItem(key, value) { assert.equal(key, 'nm.language'); stored = value },
  removeItem(key) { assert.equal(key, 'nm.language'); stored = null },
}

assert.deepEqual(Object.keys(translations.ar).sort(), Object.keys(translations.es).sort())
assert.ok(Object.keys(translations.ar).length > 0)
const visibleText = new Set()
function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) scan(file)
    else if (file.endsWith('.tsx')) {
      const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      function visit(node) {
        if (ts.isJsxText(node) && node.text.trim()) visibleText.add(node.text.replace(/\s+/g, ' ').trim())
        if (ts.isJsxAttribute(node) && ['aria-label', 'alt', 'placeholder', 'title'].includes(node.name.getText(source)) && node.initializer && ts.isStringLiteral(node.initializer) && node.initializer.text) visibleText.add(node.initializer.text)
        ts.forEachChild(node, visit)
      }
      visit(source)
    }
  }
}
scan('src')
assert.deepEqual([...visibleText].filter((key) => !(key in translations.ar)).sort(), [])
assert.equal(getLanguage(), 'es')
setLanguage('ar')
assert.equal(stored, 'ar')
assert.equal(getLanguage(), 'ar')
assert.equal(translate('Inicio', 'ar'), 'الرئيسية')
assert.equal(translate('Inicio', 'es'), 'Inicio')
assert.equal(translate('texto dinámico', 'ar'), 'texto dinámico')
assert.equal(translatedText(' Guardar ', 'ar'), ' حفظ ')
assert.equal(localizeError('No hay conexión. Revisá internet e intentá de nuevo.', 'ar'), 'لا يوجد اتصال. تحقق من الإنترنت وحاول مجددًا.')
assert.equal(localizeError('mensaje nuevo del servidor', 'ar'), 'تعذّر إكمال الطلب. راجع البيانات وحاول مجددًا.')
assert.equal(translate('Sheij no reconocido: «Ahmad» · WhatsApp no reconocido', 'ar'), 'اسم الشيخ غير معروف: «Ahmad» · رقم واتساب غير معروف')
assert.equal(translate('Respuesta personalizada', 'ar'), 'Respuesta personalizada')
assert.equal(translate('Supervisor', 'ar'), 'مشرف')
assert.equal(translate('Sheij 1', 'ar'), 'الشيخ 1')
assert.equal(translate('Colaborador', 'ar'), 'متعاون')
assert.equal(translate('Correo electrónico', 'ar'), 'بريد إلكتروني')
assert.equal(translate('Assalamu alaikum, Sheij Ahmad (demo)', 'ar'), 'السلام عليكم، Sheij Ahmad (demo)')
assert.equal(translate('¿Eliminar definitivamente el registro de Lucía? Se borran sus datos, seguimientos y documentos. Esta acción no se puede deshacer.', 'ar'), 'هل تريد حذف سجل Lucía نهائيًا؟ ستُحذف بياناته ومتابعاته ووثائقه. لا يمكن التراجع عن هذا الإجراء.')
stored = 'xx'
assert.equal(getLanguage(), 'es')
console.log('i18n: locale dictionaries, translation fallback, and persistence passed')

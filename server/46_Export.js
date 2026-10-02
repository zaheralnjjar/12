// The complete list of records, in Spanish or Arabic, for the supervisor only. Every export is audited.
// The server returns plain rows; the browser writes the Excel file (src/export/excel.ts).

var EXPORT_TEXT = {
  es: {
    id: 'N.º de registro', estado: 'Estado', maestro: 'Sheij / maestro', origen: 'Origen', creado: 'Fecha de registro', revisar: 'A revisar',
    si: 'Sí', no: 'No', M: 'Masculino', F: 'Femenino',
    estados: { activo: 'Activo', sin_contacto: 'Sin contacto', se_mudo: 'Se mudó', archivado: 'Archivado' },
    dias: { lunes: 'lunes', martes: 'martes', miercoles: 'miércoles', jueves: 'jueves', viernes: 'viernes', sabado: 'sábado', domingo: 'domingo' },
  },
  ar: {
    id: 'رقم السجل', estado: 'الحالة', maestro: 'الشيخ المعلم', origen: 'المصدر', creado: 'تاريخ التسجيل', revisar: 'للمراجعة',
    si: 'نعم', no: 'لا', M: 'ذكر', F: 'أنثى',
    estados: { activo: 'نشط', sin_contacto: 'انقطع التواصل', se_mudo: 'انتقل', archivado: 'مؤرشف' },
    dias: { lunes: 'الاثنين', martes: 'الثلاثاء', miercoles: 'الأربعاء', jueves: 'الخميس', viernes: 'الجمعة', sabado: 'السبت', domingo: 'الأحد' },
  },
};

function exportCell_(f, c, extra, t) {
  var v = f.custom ? extra[f.key] : c[f.key];
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) return v.join(', ');
  if (f.tipo === 'sexo') return t[v] || v;
  if (f.tipo === 'yesno') return v === '1' ? t.si : t.no;
  if (f.tipo === 'dias') {
    var parts = String(v).split(',');
    var known = parts.every(function (d) { return Object.prototype.hasOwnProperty.call(t.dias, d); });
    return known ? parts.map(function (d) { return t.dias[d]; }).join(', ') : v;
  }
  return String(v);
}

registerAction_('export.conversos', {
  roles: [ROLES.SUPERVISOR],
  fn: function (user, payload) {
    var idioma = payload.idioma === 'ar' ? 'ar' : 'es';
    var t = EXPORT_TEXT[idioma];
    var fields = effectiveFields_().filter(function (f) { return f.active && f.key !== 'maestroId'; });
    var names = maestroNames_();
    var headers = [t.id].concat(fields.map(function (f) { return idioma === 'ar' ? f.etiquetaAr : f.etiqueta; }), [t.maestro, t.estado, t.origen, t.creado, t.revisar]);
    var list = readableConversos_(user).slice().sort(function (a, b) { return a.id < b.id ? -1 : 1; });
    var rows = list.map(function (c) {
      var extra = parseJson_(c.extra, {});
      return [c.id].concat(
        fields.map(function (f) { return exportCell_(f, c, extra, t); }),
        [names[c.maestroId] || '', t.estados[c.estado || 'activo'] || c.estado, c.origen, String(c.createdAt).slice(0, 10), c.revisar]
      );
    });
    if (!user.preview) audit_(user, 'exportar_lista', '', idioma + ' · ' + rows.length + ' registros');
    return { headers: headers, rows: rows, idioma: idioma };
  },
});

/** Public verification reveals only the certificate number, status and issue date. */
registerPublicAction_('public.verify', {
  fn: function (payload) {
    var token = typeof payload.token === 'string' ? payload.token : '';
    if (!/^[a-f0-9]{64}$/.test(token)) fail_('INVALID_VERIFICATION', 'El código de verificación no es válido');
    var hash = tokenHash_(token);
    var cert = findOne_('Certificados', function (row) { return String(row.verificationHash || '').split('|').indexOf(hash) >= 0; });
    if (!cert) fail_('INVALID_VERIFICATION', 'El código de verificación no es válido');
    return { numero: cert.numero, estado: cert.estado === 'anulado' ? 'anulada' : 'válida', fecha: cert.fecha };
  },
});

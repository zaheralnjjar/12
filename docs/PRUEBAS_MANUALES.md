# Informe de pruebas manuales

## Alcance y entorno

- **Dónde:** navegador Chromium con emulación de teléfono (390×844 px, pantalla táctil, agente de usuario de iPhone 13) controlado con Playwright, contra el servidor local de demostración (`npm run dev:server`) y la interfaz local (`npm run dev`). Todos los datos son **ficticios**.
- **Qué código:** la integración de todas las tareas (2.1 a 2.10) con las correcciones de la revisión final.
- **No es un teléfono real.** No se probó en un dispositivo físico ni en un emulador Android o iOS (no hay ninguno disponible en este entorno). Tampoco se usaron los servicios reales de Google (Apps Script, Hojas, Drive, Formularios, correo): el servidor corre sobre los servicios simulados de `tests/mock-gas.mjs`.

## Escenarios solicitados

| # | Escenario | Resultado | Qué se comprobó |
|---|---|---|---|
| 1 | Asignación de un registro | ✅ | El supervisor cambió el sheij de un registro desde «Editar datos». El registro desapareció de «Mis registros» del primer sheij y apareció en la lista del segundo. |
| 2 | Enlace y texto de WhatsApp | ✅ | Se escribió un texto con acentos, «¿», «&» y «#». Antes de salir se ve el texto y el número; el enlace abierto fue `https://wa.me/5491123456789?text=…` con el texto codificado exactamente. |
| 3 | Rechazos | ✅ | El colaborador solo ve el formulario de registro, sin barra de navegación. Llamadas directas a la API: `conversos.list` como colaborador → `FORBIDDEN`; un sheij que pide el registro de otro → `NOT_FOUND`; exportar como sheij → `FORBIDDEN`. |
| 4 | Eliminación | ✅ | El supervisor eliminó un registro tras confirmar. Desapareció de su lista y de la del sheij asignado, y quedó en el registro de actividad (`eliminar_registro`). |
| 5 | Retiro del consentimiento | ✅ | El sheij desmarcó «Acepta ser contactado por WhatsApp». La ficha muestra «No» y el cuadro de WhatsApp avisa antes de contactar. *Durante esta prueba se encontró y corrigió un fallo: al retirar el consentimiento la fila desaparecía de la ficha en lugar de mostrar «No».* |
| 6 | Un sheij no ve registros ajenos | ✅ | La lista del sheij coincide exactamente con los registros que el supervisor ve asignados a él, y sus estadísticas cuentan solo esos registros. |
| 7 | Enlace público de un solo uso | ✅ | Sin iniciar sesión, una persona completó el enlace y envió sus datos; el registro llegó al sheij del enlace. Al reabrir el mismo enlace (pestaña nueva): «Este enlace no es válido, ya fue usado o venció». Un segundo enlace anulado por el supervisor: mismo mensaje. |

## Comprobaciones adicionales

- **Certificado bilingüe con QR:** se emitió desde el teléfono; el PDF tiene la página en español y la página árabe (título centrado, texto con tratamiento femenino correcto, línea de firma y QR). Se revisó visualmente.
- **Verificación pública:** la dirección `?verify=<código>` muestra solo número, estado y fecha de emisión. Un código inválido o un número de certificado solo son rechazados.
- **Pendientes y revisión:** las pantallas abren correctamente en el teléfono.
- No hubo errores de JavaScript en ninguna página durante las pruebas.

## No probado

- Teléfono físico, instalación como aplicación (PWA) y mensajes de instalación de cada navegador.
- Abrir la aplicación de WhatsApp real (solo se comprobó el enlace generado; no se envió ningún mensaje).
- Escanear el QR con la cámara de un teléfono (el contenido del enlace se verificó por separado).
- Vencimiento real de un enlace por fecha (cubierto por pruebas automatizadas del servidor).
- Servicios reales de Google: cuotas, permisos OAuth, disparador diario de recordatorios y actualización de listas del formulario se prueban solo con simulaciones. Hay que comprobarlos después de publicar (ver `DEPLOY.md`).

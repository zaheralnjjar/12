# Informe de pruebas manuales

## Alcance y entorno

La prueba solicitada en teléfono o emulador **no se realizó**: `adb devices -l` no mostró ningún dispositivo; el SDK local no contiene el ejecutable del emulador Android y `xcrun simctl` no está disponible. No se registran aquí como prueba móvil ni las pruebas automatizadas ni las capturas del navegador.

En el navegador local, con datos ficticios, sí se abrió la aplicación con las tres cuentas de demostración. Se confirmó visualmente que cargan el inicio del supervisor, el inicio limitado del sheij y el formulario de registro del colaborador. No se enviaron formularios ni se modificaron ni borraron registros durante esta comprobación.

## Escenarios solicitados

| Escenario | Estado | Detalle |
|---|---|---|
| Asignación de un registro | No probado | Requiere completar el flujo en teléfono o emulador. |
| Enlace de WhatsApp y texto | No probado | No se abrió WhatsApp ni se envió ningún mensaje. |
| Rechazo | No probado | No se recorrió el flujo en el dispositivo solicitado. |
| Eliminación | No probado | No se borró ningún registro. |
| Retiro del consentimiento | No probado | No se cambió el consentimiento de ningún registro. |
| Un sheij no ve registros ajenos | No probado manualmente | El aislamiento sí cuenta con pruebas automatizadas de servidor; falta comprobarlo en móvil. |
| Enlace público de un solo uso, vencimiento y revocación | No probado manualmente | Esos comportamientos tienen pruebas automatizadas; falta completar la comprobación en móvil. |

## Cómo completar la prueba pendiente

1. Seguí [`DEPLOY.md`](DEPLOY.md) para iniciar el servidor local de demostración y la interfaz. Usá únicamente las cuentas y los registros ficticios del entorno local.
2. Abrí la interfaz desde un teléfono o emulador conectado al mismo entorno local e iniciá sesión como supervisor, sheij y colaborador.
3. Ejecutá cada escenario de la tabla, comprobando tanto el resultado visible como los permisos entre cuentas.
4. Para WhatsApp, revisá el enlace y el texto preparado, pero no envíes mensajes.
5. Para eliminación, consentimiento y enlaces públicos, comprobá el efecto con datos ficticios y anota cualquier caso fallido.

**Resumen literal:** se probaron únicamente los accesos visuales iniciales de los tres roles en un navegador local con datos ficticios. No se probó ninguno de los siete escenarios funcionales solicitados en un teléfono o emulador.

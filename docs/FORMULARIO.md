# Configuración del formulario de registro

El formulario debe guardar sus respuestas en una hoja de cálculo vinculada. El importador de la aplicación lee esa hoja; nunca escribe ni modifica sus respuestas. En **Ajustes → Formulario** se vincula el enlace de la hoja y su pestaña de respuestas.

## Preguntas recomendadas

Usá estos títulos (o conservá las palabras clave indicadas) para que `FORM_COLUMNS` en `server/47_FormSync.js` reconozca las columnas. La marca temporal la agrega Google automáticamente.

| Título de la pregunta | Tipo sugerido | Reconocimiento |
|---|---|---|
| Nombre completo | Respuesta corta | `nombre` |
| Apellido | Respuesta corta | `apellido` |
| Nombre islámico | Respuesta corta | `nombre islamico` |
| Fecha de la shahada | Fecha | Debe incluir `fecha` y `shahada` (o `islam`) |
| Fecha de nacimiento | Fecha | `fecha de nacimiento` |
| Edad | Respuesta corta | `edad` |
| Sexo | Lista desplegable | `sexo` |
| Provincia | Respuesta corta | `provincia` |
| Ciudad | Respuesta corta | `ciudad` |
| Días disponibles para acercarse a la mezquita | Casillas | `dias` o `mezquita` |
| Código de país | Respuesta corta | `codigo de pais` |
| WhatsApp | Respuesta corta | `whatsapp` |
| Trabajo | Respuesta corta | `trabajo` |
| Estudios | Respuesta corta | `estudio` |
| Número de documento | Respuesta corta | `dni`, `documento` o `pasaporte` |
| Nacionalidad | Lista desplegable | `nacionalidad` |
| Lugar de la shahada | Respuesta corta | `lugar` |
| Con el sheij | Lista desplegable | `sheij`, `sheikh`, `jeque` o `maestro` |
| Foto | Carga o URL | `foto` |
| ¿Acepta que lo contactemos por WhatsApp? | Opción Sí/No | Se puede añadir; la importación no infiere consentimiento de una respuesta ausente |

No repitas palabras clave entre preguntas: cada columna se asigna una sola vez y el primer título coincidente gana. Las respuestas de preguntas adicionales pueden alimentar campos personalizados si el título coincide exactamente con su etiqueta.

## Actualizar listas

Vinculá primero la hoja de respuestas del formulario. Después, como supervisor, ejecutá **Actualizar opciones del formulario** en la sección Formulario de Ajustes. La acción `formSync.updateChoices` busca listas desplegables tituladas con “Nacionalidad” y “sheij” (también reconoce “sheikh”, “jeque” y “maestro”) y reemplaza sus opciones con las nacionalidades y los sheij activos de Ajustes. Las demás preguntas no se modifican.

La cuenta que autoriza Apps Script necesita acceso al formulario y a la hoja. La acción solo cambia las opciones del formulario; la hoja de respuestas permanece de solo lectura para la aplicación.

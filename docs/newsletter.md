# Newsletter del Golden Circle

Todo vive en la hoja **FANS DE ROMMUSER** y sale desde **contact@** con Gmail. No hay servicio externo
(Brevo queda para cuando la lista sea de cientos).

```
rommuser.com/?ref=CÓDIGO&utm_source=instagram
        │  el formulario manda correo + idioma + ref + origen
        ▼
fans-sheet.gs (doPost) ── pestaña Fans: fila nueva con segmento, código propio y "Referido por"
        │                  └─ suma 1 a "Referidos" de quien compartió; aviso a contact@ en 3, 10 y 25
        ▼
Bienvenida (tope 100/día) con su enlace personal y su enlace de baja
        ·
Axel escribe la newsletter como BORRADOR en Gmail (con {{variables}})
        ▼
Pestaña Campañas: una fila por envío ── prueba a contact@ ── Axel pone APROBADA
        ▼
newsletter.gs (sendQueue, cada hora): 40 por hora, máximo 250 por día
   Fans (esta hoja) + Promotores y Estudio (leídos en sus propias hojas, sin copiarlos)
   menos Bajas, menos a quien ya le llegó esa campaña
        ▼
processInbox (cada hora): DESCONECTAR / DISCONNECT y rebotes permanentes ── pestaña Bajas
```

## Segmentos

| Segmento | De dónde sale | Quién entra |
| --- | --- | --- |
| Fans | Pestaña Fans de esta hoja | Todos los que entraron por la web. Puedes cambiar la columna Segmento a mano (por ejemplo, a "Promotores" si un fan es organizador). |
| Promotores | ROMMUSER \| Bookings — Lead Tracker, todas las pestañas de país | Filas que tengan un correo en cualquier columna. Las que solo tienen Instagram o WhatsApp se saltan. |
| Estudio | ROMMUSER \| Ventas mixdown · Seguimiento diario, pestaña Leads | Solo filas con "Fecha 1er pago" llena (clientes que ya pagaron, no leads en frío). |

Para agregar otra hoja, se suma un bloque en `SOURCES` al inicio de `newsletter.gs`.

## Paso a paso (una sola vez)

**Antes de actualizar el formulario o Apps Script, completar el despliegue coordinado de
[seguridad](security.md). El nuevo backend requiere Turnstile y `TURNSTILE_SECRET`.**

1. **Quitar el teléfono del pie de contact@.** Todo lo que sale de contact@ (también estos scripts) lleva el
   pie de Google Workspace. En admin.google.com: Apps > Google Workspace > Gmail > Cumplimiento >
   Agregar pie de página; borra el teléfono y guarda. Antes de este paso no se envía nada.
2. **Pegar los scripts.** En la hoja FANS DE ROMMUSER: Extensiones > Apps Script.
   - Reemplaza todo el archivo `Código.gs` con `integraciones/fans-sheet.gs`.
   - Botón **+** > Script > nómbralo `newsletter` y pega `integraciones/newsletter.gs`.
   - Guarda.
3. **Configurar.** Recarga la hoja: aparece el menú **Golden Circle**. Elige *Configurar (una sola vez)* y acepta
   los permisos (ahora pide Gmail, porque lee borradores y envía). Esto:
   - agrega las columnas Segmento, Código, Referido por, Referidos y Estado, y da código a quien ya estaba;
   - crea las pestañas Campañas, Envíos y Bajas;
   - programa los activadores sendPending (diario), sendQueue y processInbox (cada hora).
4. **Publicar la versión nueva con la misma URL.** Implementar > Gestionar implementaciones > lápiz >
   Versión: *Nueva versión* > Implementar. La URL /exec no cambia, así que la web no se toca.
5. **Probar la bienvenida.** Abre `https://rommuser.com/?ref=PRUEBA&utm_source=prueba#lista` en una ventana
   privada y entra con un correo tuyo. Debe aparecer la fila con origen `rommuser.com · prueba` y llegar la
   bienvenida con tu enlace personal y el enlace de baja.

## Cada newsletter

1. En Gmail (contact@) escribe un **borrador** con el asunto que quieras, por ejemplo `Golden Circle · Noviembre`.
   Puedes usar:
   - `{{nombre|amigo}}`: el nombre si existe (promotores y estudio), si no, lo que va después de la barra;
   - `{{link_referido}}`: el enlace personal de cada fan (a los demás les llega rommuser.com/#lista);
   - `{{baja}}`: enlace para salir. Si no lo pones, se agrega solo al final;
   - `{{correo}}`, `{{codigo}}`.
   Usa imágenes con enlace (de rommuser.com) en vez de pegarlas dentro del correo.
2. En la pestaña **Campañas** agrega una fila:

   | ID | Asunto del borrador | Segmentos | Idioma | Programada para | Estado |
   | --- | --- | --- | --- | --- | --- |
   | 2026-11-pieces | Golden Circle · Noviembre | Fans, Promotores | ES | 11/11/2026 9:00 | BORRADOR |

   - Idioma: `ES`, `EN` o `TODOS`. Para mandar en dos idiomas, haz dos borradores y dos filas.
   - Programada para: vacío = apenas se apruebe.
3. Con la fila seleccionada: menú Golden Circle > *Contar destinatarios* (escribe en Notas cuántos y de qué
   segmento) y *Enviarme una prueba* (llega a contact@ con `[PRUEBA]`).
4. Si la prueba está bien, cambia Estado a **APROBADA**. Desde ahí sale sola: 40 por hora, máximo 250 al día.
   La pestaña Envíos registra cada correo y al terminar llega un aviso a contact@. Para frenar, pon **PAUSADA**.

## Referidos

- Cada fan tiene un código de 6 letras (columna Código) y su enlace `https://rommuser.com/?ref=CÓDIGO#lista`.
- La web guarda el primer `ref` y el primer origen (`utm_source` o el sitio de donde vino) aunque la persona
  navegue y vuelva después.
- Quien entra con un código queda con "Referido por"; a quien compartió se le suma 1 en "Referidos".
- En 3, 10 y 25 referidos llega un aviso a contact@. Revisa que los correos sean reales y decide el premio
  (por ejemplo, un VIP inédito o lista de invitados en una Secret Room). Nada se manda solo.
- Para medir una campaña o un post: usa enlaces con `utm_source` (`?utm_source=ig-bio`, `?utm_source=tiktok`)
  y filtra la columna Origen.

## Cuidados

- 40 por hora y 250 al día: Gmail de Workspace permite más, pero el 28/09 rebotaron ~20 en un envío masivo.
  Las primeras campañas, a Fans y Estudio; Promotores cuando la reputación esté limpia.
- Los rebotes permanentes (5.x.x) y las respuestas DESCONECTAR / DISCONNECT pasan solos a Bajas. "Buzón lleno"
  no da de baja.
- Quien se dio de baja y vuelve a entrar por la web sale de Bajas (lo pidió de nuevo).
- Leads de mixdown en frío y promotores sin conversación no deberían recibir la newsletter: para eso están los
  mensajes uno a uno.

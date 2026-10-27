# Pedidos del estudio por correo

El formulario PEDIR COTIZACIÓN de rommuser.com/estudio manda el pedido directo a **contact@** (con
"Responder" apuntando al correo del artista) mediante `integraciones/estudio-pedidos.gs`. Mientras
`data-endpoint` del formulario esté vacío, la página abre la app de correo del visitante como respaldo.

## Paso a paso (una sola vez, en la cuenta contact@)

1. script.google.com > **Nuevo proyecto**, nómbralo `ROMMUSER · Pedidos estudio` y pega `integraciones/estudio-pedidos.gs`.
2. Configuración del proyecto > **Propiedades del script**: `TURNSTILE_SECRET` = el mismo secreto del widget
   Turnstile del Golden Circle. Opcional: `SHEET_ID` = ID de una hoja para guardar cada pedido (pestaña "Pedidos web").
3. Elige `testPedido` y dale **Ejecutar**: acepta los permisos y revisa que llegue "Cotización · PRUEBA" a contact@.
4. **Implementar > Nueva implementación > App web**: Ejecutar como *yo*, Acceso *cualquier usuario*. Copia la URL `/exec`.
5. Pega la URL en `data-endpoint` de `.studio-form` en `site/estudio/index.html` y corre `npm run site:en`.
6. En Cloudflare Turnstile, el widget ya cubre `rommuser.com` y `www.rommuser.com`. Si studio.rommuser.com va a
   usar el mismo endpoint, agrega ese dominio al widget.

Turnstile no funciona en los previews de pages.dev (no están en el widget), así que el envío real se prueba en rommuser.com.

## Qué protege

- Token de Turnstile validado en el servidor, con acción `studio_quote` y solo desde nuestros dominios.
- Campo trampa `website`, largos máximos por campo y tope de 40 pedidos por día (aviso a contact@ al llegar).
- Studio (studio.rommuser.com) puede mandar `nombre` en vez de `artista`, y `mensaje` y `reporte` del chequeo.

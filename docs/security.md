# Seguridad de rommuser.com

## Estado de esta propuesta

PR de preparación. **No fusionar hasta completar la configuración de Turnstile.**
La clave pública de Turnstile ya está incorporada en `site/index.html` y su versión en inglés.
Falta confirmar el secreto en Apps Script, publicar el backend y validar un registro real. No se usan claves de prueba en producción ni se aceptan tokens
sin validarlos. `site/en/index.html` se genera con `npm run site:en`.

El sitio se publica automáticamente al fusionar en `main`. Apps Script se publica por separado.
Los cambios de código no activan por sí solos DNSSEC, 2FA, Bot Fight Mode ni reglas de Cloudflare.

## Despliegue coordinado del formulario

1. Crear un widget Turnstile Managed para `rommuser.com` y `www.rommuser.com`, acción
   `fan_signup`. Usar un widget y backend separados para staging; producción no acepta localhost
   ni previews. La clave pública va en `data-sitekey` de `site/index.html`; regenerar inglés.
2. Guardar el secreto únicamente en **Propiedades del script**, con nombre `TURNSTILE_SECRET`.
   No incluirlo en HTML, commits, logs ni comentarios de PR.
3. Preparar `integraciones/fans-sheet.gs` junto a `newsletter.gs` en el proyecto existente.
   Autorizar UrlFetchApp en el editor sin ejecutar `testWelcome`, `sendPending` o campañas.
4. Hacer la transición en una ventana breve: publicar la nueva versión de Apps Script
   manteniendo la URL `/exec`, y publicar el frontend con la clave real inmediatamente después.
   En ese intervalo el formulario antiguo será rechazado: no hay fallback inseguro.
5. Con un correo de prueba autorizado, verificar una alta real y la fila en Sheets. Repetir
   el mismo token debe devolver `forbidden` y no crear otra fila. Un POST directo sin token,
   un token vencido o de otro hostname/acción tampoco deben crear filas ni enviar correos.
6. Probar ES/EN, error de red y reintento: se debe obtener un token nuevo después de cada intento.
   La respuesta de Apps Script es opaca (`no-cors`): la interfaz informa que envió una solicitud,
   nunca promete que se guardó. Para confirmación exacta haría falta un transporte que permita
   leer la respuesta, fuera de esta migración.

Límite de seguridad: máximo 300 altas nuevas/día (Costa Rica), contabilizadas dentro del lock.
Es un límite global, no por IP. Puede detener altas legítimas en una campaña grande: revisar
tráfico y ajustar antes de campañas. El tope existente de 100 bienvenidas/día se conserva.
Turnstile reduce abuso, pero no prueba propiedad del correo; double opt-in queda pendiente.
La URL pública de Apps Script aún puede recibir tráfico y consumir cuota antes del rechazo.

## Cloudflare y cuentas: cambios operativos pendientes

| Control | Valor propuesto | Verificación / impacto |
| --- | --- | --- |
| 2FA | Activar personalmente en Cloudflare, GitHub, Google y registrador | Guardar recuperación fuera del repositorio; revisar sesiones/tokens. |
| TLS | Mínimo 1.2; Full (strict) | Verificar primero todos los hosts proxied, incluido Studio; son ajustes de zona. |
| HTTPS | Always Use HTTPS | Comprobar redirecciones sin bucles en apex, www y Studio. |
| HSTS | El PR añade 86400 segundos | Sin includeSubDomains ni preload. Ampliar solo tras verificar HTTPS estable. El navegador retiene la política 24 horas aunque se revierta. |
| Bots | Evaluar Bot Fight Mode y activar con monitoreo | Puede causar falsos positivos; no bloquear buscadores ni previews sociales por User-Agent. No protege Google Apps Script. |
| WAF | Conservar Free Managed Ruleset; añadir reglas dirigidas según eventos | No confundir el ajuste heredado waf=off con ausencia total de protección. |
| Rate limiting | Aplicar a endpoints sensibles propios cuando existan | El formulario actual envía a Google, no a un endpoint del dominio; una regla en rommuser.com no lo limita. |
| DNSSEC | Activar y publicar DS en Hostinger | Completar y verificar la cadena; no dejar solo la mitad de la configuración. |
| Previews | Cloudflare Access para *.rommuser-web.pages.dev | Probar acceso autorizado; no proteger con login la web artística pública. |
| Dominio alternativo | `_redirects` en este PR para rommuser-web.pages.dev | Verificar 301, ruta y query string; previews son un control separado. |
| DMARC | Progresar de p=none después de revisar remitentes | No cambiar a reject antes de confirmar SPF/DKIM de todos los servicios. |

## Verificación y rollback

- `npm test`, `npm run build`, `npm run site:en`, `git diff --check`.
- Pruebas unitarias cubren rechazo de tokens inválidos, replay reportado por Siteverify,
  hostname/acción incorrectos, errores de red/JSON, cuerpo excesivo y límite diario.
  No sustituyen la validación real con el secreto del backend.
- Tras publicar: comprobar CSP, HSTS, carga del widget, ES/EN, 404 real y redirect pages.dev.
- Si el backend falla, mantener las altas cerradas mientras se corrige la configuración.
  Revertir ambos componentes al código anterior reabriría el endpoint sin Turnstile.
- Ninguna medida garantiza seguridad absoluta. Revisar eventos, permisos y dependencias regularmente.

Referencias:
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- https://developers.cloudflare.com/turnstile/reference/content-security-policy/
- https://developers.cloudflare.com/pages/configuration/redirects/
- https://developers.cloudflare.com/pages/configuration/preview-deployments/

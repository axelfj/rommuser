# ROMMUSER / El receptor

Design study, 26 October 2026. Review in PR #43; not a production release.

## Reuse the original site

Keep the existing catalog data and platform picker, dated show archive, real portrait and logo, ES/EN generator, EPK/rider links, booking directory, Golden Circle form and Turnstile integration. Keep the studio application separate. These provide working infrastructure and real evidence; redesign the artist presentation around them.

The new receiver.css replaces night.css on the artist homepage. Shared style.css and scripts remain available to the existing studio/store pages. Recent PR changes are retained: dated releases, Idely with The Number on 17 April 2026, and recorded sets attached to actual shows.

## Visual direction

El receptor is an imagined sculptural listening chamber: black stone for physical weight, brushed metal for resonance, one white slit for the signal. Generated specifically for this design study, not a photo of the artist or a real show. AI provenance is disclosed in the footer. No claim of legally exclusive imagery.

The composition moves from black artwork to bone catalog, black dance floor, bone Secret Rooms, real artist portrait and interactive signal, then bookings. Serif italics introduce a softer physical rhythm alongside the existing geometric type. Original artist assets remain recognizable.

Artwork: site/assets/receiver-v1.webp, 1536 x 1024, approximately 69 KB. Created with the built-in image generation tool, then compressed to WebP. Concept prompt: original monochrome fine-art sculpture, asymmetrical obsidian and brushed-silver ribbons around a hollow listening chamber, one thin bone-white vertical slit, object on the right and negative space left; no text, logos, people, robots, planets or neon.

## Content audit

- Public identity stays ROMMUSER; no private biography, personal financial goals or sales credentials.
- Exact Don't Wanna artist credit and Beatport preorder retained.
- Pieces date omitted: conflicting 10/11 and 11/11 remain unresolved in Axel's context.
- December release remains ID until Axel announces it.
- Shows and released music provide evidence; no invented performance imagery.
- Original music links, EPK/rider and Golden Circle endpoints preserved.

## Validation scope

88 automated tests passed; TypeScript/Vite studio build passed; generated ES/EN artist pages rebuilt. These checks do not substitute for browser layout review. site/review.html is a noindex internal layout harness with 320, 390 and 768 pixel frames; it is not linked from artist navigation. No newsletter submission or real booking email is sent during review. Production remains unchanged until PR merge.

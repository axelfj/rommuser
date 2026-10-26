# Ten navigable ROMMUSER concepts

Each image concept now has its own HTML layout in `/preview/live/<concept>/<es|en>/`. The gallery provides direct navigation. Existing public routes and the three earlier proposals remain unchanged.

## Content and interactions

`python scripts/build-ten-sites.py` reads the existing artist ES/EN HTML. Releases, label credits, dates, listening destinations, shows, EPK/rider and artist copy are extracted instead of maintained in another catalog. Native details elements expose music platforms, show archives, mobile navigation and the concept switcher. Anchor links, language links, booking mail links and Studio links work without JavaScript. Golden Circle points to the existing signup rather than duplicating a live form.

## Performance choices

- No runtime JavaScript in the twenty concept pages. The QA-only page has its own small script.
- No downloaded webfonts, autoplay media, embedded Spotify/YouTube players, tracking scripts, canvas, background loops, blur filters or scroll listeners.
- System sans and serif font stacks work on Windows/macOS; exact glyph metrics will differ between OS fonts.
- The existing 276,650-byte WebP portrait is shared by all designs and reused for alternate crops. No new user-photo upload.
- Hero image has explicit dimensions and high fetch priority; secondary images are lazy-loaded. Shared CSS is approximately 19 KB uncompressed. Each HTML document is approximately 12 KB.
- Responsive layouts collapse to one column at narrow widths; sidebars become mobile navigation. Links and native disclosure controls have touch-sized targets.
- Reduced motion, increased contrast, forced colors and print styles are provided. There are no essential animations to disable. Browser zoom is allowed, and content does not depend on hover.
- Data saver/slow network has no scripts or videos to download; the hero photograph is the largest initial resource. No claim of a measured Lighthouse score or guaranteed network timing.

## Validation

`python scripts/check-ten-sites.py` checks twenty pages, unique IDs, internal anchor targets, local image/CSS paths, all concept/language links, noindex, absence of runtime scripts, and idempotent gallery generation. Existing 88 automated tests and TypeScript/Vite build pass.

Browser layout QA uses `/preview/live/qa.html`, which renders the actual generated documents at 320, 390, 768 and 1440 pixels. Native Windows and macOS/Safari execution is not available in this environment; Chromium checks do not establish Safari parity. Manual Safari and Windows high-contrast checks remain recommended before a production merge.

Browser results: all ten Spanish concepts passed document-overflow checks in 320/390/768/1440 px frames (content widths exclude scrollbar). All ten English concepts passed at 320 px with mobile menus opened. Listening-platform disclosure, archived set links, language switching and concept switching were exercised on deployed pages. The automated checks verify layout bounds, not every possible visual overlap.

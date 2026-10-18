import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
const app = readFileSync(new URL('../site/app.js', import.meta.url), 'utf8');
const source = app.slice(app.indexOf('// Release-day'), app.indexOf('// Preserve the original'));
function release(day, href = 'https://link.tracks.id/dItL') {
  const classes = new Set(['upcoming', 'presave']);
  const label = { textContent: 'PRE-SAVE' };
  const track = { dataset: { release: '2026-11-10' }, href, disabled: true,
    classList: { remove: value => classes.delete(value) },
    hasAttribute: name => name === 'href' && !!href,
    querySelector: selector => selector === '.track-type' ? label : { textContent: 'PIECES' } };
  runInNewContext(source, { document: { querySelectorAll: () => [track] },
    Intl: { DateTimeFormat: class { format() { return day; } } }, Date, tr: s => s });
  return { track, classes, label };
}
it('keeps a future pre-save label and verified destination before release', () => {
  const { track, classes, label } = release('2026-11-09');
  expect(label.textContent).toBe('PRE-SAVE'); expect(classes.has('upcoming')).toBe(true);
  expect(track.href).toBe('https://link.tracks.id/dItL');
});
it.each(['2026-11-10', '2026-11-11'])('updates a released smartlink label on %s without intercepting its destination', day => {
  const { track, classes, label } = release(day);
  expect(label.textContent).toBe('ESCUCHAR'); expect(classes.has('upcoming')).toBe(false);
  expect(classes.has('presave')).toBe(true); expect(track.href).toBe('https://link.tracks.id/dItL');
});
it('enables modal-based releases on their release day', () => {
  const { track, label } = release('2026-11-10', null);
  expect(track.disabled).toBe(false); expect(track.dataset.track).toBe('PIECES');
  expect(label.textContent).toBe('ESCUCHAR');
});

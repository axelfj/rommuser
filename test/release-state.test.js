import { beforeAll, expect, it, vi } from 'vitest';

let revealReleasedTracks;
beforeAll(async () => {
  vi.stubGlobal('document', { documentElement: { lang: 'es' } });
  ({ revealReleasedTracks } = await import('../site/js/release-day.js'));
});

function release(day, href = 'https://link.tracks.id/dItL', soundcloud) {
  const classes = new Set(['upcoming', 'presave']);
  const label = { textContent: 'PRE-SAVE' };
  const track = { dataset: { release: '2026-11-10', soundcloud }, href, disabled: true,
    classList: { remove: value => classes.delete(value), contains: value => classes.has(value) },
    hasAttribute: name => name === 'href' && !!href,
    querySelector: selector => selector === '.track-type' ? label : { textContent: 'PIECES' } };
  revealReleasedTracks([track], day);
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

it('keeps Pieces on pre-save until release, then enables its verified SoundCloud modal destination', () => {
  const url = 'https://on.soundcloud.com/zYPBqwIx9xIhiN3U4Z';
  const before = release('2026-11-09', 'https://link.tracks.id/dItL', url);
  expect(before.classes.has('presave')).toBe(true);
  expect(before.label.textContent).toBe('PRE-SAVE');
  const onRelease = release('2026-11-10', 'https://link.tracks.id/dItL', url);
  expect(onRelease.classes.has('presave')).toBe(false);
  expect(onRelease.track.dataset.track).toBe('PIECES');
  expect(onRelease.track.dataset.soundcloud).toBe(url);
  expect(onRelease.label.textContent).toBe('ESCUCHAR');
});

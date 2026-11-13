import { beforeAll, expect, it, vi } from 'vitest';

let newestRelease, youtubeId;
beforeAll(async () => {
  vi.stubGlobal('document', { documentElement: { lang: 'es' } });
  ({ newestRelease, youtubeId } = await import('../site/js/hero-release.js'));
});

const card = (name, iso) => ({ name, querySelector: () => (iso ? { getAttribute: () => iso } : null) });
const cards = [card('DON\'T WANNA', '2026-10-30'), card('PIECES', '2026-11-11'), card('JUST GROOVE', '2026-12-11'), card('REMIX', '')];

it('shows a release from its own day, Costa Rica time', () => {
  expect(newestRelease(cards, '2026-11-10').name).toBe('DON\'T WANNA');
  expect(newestRelease(cards, '2026-11-11').name).toBe('PIECES');
  expect(newestRelease(cards, '2026-12-11').name).toBe('JUST GROOVE');
});

it('reads the video id from the YouTube links the cards use', () => {
  expect(youtubeId('https://www.youtube.com/watch?v=yOZEs1BBfC4')).toBe('yOZEs1BBfC4');
  expect(youtubeId('https://music.youtube.com/watch?v=yOZEs1BBfC4&si=x')).toBe('yOZEs1BBfC4');
  expect(youtubeId('https://youtu.be/ZA9uOBhCU7Y')).toBe('ZA9uOBhCU7Y');
  expect(youtubeId('https://soundcloud.com/rommuser')).toBe('');
});

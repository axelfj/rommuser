import { describe, expect, it } from 'vitest';
import { countdown } from '../site/js/shows.js';

describe('cuenta regresiva de la próxima fecha', () => {
  it('cuenta hasta las 21:00 de Costa Rica', () => {
    const now = Date.parse('2026-11-18T03:00:00Z'); // 17.11 21:00 en Costa Rica, tres días antes
    expect(countdown('2026-11-20', now, '2026-11-17')).toBe('T− 03D 00H 00M 00S');
    expect(countdown('2026-11-20', now + 61_000, '2026-11-17')).toBe('T− 02D 23H 58M 59S');
  });

  it('no cuenta una fecha que ya pasó', () => {
    expect(countdown('2026-11-10', Date.parse('2026-11-12T00:00:00Z'), '2026-11-11')).toBe('');
  });
});

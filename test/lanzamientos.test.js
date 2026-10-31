import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, it } from 'vitest';
const root = new URL('..', import.meta.url).pathname;
const copy = mkdtempSync(join(tmpdir(), 'lanzamientos-'));
for (const dir of ['site', 'scripts']) cpSync(join(root, dir), join(copy, dir), { recursive: true });
afterAll(() => rmSync(copy, { recursive: true, force: true }));
it("keeps Don't Wanna's verified Beatport link when the release is revealed on 30/10", () => {
  execFileSync('node', [join(copy, 'scripts', 'publicar-lanzamientos.mjs')], { env: { ...process.env, FECHA: '2026-10-30' }, stdio: 'pipe' });
  for (const page of ['index.html', 'en/index.html']) {
    const row = readFileSync(join(copy, 'site', page), 'utf8').match(/<button\s+class="track music-choice"\s+data-track="DON'T WANNA"[^>]*>/)?.[0];
    expect(row).toContain('data-beatport="https://www.beatport.com/release/dont-wanna/7598860"');
  }
});

it('reveals Pieces on 11/11 in the formatted page: a listen button with its SoundCloud link, label and ESCUCHAR', () => {
  const day = mkdtempSync(join(tmpdir(), 'lanzamientos-'));
  try {
    for (const dir of ['site', 'scripts']) cpSync(join(root, dir), join(day, dir), { recursive: true });
    execFileSync('node', [join(day, 'scripts', 'publicar-lanzamientos.mjs')], { env: { ...process.env, FECHA: '2026-11-11' }, stdio: 'pipe' });
    for (const page of ['index.html', 'en/index.html']) {
      const html = readFileSync(join(day, 'site', page), 'utf8');
      const card = html.match(/<button\s+class="track music-choice"\s+data-track="PIECES"[^>]*>[\s\S]*?<\/button>/)?.[0];
      expect(card).toContain('data-soundcloud="https://on.soundcloud.com/zYPBqwIx9xIhiN3U4Z"');
      expect(card).toContain('<strong>PIECES</strong>');
      expect(card).toMatch(/<span class="track-type">(ESCUCHAR|LISTEN)<\/span>/);
      expect(card).toContain('latest-release');
      expect(html).not.toMatch(/data-release="2026-11-11"/);
    }
  } finally {
    rmSync(day, { recursive: true, force: true });
  }
});

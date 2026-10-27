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
    const row = readFileSync(join(copy, 'site', page), 'utf8').match(/<button class="track music-choice" data-track="DON'T WANNA"[^>]*>/)?.[0];
    expect(row).toContain('data-beatport="https://www.beatport.com/release/dont-wanna/7598860"');
  }
});

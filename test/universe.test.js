import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
const source = readFileSync(new URL('../site/universe.js', import.meta.url), 'utf8');
function setup(reduce) {
  const events = {}, classes = new Set();
  let frames = 0, clicks, nextFrame;
  const ctx = new Proxy({}, { get: (o, k) => o[k] ?? (() => {}), set: (o, k, v) => { o[k] = v; return true; } });
  const button = { addEventListener: (key, fn) => { if (key === 'click') clicks = fn; }, setAttribute() {} };
  const scene = { querySelector: () => button, getBoundingClientRect: () => ({left:0,top:0,width:600,height:400}),
    classList: { toggle: (key, on) => on ? classes.add(key) : classes.delete(key) },
    addEventListener: (key, fn) => { events[key] = fn; } };
  const canvas = { getContext: () => ctx };
  runInNewContext(source, {
    document: { querySelector: () => scene, getElementById: () => canvas, addEventListener() {}, hidden:false },
    matchMedia: query => ({ matches: query.includes('reduced-motion') && reduce, addEventListener() {} }),
    Image: class { addEventListener() {} },
    IntersectionObserver: class { constructor(fn) {this.fn=fn;} observe() {this.fn([{isIntersecting:true}]);} },
    ResizeObserver: class { constructor(fn) {this.fn=fn;} observe() {this.fn();} },
    requestAnimationFrame: fn => {nextFrame=fn;return ++frames;}, cancelAnimationFrame() {}, addEventListener() {},
    innerHeight:800, devicePixelRatio:3, tr: x => x,
  });
  return { events, classes, ctx, canvas, button, frames:()=>frames, click:()=>clicks(), tick:now=>nextFrame(now) };
}
it('drifts on its own without any pointer game', () => {
  const s=setup(false);
  expect(s.frames()).toBeGreaterThan(0);
  expect(Object.keys(s.events)).toEqual([]);
  expect(source).not.toMatch(/shadowBlur|pointer/);
});
it('caps the canvas pixel ratio to keep it light', () => {
  const s=setup(false);
  expect(s.canvas.width).toBe(900);
});
it('stays still in reduced motion until the visitor resumes it', () => {
  const s=setup(true);
  expect(s.frames()).toBe(0);
  expect(s.classes.has('is-paused')).toBe(true);
  s.click();
  expect(s.frames()).toBe(1);
  expect(s.button.textContent).toBe('PAUSAR MOVIMIENTO');
});

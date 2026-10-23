import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
const source = readFileSync(new URL('../site/universe.js', import.meta.url), 'utf8');
function setup(reduce) {
  const events = {}, classes = new Set();
  let frames = 0, bullets = 0, nextFrame;
  const ctx = new Proxy({ fillRect: () => bullets++ }, { get: (o, k) => o[k] ?? (() => {}) });
  const button = { addEventListener() {}, setAttribute() {} };
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
    innerHeight:800, devicePixelRatio:1, tr: x => x,
  });
  const pointer = {clientX:150,clientY:100,target:{closest:()=>null}};
  return { events, classes, pointer, frames:()=>frames, bullets:()=>bullets, tick:now=>nextFrame(now) };
}
it('keeps the native cursor: the scene has no pointer game', () => {
  const s=setup(false);
  expect(Object.keys(s.events)).toEqual([]);
  expect(s.classes.has('ship-active')).toBe(false);
});
it('stays still in reduced motion and animates otherwise', () => {
  expect(setup(true).frames()).toBe(0);
  expect(setup(false).frames()).toBeGreaterThan(0);
});

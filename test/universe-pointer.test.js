import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
const source = readFileSync(new URL('../site/universe.js', import.meta.url), 'utf8');
function setup(reduce) {
  const events = {}, classes = new Set();
  let frames = 0, bullets = 0;
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
    requestAnimationFrame: () => ++frames, cancelAnimationFrame() {}, addEventListener() {},
    innerHeight:800, devicePixelRatio:1, tr: x => x,
  });
  const pointer = {clientX:150,clientY:100,target:{closest:()=>null}};
  return { events, classes, pointer, frames:()=>frames, bullets:()=>bullets };
}
it('shows a static ship in reduced motion without starting animation or firing', () => {
  const s=setup(true);
  s.events.pointermove(s.pointer);
  expect(s.classes.has('ship-active')).toBe(true);
  expect(s.frames()).toBe(0);
  s.events.pointerdown(s.pointer);
  expect(s.bullets()).toBe(0);
  s.events.pointerleave();
  expect(s.classes.has('ship-active')).toBe(false);
});
it('restores the native cursor over the motion control in reduced motion', () => {
  const s=setup(true);
  s.events.pointermove(s.pointer);
  s.events.pointermove({...s.pointer,target:{closest:()=>({})}});
  expect(s.classes.has('ship-active')).toBe(false);
  expect(s.frames()).toBe(0);
});

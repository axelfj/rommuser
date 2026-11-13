import { expect, it } from 'vitest';
import { needleAt } from '../site/js/page-motion.js';

const stops = [{ x: 100, y: 1000 }, { x: 200, y: 3000 }, { x: 300, y: 4000 }];

it('the dial needle rests on a station when its section reaches the top and glides in between', () => {
  expect(needleAt(0, stops)).toBe(0);
  expect(needleAt(500, stops)).toBe(50);
  expect(needleAt(1000, stops)).toBe(100);
  expect(needleAt(2000, stops)).toBe(150);
  expect(needleAt(4000, stops)).toBe(300);
  expect(needleAt(9000, stops)).toBe(300);
});

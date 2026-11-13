import { expect, it } from 'vitest';
import { stationProgress } from '../site/js/page-motion.js';

const tops = [0, 1000, 3000, 4000];

it('the page counts the stations as the page scrolls: whole numbers at each station, fractions in between', () => {
  expect(stationProgress(0, tops)).toBe(0);
  expect(stationProgress(500, tops)).toBe(0.5);
  expect(stationProgress(1000, tops)).toBe(1);
  expect(stationProgress(2000, tops)).toBe(1.5);
  expect(stationProgress(4000, tops)).toBe(3);
  expect(stationProgress(9000, tops)).toBe(3);
});

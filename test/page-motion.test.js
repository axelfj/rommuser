import { expect, it } from 'vitest';
import { frequencyAt, stationProgress } from '../site/js/page-motion.js';

const tops = [0, 1000, 3000, 4000];

it('the dial counts the stations as the page scrolls: whole numbers at each station, fractions in between', () => {
  expect(stationProgress(0, tops)).toBe(0);
  expect(stationProgress(500, tops)).toBe(0.5);
  expect(stationProgress(1000, tops)).toBe(1);
  expect(stationProgress(2000, tops)).toBe(1.5);
  expect(stationProgress(4000, tops)).toBe(3);
  expect(stationProgress(9000, tops)).toBe(3);
});

it('the frequency glides between the stations', () => {
  const mhz = [88.1, 92.7, 97.3, 101.9];
  expect(frequencyAt(0, mhz)).toBe('88.1');
  expect(frequencyAt(0.5, mhz)).toBe('90.4');
  expect(frequencyAt(3, mhz)).toBe('101.9');
});

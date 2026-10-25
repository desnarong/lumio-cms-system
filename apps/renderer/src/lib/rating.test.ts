import { describe, expect, it } from 'vitest';
import { ratingLabel, starFills } from './rating';

describe('starFills', () => {
  it('fills five stars when the score is perfect', () => {
    expect(starFills(5)).toEqual(['full', 'full', 'full', 'full', 'full']);
  });

  it('splits a half star on a .5 score', () => {
    expect(starFills(4.5)).toEqual(['full', 'full', 'full', 'full', 'half']);
  });

  it('rounds the nearest star when the score is close', () => {
    expect(starFills(4.2)).toEqual(['full', 'full', 'full', 'full', 'empty']);
    expect(starFills(4.8)).toEqual(['full', 'full', 'full', 'full', 'full']);
  });

  it('shows empty stars when there is no score', () => {
    expect(starFills(null)).toEqual(['empty', 'empty', 'empty', 'empty', 'empty']);
  });
});

describe('ratingLabel', () => {
  it('reads the score and the review count', () => {
    expect(ratingLabel(4.5, 32)).toBe('ให้คะแนน 4.5 จาก 5 จาก 32 รีวิว');
  });

  it('drops the count when nobody has reviewed yet', () => {
    expect(ratingLabel(5, 0)).toBe('ให้คะแนน 5.0 จาก 5');
  });
});

import { describe, expect, it } from 'vitest';
import { inr, parseRupees } from './money';

describe('money', () => {
  it('formats with Indian grouping and no decimals', () => {
    expect(inr(120000)).toBe('₹1,20,000');
    expect(inr(45000)).toBe('₹45,000');
    expect(inr(0)).toBe('₹0');
    expect(inr(10000000)).toBe('₹1,00,00,000');
  });

  it('parses typed amounts', () => {
    expect(parseRupees('1,20,000')).toBe(120000);
    expect(parseRupees('₹ 45000')).toBe(45000);
    expect(parseRupees('')).toBeNull();
    expect(parseRupees('abc')).toBeNull();
  });
});

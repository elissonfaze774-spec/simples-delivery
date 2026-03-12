import { describe, it, expect } from 'vitest';
import { sanitizePhone } from './phone';

describe('sanitizePhone', () => {
  it('removes non-digit characters', () => {
    expect(sanitizePhone('+55 (11) 91234-5678')).toBe('5511912345678');
    expect(sanitizePhone(' (11) 99999-9999 ')).toBe('11999999999');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(sanitizePhone(undefined)).toBe('');
    expect(sanitizePhone(null)).toBe('');
    expect(sanitizePhone('')).toBe('');
  });
});

import { describe, it, expect } from 'vitest';
import { lozengeClass, statusAppearance, statusLabel } from '../../src/lib/ui/status';

describe('status lozenges', () => {
  it.each([
    ['pending_budget', 'moved'],
    ['approved', 'success'],
    ['paid', 'success'],
    ['rejected', 'removed'],
    ['issued', 'inprogress'],
    ['draft', 'default'],
    ['APPROVED', 'success'],
    ['something_new', 'default'],
  ])('%s is shown as %s', (status, appearance) => {
    expect(statusAppearance(status)).toBe(appearance);
  });

  it('maps statuses and appearances to badge classes', () => {
    expect(lozengeClass('approved')).toBe('badge badge-success');
    expect(lozengeClass('removed')).toBe('badge badge-danger');
    expect(lozengeClass(null)).toBe('badge');
  });

  it('writes labels in sentence case', () => {
    expect(statusLabel('pending_accounting')).toBe('Pending accounting');
    expect(statusLabel('partially_paid')).toBe('Partially paid');
    expect(statusLabel(undefined)).toBe('Unknown');
  });
});

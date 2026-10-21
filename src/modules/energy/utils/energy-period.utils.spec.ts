import { resolvePeriodRange } from './energy-period.utils';

describe('energy-period utils', () => {
  it('computes today using the application timezone instead of UTC', () => {
    const now = new Date('2026-06-14T02:30:00.000Z');

    const { from } = resolvePeriodRange('today', now, 'America/Sao_Paulo');

    expect(from.toISOString()).toBe('2026-06-13T03:00:00.000Z');
  });
});

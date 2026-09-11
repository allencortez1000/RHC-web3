import { redactSensitive } from '@rhc/shared';
describe('redactSensitive', () => {
  it('does not expose passwords, tokens, or secrets', () => {
    expect(redactSensitive({ password: 'x', token: 'y', nested: { apiSecret: 'z' } })).toEqual({ password: '[REDACTED]', token: '[REDACTED]', nested: { apiSecret: '[REDACTED]' } });
  });
});

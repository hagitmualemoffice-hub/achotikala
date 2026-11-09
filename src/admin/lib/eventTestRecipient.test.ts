import { describe, expect, it } from 'vitest';
import { testRecipient } from '../../../supabase/functions/event-communication-test/recipient';

describe('event test recipient', () => {
  it('sends the test to the chosen address instead of the connected mailbox', () => {
    expect(testRecipient(' other@example.org ', 'connected@example.org')).toBe('other@example.org');
  });
  it('keeps the connected mailbox default for older clients', () => {
    expect(testRecipient(undefined, 'connected@example.org')).toBe('connected@example.org');
  });
  it.each(['', 'not-email', 'a@example.org,b@example.org', 'a@example.org\r\nBcc: b@example.org'])('rejects invalid or multiple test addresses: %s', address => {
    expect(() => testRecipient(address, 'connected@example.org')).toThrow();
  });
});
import { describe, expect, it } from 'vitest';
import { communicationSource } from '../../../supabase/functions/_shared/communicationSource';
import { eventEmailHtml } from '../../../supabase/functions/_shared/eventEmailHtml';
describe('communication source', () => {
  it('system messages use their uploaded image and no event details', () => {
    expect(communicationSource({ communication_kind: 'system', cover_image: 'https://achotikala.com/test.webp' }, null))
      .toEqual({ event: {}, coverUrl: 'https://achotikala.com/test.webp' });
  });
  it('existing event drafts retain their event image and facts', () => {
    const event = { event_date: '2026-11-21', cover_image: 'https://achotikala.com/event.webp' };
    expect(communicationSource({}, event)).toEqual({ event, coverUrl: event.cover_image });
    expect(() => communicationSource({}, null)).toThrow('Event not found');
  });
  it('system email omits event facts and retains the supplied title, image and unsubscribe', () => {
    const html = eventEmailHtml({ title: 'הודעת מערכת', body: 'עדכון', registrationHref: '', logoHtml: '', coverUrl: 'https://achotikala.com/test.webp', event: {}, unsubscribeUrl: 'https://achotikala.com/unsubscribe' });
    expect(html).toContain('https://achotikala.com/test.webp');
    expect(html).toContain('https://achotikala.com/unsubscribe');
    expect(html).not.toContain('calendar.png');
    expect(html).not.toContain('map-pin.png');
    expect(html).not.toContain('רישום מוקדם');
  });
});
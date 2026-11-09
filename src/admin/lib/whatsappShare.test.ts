import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadWhatsappImage } from './whatsappShare';

afterEach(() => vi.unstubAllGlobals());
describe('WhatsApp event image', () => {
  it('returns the actual event image for sharing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['image'], { type: 'image/webp' }) }));
    const file = await loadWhatsappImage('/event.webp', new AbortController().signal);
    expect(file?.type).toBe('image/webp');
    expect(file?.name).toBe('event.webp');
  });
  it('allows text sharing when image loading is cancelled', async () => {
    const controller = new AbortController();
    vi.stubGlobal('fetch', vi.fn((_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))));
    const result = loadWhatsappImage('/event.webp', controller.signal);
    controller.abort();
    expect(await result).toBeNull();
  });
});
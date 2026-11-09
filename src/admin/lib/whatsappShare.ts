export async function loadWhatsappImage(url: string, signal: AbortSignal): Promise<File | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, { signal });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    return new File([blob], `event.${blob.type.split('/')[1] || 'webp'}`, { type: blob.type });
  } catch { return null; }
}
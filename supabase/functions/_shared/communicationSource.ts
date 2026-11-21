/** System announcements use the same email shell without fictional event facts. */
export function communicationSource(draft: { communication_kind?: string; cover_image?: string }, event: Record<string, unknown> | null) {
  if (draft.communication_kind === 'system') return { event: {}, coverUrl: draft.cover_image ?? '' };
  if (!event) throw new Error('Event not found');
  return { event, coverUrl: String(event.cover_image ?? '') };
}
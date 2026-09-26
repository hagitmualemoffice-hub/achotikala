import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

const BUCKET = 'community-files';
const MAX_BYTES = 10 * 1024 * 1024;

/** Authenticated + authorized community member, verified server-side. */
const member = async (req: Request) => {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const db = admin();
  const { data, error } = await db.auth.getUser(auth.slice(7));
  if (error || !data.user) return null;
  const { data: ok } = await db.rpc('community_is_member', { _user_id: data.user.id });
  return ok === true ? { db, user: data.user } : null;
};

const kindFor = (name: string, type: string) => {
  const n = name.toLowerCase();
  if (/\.(xlsx?|csv)$/.test(n)) return 'excel';
  if (n.endsWith('.pdf')) return 'pdf';
  if (/^image\//.test(type)) return 'image';
  if (/\.(docx?|txt|rtf)$/.test(n)) return 'doc';
  return 'file';
};

const prettySize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const session = await member(req);
  if (!session) return json({ error: 'not_authorized' }, 403);
  const { db, user } = session;

  try {
    const ct = req.headers.get('content-type') ?? '';

    // ---- upload (multipart) ----
    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return json({ error: 'no_file' }, 400);
      if (file.size > MAX_BYTES) return json({ error: 'too_large' }, 400);

      const safe = (file.name || 'file').replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(-80);
      const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
      const { error } = await db.storage
        .from(BUCKET)
        .upload(path, new Uint8Array(await file.arrayBuffer()), {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });
      if (error) return json({ error: error.message }, 500);

      return json({
        storage_path: path,
        title: file.name,
        kind: kindFor(file.name, file.type),
        meta: prettySize(file.size),
      });
    }

    // ---- signed download url ----
    const body = await req.json().catch(() => ({}));
    const attachmentId = body?.attachment_id as string | undefined;
    const toolId = body?.tool_id as string | undefined;
    let path: string | null = null;
    let name: string | null = null;

    if (attachmentId) {
      const { data } = await db
        .from('community_attachments')
        .select('storage_path,title')
        .eq('id', attachmentId)
        .maybeSingle();
      path = data?.storage_path ?? null;
      name = data?.title ?? null;
    } else if (toolId) {
      const { data } = await db
        .from('community_tools')
        .select('storage_path,title,status')
        .eq('id', toolId)
        .maybeSingle();
      if (data?.status === 'approved') {
        path = data.storage_path ?? null;
        name = data.title ?? null;
      }
    }
    if (!path) return json({ error: 'not_found' }, 404);

    const { data: signed, error: signErr } = await db.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 10, { download: name ?? undefined });
    if (signErr) return json({ error: signErr.message }, 500);
    return json({ url: signed.signedUrl });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});

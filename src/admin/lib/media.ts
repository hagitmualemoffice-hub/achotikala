import { supabase } from "@/integrations/supabase/client";

export async function uploadToMedia(
  file: Blob,
  filename: string,
  altText?: string,
): Promise<{ path: string; url: string; assetId: string }> {
  const ext = filename.split(".").pop() || "png";
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
    contentType: (file as File).type || `image/${ext}`,
    upsert: false,
  });
  if (upErr) throw upErr;

  // 10-year signed URL (bucket is private due to workspace policy)
  const { data: signed, error: signErr } = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signErr) throw signErr;

  const publicUrl = signed.signedUrl;
  const size = (file as File).size ?? 0;
  const mime = (file as File).type ?? `image/${ext}`;

  const { data: asset, error: insErr } = await supabase
    .from("media_assets")
    .insert({
      storage_path: path,
      public_url: publicUrl,
      filename: safeName,
      alt_text: altText ?? null,
      mime_type: mime,
      size_bytes: size,
    })
    .select()
    .single();
  if (insErr) throw insErr;

  return { path, url: publicUrl, assetId: asset.id };
}

export async function uploadBase64ToMedia(
  base64: string,
  filename: string,
  altText?: string,
) {
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], { type: "image/png" });
  return uploadToMedia(blob, filename, altText);
}

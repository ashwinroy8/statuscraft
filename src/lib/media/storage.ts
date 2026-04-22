import { createClient } from "@supabase/supabase-js";

const BUCKET = "statuscraft-media";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function uploadToStorage(
  sourceUrl: string,
  destPath: string
): Promise<string> {
  const supabase = getSupabase();
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} — URL: ${sourceUrl.slice(0, 200)}`);

  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "image/jpeg";

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(destPath, buffer, { contentType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(destPath);

  return publicUrl;
}

export async function uploadFileToStorage(
  file: Buffer | ArrayBuffer,
  destPath: string,
  contentType: string
): Promise<string> {
  const supabase = getSupabase();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(destPath, file, { contentType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(destPath);

  return publicUrl;
}

export async function deleteFromStorage(path: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.storage.from(BUCKET).remove([path]);
}

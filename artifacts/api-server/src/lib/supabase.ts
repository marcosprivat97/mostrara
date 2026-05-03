import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseClient;
}

export const BUCKET = "vitrinepro-photos";

export async function uploadImageToSupabase(
  base64Data: string,
  mimeType: string,
  folder: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Clean, "base64");
    const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: mimeType || "image/jpeg",
        upsert: false,
      });

    if (error) {
      return null;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return data.publicUrl;
  } catch {
    return null;
  }
}

export async function deleteImageFromSupabase(url: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !supabaseUrl) return;

  try {
    const publicPrefix = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/`;
    if (!url.startsWith(publicPrefix)) return;
    const path = url.slice(publicPrefix.length);
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // ignore
  }
}

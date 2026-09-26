import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

let supabaseClient = null;

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  const bucket = process.env.SUPABASE_BUCKET || "prava-documents";
  const isConfigured = Boolean(
    url &&
    key &&
    !url.includes("your-project") &&
    !key.includes("your-")
  );
  return { url, key, bucket, isConfigured };
}

export function getSupabaseClient() {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key, {
        auth: { persistSession: false },
      });
    } catch (err) {
      console.warn("[Supabase] Failed to initialize client:", err.message);
      return null;
    }
  }
  return supabaseClient;
}

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), ".storage_cache");
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  try {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
  } catch {}
}

export async function uploadToSupabase(relKey, data, contentType = "application/octet-stream") {
  const { bucket, isConfigured } = getSupabaseConfig();
  const client = getSupabaseClient();
  const normalizedKey = relKey.replace(/^\/+/, "");
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const dotIndex = normalizedKey.lastIndexOf(".");
  const uniqueKey =
    dotIndex === -1
      ? `${normalizedKey}_${hash}`
      : `${normalizedKey.slice(0, dotIndex)}_${hash}${normalizedKey.slice(dotIndex)}`;

  const buffer =
    typeof data === "string"
      ? Buffer.from(data)
      : data instanceof Buffer
      ? data
      : Buffer.from(await (data?.arrayBuffer ? data.arrayBuffer() : []));

  if (isConfigured && client) {
    try {
      const { data: uploadData, error } = await client.storage
        .from(bucket)
        .upload(uniqueKey, buffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.warn("[Supabase] Upload error:", error.message);
        throw error;
      }

      const { data: urlData } = client.storage.from(bucket).getPublicUrl(uniqueKey);
      return {
        key: uniqueKey,
        url: urlData?.publicUrl || `/api/storage/${uniqueKey}`,
        provider: "supabase",
        bucket,
      };
    } catch (err) {
      console.warn("[Supabase Storage] Fallback to local cache due to upload failure:", err.message);
    }
  }

  // Resilient local storage fallback
  const localFilePath = path.join(LOCAL_STORAGE_DIR, uniqueKey.replace(/\//g, "_"));
  fs.writeFileSync(localFilePath, buffer);
  return {
    key: uniqueKey,
    url: `/api/storage/${encodeURIComponent(uniqueKey)}`,
    provider: "local_cache",
    bucket: "local-dev",
  };
}

export async function getSupabaseSignedUrl(relKey, expiresInSeconds = 3600) {
  const { bucket, isConfigured } = getSupabaseConfig();
  const client = getSupabaseClient();
  const normalizedKey = relKey.replace(/^\/+/, "");

  if (isConfigured && client) {
    try {
      const { data, error } = await client.storage
        .from(bucket)
        .createSignedUrl(normalizedKey, expiresInSeconds);
      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch (err) {
      console.warn("[Supabase] Signed URL error:", err.message);
    }
  }

  return `/api/storage/${encodeURIComponent(normalizedKey)}`;
}

export async function getSupabaseFile(relKey) {
  const { bucket, isConfigured } = getSupabaseConfig();
  const client = getSupabaseClient();
  const normalizedKey = relKey.replace(/^\/+/, "");

  if (isConfigured && client) {
    try {
      const { data, error } = await client.storage.from(bucket).download(normalizedKey);
      if (!error && data) {
        const buffer = Buffer.from(await data.arrayBuffer());
        return { buffer, contentType: data.type || "application/octet-stream" };
      }
    } catch (err) {
      console.warn("[Supabase] Download error:", err.message);
    }
  }

  const localFilePath = path.join(LOCAL_STORAGE_DIR, normalizedKey.replace(/\//g, "_"));
  if (fs.existsSync(localFilePath)) {
    const buffer = fs.readFileSync(localFilePath);
    return { buffer, contentType: "application/octet-stream" };
  }
  return null;
}

import {
  uploadToSupabase,
  getSupabaseSignedUrl,
  getSupabaseConfig,
  getSupabaseFile,
} from "./supabaseStorage.js";

function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey,
  data,
  contentType = "application/octet-stream"
) {
  return uploadToSupabase(relKey, data, contentType);
}

export async function storageGet(relKey) {
  const key = normalizeKey(relKey);
  const signedUrl = await getSupabaseSignedUrl(key, 7200);
  return { key, url: signedUrl };
}

export async function storageGetSignedUrl(relKey) {
  return getSupabaseSignedUrl(relKey, 3600);
}

export async function getStorageHealth() {
  const config = getSupabaseConfig();
  return {
    provider: config.isConfigured ? "supabase" : "local_cache",
    configured: config.isConfigured,
    bucket: config.bucket,
    supabaseUrl: config.url ? config.url.replace(/https?:\/\//, "").split(".")[0] : null,
  };
}

export { getSupabaseFile };

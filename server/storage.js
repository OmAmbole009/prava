import {
  uploadToSupabase,
  getSupabaseSignedUrl,
  getSupabaseConfig,
  getSupabaseFile,
  probeSupabaseStorage,
  isProductionRuntime,
  describeSupabaseEnvironment,
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

/**
 * Reports whether uploaded documents are actually durable. `durable` is only
 * true when a live write/sign/delete probe against the configured bucket
 * succeeds, so "configured but broken" can never look healthy.
 */
export async function getStorageHealth({ force = false } = {}) {
  const config = getSupabaseConfig();
  const probe = await probeSupabaseStorage({ force });
  return {
    provider: config.isConfigured ? "supabase" : isProductionRuntime() ? "unconfigured" : "local_cache",
    configured: config.isConfigured,
    durable: probe.canWrite,
    bucket: config.bucket,
    supabaseUrl: config.url ? config.url.replace(/https?:\/\//, "").split(".")[0] : null,
    // Names and shapes only: lets a deploy be diagnosed without dashboard access.
    environment: describeSupabaseEnvironment(),
    probe,
  };
}

export { getSupabaseFile, probeSupabaseStorage };

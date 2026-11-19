import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

let supabaseClient = null;

/**
 * Raised when durable document storage is missing or failing on a deployed
 * server. Carrying `statusCode`/`code`/`hint` lets the API surface an
 * actionable message instead of a generic failure (see sendError).
 */
export class StorageUnavailableError extends Error {
  constructor(message, { code = "STORAGE_UNAVAILABLE", hint, details, statusCode = 503 } = {}) {
    super(message);
    this.name = "StorageUnavailableError";
    this.statusCode = statusCode;
    this.code = code;
    this.hint = hint;
    this.details = details;
  }
}

// Environment values pasted into hosting dashboards routinely keep surrounding
// quotes or a trailing space, which makes Supabase reject every request.
function cleanEnvValue(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^["']+|["']+$/g, "").trim();
}

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

// Hosting dashboards are often filled in with a different but equivalent name
// (`SUPABASE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, ...). Accepting the common
// spellings avoids a deploy that silently has no storage at all.
const URL_ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_PROJECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "VITE_SUPABASE_URL",
];
const KEY_ENV_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_KEY",
  "SUPABASE_SERVICE_ROLE",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_ANON_KEY",
];
const BUCKET_ENV_KEYS = ["SUPABASE_BUCKET", "SUPABASE_STORAGE_BUCKET"];

function readFirstEnv(names) {
  for (const name of names) {
    const value = cleanEnvValue(process.env[name]);
    if (value) return { value, name };
  }
  return { value: "", name: null };
}

export function getSupabaseConfig() {
  const urlEntry = readFirstEnv(URL_ENV_KEYS);
  const keyEntry = readFirstEnv(KEY_ENV_KEYS);
  const bucketEntry = readFirstEnv(BUCKET_ENV_KEYS);
  const url = urlEntry.value;
  const key = keyEntry.value;
  const bucket = bucketEntry.value || "prava-documents";
  const isConfigured = Boolean(
    url &&
    key &&
    !url.includes("your-project") &&
    !key.includes("your-")
  );
  return {
    url,
    key,
    bucket,
    isConfigured,
    urlSource: urlEntry.name,
    keySource: keyEntry.name,
    bucketSource: bucketEntry.name,
  };
}

/**
 * Describes what the running process can actually see about Supabase without
 * ever exposing a secret value. Hosting dashboards silently keep values on the
 * wrong service, under a mistyped name, or un-saved, and without this the only
 * symptom is a permanent "not configured" error in the UI.
 */
export function describeSupabaseEnvironment() {
  const { url, key, bucket, isConfigured, urlSource, keySource } = getSupabaseConfig();
  let urlHost = null;
  if (url) {
    try {
      urlHost = new URL(url).host;
    } catch {
      urlHost = "(invalid URL)";
    }
  }
  return {
    nodeEnv: process.env.NODE_ENV || null,
    // Names only, never values: this answers "did the host inject them at all?".
    visibleKeys: Object.keys(process.env)
      .filter((name) => /^SUPABASE/i.test(name))
      .sort(),
    urlPresent: Boolean(url),
    urlSource,
    keySource,
    urlHost,
    serviceKeyPresent: Boolean(key),
    serviceKeyLength: key.length,
    serviceKeyKind: !key
      ? "missing"
      : key.startsWith("sb_secret")
      ? "sb_secret"
      : key.startsWith("sb_")
      ? "sb_publishable"
      : key.startsWith("eyJ")
      ? "jwt"
      : "other",
    bucket,
    isConfigured,
  };
}

function storageConfigHint(env = describeSupabaseEnvironment()) {
  if (env.visibleKeys.length === 0) {
    return (
      "The running server sees no SUPABASE_* environment variables at all. " +
      "Add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_BUCKET to the Environment tab of this exact " +
      "Render service, save, then redeploy so the process restarts with them."
    );
  }
  const missing = [];
  if (!env.urlPresent) missing.push("SUPABASE_URL");
  if (!env.serviceKeyPresent) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!missing.length) {
    return `The server sees ${env.visibleKeys.join(
      ", "
    )} but they still look like placeholder values. Replace them with the real Supabase project values and redeploy.`;
  }
  return `The server sees ${env.visibleKeys.join(", ")} but ${missing.join(
    " and "
  )} is empty or missing. Fix the name/value on this Render service and redeploy.`;
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

const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
const LOCAL_STORAGE_DIR = isTestEnv
  ? path.resolve(process.cwd(), "scratch", "test_storage_cache")
  : path.resolve(process.cwd(), ".storage_cache");

if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  try {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
  } catch {}
}

function contentTypeForKey(key, fallback = "application/octet-stream") {
  const ext = path.extname(key).toLowerCase();
  const map = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".txt": "text/plain",
    ".json": "application/json",
  };
  return map[ext] || fallback;
}

function writeLocalCache(uniqueKey, buffer) {
  const localFilePath = path.join(LOCAL_STORAGE_DIR, uniqueKey.replace(/\//g, "_"));
  fs.writeFileSync(localFilePath, buffer);
  return {
    key: uniqueKey,
    url: `/api/storage/${encodeURIComponent(uniqueKey)}`,
    provider: "local_cache",
    bucket: "local-dev",
  };
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

  if (!isConfigured || !client) {
    if (isProductionRuntime()) {
      // A container filesystem is wiped on every deploy, so writing here would
      // report success while guaranteeing the document is lost. Fail loudly.
      const environment = describeSupabaseEnvironment();
      throw new StorageUnavailableError(
        "Document storage is not configured on the server, so uploads would not be kept.",
        {
          code: "STORAGE_NOT_CONFIGURED",
          hint: storageConfigHint(environment),
          details: { environment },
        }
      );
    }
    return writeLocalCache(uniqueKey, buffer);
  }

  let uploadError = null;
  try {
    const { data: uploadData, error } = await client.storage
      .from(bucket)
      .upload(uniqueKey, buffer, {
        contentType,
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = client.storage.from(bucket).getPublicUrl(uniqueKey);
    return {
      key: uniqueKey,
      url: urlData?.publicUrl || `/api/storage/${uniqueKey}`,
      provider: "supabase",
      bucket,
    };
  } catch (err) {
    uploadError = err;
    console.error("[Supabase] Upload failed:", err?.message || err);
  }

  if (isProductionRuntime()) {
    throw new StorageUnavailableError(
      "The document could not be saved to durable storage.",
      {
        code: "STORAGE_UPLOAD_FAILED",
        hint: "Check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and that the storage bucket exists in Supabase.",
        details: { reason: uploadError?.message || String(uploadError) },
      }
    );
  }

  console.warn("[Supabase Storage] Falling back to local development cache due to upload failure:", uploadError?.message);
  return writeLocalCache(uniqueKey, buffer);
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
      console.warn("[Supabase] Signed URL error:", error?.message);
    } catch (err) {
      console.warn("[Supabase] Signed URL error:", err.message);
    }
    // Signing can fail transiently; the same-origin proxy still streams the
    // object straight from Supabase, so the preview stays available.
    return `/api/storage/${encodeURIComponent(normalizedKey)}`;
  }

  if (isProductionRuntime()) {
    const environment = describeSupabaseEnvironment();
    throw new StorageUnavailableError(
      "Document storage is not configured on the server, so this file cannot be retrieved.",
      {
        code: "STORAGE_NOT_CONFIGURED",
        hint: storageConfigHint(environment),
        details: { environment },
      }
    );
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
        return { buffer, contentType: contentTypeForKey(normalizedKey, data.type || "application/octet-stream") };
      }
      if (error) console.warn("[Supabase] Download error:", error.message);
    } catch (err) {
      console.warn("[Supabase] Download error:", err.message);
    }
  }

  const localFilePath = path.join(LOCAL_STORAGE_DIR, normalizedKey.replace(/\//g, "_"));
  if (!isProductionRuntime() && fs.existsSync(localFilePath)) {
    const buffer = fs.readFileSync(localFilePath);
    return { buffer, contentType: contentTypeForKey(normalizedKey) };
  }
  return null;
}

let probeCache = { at: 0, result: null };

/**
 * Proves whether the deployed server can actually persist documents: writes a
 * tiny object, signs it, then removes it. Cached so the health endpoint is
 * cheap to poll.
 */
export async function probeSupabaseStorage({ force = false } = {}) {
  const now = Date.now();
  if (!force && probeCache.result && now - probeCache.at < 60_000) {
    return probeCache.result;
  }

  const { bucket, isConfigured, url } = getSupabaseConfig();
  const client = getSupabaseClient();
  const result = {
    configured: isConfigured,
    bucket,
    project: url ? url.replace(/https?:\/\//, "").split(".")[0] : null,
    canWrite: false,
    canSign: false,
    error: null,
    checkedAt: new Date().toISOString(),
  };

  if (!isConfigured || !client) {
    result.error = "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing on the server.";
    probeCache = { at: now, result };
    return result;
  }

  const probeKey = `health/probe-${now}.txt`;
  try {
    const uploaded = await client.storage
      .from(bucket)
      .upload(probeKey, Buffer.from("ok"), { contentType: "text/plain", upsert: true });
    if (uploaded.error) throw uploaded.error;
    result.canWrite = true;

    const signed = await client.storage.from(bucket).createSignedUrl(probeKey, 30);
    result.canSign = !signed.error && Boolean(signed.data?.signedUrl);
    if (signed.error) result.error = signed.error.message;

    const removed = await client.storage.from(bucket).remove([probeKey]);
    if (removed.error && !result.error) result.error = removed.error.message;
  } catch (err) {
    result.error = err?.message || String(err);
  }

  probeCache = { at: now, result };
  return result;
}

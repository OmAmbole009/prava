import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSupabaseSignedUrl, uploadToSupabase } from "./supabaseStorage.js";

const savedEnv = {
  NODE_ENV: process.env.NODE_ENV,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
};

function restore(key) {
  if (savedEnv[key] === undefined) delete process.env[key];
  else process.env[key] = savedEnv[key];
}

afterEach(() => {
  Object.keys(savedEnv).forEach(restore);
});

describe("Durable document storage", () => {
  describe("on a deployed server without Supabase configured", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_ANON_KEY;
    });

    it("refuses an upload instead of writing to the ephemeral container filesystem", async () => {
      await expect(uploadToSupabase("businesses/1/documents/a.pdf", Buffer.from("%PDF"), "application/pdf"))
        .rejects.toMatchObject({ code: "STORAGE_NOT_CONFIGURED", statusCode: 503 });
    });

    it("refuses to hand back a link that cannot be served", async () => {
      await expect(getSupabaseSignedUrl("businesses/1/documents/a.pdf"))
        .rejects.toMatchObject({ code: "STORAGE_NOT_CONFIGURED", statusCode: 503 });
    });
  });

  describe("in development", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "test";
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_ANON_KEY;
    });

    it("keeps the local cache fallback so local work needs no cloud credentials", async () => {
      const stored = await uploadToSupabase("businesses/1/documents/dev.pdf", Buffer.from("%PDF"), "application/pdf");
      expect(stored.provider).toBe("local_cache");
      expect(stored.url).toMatch(/^\/api\/storage\//);
      expect(stored.key).toMatch(/^businesses\/1\/documents\/dev_[0-9a-f]{8}\.pdf$/);
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  authenticateWithGoogle,
  createMockGoogleIdToken,
  getGoogleOAuthConfiguration,
  sanitizeGoogleClientId,
  verifyGoogleIdToken,
} from "./services/googleAuth.service.js";
import { inMemoryUsers, getUserByEmail, getUserByOpenId } from "./db.js";

describe("PHASE 3: Google Authentication & Account Security Tests", () => {
  const dummyCtx = {
    req: { ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } },
    res: {
      cookie: () => {},
      clearCookie: () => {},
      setHeader: () => {},
    },
  };

  it("1. Reports Google OAuth configuration honestly", () => {
    const config = getGoogleOAuthConfiguration();
    expect(config).toBeDefined();
    expect(config.configured).toBeTypeOf("boolean");
    if (!process.env.GOOGLE_CLIENT_ID) {
      expect(config.configured).toBe(false);
      expect(config.clientId).toBeNull();
    }
  });

  it("1b. Normalises pasted Google client IDs and rejects non-web clients", () => {
    expect(sanitizeGoogleClientId('  "123-abc.apps.googleusercontent.com"  ')).toBe(
      "123-abc.apps.googleusercontent.com"
    );
    expect(sanitizeGoogleClientId("   ")).toBeNull();
    expect(sanitizeGoogleClientId(undefined)).toBeNull();

    const previous = process.env.GOOGLE_CLIENT_ID;
    try {
      process.env.GOOGLE_CLIENT_ID = "not-a-web-client-id";
      const invalid = getGoogleOAuthConfiguration();
      expect(invalid.configured).toBe(false);
      expect(invalid.clientId).toBeNull();

      process.env.GOOGLE_CLIENT_ID = "123-abc.apps.googleusercontent.com";
      const valid = getGoogleOAuthConfiguration();
      expect(valid.configured).toBe(true);
      expect(valid.clientId).toBe("123-abc.apps.googleusercontent.com");
      expect(valid.clientSecretConfigured).toBeTypeOf("boolean");
    } finally {
      if (previous === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = previous;
    }
  });

  it("2. Rejects empty or invalid Google ID tokens", async () => {
    await expect(verifyGoogleIdToken("")).rejects.toThrow("Google identity token is required.");
    await expect(verifyGoogleIdToken("invalid.jwt.token")).rejects.toThrow();
  });

  it("3. Rejects Google account if email is unverified", async () => {
    const unverifiedToken = await createMockGoogleIdToken({
      sub: "unverified-google-sub-1",
      email: "unverified@domain.com",
      email_verified: false,
    });

    await expect(authenticateWithGoogle(dummyCtx, { credential: unverifiedToken }))
      .rejects.toThrow("verified");
  });

  it("4. Authenticates new user via verified Google ID token", async () => {
    const testSub = "google-user-sub-889911";
    const testEmail = "sarah.connor@cybertech.io";
    const testName = "Sarah Connor";

    const validToken = await createMockGoogleIdToken({
      sub: testSub,
      email: testEmail,
      name: testName,
      email_verified: true,
    });

    const result = await authenticateWithGoogle(dummyCtx, { credential: validToken });
    expect(result.success).toBe(true);
    expect(result.user.email).toBe(testEmail);
    expect(result.user.name).toBe(testName);
    expect(result.user.loginMethod).toBe("google");
    expect(result.token).toBeDefined();

    // Verify user exists in database/store
    const saved = await getUserByOpenId(`google_${testSub}`);
    expect(saved).toBeDefined();
    expect(saved.email).toBe(testEmail);
  });

  it("5. Secure Account Linking: Links Google login to an existing user with matching verified email", async () => {
    // Setup an existing local user
    const existingEmail = "robert.langdon@harvard.edu";
    const existingLocalUser = {
      id: 9912,
      openId: "local-robert-langdon-id",
      name: "Robert Langdon",
      email: existingEmail,
      loginMethod: "local_auth",
      passwordHash: "salted_hash_val_abc",
      passwordSalt: "salt_123",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    inMemoryUsers.set(existingLocalUser.openId, existingLocalUser);

    const linkingSub = "google-sub-linked-robert";
    const linkingToken = await createMockGoogleIdToken({
      sub: linkingSub,
      email: existingEmail,
      name: "Prof. Robert Langdon",
      email_verified: true,
    });

    const result = await authenticateWithGoogle(dummyCtx, { credential: linkingToken });
    expect(result.success).toBe(true);
    expect(result.user.id).toBe(existingLocalUser.id);
    expect(result.user.email).toBe(existingEmail);

    // Existing password hash must be preserved!
    const linkedUser = await getUserByEmail(existingEmail);
    expect(linkedUser.passwordHash).toBe("salted_hash_val_abc");
    expect(linkedUser.openId).toBe(`google_${linkingSub}`);
  });

  it("6. Re-authenticates returning Google user without creating duplicates", async () => {
    const returningSub = "google-sub-returning-user";
    const returningEmail = "alice@wonderland.co";

    const token1 = await createMockGoogleIdToken({
      sub: returningSub,
      email: returningEmail,
      name: "Alice",
      email_verified: true,
    });

    // First login
    await authenticateWithGoogle(dummyCtx, { credential: token1 });
    const userCount1 = inMemoryUsers.size;

    // Second login
    const token2 = await createMockGoogleIdToken({
      sub: returningSub,
      email: returningEmail,
      name: "Alice",
      email_verified: true,
    });
    const result2 = await authenticateWithGoogle(dummyCtx, { credential: token2 });
    expect(result2.success).toBe(true);

    const userCount2 = inMemoryUsers.size;
    expect(userCount2).toBe(userCount1); // No duplicate users created!
  });
});

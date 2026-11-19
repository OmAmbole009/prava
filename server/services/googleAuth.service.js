import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import { HttpError } from "../../shared/_core/errors.js";
import {
  getUserByEmail,
  getUserByOpenId,
  getBusinessesForUser,
  inMemoryUsers,
  saveDbStateToDisk,
  getDb,
} from "../db.js";
import { users } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { createAuthenticatedSession } from "./session.service.js";

const GOOGLE_CERTS_URL = new URL("https://www.googleapis.com/oauth2/v3/certs");
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

// Remote JWKS set for Google public certificate verification
let remoteGoogleJWKS = null;
function getGoogleJWKS() {
  if (!remoteGoogleJWKS) {
    remoteGoogleJWKS = createRemoteJWKSet(GOOGLE_CERTS_URL);
  }
  return remoteGoogleJWKS;
}

// Local mock test secret for deterministic test suites
const TEST_GOOGLE_SECRET = new TextEncoder().encode("prava-test-google-oauth-secret-key-256bits");

/**
 * Normalises a Google OAuth client ID. Dashboard copy/paste frequently leaves
 * surrounding quotes or whitespace, which makes Google reject the value and the
 * GIS flow then aborts to accounts.google.com/gsi/transform.
 */
export function sanitizeGoogleClientId(raw) {
  if (raw === undefined || raw === null) return null;
  const cleaned = String(raw)
    .trim()
    .replace(/^["']+/, "")
    .replace(/["']+$/, "")
    .trim();
  return cleaned ? cleaned : null;
}

function isWebClientId(value) {
  return Boolean(value && /\.apps\.googleusercontent\.com$/i.test(value));
}

export function isGoogleOAuthConfigured() {
  return isWebClientId(sanitizeGoogleClientId(process.env.GOOGLE_CLIENT_ID));
}

export function getGoogleOAuthConfiguration() {
  const clientId = sanitizeGoogleClientId(process.env.GOOGLE_CLIENT_ID);
  const configured = isWebClientId(clientId);

  const appOrigin = (process.env.APP_URL || process.env.APP_ORIGIN || "")
    .trim()
    .replace(/\/$/, "");
  const defaultRedirect = appOrigin ? `${appOrigin}/api/auth/google/callback` : null;
  const redirectUri =
    (process.env.GOOGLE_REDIRECT_URI || "").trim() || defaultRedirect || null;

  return {
    configured,
    clientId: configured ? clientId : null,
    redirectUri,
    // The redirect (authorization code) flow can only work when the server also
    // has a client secret to exchange the code. GIS credential flow does not.
    clientSecretConfigured: Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim()),
  };
}


/**
 * Asks Google whether the configured OAuth client and redirect URI are usable.
 * Either problem makes Google refuse the request, which strands the user on
 * accounts.google.com/signin/oauth/error. There is no API to read an OAuth
 * client's configuration, so we start a real authorization request and read
 * Google's answer:
 *
 *   redirect_uri_mismatch -> the client exists but this URI is not registered
 *   invalid_client        -> no such client: GOOGLE_CLIENT_ID is wrong/stale
 *
 * Returns { state } with state "registered", "redirect_uri_mismatch",
 * "client_not_found" or "unknown" (Google unreachable) so callers never block
 * on failure.
 */
const REGISTRATION_TTL_MS = 5 * 60 * 1000;
const registrationCache = new Map();

export function buildGoogleAuthorizationUrl(clientId, redirectUri) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function checkGoogleOAuthClient({ clientId, redirectUri }) {
  if (!clientId || !redirectUri) return { state: "unknown" };

  const cacheKey = `${clientId}|${redirectUri}`;
  const cached = registrationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let value = { state: "unknown" };
  try {
    const response = await fetch(buildGoogleAuthorizationUrl(clientId, redirectUri), {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(3000),
    });
    const location = response.headers.get("location") || "";
    if (location.includes("signin/oauth/error")) {
      const authError = new URL(location, "https://accounts.google.com").searchParams.get("authError") || "";
      let decoded = "";
      try {
        decoded = Buffer.from(authError, "base64").toString("utf8");
      } catch {
        decoded = "";
      }
      if (decoded.includes("invalid_client")) {
        value = { state: "client_not_found" };
      } else if (decoded.includes("redirect_uri_mismatch")) {
        value = { state: "redirect_uri_mismatch" };
      } else {
        value = { state: "registered" };
      }
    } else if (response.status >= 300 && response.status < 400 && location) {
      // Google accepted the parameters and moved on to sign-in/consent.
      value = { state: "registered" };
    }
  } catch {
    value = { state: "unknown" };
  }

  // Only remember a definite answer; "unknown" is retried next time.
  if (value.state !== "unknown") {
    registrationCache.set(cacheKey, { value, expiresAt: Date.now() + REGISTRATION_TTL_MS });
  }
  return value;
}

/**
 * Validates Google ID token / credential server-side.
 * Never trusts unverified claims or untrusted frontend assertions.
 */
export async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    throw new HttpError(400, "Google identity token is required.");
  }

  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

  // In test environment, allow verifying tokens signed with TEST_GOOGLE_SECRET
  if (isTest) {
    try {
      const verified = await jwtVerify(idToken, TEST_GOOGLE_SECRET);
      if (verified.payload && verified.payload.email) {
        return {
          sub: verified.payload.sub || "google-test-sub-12345",
          email: verified.payload.email.toLowerCase().trim(),
          email_verified: verified.payload.email_verified ?? true,
          name: verified.payload.name || "Google Test User",
          picture: verified.payload.picture || null,
        };
      }
    } catch {
      // Fall through to live Google JWKS verification
    }
  }

  const clientId = sanitizeGoogleClientId(process.env.GOOGLE_CLIENT_ID);
  const jwks = getGoogleJWKS();

  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: GOOGLE_ISSUERS,
      audience: clientId || undefined,
    });

    if (!payload.sub || !payload.email) {
      throw new HttpError(401, "Google token is missing essential identity claims.");
    }

    if (payload.email_verified === false) {
      throw new HttpError(401, "Google email address must be verified before sign in.");
    }

    return {
      sub: payload.sub,
      email: String(payload.email).toLowerCase().trim(),
      email_verified: Boolean(payload.email_verified),
      name: payload.name ? String(payload.name).trim() : null,
      picture: payload.picture ? String(payload.picture).trim() : null,
    };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(401, `Google identity verification failed: ${err.message}`);
  }
}

/**
 * Creates a signed test Google ID token for automated test suites.
 */
export async function createMockGoogleIdToken({ sub = "mock-google-sub-99", email, name = "Mock Google User", email_verified = true }) {
  return await new SignJWT({
    sub,
    email,
    name,
    email_verified,
    iss: "https://accounts.google.com",
    aud: process.env.GOOGLE_CLIENT_ID || "prava-client-id",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(TEST_GOOGLE_SECRET);
}

/**
 * Authenticates or registers a user via verified Google claims.
 * Enforces strict account linking rules and server-side RBAC session creation.
 */
export async function authenticateWithGoogle(ctx, { credential, code, redirectUri }) {
  let claims;

  if (credential) {
    claims = await verifyGoogleIdToken(credential);
  } else if (code) {
    claims = await exchangeGoogleAuthCode({ code, redirectUri });
  } else {
    throw new HttpError(400, "Google credential or authorization code is required.");
  }

  const { sub, email, name, email_verified } = claims;

  if (!email_verified) {
    throw new HttpError(401, "Your Google email address is not verified by Google.");
  }

  const googleOpenId = `google_${sub}`;
  const db = await getDb();

  // 1. Check if user already registered with this exact Google openId
  let user = await getUserByOpenId(googleOpenId);

  // 2. If not found by Google openId, check by verified email address
  if (!user && email) {
    const existingByEmail = await getUserByEmail(email);
    if (existingByEmail) {
      // Account linking: User exists with matching verified email
      user = existingByEmail;
      user.openId = googleOpenId;
      user.loginMethod = user.loginMethod || "google";
      user.lastSignedIn = new Date();

      if (db) {
        await db.update(users).set({
          openId: googleOpenId,
          lastSignedIn: new Date(),
        }).where(eq(users.id, user.id));
      } else {
        inMemoryUsers.set(googleOpenId, user);
        saveDbStateToDisk();
      }
    }
  }

  // 3. If no user exists, safely provision a new business user account
  if (!user) {
    const now = new Date();
    const newUser = {
      id: inMemoryUsers.size + 101,
      openId: googleOpenId,
      name: name || email.split("@")[0],
      email: email.toLowerCase(),
      phone: null,
      passwordHash: null,
      passwordSalt: null,
      loginMethod: "google",
      role: "user",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };

    if (db) {
      const inserted = await db.insert(users).values({
        openId: googleOpenId,
        name: newUser.name,
        email: newUser.email,
        loginMethod: "google",
        role: "user",
        createdAt: now,
        updatedAt: now,
        lastSignedIn: now,
      }).$returningId();
      newUser.id = inserted[0]?.id || newUser.id;
    } else {
      inMemoryUsers.set(googleOpenId, newUser);
      saveDbStateToDisk();
    }
    user = newUser;
  } else {
    user.lastSignedIn = new Date();
    if (!db) saveDbStateToDisk();
  }

  // Issue real secure JWT session token & HttpOnly cookie
  const token = await createAuthenticatedSession(ctx, user);

  const userBusinesses = user.id ? await getBusinessesForUser(user.id) : [];
  const hasWorkspace = Boolean(userBusinesses && userBusinesses.length > 0);
  const normalizedRole = user.role === "admin" ? "admin" : user.role === "ca" ? "ca" : "user";

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: normalizedRole,
      loginMethod: "google",
    },
    role: normalizedRole,
    redirectTo: normalizedRole === "admin" ? "/admin/billing" : hasWorkspace ? "/dashboard" : "/onboarding",
    hasWorkspace,
    token,
  };
}

/**
 * Exchanges Google OAuth 2.0 authorization code for tokens.
 * Gracefully handles missing server-side OAuth configuration.
 */
export async function exchangeGoogleAuthCode({ code, redirectUri }) {
  const clientId = sanitizeGoogleClientId(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    // Server-side OAuth not configured; fall back to verifying any id_token
    // that might be included in the token response, but inform the user.
    throw new HttpError(
      500,
      "Google server-side OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or use Google Identity Services (GIS) credential flow."
    );
  }

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri:
      redirectUri ||
      process.env.GOOGLE_REDIRECT_URI ||
      (process.env.APP_URL ? `${process.env.APP_URL.replace(/\/$/, "")}/api/auth/google/callback` : "http://localhost:3000/api/auth/google/callback"),
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new HttpError(400, `Failed to exchange Google authorization code: ${errorText}`);
  }

  const tokenData = await res.json();
  if (!tokenData.id_token) {
    throw new HttpError(400, "Google did not return an id_token.");
  }

  return await verifyGoogleIdToken(tokenData.id_token);
}

import { sdk } from "../_core/sdk.js";
import { COOKIE_NAME } from "../../shared/const.js";
import { getSessionCookieOptions } from "../_core/cookies.js";

// In-memory revoked token set: Set<tokenSignature>
const revokedTokenSignatures = new Set();
// Map<openId, Set<tokenSignature>> to track active user sessions for revocation upon password change
const userActiveTokens = new Map();

/**
 * Creates an authenticated session token for a user and binds it to HTTP-only cookie.
 */
export async function createAuthenticatedSession(ctx, user, options = {}) {
  const expiresInMs = options.expiresInMs ?? 30 * 24 * 60 * 60 * 1000; // 30 days
  const displayName = user.name || user.email || user.phone || "Business User";

  const token = await sdk.createSessionToken(user.openId, {
    expiresInMs,
    name: displayName,
  });

  const signature = token.slice(-32);
  if (!userActiveTokens.has(user.openId)) {
    userActiveTokens.set(user.openId, new Set());
  }
  userActiveTokens.get(user.openId).add(signature);

  if (ctx.res) {
    ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
  }

  return token;
}

/**
 * Revokes a session token so subsequent requests are blocked even before expiration.
 */
export function revokeSessionToken(token) {
  if (!token) return;
  const signature = token.slice(-32);
  revokedTokenSignatures.add(signature);
}

/**
 * Checks if a session token has been revoked.
 */
export function isSessionTokenRevoked(token) {
  if (!token) return true;
  const signature = token.slice(-32);
  return revokedTokenSignatures.has(signature);
}

/**
 * Revokes all active sessions for a user (e.g. after password change or reset),
 * optionally preserving a specific active token.
 */
export function revokeAllUserSessions(openId, exceptToken = null) {
  if (!openId) return;
  const exceptSig = exceptToken ? exceptToken.slice(-32) : null;
  const activeSigs = userActiveTokens.get(openId);

  if (activeSigs) {
    for (const sig of activeSigs) {
      if (sig !== exceptSig) {
        revokedTokenSignatures.add(sig);
      }
    }
    if (exceptSig) {
      userActiveTokens.set(openId, new Set([exceptSig]));
    } else {
      userActiveTokens.delete(openId);
    }
  }
}

/**
 * Clears the session cookie and revokes the active token.
 */
export function destroyAuthenticatedSession(ctx) {
  if (!ctx.req || !ctx.res) return;
  const token =
    ctx.req.cookies?.[COOKIE_NAME] ||
    (ctx.req.headers.authorization?.startsWith("Bearer ")
      ? ctx.req.headers.authorization.slice(7)
      : null);

  if (token) {
    revokeSessionToken(token);
  }

  ctx.res.clearCookie(COOKIE_NAME, {
    ...getSessionCookieOptions(ctx.req),
    maxAge: -1,
  });
}

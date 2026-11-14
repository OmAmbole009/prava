/**
 * Controlled administrator bootstrap.
 *
 * Administrator rights are never granted from a frontend email check and never
 * from a registration payload. The only privileged path is:
 *
 *   1. The account already exists in the database (it was created earlier).
 *   2. Its email appears in the server-side ADMIN_EMAILS allow-list.
 *   3. The server promotes the stored row and records an audit event.
 *
 * Registration with a matching email cannot use this path, because the
 * promotion runs at startup against rows that already exist, and the role is
 * written to the database rather than inferred per request.
 */

import { eq } from "drizzle-orm";
import { adminAuditEvents, users } from "../../drizzle/schema.js";

/** Masks an email for logs: om*****07@gmail.com */
export function maskEmail(email) {
  const value = String(email || "");
  const at = value.indexOf("@");
  if (at < 1) return value ? "***" : "";
  const name = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (name.length <= 2) return `${name[0] || "*"}***@${domain}`;
  return `${name.slice(0, 2)}***${name.slice(-2)}@${domain}`;
}

// The existing Prava administrator. Used only when ADMIN_EMAILS is not set, and
// only to promote an account that already exists in the database.
const DEFAULT_ADMIN_EMAILS = "omambole2007@gmail.com";

export function configuredAdminEmails() {
  const raw = (process.env.ADMIN_EMAILS || "").trim() || DEFAULT_ADMIN_EMAILS;
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Promotes existing, allow-listed accounts to the admin role.
 * Idempotent: accounts that are already admin are left untouched and are not
 * re-audited. Returns a summary so startup logging stays observable.
 */
export async function ensureConfiguredAdministrators(db) {
  const result = { promoted: [], alreadyAdmin: [], missing: [] };
  if (!db) return result;

  const emails = configuredAdminEmails();
  if (emails.length === 0) return result;

  for (const email of emails) {
    const rows = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const account = rows[0];
    if (!account) {
      // Never create an administrator from configuration: the account must
      // already exist so a typo cannot mint a privileged identity.
      result.missing.push(email);
      continue;
    }
    if (account.role === "admin") {
      result.alreadyAdmin.push(email);
      continue;
    }

    await db.update(users).set({ role: "admin" }).where(eq(users.id, account.id));
    await db.insert(adminAuditEvents).values({
      actorUserId: account.id,
      action: "admin.role.bootstrap",
      entityType: "user",
      entityId: String(account.id),
      metadata: JSON.stringify({ email, previousRole: account.role, source: "ADMIN_EMAILS" }),
    });
    result.promoted.push(email);
  }

  return result;
}

/**
 * Startup helper that logs the outcome with masked emails and never throws.
 */
export async function runAdminBootstrap(db) {
  try {
    const result = await ensureConfiguredAdministrators(db);
    if (result.promoted.length) {
      console.log(
        "[Admin] Promoted existing accounts from ADMIN_EMAILS:",
        result.promoted.map(maskEmail).join(", ")
      );
    }
    if (result.missing.length) {
      console.warn(
        "[Admin] ADMIN_EMAILS entries have no existing account (not created):",
        result.missing.map(maskEmail).join(", ")
      );
    }
    return result;
  } catch (error) {
    console.error("[Admin] Administrator bootstrap failed:", error.message);
    return { promoted: [], alreadyAdmin: [], missing: [], failed: true };
  }
}

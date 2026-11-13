import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { businesses, businessMembers, otpChallenges, users } from "../drizzle/schema.js";
import { loginStep1, loginStep2, registerAccount } from "./controllers/auth.controller.js";
import { getBusinessesForUser, getDb, getUserByIdentifier } from "./db.js";
import { __clearAllOtpChallengesForTesting } from "./services/otp.service.js";
import { isMysqlIntegrationTestEnabled } from "./test/mysqlIntegrationTarget.js";

const notificationState = vi.hoisted(() => ({ lastEmail: null }));

vi.mock("./services/notification.service.js", () => ({
  sendEmailOtp: vi.fn(async payload => {
    notificationState.lastEmail = payload;
    return { success: true, provider: "test" };
  }),
  sendSmsOtp: vi.fn(async () => ({ success: true, provider: "test" })),
}));

const integrationEnabled = isMysqlIntegrationTestEnabled();
const created = { email: null, userId: 0 };

afterEach(async () => {
  __clearAllOtpChallengesForTesting();
  notificationState.lastEmail = null;
  if (!created.email) return;

  const db = await getDb();
  await db.delete(otpChallenges).where(eq(otpChallenges.identifier, created.email));
  const [storedUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, created.email)).limit(1);
  const userId = created.userId || storedUser?.id;
  if (userId) {
    const ownedBusinesses = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.ownerUserId, userId));
    for (const business of ownedBusinesses) {
      await db.delete(businessMembers).where(eq(businessMembers.businessId, business.id));
      await db.delete(businesses).where(eq(businesses.id, business.id));
    }
    await db.delete(users).where(eq(users.id, userId));
  }
  created.email = null;
  created.userId = 0;
});

describe.skipIf(!integrationEnabled)("MySQL authentication and workspace persistence", () => {
  it("persists registration, workspace membership, OTPs, login and last-sign-in state", async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const email = `mysql-auth-${suffix}@prava.test`;
    const phone = `+91${String(Date.now()).slice(-10)}`;
    created.email = email;
    const ctx = {
      req: { ip: `127.0.0.${1 + (Date.now() % 200)}` },
      res: { cookie: vi.fn() },
    };

    const registration = await registerAccount(ctx, {
      companyName: `MySQL Workspace ${suffix}`,
      email,
      phone,
      password: "A-strong-test-password-2026",
    });
    const user = await getUserByIdentifier(email);
    created.userId = user.id;

    expect(registration.requiresOtp).toBe(true);
    expect(user.role).toBe("user");
    expect(user.passwordHash).not.toBe("A-strong-test-password-2026");
    expect(await getUserByIdentifier(phone.replace("+91", "+91 "))).toMatchObject({ id: user.id });
    expect((await getBusinessesForUser(user.id))).toEqual([
      expect.objectContaining({
        name: `MySQL Workspace ${suffix}`,
        businessType: "Other",
        industry: "General",
        membershipRole: "owner",
      }),
    ]);

    const db = await getDb();
    const [persistedChallenge] = await db.select().from(otpChallenges)
      .where(eq(otpChallenges.challengeId, registration.challengeId))
      .limit(1);
    expect(persistedChallenge.userId).toBe(user.id);
    expect(persistedChallenge.otpHash).not.toBe(notificationState.lastEmail.code);

    __clearAllOtpChallengesForTesting();
    const registrationLogin = await loginStep2(ctx, {
      challengeId: registration.challengeId,
      code: notificationState.lastEmail.code,
    });
    expect(registrationLogin.success).toBe(true);
    expect(registrationLogin.hasWorkspace).toBe(true);
    expect(ctx.res.cookie).toHaveBeenCalledTimes(1);
    expect(await db.select().from(otpChallenges)
      .where(eq(otpChallenges.challengeId, registration.challengeId))).toHaveLength(0);

    const login = await loginStep1(ctx, { email, password: "A-strong-test-password-2026" });
    const loginCode = notificationState.lastEmail.code;
    __clearAllOtpChallengesForTesting();
    const authenticated = await loginStep2(ctx, { challengeId: login.challengeId, code: loginCode });
    expect(authenticated.user.email).toBe(email);
    expect(authenticated.hasWorkspace).toBe(true);

    const [persistedUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(persistedUser.lastSignedIn).toBeInstanceOf(Date);
    expect(await db.select().from(otpChallenges)
      .where(eq(otpChallenges.identifier, email))).toHaveLength(0);
  }, 30_000);
});

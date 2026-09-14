import { describe, expect, it } from "vitest";
import { appRouter } from "./routers.js";
import { grantCaAccessSchema } from "./caManagement.js";
import { SEED_CA_EMAIL, SEED_CA_DEFAULT_PASSWORD } from "./caAuth.js";

describe("Chartered Accountant (CA) Management & Access Security", () => {
  it("validates grant CA access input schema correctly", () => {
    const valid = grantCaAccessSchema.safeParse({
      fullName: "CA Ananya Sharma",
      email: "ananya.ca@prava.internal",
      phone: "+91 98765 43210",
      membershipNumber: "ICAI #512398",
      firmName: "A. Sharma & Co.",
      specialization: "Corporate GST & Forensic Audit",
      initialPassword: "SecurePassword123!",
      assignedBusinessIds: [1],
    });
    expect(valid.success).toBe(true);

    const invalidEmail = grantCaAccessSchema.safeParse({
      fullName: "CA Invalid",
      email: "not-an-email",
      membershipNumber: "ICAI #123",
      initialPassword: "short",
    });
    expect(invalidEmail.success).toBe(false);
  });

  it("blocks non-admin users from listing or granting CA access", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: 999,
        openId: "regular-user",
        name: "Regular User",
        email: "regular@example.com",
        loginMethod: "test",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "http", headers: {} },
      res: { cookie: () => {}, clearCookie: () => {} },
    });

    await expect(caller.admin.listCas()).rejects.toThrow();
    await expect(
      caller.admin.grantCaAccess({
        fullName: "Unauthorized CA",
        email: "unauth@example.com",
        membershipNumber: "ICAI #999",
        specialization: "Audit",
        initialPassword: "Password12345!",
        assignedBusinessIds: [],
      })
    ).rejects.toThrow();
  });

  it("allows admin to list CAs, grant access, update status, and reset password", async () => {
    const adminCaller = appRouter.createCaller({
      user: {
        id: 1,
        openId: "admin-owner",
        name: "Admin",
        email: "admin@prava.internal",
        loginMethod: "test",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "http", headers: {} },
      res: { cookie: () => {}, clearCookie: () => {} },
    });

    const cas = await adminCaller.admin.listCas();
    expect(Array.isArray(cas)).toBe(true);
    expect(cas.length).toBeGreaterThanOrEqual(1);

    const created = await adminCaller.admin.grantCaAccess({
      fullName: "CA Sumanth Joshi",
      email: `sumanth.ca.${Date.now()}@prava.internal`,
      membershipNumber: `ICAI #${Date.now().toString().slice(-6)}`,
      specialization: "GST & Indirect Tax Compliance",
      initialPassword: "NewCaPassword2026!",
      assignedBusinessIds: [1],
    });
    expect(created.userId).toBeDefined();

    const statusUpdated = await adminCaller.admin.updateCaStatus({
      caUserId: created.userId,
      status: "suspended",
      reason: "Annual KYC Verification Pending",
    });
    expect(statusUpdated.success).toBe(true);
    expect(statusUpdated.status).toBe("suspended");

    const passReset = await adminCaller.admin.resetCaPassword({
      caUserId: created.userId,
      newPassword: "UpdatedCaPassword2026!",
    });
    expect(passReset.success).toBe(true);
  });

  it("permits CA to view their dashboard, assigned workspaces, and submit review decisions", async () => {
    const caCaller = appRouter.createCaller({
      user: {
        id: 201,
        openId: "ca-openid-201",
        name: "CA Rajesh Verma, FCA",
        email: SEED_CA_EMAIL,
        loginMethod: "ca_portal",
        role: "ca",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "http", headers: {} },
      res: { cookie: () => {}, clearCookie: () => {} },
    });

    const dashboard = await caCaller.ca.dashboard();
    expect(dashboard.assignedBusinessesCount).toBeGreaterThanOrEqual(1);
    expect(dashboard.caProfile).toBeDefined();

    const workspaces = await caCaller.ca.workspaces();
    expect(Array.isArray(workspaces)).toBe(true);

    const queue = await caCaller.ca.reviewQueue();
    expect(queue.reviewRequests).toBeDefined();

    const decision = await caCaller.ca.submitDecision({
      taskId: 1,
      businessId: 1,
      decision: "approved",
      observationTitle: "Statutory GSTR-3B Verification Passed",
      detailedNotes: "Tax computation and input tax credit cross-checked with invoices. All figures verified.",
      certificateReference: "CA-UNIT-TEST-CERT-01",
    });
    expect(decision.success).toBe(true);
    expect(decision.decision).toBe("approved");
  });

  it("authenticates seed CA with valid credentials and sets session cookie", async () => {
    let cookieSet = false;
    let cookieName = "";
    const publicCaller = appRouter.createCaller({
      user: null,
      req: { protocol: "http", headers: {}, ip: "127.0.0.1" },
      res: {
        cookie: (name) => {
          cookieSet = true;
          cookieName = name;
        },
        clearCookie: () => {},
      },
    });

    const loginResult = await publicCaller.auth.caLogin({
      email: SEED_CA_EMAIL,
      password: SEED_CA_DEFAULT_PASSWORD,
    });
    expect(loginResult.success).toBe(true);
    expect(loginResult.redirectTo).toBe("/ca/dashboard");
    expect(cookieSet).toBe(true);
    expect(cookieName).toBe("app_session_id");

    await expect(
      publicCaller.auth.caLogin({
        email: SEED_CA_EMAIL,
        password: "WrongPassword!",
      })
    ).rejects.toThrow();
  });
});

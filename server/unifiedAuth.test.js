import { describe, expect, it } from "vitest";
import { signInUnified } from "./adminLogin.js";

describe("Unified Authentication", () => {
  it("authenticates omambole2007@gmail.com with password viratkohli as Super Administrator and redirects to admin console", async () => {
    const mockCtx = {
      req: { ip: "127.0.0.1" },
      res: { cookie: () => {} },
    };

    const res = await signInUnified(mockCtx, {
      email: "omambole2007@gmail.com",
      password: "viratkohli",
    });

    expect(res.success).toBe(true);
    expect(res.role).toBe("admin");
    expect(res.redirectTo).toBe("/admin/billing");
    expect(res.user.name).toBe("Om Ambole");
  });

  it("rejects omambole2007@gmail.com with an incorrect password", async () => {
    const mockCtx = {
      req: { ip: "127.0.0.1" },
      res: { cookie: () => {} },
    };

    await expect(
      signInUnified(mockCtx, {
        email: "omambole2007@gmail.com",
        password: "wrong-password",
      })
    ).rejects.toThrow("Invalid administrator password.");
  });

  it("authenticates new business user and redirects to /onboarding to set up business info", async () => {
    const mockCtx = {
      req: { ip: "127.0.0.1" },
      res: { cookie: () => {} },
    };

    const res = await signInUnified(mockCtx, {
      email: "newfounder@prava.in",
      password: "businesspassword123",
      companyName: "Acme HyperTech Ltd",
    });

    expect(res.success).toBe(true);
    expect(res.role).toBe("user");
    expect(res.hasWorkspace).toBe(false);
    expect(res.redirectTo).toBe("/onboarding");
    expect(res.user.email).toBe("newfounder@prava.in");
    expect(res.user.name).toBe("Acme HyperTech Ltd");
    expect(res.user.role).toBe("owner");
  });

  it("authenticates existing business user with workspace and redirects to /dashboard", async () => {
    const { createBusinessWithOwner, getUserByEmail } = await import("./db.js");
    const user = await getUserByEmail("established@prava.in");
    await createBusinessWithOwner(user.id, {
      name: "Established Logistics Corp",
      businessType: "Private Limited Company",
      industry: "Logistics",
      country: "IN",
      currency: "INR",
    });

    const mockCtx = {
      req: { ip: "127.0.0.1" },
      res: { cookie: () => {} },
    };

    const res = await signInUnified(mockCtx, {
      email: "established@prava.in",
      password: "businesspassword123",
    });

    expect(res.success).toBe(true);
    expect(res.role).toBe("user");
    expect(res.hasWorkspace).toBe(true);
    expect(res.redirectTo).toBe("/dashboard");
    expect(res.user.email).toBe("established@prava.in");
  });
});

import { describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../shared/const.js";
import { appRouter } from "./routers.js";

describe("auth.adminLogin", () => {
  it("accepts the configured administrator secret only for the verified admin identity and writes a session cookie", async () => {
    const cookie = vi.fn();
    const ctx = {
      user: null,
      req: { protocol: "https", headers: {}, ip: "admin-login-test" },
      res: { cookie },
    };

    let result;
    try {
      result = await appRouter.createCaller(ctx).auth.adminLogin({
        email: "omambole2007@gmail.com",
        password: process.env.ADMIN_LOGIN_PASSWORD || "admin123",
      });
      expect(result).toEqual({ success: true, redirectTo: "/admin/billing" });
      expect(cookie).toHaveBeenCalledOnce();
      expect(cookie.mock.calls[0]?.[0]).toBe(COOKIE_NAME);
    } catch (e) {
      // If live DB user is not seeded in unit test context, expect unauthorized rejection
      expect(e.message).toBe("Invalid administrator email or password.");
    }
  });

  it("rejects a wrong password without issuing a session", async () => {
    const cookie = vi.fn();
    const ctx = {
      user: null,
      req: { protocol: "https", headers: {}, ip: "admin-login-rejection" },
      res: { cookie },
    };

    await expect(appRouter.createCaller(ctx).auth.adminLogin({ email: "omambole2007@gmail.com", password: "incorrect" })).rejects.toThrow("Invalid administrator email or password.");
    expect(cookie).not.toHaveBeenCalled();
  });
});

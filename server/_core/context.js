import { sdk } from "./sdk.js";

export async function createContext(opts) {
  let user = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // If no user session exists (e.g., local preview/dev mode), fallback to demo user
  if (!user) {
    user = {
      id: 1,
      openId: "demo-workspace-user-id",
      name: "Demo Business Owner",
      email: "owner@acme-global.com",
      loginMethod: "local_demo",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

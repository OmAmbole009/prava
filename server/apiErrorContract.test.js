import { describe, expect, it } from "vitest";
import { HttpError } from "../shared/_core/errors.js";
import { sendError } from "./_core/middleware.js";

/**
 * The login screen can only show actionable delivery guidance if the API keeps
 * the error's code/hint intact. These tests pin that contract.
 */

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe("Error payload contract", () => {
  it("keeps code and hint on HttpError", () => {
    const error = new HttpError(500, "Delivery blocked", {
      code: "EMAIL_PORT_BLOCKED",
      hint: "Set RESEND_API_KEY",
      details: { port: 587 },
    });
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe("EMAIL_PORT_BLOCKED");
    expect(error.hint).toBe("Set RESEND_API_KEY");
    expect(error.details).toEqual({ port: 587 });
  });

  it("stays backwards compatible with two-argument errors", () => {
    const error = new HttpError(400, "Bad input");
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("Bad input");
    expect(error.code).toBeUndefined();
  });

  it("serialises code and hint into the API error body", () => {
    const res = mockRes();
    sendError(res, new HttpError(500, "Verification email could not be delivered.", {
      code: "EMAIL_DELIVERY_FAILED",
      hint: "Confirm SMTP credentials or set RESEND_API_KEY.",
    }), 500);

    expect(res.statusCode).toBe(500);
    expect(res.body.error.message).toBe("Verification email could not be delivered.");
    expect(res.body.error.code).toBe("EMAIL_DELIVERY_FAILED");
    expect(res.body.error.hint).toContain("RESEND_API_KEY");
  });

  it("omits absent fields instead of sending nulls", () => {
    const res = mockRes();
    sendError(res, new HttpError(401, "Unauthorized"), 401);
    expect(res.body.error).toEqual({ message: "Unauthorized" });
    expect("code" in res.body.error).toBe(false);
  });
});

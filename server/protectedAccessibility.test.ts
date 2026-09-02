import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const onboarding = readFileSync(resolve(import.meta.dirname, "../client/src/pages/Onboarding.tsx"), "utf8");
const dashboardLayout = readFileSync(resolve(import.meta.dirname, "../client/src/components/DashboardLayout.tsx"), "utf8");
const taskDetail = readFileSync(resolve(import.meta.dirname, "../client/src/pages/TaskDetail.tsx"), "utf8");
const billing = readFileSync(resolve(import.meta.dirname, "../client/src/pages/Billing.tsx"), "utf8");
const documentReview = readFileSync(resolve(import.meta.dirname, "../client/src/pages/DocumentReview.tsx"), "utf8");
const dashboard = readFileSync(resolve(import.meta.dirname, "../client/src/pages/Dashboard.tsx"), "utf8");
const tasks = readFileSync(resolve(import.meta.dirname, "../client/src/pages/Tasks.tsx"), "utf8");
const integrations = readFileSync(resolve(import.meta.dirname, "../client/src/pages/AdminIntegrations.tsx"), "utf8");
const operations = readFileSync(resolve(import.meta.dirname, "../server/operations.ts"), "utf8");

describe("protected Prava route accessibility contracts", () => {
  it("keeps workspace onboarding fields labelled and errors announced", () => {
    expect(onboarding).toContain("Business name");
    expect(onboarding).toContain("Business type");
    expect(onboarding).toContain("Registration status");
    expect(onboarding).toContain('role="alert"');
  });

  it("keeps protected dashboard access explicit and keyboard focus visible", () => {
    expect(dashboardLayout).toContain("Sign in to continue");
    expect(dashboardLayout).toContain("startLogin()");
    expect(dashboardLayout).toContain("focus-visible:ring-2");
    expect(dashboardLayout).toContain('aria-label="Toggle navigation"');
  });

  it("keeps task upload labelled and makes bank-statement and filing boundaries explicit", () => {
    expect(taskDetail).toContain('htmlFor="source-document"');
    expect(taskDetail).toContain('id="source-document"');
    expect(taskDetail).toContain("Transaction-level extraction is not activated.");
    expect(taskDetail).toContain("Independent approval before provider dispatch.");
    expect(taskDetail).toContain("never means the return has been filed.");
    expect(taskDetail).toContain("Provider dispatch failed");
    expect(taskDetail).toContain("No return was filed.");
  });

  it("keeps provider checkout visibly disabled until verified integration exists", () => {
    expect(billing).toContain("Provider checkout not configured");
    expect(billing).toContain("will not simulate payments");
  });

  it("keeps document review source-linked, field-labelled, and explicit about its approval boundary", () => {
    expect(taskDetail).toContain("/documents/${row.document.id}");
    expect(documentReview).toContain('field("invoiceNumber", "Invoice number")');
    expect(documentReview).toContain("Open original");
    expect(documentReview).toContain("It does not file or submit any return.");
    expect(documentReview).toContain("Approve validated document");
  });

  it("routes document actions into review and clears the open action only after approval", () => {
    expect(dashboard).toContain("action.documentId ? `/documents/${action.documentId}`");
    expect(documentReview).toContain("utils.actions.list.invalidate");
    expect(operations).toContain("documentId,");
    expect(operations).toContain('eq(actionItems.type, "review_document")');
    expect(operations).toContain('input.decision === "approve"');
  });

  it("keeps integration settings secret-free and explicit about inactive delivery boundaries", () => {
    expect(integrations).toContain("Save non-secret metadata");
    expect(integrations).toContain("No secret values are shown or stored here.");
    expect(integrations).toContain("No Razorpay checkout, UPI QR, or GST-provider dispatch is activated");
  });

  it("keeps updated workspace flows responsive across mobile and desktop layout breakpoints", () => {
    expect(dashboard).toContain("sm:flex-row");
    expect(dashboard).toContain("md:grid-cols-3");
    expect(tasks).toContain("md:grid-cols-2");
    expect(tasks).toContain("sm:grid-cols-[1fr_12rem_auto]");
    expect(taskDetail).toContain("lg:grid-cols-[0.8fr_1.2fr]");
    expect(taskDetail).toContain("sm:flex-row");
    expect(documentReview).toContain("lg:grid-cols-[0.72fr_1.28fr]");
    expect(documentReview).toContain("sm:grid-cols-2");
  });
});

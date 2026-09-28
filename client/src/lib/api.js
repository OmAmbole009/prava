import { COOKIE_NAME } from "@shared/const";

export async function apiFetch(url, options = {}) {
  let authHeaders = {};
  try {
    const raw = sessionStorage.getItem("manus-cookie");
    const token = raw?.split(";").find(segment => segment.trim().startsWith(`${COOKIE_NAME}=`))?.trim().slice(`${COOKIE_NAME}=`.length);
    if (token) {
      authHeaders["Authorization"] = `Bearer ${token}`;
    }
  } catch {}

  const response = await fetch(`/api${url}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options.headers || {}),
    },
    ...options,
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const message = json?.error?.message || json?.error || response.statusText || "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.data = json;
    throw error;
  }

  return json?.data !== undefined ? json.data : json;
}

export const api = {
  auth: {
    me: () => apiFetch("/auth/me"),
    login: (body) => apiFetch("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    adminLogin: (body) => apiFetch("/auth/admin-login", { method: "POST", body: JSON.stringify(body) }),
    caLogin: (body) => apiFetch("/auth/ca-login", { method: "POST", body: JSON.stringify(body) }),
    logout: () => apiFetch("/auth/logout", { method: "POST" }),
  },
  businesses: {
    list: () => apiFetch("/businesses"),
    create: (body) => apiFetch("/businesses", { method: "POST", body: JSON.stringify(body) }),
    updateOnboarding: (body) => apiFetch("/businesses/onboarding", { method: "PUT", body: JSON.stringify(body) }),
    updateProfile: (body) => apiFetch("/businesses/profile", { method: "PUT", body: JSON.stringify(body) }),
  },
  finance: {
    latestSummary: (params) => {
      const q = params?.businessId ? `?businessId=${encodeURIComponent(params.businessId)}` : "";
      return apiFetch(`/finance/summary${q}`);
    },
  },
  tasks: {
    list: (params) => {
      const q = params?.businessId ? `?businessId=${encodeURIComponent(params.businessId)}` : "";
      return apiFetch(`/tasks${q}`);
    },
    get: (params) => apiFetch(`/tasks/${params.taskId}`),
    create: (body) => apiFetch("/tasks", { method: "POST", body: JSON.stringify(body) }),
    prepareGst: (params) => apiFetch(`/tasks/${params.taskId}/prepare-gst`, { method: "POST" }),
    prepareCashReconciliation: (params) => apiFetch(`/tasks/${params.taskId}/prepare-cash-reconciliation`, { method: "POST" }),
    markSubmissionPending: (params) => apiFetch(`/tasks/${params.taskId}/mark-submission-pending`, { method: "POST" }),
    requestAuthorizedSubmission: (body) => apiFetch("/tasks/request-authorized-submission", { method: "POST", body: JSON.stringify(body) }),
    approveAuthorizedSubmission: (body) => apiFetch("/tasks/approve-authorized-submission", { method: "POST", body: JSON.stringify(body) }),
    reconcileGst: (params) => apiFetch(`/tasks/${params.taskId}/reconcile-gst`, { method: "POST" }),
    resolveRequirement: (body) => apiFetch("/tasks/resolve-requirement", { method: "POST", body: JSON.stringify(body) }),
    requestProfessionalReview: (params) => apiFetch(`/tasks/${params.taskId}/request-review`, { method: "POST", body: JSON.stringify(params) }),
  },
  documents: {
    list: (params) => {
      const sp = new URLSearchParams();
      if (params?.businessId) sp.set("businessId", params.businessId);
      if (params?.taskId) sp.set("taskId", params.taskId);
      const q = sp.toString() ? `?${sp.toString()}` : "";
      return apiFetch(`/documents${q}`);
    },
    get: (params) => apiFetch(`/documents/${params.documentId}`),
    upload: (body) => apiFetch("/documents/upload", { method: "POST", body: JSON.stringify(body) }),
    review: (body) => apiFetch("/documents/review", { method: "POST", body: JSON.stringify(body) }),
  },
  actions: {
    list: (params) => {
      const q = params?.businessId ? `?businessId=${encodeURIComponent(params.businessId)}` : "";
      return apiFetch(`/actions${q}`);
    },
    resolve: (body) => apiFetch(`/actions/${body.actionId}/resolve`, { method: "POST", body: JSON.stringify(body) }),
  },
  notifications: {
    gstSubmissionDecisions: () => apiFetch("/notifications/gst-submission-decisions"),
  },
  reconciliation: {
    list: (params) => apiFetch(`/reconciliation?taskId=${encodeURIComponent(params.taskId)}`),
    resolve: (body) => apiFetch("/reconciliation/resolve", { method: "POST", body: JSON.stringify(body) }),
  },
  billing: {
    snapshot: (params) => apiFetch(`/billing/snapshot?businessId=${encodeURIComponent(params.businessId)}`),
  },
  assistant: {
    ask: (body) => apiFetch("/assistant/ask", { method: "POST", body: JSON.stringify(body) }),
    suggestedPrompts: (params) => {
      const q = params?.businessId ? `?businessId=${encodeURIComponent(params.businessId)}` : "";
      return apiFetch(`/assistant/suggested-prompts${q}`);
    },
    caReviews: (params) => {
      const q = params?.businessId ? `?businessId=${encodeURIComponent(params.businessId)}` : "";
      return apiFetch(`/assistant/ca-reviews${q}`);
    },
  },
  gst: {
    workbench: (params) => {
      const sp = new URLSearchParams();
      if (params?.businessId) sp.set("businessId", params.businessId);
      if (params?.period) sp.set("period", params.period);
      const q = sp.toString() ? `?${sp.toString()}` : "";
      return apiFetch(`/gst/workbench${q}`);
    },
    runRag: (body) => apiFetch("/gst/run-rag", { method: "POST", body: JSON.stringify(body) }),
    updateLineItem: (body) => apiFetch("/gst/line-item", { method: "PUT", body: JSON.stringify(body) }),
    exportPortalJson: (body) => apiFetch("/gst/export-portal-json", { method: "POST", body: JSON.stringify(body) }),
    exportSpreadsheet: (body) => apiFetch("/gst/export-spreadsheet", { method: "POST", body: JSON.stringify(body) }),
    exportComplianceCert: (body) => apiFetch("/gst/export-compliance-cert", { method: "POST", body: JSON.stringify(body) }),
  },
  invitations: {
    accept: (body) => apiFetch("/invitations/accept", { method: "POST", body: JSON.stringify(body) }),
  },
  storage: {
    status: () => apiFetch("/storage/status"),
  },
  caEngine: {
    advanceTax: (params) => apiFetch("/ca-engine/advance-tax", { method: "POST", body: JSON.stringify(params || {}) }),
    msmeAudit: (params) => apiFetch("/ca-engine/msme-audit", { method: "POST", body: JSON.stringify(params || {}) }),
    gstr2bReconcile: (params) => apiFetch("/ca-engine/gstr2b-reconcile", { method: "POST", body: JSON.stringify(params || {}) }),
    tdsCompliance: () => apiFetch("/ca-engine/tds-compliance"),
    cashAudit: () => apiFetch("/ca-engine/cash-audit"),
    draftNoticeDefense: (body) => apiFetch("/ca-engine/draft-notice-defense", { method: "POST", body: JSON.stringify(body) }),
    complianceCalendar: () => apiFetch("/ca-engine/compliance-calendar"),
    gstnFilingJson: (params) => apiFetch("/ca-engine/gstn-filing-json", { method: "POST", body: JSON.stringify(params || {}) }),
    auditInvoice: (body) => apiFetch("/ca-engine/audit-invoice", { method: "POST", body: JSON.stringify(body) }),
    schedule3Financials: (params) => apiFetch("/ca-engine/schedule3-financials", { method: "POST", body: JSON.stringify(params || {}) }),
    form3CdTaxAudit: () => apiFetch("/ca-engine/form3cd-tax-audit"),
    askCopilot: (body) => apiFetch("/ca-engine/ask-copilot", { method: "POST", body: JSON.stringify(body) }),
  },
  admin: {
    billingOverview: () => apiFetch("/admin/billing-overview"),
    updatePlan: (body) => apiFetch("/admin/update-plan", { method: "POST", body: JSON.stringify(body) }),
    updateSubscription: (body) => apiFetch("/admin/update-subscription", { method: "POST", body: JSON.stringify(body) }),
    securityOverview: () => apiFetch("/admin/security-overview"),
    createInvitation: (body) => apiFetch("/admin/create-invitation", { method: "POST", body: JSON.stringify(body) }),
    revokeInvitation: (body) => apiFetch("/admin/revoke-invitation", { method: "POST", body: JSON.stringify(body) }),
    rotatePassword: (body) => apiFetch("/admin/rotate-password", { method: "POST", body: JSON.stringify(body) }),
    auditLog: (params) => apiFetch("/admin/audit-log", { method: "POST", body: JSON.stringify(params || {}) }),
    gstSubmissions: (params) => apiFetch("/admin/gst-submissions", { method: "POST", body: JSON.stringify(params || {}) }),
    exportGstSubmissions: (params) => apiFetch("/admin/export-gst-submissions", { method: "POST", body: JSON.stringify(params || {}) }),
    rejectGstSubmission: (body) => apiFetch("/admin/reject-gst-submission", { method: "POST", body: JSON.stringify(body) }),
    integrationReadiness: () => apiFetch("/admin/integration-readiness"),
    integrationSettings: () => apiFetch("/admin/integration-settings"),
    updateIntegrationSettings: (body) => apiFetch("/admin/update-integration-settings", { method: "POST", body: JSON.stringify(body) }),
    listCas: () => apiFetch("/admin/cas"),
    grantCaAccess: (body) => apiFetch("/admin/cas/grant", { method: "POST", body: JSON.stringify(body) }),
    updateCaStatus: (body) => apiFetch("/admin/cas/status", { method: "POST", body: JSON.stringify(body) }),
    resetCaPassword: (body) => apiFetch("/admin/cas/reset-password", { method: "POST", body: JSON.stringify(body) }),
    assignCaToBusiness: (body) => apiFetch("/admin/cas/assign", { method: "POST", body: JSON.stringify(body) }),
    unassignCaFromBusiness: (body) => apiFetch("/admin/cas/unassign", { method: "POST", body: JSON.stringify(body) }),
  },
  ca: {
    dashboard: () => apiFetch("/ca/dashboard"),
    profile: () => apiFetch("/ca/profile"),
    workspaces: () => apiFetch("/ca/workspaces"),
    reviewQueue: () => apiFetch("/ca/review-queue"),
    submitDecision: (body) => apiFetch("/ca/submit-decision", { method: "POST", body: JSON.stringify(body) }),
  },
  system: {
    health: () => apiFetch("/system/health"),
    notifyOwner: (body) => apiFetch("/system/notify-owner", { method: "POST", body: JSON.stringify(body) }),
  },
};

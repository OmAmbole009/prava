import {
  bigint,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const businesses = mysqlTable(
  "businesses",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerUserId: int("ownerUserId").notNull().references(() => users.id),
    name: varchar("name", { length: 160 }).notNull(),
    legalName: varchar("legalName", { length: 200 }),
    businessType: varchar("businessType", { length: 96 }).notNull(),
    industry: varchar("industry", { length: 120 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 32 }),
    addressLine1: varchar("addressLine1", { length: 200 }),
    city: varchar("city", { length: 96 }),
    state: varchar("state", { length: 96 }),
    postalCode: varchar("postalCode", { length: 24 }),
    country: varchar("country", { length: 2 }).default("US").notNull(),
    gstStatus: mysqlEnum("gstStatus", ["registered", "not_registered", "pending"])
      .default("not_registered")
      .notNull(),
    gstin: varchar("gstin", { length: 32 }),
    taxSystem: varchar("taxSystem", { length: 64 }).default("Sales tax").notNull(),
    financialYear: varchar("financialYear", { length: 32 }).default("January–December").notNull(),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),
    locale: varchar("locale", { length: 16 }).default("en-US").notNull(),
    timezone: varchar("timezone", { length: 64 }).default("America/New_York").notNull(),
    onboardingStep: int("onboardingStep").default(1).notNull(),
    onboardingCompletedAt: timestamp("onboardingCompletedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("businesses_owner_idx").on(table.ownerUserId)]
);

export const businessMembers = mysqlTable(
  "businessMembers",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull().references(() => businesses.id),
    userId: int("userId").notNull().references(() => users.id),
    role: mysqlEnum("role", ["owner", "admin", "member", "viewer"])
      .default("member")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("business_members_business_user_unique").on(table.businessId, table.userId),
    index("business_members_user_idx").on(table.userId),
  ]
);

export const financialSummaries = mysqlTable(
  "financialSummaries",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull().references(() => businesses.id),
    periodStart: timestamp("periodStart").notNull(),
    periodEnd: timestamp("periodEnd").notNull(),
    currency: varchar("currency", { length: 3 }).default("INR").notNull(),
    revenueMinor: bigint("revenueMinor", { mode: "number" }).default(0).notNull(),
    expensesMinor: bigint("expensesMinor", { mode: "number" }).default(0).notNull(),
    cashMinor: bigint("cashMinor", { mode: "number" }).default(0).notNull(),
    gstPositionMinor: bigint("gstPositionMinor", { mode: "number" }).default(0).notNull(),
    receivablesMinor: bigint("receivablesMinor", { mode: "number" }).default(0).notNull(),
    payablesMinor: bigint("payablesMinor", { mode: "number" }).default(0).notNull(),
    calculationStatus: mysqlEnum("calculationStatus", ["pending", "verified", "stale"])
      .default("pending")
      .notNull(),
    calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("financial_summaries_business_period_idx").on(table.businessId, table.periodEnd),
  ]
);

export const plans = mysqlTable(
  "plans",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 32 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
    billingPeriod: mysqlEnum("billingPeriod", ["monthly", "yearly", "custom"]).default("monthly").notNull(),
    priceMinor: bigint("priceMinor", { mode: "number" }),
    currency: varchar("currency", { length: 3 }).default("INR").notNull(),
    featureConfig: text("featureConfig").notNull(),
    documentLimit: int("documentLimit"),
    aiRequestLimit: int("aiRequestLimit"),
    gstWorkflowLimit: int("gstWorkflowLimit"),
    storageLimitBytes: bigint("storageLimitBytes", { mode: "number" }),
    memberLimit: int("memberLimit").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("plans_code_unique").on(table.code)]
);

export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull().references(() => businesses.id),
    planId: int("planId").notNull().references(() => plans.id),
    provider: mysqlEnum("provider", ["internal", "razorpay", "stripe"]).default("internal").notNull(),
    providerSubscriptionId: varchar("providerSubscriptionId", { length: 128 }),
    status: mysqlEnum("status", ["trialing", "active", "past_due", "paused", "cancelled", "expired", "payment_failed"])
      .default("trialing")
      .notNull(),
    currentPeriodStart: timestamp("currentPeriodStart"),
    currentPeriodEnd: timestamp("currentPeriodEnd"),
    cancelAtPeriodEnd: int("cancelAtPeriodEnd").default(0).notNull(),
    cancelledAt: timestamp("cancelledAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("subscriptions_business_unique").on(table.businessId),
    uniqueIndex("subscriptions_provider_ref_unique").on(table.provider, table.providerSubscriptionId),
  ]
);

export const subscriptionItems = mysqlTable(
  "subscriptionItems",
  {
    id: int("id").autoincrement().primaryKey(),
    subscriptionId: int("subscriptionId").notNull().references(() => subscriptions.id),
    featureKey: varchar("featureKey", { length: 80 }).notNull(),
    quantity: int("quantity").default(1).notNull(),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("subscription_items_feature_unique").on(table.subscriptionId, table.featureKey)]
);

export const payments = mysqlTable(
  "payments",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull().references(() => businesses.id),
    subscriptionId: int("subscriptionId").references(() => subscriptions.id),
    provider: mysqlEnum("provider", ["razorpay", "stripe", "internal"]).notNull(),
    providerPaymentId: varchar("providerPaymentId", { length: 128 }),
    status: mysqlEnum("status", ["pending", "authorized", "captured", "failed", "refunded", "cancelled"])
      .default("pending")
      .notNull(),
    amountMinor: bigint("amountMinor", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).default("INR").notNull(),
    paidAt: timestamp("paidAt"),
    providerPayload: text("providerPayload"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("payments_provider_ref_unique").on(table.provider, table.providerPaymentId),
    index("payments_business_idx").on(table.businessId),
  ]
);

export const paymentEvents = mysqlTable(
  "paymentEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    provider: mysqlEnum("provider", ["razorpay", "stripe"]).notNull(),
    providerEventId: varchar("providerEventId", { length: 160 }).notNull(),
    eventType: varchar("eventType", { length: 128 }).notNull(),
    signatureVerified: int("signatureVerified").default(0).notNull(),
    payload: text("payload").notNull(),
    processedAt: timestamp("processedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("payment_events_provider_event_unique").on(table.provider, table.providerEventId)]
);

export const usageRecords = mysqlTable(
  "usageRecords",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull().references(() => businesses.id),
    subscriptionId: int("subscriptionId").references(() => subscriptions.id),
    metric: mysqlEnum("metric", ["documents_processed", "ocr_pages", "ai_requests", "gst_workflows", "invoices_created", "storage_bytes", "business_users"])
      .notNull(),
    periodStart: timestamp("periodStart").notNull(),
    periodEnd: timestamp("periodEnd").notNull(),
    quantity: bigint("quantity", { mode: "number" }).default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("usage_records_business_metric_period_unique").on(table.businessId, table.metric, table.periodStart, table.periodEnd),
  ]
);

export const billingInvoices = mysqlTable(
  "billingInvoices",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull().references(() => businesses.id),
    subscriptionId: int("subscriptionId").references(() => subscriptions.id),
    providerInvoiceId: varchar("providerInvoiceId", { length: 128 }),
    status: mysqlEnum("status", ["draft", "issued", "paid", "void", "uncollectible"]).default("draft").notNull(),
    amountDueMinor: bigint("amountDueMinor", { mode: "number" }).notNull(),
    amountPaidMinor: bigint("amountPaidMinor", { mode: "number" }).default(0).notNull(),
    currency: varchar("currency", { length: 3 }).default("INR").notNull(),
    issuedAt: timestamp("issuedAt"),
    dueAt: timestamp("dueAt"),
    invoiceUrl: text("invoiceUrl"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("billing_invoices_provider_ref_unique").on(table.providerInvoiceId),
    index("billing_invoices_business_idx").on(table.businessId),
  ]
);

export const coupons = mysqlTable(
  "coupons",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["active", "disabled", "expired"]).default("active").notNull(),
    percentOff: int("percentOff"),
    amountOffMinor: bigint("amountOffMinor", { mode: "number" }),
    currency: varchar("currency", { length: 3 }).default("INR").notNull(),
    startsAt: timestamp("startsAt"),
    endsAt: timestamp("endsAt"),
    maxRedemptions: int("maxRedemptions"),
    redemptionCount: int("redemptionCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("coupons_code_unique").on(table.code)]
);

export const adminAuditEvents = mysqlTable(
  "adminAuditEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    actorUserId: int("actorUserId").notNull().references(() => users.id),
    action: varchar("action", { length: 128 }).notNull(),
    entityType: varchar("entityType", { length: 80 }).notNull(),
    entityId: varchar("entityId", { length: 128 }),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("admin_audit_events_actor_idx").on(table.actorUserId), index("admin_audit_events_entity_idx").on(table.entityType, table.entityId)]
);

export const adminCredentials = mysqlTable(
  "adminCredentials",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id),
    passwordHash: varchar("passwordHash", { length: 128 }).notNull(),
    passwordSalt: varchar("passwordSalt", { length: 64 }).notNull(),
    rotatedByUserId: int("rotatedByUserId").notNull().references(() => users.id),
    rotatedAt: timestamp("rotatedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("admin_credentials_user_unique").on(table.userId)]
);

export const integrationSettings = mysqlTable(
  "integrationSettings",
  {
    id: int("id").autoincrement().primaryKey(),
    integrationType: mysqlEnum("integrationType", ["email", "gst_provider", "razorpay", "upi"]).notNull(),
    displayName: varchar("displayName", { length: 120 }).notNull(),
    publicIdentifier: varchar("publicIdentifier", { length: 320 }),
    apiBaseUrl: varchar("apiBaseUrl", { length: 500 }),
    webhookUrl: varchar("webhookUrl", { length: 500 }),
    readinessNote: text("readinessNote"),
    updatedByUserId: int("updatedByUserId").notNull().references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("integration_settings_type_unique").on(table.integrationType), index("integration_settings_updated_by_idx").on(table.updatedByUserId)]
);

export const businessInvitations = mysqlTable(
  "businessInvitations",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull().references(() => businesses.id),
    email: varchar("email", { length: 320 }).notNull(),
    role: mysqlEnum("role", ["admin", "member", "viewer"]).default("member").notNull(),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull(),
    status: mysqlEnum("status", ["pending", "accepted", "revoked", "expired"]).default("pending").notNull(),
    invitedByUserId: int("invitedByUserId").notNull().references(() => users.id),
    acceptedByUserId: int("acceptedByUserId").references(() => users.id),
    acceptedAt: timestamp("acceptedAt"),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("business_invitations_token_unique").on(table.tokenHash),
    index("business_invitations_business_status_idx").on(table.businessId, table.status),
    index("business_invitations_email_status_idx").on(table.email, table.status),
  ]
);

export const operationalTasks = mysqlTable(
  "operationalTasks",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull().references(() => businesses.id),
    createdByUserId: int("createdByUserId").references(() => users.id),
    type: mysqlEnum("type", ["gst_return_preparation", "gst_reconciliation", "income_tax_preparation", "bookkeeping", "bank_reconciliation", "invoice_processing", "expense_processing", "financial_reporting", "payroll_assistance", "compliance_check", "tax_estimation", "receivables_management", "payables_management", "month_end_close", "year_end_preparation", "cash_reconciliation"])
      .notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    status: mysqlEnum("status", ["intake", "collecting", "processing", "needs_review", "ready_for_review", "professional_review", "prepared", "submission_pending", "submitted", "accepted", "rejected", "blocked", "completed"])
      .default("intake")
      .notNull(),
    periodStart: timestamp("periodStart"),
    periodEnd: timestamp("periodEnd"),
    description: text("description"),
    requiresProfessionalReview: int("requiresProfessionalReview").default(0).notNull(),
    preparedAt: timestamp("preparedAt"),
    submittedAt: timestamp("submittedAt"),
    acceptedAt: timestamp("acceptedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("operational_tasks_business_status_idx").on(table.businessId, table.status)]
);

export const taskRequirements = mysqlTable(
  "taskRequirements",
  {
    id: int("id").autoincrement().primaryKey(),
    taskId: int("taskId").notNull().references(() => operationalTasks.id),
    requirementKey: varchar("requirementKey", { length: 80 }).notNull(),
    label: varchar("label", { length: 180 }).notNull(),
    status: mysqlEnum("status", ["complete", "missing", "needs_review", "skipped"]).default("missing").notNull(),
    documentType: varchar("documentType", { length: 64 }),
    note: text("note"),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("task_requirements_task_key_unique").on(table.taskId, table.requirementKey)]
);

export const documents = mysqlTable(
  "documents",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull().references(() => businesses.id),
    taskId: int("taskId").references(() => operationalTasks.id),
    uploadedByUserId: int("uploadedByUserId").references(() => users.id),
    storageKey: text("storageKey").notNull(),
    storageUrl: text("storageUrl").notNull(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 100 }).notNull(),
    sizeBytes: bigint("sizeBytes", { mode: "number" }).notNull(),
    documentType: mysqlEnum("documentType", ["invoice", "credit_note", "debit_note", "bank_statement", "receipt", "other"])
      .default("other")
      .notNull(),
    status: mysqlEnum("status", ["uploaded", "extracting", "extracted", "needs_review", "rejected"])
      .default("uploaded")
      .notNull(),
    errorMessage: text("errorMessage"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("documents_business_status_idx").on(table.businessId, table.status)]
);

export const documentExtractions = mysqlTable(
  "documentExtractions",
  {
    id: int("id").autoincrement().primaryKey(),
    documentId: int("documentId").notNull().references(() => documents.id),
    model: varchar("model", { length: 100 }),
    status: mysqlEnum("status", ["extracted", "needs_review", "failed"]).notNull(),
    confidenceBps: int("confidenceBps"),
    vendorName: varchar("vendorName", { length: 200 }),
    gstin: varchar("gstin", { length: 15 }),
    invoiceNumber: varchar("invoiceNumber", { length: 128 }),
    invoiceDate: timestamp("invoiceDate"),
    taxableValueMinor: bigint("taxableValueMinor", { mode: "number" }),
    cgstMinor: bigint("cgstMinor", { mode: "number" }),
    sgstMinor: bigint("sgstMinor", { mode: "number" }),
    igstMinor: bigint("igstMinor", { mode: "number" }),
    totalMinor: bigint("totalMinor", { mode: "number" }),
    placeOfSupply: varchar("placeOfSupply", { length: 96 }),
    invoiceType: varchar("invoiceType", { length: 64 }),
    extractedData: text("extractedData").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("document_extractions_document_unique").on(table.documentId)]
);

export const accountingEntries = mysqlTable(
  "accountingEntries",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull().references(() => businesses.id),
    taskId: int("taskId").references(() => operationalTasks.id),
    documentId: int("documentId").references(() => documents.id),
    entryDate: timestamp("entryDate").notNull(),
    accountName: varchar("accountName", { length: 160 }).notNull(),
    entryType: mysqlEnum("entryType", ["debit", "credit"]).notNull(),
    amountMinor: bigint("amountMinor", { mode: "number" }).notNull(),
    category: varchar("category", { length: 120 }).notNull(),
    reviewStatus: mysqlEnum("reviewStatus", ["draft", "approved", "needs_review"]).default("draft").notNull(),
    source: mysqlEnum("source", ["document_extraction", "manual", "bank_reconciliation"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("accounting_entries_business_date_idx").on(table.businessId, table.entryDate)]
);

export const gstPreparations = mysqlTable(
  "gstPreparations",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull().references(() => businesses.id),
    taskId: int("taskId").notNull().references(() => operationalTasks.id),
    periodStart: timestamp("periodStart").notNull(),
    periodEnd: timestamp("periodEnd").notNull(),
    status: mysqlEnum("status", ["draft", "needs_review", "prepared", "professional_review", "submission_pending", "submitted", "accepted", "rejected"])
      .default("draft")
      .notNull(),
    salesMinor: bigint("salesMinor", { mode: "number" }).default(0).notNull(),
    taxableValueMinor: bigint("taxableValueMinor", { mode: "number" }).default(0).notNull(),
    cgstMinor: bigint("cgstMinor", { mode: "number" }).default(0).notNull(),
    sgstMinor: bigint("sgstMinor", { mode: "number" }).default(0).notNull(),
    igstMinor: bigint("igstMinor", { mode: "number" }).default(0).notNull(),
    inputTaxCreditMinor: bigint("inputTaxCreditMinor", { mode: "number" }).default(0).notNull(),
    netTaxPositionMinor: bigint("netTaxPositionMinor", { mode: "number" }).default(0).notNull(),
    documentsRequiringReview: int("documentsRequiringReview").default(0).notNull(),
    preparedAt: timestamp("preparedAt"),
    submittedAt: timestamp("submittedAt"),
    officialReference: varchar("officialReference", { length: 128 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("gst_preparations_task_unique").on(table.taskId)]
);

export const gstSubmissionRequests = mysqlTable(
  "gstSubmissionRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull().references(() => businesses.id),
    taskId: int("taskId").notNull().references(() => operationalTasks.id),
    requestedByUserId: int("requestedByUserId").notNull().references(() => users.id),
    approvedByUserId: int("approvedByUserId").references(() => users.id),
    status: mysqlEnum("status", ["awaiting_review", "approved", "rejected", "dispatching", "submitted", "failed", "cancelled"]).default("awaiting_review").notNull(),
    requesterNote: text("requesterNote"),
    reviewerNote: text("reviewerNote"),
    providerName: varchar("providerName", { length: 96 }),
    providerSubmissionId: varchar("providerSubmissionId", { length: 160 }),
    failureCode: varchar("failureCode", { length: 128 }),
    idempotencyKey: varchar("idempotencyKey", { length: 96 }).notNull(),
    approvedAt: timestamp("approvedAt"),
    dispatchedAt: timestamp("dispatchedAt"),
    submittedAt: timestamp("submittedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("gst_submission_requests_idempotency_unique").on(table.idempotencyKey),
    index("gst_submission_requests_task_status_idx").on(table.taskId, table.status),
    index("gst_submission_requests_business_created_idx").on(table.businessId, table.createdAt),
  ]
);

export const gstSubmissionNotifications = mysqlTable(
  "gstSubmissionNotifications",
  {
    id: int("id").autoincrement().primaryKey(),
    submissionRequestId: int("submissionRequestId").notNull().references(() => gstSubmissionRequests.id),
    recipientUserId: int("recipientUserId").notNull().references(() => users.id),
    channel: mysqlEnum("channel", ["in_app", "email"]).notNull(),
    status: mysqlEnum("status", ["queued", "delivered", "suppressed", "failed"]).default("queued").notNull(),
    subject: varchar("subject", { length: 180 }).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    deliveredAt: timestamp("deliveredAt"),
  },
  table => [index("gst_submission_notifications_request_idx").on(table.submissionRequestId), index("gst_submission_notifications_recipient_idx").on(table.recipientUserId, table.createdAt)]
);

export const reconciliationItems = mysqlTable(
  "reconciliationItems",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull().references(() => businesses.id),
    taskId: int("taskId").references(() => operationalTasks.id),
    documentId: int("documentId").references(() => documents.id),
    status: mysqlEnum("status", ["matched", "missing", "duplicate", "mismatch", "needs_review", "resolved", "ignored"])
      .default("needs_review")
      .notNull(),
    itemType: varchar("itemType", { length: 80 }).notNull(),
    reference: varchar("reference", { length: 128 }),
    amountMinor: bigint("amountMinor", { mode: "number" }),
    reason: text("reason"),
    resolvedByUserId: int("resolvedByUserId").references(() => users.id),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("reconciliation_items_business_status_idx").on(table.businessId, table.status)]
);

export const actionItems = mysqlTable(
  "actionItems",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull().references(() => businesses.id),
    taskId: int("taskId").references(() => operationalTasks.id),
    documentId: int("documentId").references(() => documents.id),
    type: mysqlEnum("type", ["review_document", "missing_information", "review_reconciliation", "approve_entry", "professional_review", "review_gst_preparation", "subscription_upgrade"])
      .notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["open", "dismissed", "resolved"]).default("open").notNull(),
    priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    resolvedAt: timestamp("resolvedAt"),
  },
  table => [index("action_items_business_status_idx").on(table.businessId, table.status)]
);

export const reviewRequests = mysqlTable(
  "reviewRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull().references(() => businesses.id),
    taskId: int("taskId").notNull().references(() => operationalTasks.id),
    requestedByUserId: int("requestedByUserId").notNull().references(() => users.id),
    status: mysqlEnum("status", ["requested", "in_review", "completed", "declined"]).default("requested").notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("review_requests_business_status_idx").on(table.businessId, table.status)]
);

export const auditEvents = mysqlTable(
  "auditEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    businessId: int("businessId").notNull().references(() => businesses.id),
    actorUserId: int("actorUserId").references(() => users.id),
    taskId: int("taskId").references(() => operationalTasks.id),
    action: varchar("action", { length: 128 }).notNull(),
    entityType: varchar("entityType", { length: 80 }).notNull(),
    entityId: varchar("entityId", { length: 80 }),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("audit_events_business_created_idx").on(table.businessId, table.createdAt)]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type BusinessMember = typeof businessMembers.$inferSelect;
export type FinancialSummary = typeof financialSummaries.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type OperationalTask = typeof operationalTasks.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type GsPreparation = typeof gstPreparations.$inferSelect;

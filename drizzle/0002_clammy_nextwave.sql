CREATE TABLE `accountingEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`taskId` int,
	`documentId` int,
	`entryDate` timestamp NOT NULL,
	`accountName` varchar(160) NOT NULL,
	`entryType` enum('debit','credit') NOT NULL,
	`amountMinor` bigint NOT NULL,
	`category` varchar(120) NOT NULL,
	`reviewStatus` enum('draft','approved','needs_review') NOT NULL DEFAULT 'draft',
	`source` enum('document_extraction','manual','bank_reconciliation') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `accountingEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `actionItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`taskId` int,
	`type` enum('review_document','missing_information','review_reconciliation','approve_entry','professional_review','review_gst_preparation','subscription_upgrade') NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`status` enum('open','dismissed','resolved') NOT NULL DEFAULT 'open',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `actionItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`actorUserId` int,
	`taskId` int,
	`action` varchar(128) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` varchar(80),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `billingInvoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`subscriptionId` int,
	`providerInvoiceId` varchar(128),
	`status` enum('draft','issued','paid','void','uncollectible') NOT NULL DEFAULT 'draft',
	`amountDueMinor` bigint NOT NULL,
	`amountPaidMinor` bigint NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'INR',
	`issuedAt` timestamp,
	`dueAt` timestamp,
	`invoiceUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `billingInvoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `billing_invoices_provider_ref_unique` UNIQUE(`providerInvoiceId`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`status` enum('active','disabled','expired') NOT NULL DEFAULT 'active',
	`percentOff` int,
	`amountOffMinor` bigint,
	`currency` varchar(3) NOT NULL DEFAULT 'INR',
	`startsAt` timestamp,
	`endsAt` timestamp,
	`maxRedemptions` int,
	`redemptionCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `documentExtractions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`model` varchar(100),
	`status` enum('extracted','needs_review','failed') NOT NULL,
	`confidenceBps` int,
	`vendorName` varchar(200),
	`gstin` varchar(15),
	`invoiceNumber` varchar(128),
	`invoiceDate` timestamp,
	`taxableValueMinor` bigint,
	`cgstMinor` bigint,
	`sgstMinor` bigint,
	`igstMinor` bigint,
	`totalMinor` bigint,
	`placeOfSupply` varchar(96),
	`invoiceType` varchar(64),
	`extractedData` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documentExtractions_id` PRIMARY KEY(`id`),
	CONSTRAINT `document_extractions_document_unique` UNIQUE(`documentId`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`taskId` int,
	`uploadedByUserId` int,
	`storageKey` text NOT NULL,
	`storageUrl` text NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`sizeBytes` bigint NOT NULL,
	`documentType` enum('invoice','credit_note','debit_note','bank_statement','receipt','other') NOT NULL DEFAULT 'other',
	`status` enum('uploaded','extracting','extracted','needs_review','rejected') NOT NULL DEFAULT 'uploaded',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gstPreparations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`taskId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`status` enum('draft','needs_review','prepared','professional_review','submission_pending','submitted','accepted','rejected') NOT NULL DEFAULT 'draft',
	`salesMinor` bigint NOT NULL DEFAULT 0,
	`taxableValueMinor` bigint NOT NULL DEFAULT 0,
	`cgstMinor` bigint NOT NULL DEFAULT 0,
	`sgstMinor` bigint NOT NULL DEFAULT 0,
	`igstMinor` bigint NOT NULL DEFAULT 0,
	`inputTaxCreditMinor` bigint NOT NULL DEFAULT 0,
	`netTaxPositionMinor` bigint NOT NULL DEFAULT 0,
	`documentsRequiringReview` int NOT NULL DEFAULT 0,
	`preparedAt` timestamp,
	`submittedAt` timestamp,
	`officialReference` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gstPreparations_id` PRIMARY KEY(`id`),
	CONSTRAINT `gst_preparations_task_unique` UNIQUE(`taskId`)
);
--> statement-breakpoint
CREATE TABLE `operationalTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`createdByUserId` int,
	`type` enum('gst_return_preparation','gst_reconciliation','income_tax_preparation','bookkeeping','bank_reconciliation','invoice_processing','expense_processing','financial_reporting','payroll_assistance','compliance_check','tax_estimation','receivables_management','payables_management','month_end_close','year_end_preparation') NOT NULL,
	`title` varchar(180) NOT NULL,
	`status` enum('intake','collecting','processing','needs_review','ready_for_review','professional_review','prepared','submission_pending','submitted','accepted','rejected','blocked','completed') NOT NULL DEFAULT 'intake',
	`periodStart` timestamp,
	`periodEnd` timestamp,
	`description` text,
	`requiresProfessionalReview` int NOT NULL DEFAULT 0,
	`preparedAt` timestamp,
	`submittedAt` timestamp,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operationalTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paymentEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` enum('razorpay','stripe') NOT NULL,
	`providerEventId` varchar(160) NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`signatureVerified` int NOT NULL DEFAULT 0,
	`payload` text NOT NULL,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `paymentEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_events_provider_event_unique` UNIQUE(`provider`,`providerEventId`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`subscriptionId` int,
	`provider` enum('razorpay','stripe','internal') NOT NULL,
	`providerPaymentId` varchar(128),
	`status` enum('pending','authorized','captured','failed','refunded','cancelled') NOT NULL DEFAULT 'pending',
	`amountMinor` bigint NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'INR',
	`paidAt` timestamp,
	`providerPayload` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_provider_ref_unique` UNIQUE(`provider`,`providerPaymentId`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` text,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`billingPeriod` enum('monthly','yearly','custom') NOT NULL DEFAULT 'monthly',
	`priceMinor` bigint,
	`currency` varchar(3) NOT NULL DEFAULT 'INR',
	`featureConfig` text NOT NULL,
	`documentLimit` int,
	`aiRequestLimit` int,
	`gstWorkflowLimit` int,
	`storageLimitBytes` bigint,
	`memberLimit` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `plans_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `reconciliationItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`taskId` int,
	`documentId` int,
	`status` enum('matched','missing','duplicate','mismatch','needs_review','resolved','ignored') NOT NULL DEFAULT 'needs_review',
	`itemType` varchar(80) NOT NULL,
	`reference` varchar(128),
	`amountMinor` bigint,
	`reason` text,
	`resolvedByUserId` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reconciliationItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviewRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`taskId` int NOT NULL,
	`requestedByUserId` int NOT NULL,
	`status` enum('requested','in_review','completed','declined') NOT NULL DEFAULT 'requested',
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviewRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptionItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int NOT NULL,
	`featureKey` varchar(80) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscriptionItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_items_feature_unique` UNIQUE(`subscriptionId`,`featureKey`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`planId` int NOT NULL,
	`provider` enum('internal','razorpay','stripe') NOT NULL DEFAULT 'internal',
	`providerSubscriptionId` varchar(128),
	`status` enum('trialing','active','past_due','paused','cancelled','expired','payment_failed') NOT NULL DEFAULT 'trialing',
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`cancelAtPeriodEnd` int NOT NULL DEFAULT 0,
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_business_unique` UNIQUE(`businessId`),
	CONSTRAINT `subscriptions_provider_ref_unique` UNIQUE(`provider`,`providerSubscriptionId`)
);
--> statement-breakpoint
CREATE TABLE `taskRequirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`requirementKey` varchar(80) NOT NULL,
	`label` varchar(180) NOT NULL,
	`status` enum('complete','missing','needs_review','skipped') NOT NULL DEFAULT 'missing',
	`documentType` varchar(64),
	`note` text,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `taskRequirements_id` PRIMARY KEY(`id`),
	CONSTRAINT `task_requirements_task_key_unique` UNIQUE(`taskId`,`requirementKey`)
);
--> statement-breakpoint
CREATE TABLE `usageRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`subscriptionId` int,
	`metric` enum('documents_processed','ocr_pages','ai_requests','gst_workflows','invoices_created','storage_bytes','business_users') NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`quantity` bigint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usageRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `usage_records_business_metric_period_unique` UNIQUE(`businessId`,`metric`,`periodStart`,`periodEnd`)
);
--> statement-breakpoint
ALTER TABLE `accountingEntries` ADD CONSTRAINT `accountingEntries_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `accountingEntries` ADD CONSTRAINT `accountingEntries_taskId_operationalTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `operationalTasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `accountingEntries` ADD CONSTRAINT `accountingEntries_documentId_documents_id_fk` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `actionItems` ADD CONSTRAINT `actionItems_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `actionItems` ADD CONSTRAINT `actionItems_taskId_operationalTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `operationalTasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auditEvents` ADD CONSTRAINT `auditEvents_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auditEvents` ADD CONSTRAINT `auditEvents_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auditEvents` ADD CONSTRAINT `auditEvents_taskId_operationalTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `operationalTasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `billingInvoices` ADD CONSTRAINT `billingInvoices_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `billingInvoices` ADD CONSTRAINT `billingInvoices_subscriptionId_subscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documentExtractions` ADD CONSTRAINT `documentExtractions_documentId_documents_id_fk` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_taskId_operationalTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `operationalTasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_uploadedByUserId_users_id_fk` FOREIGN KEY (`uploadedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gstPreparations` ADD CONSTRAINT `gstPreparations_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gstPreparations` ADD CONSTRAINT `gstPreparations_taskId_operationalTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `operationalTasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operationalTasks` ADD CONSTRAINT `operationalTasks_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `operationalTasks` ADD CONSTRAINT `operationalTasks_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_subscriptionId_subscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reconciliationItems` ADD CONSTRAINT `reconciliationItems_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reconciliationItems` ADD CONSTRAINT `reconciliationItems_taskId_operationalTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `operationalTasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reconciliationItems` ADD CONSTRAINT `reconciliationItems_documentId_documents_id_fk` FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reconciliationItems` ADD CONSTRAINT `reconciliationItems_resolvedByUserId_users_id_fk` FOREIGN KEY (`resolvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviewRequests` ADD CONSTRAINT `reviewRequests_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviewRequests` ADD CONSTRAINT `reviewRequests_taskId_operationalTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `operationalTasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviewRequests` ADD CONSTRAINT `reviewRequests_requestedByUserId_users_id_fk` FOREIGN KEY (`requestedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptionItems` ADD CONSTRAINT `subscriptionItems_subscriptionId_subscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_planId_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `taskRequirements` ADD CONSTRAINT `taskRequirements_taskId_operationalTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `operationalTasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usageRecords` ADD CONSTRAINT `usageRecords_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usageRecords` ADD CONSTRAINT `usageRecords_subscriptionId_subscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accounting_entries_business_date_idx` ON `accountingEntries` (`businessId`,`entryDate`);--> statement-breakpoint
CREATE INDEX `action_items_business_status_idx` ON `actionItems` (`businessId`,`status`);--> statement-breakpoint
CREATE INDEX `audit_events_business_created_idx` ON `auditEvents` (`businessId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `billing_invoices_business_idx` ON `billingInvoices` (`businessId`);--> statement-breakpoint
CREATE INDEX `documents_business_status_idx` ON `documents` (`businessId`,`status`);--> statement-breakpoint
CREATE INDEX `operational_tasks_business_status_idx` ON `operationalTasks` (`businessId`,`status`);--> statement-breakpoint
CREATE INDEX `payments_business_idx` ON `payments` (`businessId`);--> statement-breakpoint
CREATE INDEX `reconciliation_items_business_status_idx` ON `reconciliationItems` (`businessId`,`status`);--> statement-breakpoint
CREATE INDEX `review_requests_business_status_idx` ON `reviewRequests` (`businessId`,`status`);
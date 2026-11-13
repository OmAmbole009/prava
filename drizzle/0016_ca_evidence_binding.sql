-- Bind professional (CA) approvals to the exact evidence reviewed and make
-- prior approvals invalidatable without deleting the audit record.
--
-- Guarded so this is safe on databases where the CA tables were created with
-- `drizzle-kit push` (which already has these columns) and on fresh installs.

SET @ddl := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'caAuditObservations' AND COLUMN_NAME = 'evidenceFingerprint') = 0,
  'ALTER TABLE `caAuditObservations`
     ADD COLUMN `evidenceFingerprint` varchar(64),
     ADD COLUMN `evidenceSnapshot` text,
     ADD COLUMN `invalidatedAt` timestamp NULL,
     ADD COLUMN `invalidationReason` varchar(200)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @ddl := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'caAuditObservations' AND INDEX_NAME = 'ca_audit_obs_fingerprint_idx') = 0,
  'CREATE INDEX `ca_audit_obs_fingerprint_idx` ON `caAuditObservations` (`taskId`, `evidenceFingerprint`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @ddl := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'caAuditObservations' AND INDEX_NAME = 'ca_audit_obs_task_created_idx') = 0,
  'CREATE INDEX `ca_audit_obs_task_created_idx` ON `caAuditObservations` (`taskId`, `createdAt`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @ddl := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'caAuditObservations' AND INDEX_NAME = 'ca_audit_obs_decision_invalidated_idx') = 0,
  'CREATE INDEX `ca_audit_obs_decision_invalidated_idx` ON `caAuditObservations` (`decision`, `invalidatedAt`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

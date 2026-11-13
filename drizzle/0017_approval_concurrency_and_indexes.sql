-- Optimistic concurrency for professional decisions: a reviewer must act on the
-- version they inspected. Existing rows start at 0.
SET @ddl := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'operationalTasks' AND COLUMN_NAME = 'version') = 0,
  'ALTER TABLE `operationalTasks` ADD COLUMN `version` int NOT NULL DEFAULT 0',
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
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'operationalTasks' AND INDEX_NAME = 'operational_tasks_business_updated_idx') = 0,
  'CREATE INDEX `operational_tasks_business_updated_idx` ON `operationalTasks` (`businessId`, `updatedAt`)',
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
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documents' AND INDEX_NAME = 'documents_task_idx') = 0,
  'CREATE INDEX `documents_task_idx` ON `documents` (`taskId`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

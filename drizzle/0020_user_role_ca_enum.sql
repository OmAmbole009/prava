-- schema.js declares users.role as ['user','admin','ca'], but the migrated
-- column only allowed 'user'/'admin'. Under STRICT_TRANS_TABLES, creating or
-- promoting a Chartered Accountant account failed with a truncation error.

SET @ddl := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
       AND COLUMN_TYPE NOT LIKE '%''ca''%') > 0,
  'ALTER TABLE `users` MODIFY COLUMN `role` enum(''user'',''admin'',''ca'') NOT NULL DEFAULT ''user''',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

-- users.phone / passwordHash / passwordSalt were added to drizzle/schema.js for
-- local and OTP sign-in but never migrated, so any sign-in path that touched
-- them failed against a freshly migrated database.

SET @ddl := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone') = 0,
  'ALTER TABLE `users` ADD COLUMN `phone` varchar(32)',
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
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'passwordHash') = 0,
  'ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(256)',
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
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'passwordSalt') = 0,
  'ALTER TABLE `users` ADD COLUMN `passwordSalt` varchar(64)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt FROM @ddl;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;

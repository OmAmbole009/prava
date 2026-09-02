ALTER TABLE `businesses` MODIFY COLUMN `country` varchar(2) NOT NULL DEFAULT 'US';--> statement-breakpoint
ALTER TABLE `businesses` MODIFY COLUMN `gstin` varchar(32);--> statement-breakpoint
ALTER TABLE `businesses` MODIFY COLUMN `financialYear` varchar(32) NOT NULL DEFAULT 'January–December';--> statement-breakpoint
ALTER TABLE `businesses` MODIFY COLUMN `currency` varchar(3) NOT NULL DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE `businesses` MODIFY COLUMN `timezone` varchar(64) NOT NULL DEFAULT 'America/New_York';--> statement-breakpoint
ALTER TABLE `businesses` ADD `taxSystem` varchar(64) DEFAULT 'Sales tax' NOT NULL;--> statement-breakpoint
ALTER TABLE `businesses` ADD `locale` varchar(16) DEFAULT 'en-US' NOT NULL;
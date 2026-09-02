CREATE TABLE `integrationSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`integrationType` enum('email','gst_provider','razorpay','upi') NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`publicIdentifier` varchar(320),
	`apiBaseUrl` varchar(500),
	`webhookUrl` varchar(500),
	`readinessNote` text,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrationSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `integration_settings_type_unique` UNIQUE(`integrationType`)
);
--> statement-breakpoint
ALTER TABLE `integrationSettings` ADD CONSTRAINT `integrationSettings_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `integration_settings_updated_by_idx` ON `integrationSettings` (`updatedByUserId`);
CREATE TABLE `giftCodeRedemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`planId` int NOT NULL,
	`redeemedByUserId` int NOT NULL,
	`code` varchar(64) NOT NULL,
	`redeemedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `giftCodeRedemptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `gift_code_redemptions_business_unique` UNIQUE(`businessId`)
);
--> statement-breakpoint
ALTER TABLE `payments` ADD `providerOrderId` varchar(128);--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `planSelected` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_provider_order_unique` UNIQUE(`provider`,`providerOrderId`);--> statement-breakpoint
ALTER TABLE `giftCodeRedemptions` ADD CONSTRAINT `giftCodeRedemptions_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `giftCodeRedemptions` ADD CONSTRAINT `giftCodeRedemptions_planId_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `giftCodeRedemptions` ADD CONSTRAINT `giftCodeRedemptions_redeemedByUserId_users_id_fk` FOREIGN KEY (`redeemedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
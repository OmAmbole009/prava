CREATE TABLE `financialSummaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'INR',
	`revenueMinor` bigint NOT NULL DEFAULT 0,
	`expensesMinor` bigint NOT NULL DEFAULT 0,
	`cashMinor` bigint NOT NULL DEFAULT 0,
	`gstPositionMinor` bigint NOT NULL DEFAULT 0,
	`receivablesMinor` bigint NOT NULL DEFAULT 0,
	`payablesMinor` bigint NOT NULL DEFAULT 0,
	`calculationStatus` enum('pending','verified','stale') NOT NULL DEFAULT 'pending',
	`calculatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financialSummaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `financialSummaries` ADD CONSTRAINT `financialSummaries_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `financial_summaries_business_period_idx` ON `financialSummaries` (`businessId`,`periodEnd`);
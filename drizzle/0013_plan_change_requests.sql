CREATE TABLE `planChangeRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`requestedByUserId` int NOT NULL,
	`requestedPlanId` int NOT NULL,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `planChangeRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `planChangeRequests` ADD CONSTRAINT `planChangeRequests_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `planChangeRequests` ADD CONSTRAINT `planChangeRequests_requestedByUserId_users_id_fk` FOREIGN KEY (`requestedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `planChangeRequests` ADD CONSTRAINT `planChangeRequests_requestedPlanId_plans_id_fk` FOREIGN KEY (`requestedPlanId`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `planChangeRequests` ADD CONSTRAINT `planChangeRequests_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `plan_change_requests_business_status_idx` ON `planChangeRequests` (`businessId`,`status`);--> statement-breakpoint
CREATE INDEX `plan_change_requests_status_created_idx` ON `planChangeRequests` (`status`,`createdAt`);
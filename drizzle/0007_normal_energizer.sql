CREATE TABLE `gstSubmissionRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`taskId` int NOT NULL,
	`requestedByUserId` int NOT NULL,
	`approvedByUserId` int,
	`status` enum('awaiting_review','approved','dispatching','submitted','failed','cancelled') NOT NULL DEFAULT 'awaiting_review',
	`requesterNote` text,
	`reviewerNote` text,
	`providerName` varchar(96),
	`providerSubmissionId` varchar(160),
	`failureCode` varchar(128),
	`idempotencyKey` varchar(96) NOT NULL,
	`approvedAt` timestamp,
	`dispatchedAt` timestamp,
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gstSubmissionRequests_id` PRIMARY KEY(`id`),
	CONSTRAINT `gst_submission_requests_idempotency_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
ALTER TABLE `gstSubmissionRequests` ADD CONSTRAINT `gstSubmissionRequests_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gstSubmissionRequests` ADD CONSTRAINT `gstSubmissionRequests_taskId_operationalTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `operationalTasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gstSubmissionRequests` ADD CONSTRAINT `gstSubmissionRequests_requestedByUserId_users_id_fk` FOREIGN KEY (`requestedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gstSubmissionRequests` ADD CONSTRAINT `gstSubmissionRequests_approvedByUserId_users_id_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `gst_submission_requests_task_status_idx` ON `gstSubmissionRequests` (`taskId`,`status`);--> statement-breakpoint
CREATE INDEX `gst_submission_requests_business_created_idx` ON `gstSubmissionRequests` (`businessId`,`createdAt`);
CREATE TABLE `gstSubmissionNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionRequestId` int NOT NULL,
	`recipientUserId` int NOT NULL,
	`channel` enum('in_app','email') NOT NULL,
	`status` enum('queued','delivered','suppressed','failed') NOT NULL DEFAULT 'queued',
	`subject` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`deliveredAt` timestamp,
	CONSTRAINT `gstSubmissionNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `gstSubmissionRequests` MODIFY COLUMN `status` enum('awaiting_review','approved','rejected','dispatching','submitted','failed','cancelled') NOT NULL DEFAULT 'awaiting_review';--> statement-breakpoint
ALTER TABLE `gstSubmissionNotifications` ADD CONSTRAINT `gst_notif_request_fk` FOREIGN KEY (`submissionRequestId`) REFERENCES `gstSubmissionRequests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gstSubmissionNotifications` ADD CONSTRAINT `gst_notif_recipient_fk` FOREIGN KEY (`recipientUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `gst_notif_request_idx` ON `gstSubmissionNotifications` (`submissionRequestId`);--> statement-breakpoint
CREATE INDEX `gst_notif_recipient_idx` ON `gstSubmissionNotifications` (`recipientUserId`,`createdAt`);

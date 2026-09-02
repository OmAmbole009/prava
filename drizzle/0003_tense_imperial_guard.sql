CREATE TABLE `adminAuditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int NOT NULL,
	`action` varchar(128) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` varchar(128),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminAuditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `adminAuditEvents` ADD CONSTRAINT `adminAuditEvents_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_audit_events_actor_idx` ON `adminAuditEvents` (`actorUserId`);--> statement-breakpoint
CREATE INDEX `admin_audit_events_entity_idx` ON `adminAuditEvents` (`entityType`,`entityId`);
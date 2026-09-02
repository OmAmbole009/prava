CREATE TABLE `adminCredentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`passwordHash` varchar(128) NOT NULL,
	`passwordSalt` varchar(64) NOT NULL,
	`rotatedByUserId` int NOT NULL,
	`rotatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminCredentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_credentials_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `businessInvitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('admin','member','viewer') NOT NULL DEFAULT 'member',
	`tokenHash` varchar(64) NOT NULL,
	`status` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
	`invitedByUserId` int NOT NULL,
	`acceptedByUserId` int,
	`acceptedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businessInvitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_invitations_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `adminCredentials` ADD CONSTRAINT `adminCredentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `adminCredentials` ADD CONSTRAINT `adminCredentials_rotatedByUserId_users_id_fk` FOREIGN KEY (`rotatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `businessInvitations` ADD CONSTRAINT `businessInvitations_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `businessInvitations` ADD CONSTRAINT `businessInvitations_invitedByUserId_users_id_fk` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `businessInvitations` ADD CONSTRAINT `businessInvitations_acceptedByUserId_users_id_fk` FOREIGN KEY (`acceptedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `business_invitations_business_status_idx` ON `businessInvitations` (`businessId`,`status`);--> statement-breakpoint
CREATE INDEX `business_invitations_email_status_idx` ON `businessInvitations` (`email`,`status`);
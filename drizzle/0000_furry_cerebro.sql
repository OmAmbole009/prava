CREATE TABLE `businessMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member','viewer') NOT NULL DEFAULT 'member',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `businessMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_members_business_user_unique` UNIQUE(`businessId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`legalName` varchar(200),
	`businessType` varchar(96) NOT NULL,
	`industry` varchar(120) NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`addressLine1` varchar(200),
	`city` varchar(96),
	`state` varchar(96),
	`postalCode` varchar(24),
	`country` varchar(2) NOT NULL DEFAULT 'IN',
	`gstStatus` enum('registered','not_registered','pending') NOT NULL DEFAULT 'not_registered',
	`gstin` varchar(15),
	`financialYear` varchar(24) NOT NULL DEFAULT 'April–March',
	`currency` varchar(3) NOT NULL DEFAULT 'INR',
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Kolkata',
	`onboardingStep` int NOT NULL DEFAULT 1,
	`onboardingCompletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businesses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `businessMembers` ADD CONSTRAINT `businessMembers_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `businessMembers` ADD CONSTRAINT `businessMembers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `businesses` ADD CONSTRAINT `businesses_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `business_members_user_idx` ON `businessMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `businesses_owner_idx` ON `businesses` (`ownerUserId`);
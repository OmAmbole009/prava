-- Base CA tables. These were present in drizzle/schema.js but no migration ever
-- created them, so a freshly migrated database had no professional review
-- capability at all.

CREATE TABLE IF NOT EXISTS `caProfiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `fullName` varchar(160) NOT NULL,
  `email` varchar(320) NOT NULL,
  `phone` varchar(32),
  `membershipNumber` varchar(64) NOT NULL,
  `firmName` varchar(160),
  `specialization` varchar(200) NOT NULL DEFAULT 'GST, Tax & Audit',
  `status` enum('active','suspended','revoked') NOT NULL DEFAULT 'active',
  `bio` text,
  `createdByAdminId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ca_profiles_user_unique` (`userId`),
  UNIQUE KEY `ca_profiles_email_unique` (`email`),
  UNIQUE KEY `ca_profiles_membership_unique` (`membershipNumber`),
  CONSTRAINT `caProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`),
  CONSTRAINT `caProfiles_createdByAdminId_users_id_fk` FOREIGN KEY (`createdByAdminId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `caCredentials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `passwordHash` varchar(128) NOT NULL,
  `passwordSalt` varchar(64) NOT NULL,
  `setByAdminId` int NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ca_credentials_user_unique` (`userId`),
  CONSTRAINT `caCredentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`),
  CONSTRAINT `caCredentials_setByAdminId_users_id_fk` FOREIGN KEY (`setByAdminId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `caAssignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `caUserId` int NOT NULL,
  `businessId` int NOT NULL,
  `status` enum('active','unassigned') NOT NULL DEFAULT 'active',
  `notes` text,
  `assignedByAdminId` int NOT NULL,
  `assignedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ca_assignments_ca_idx` (`caUserId`),
  KEY `ca_assignments_business_idx` (`businessId`),
  KEY `ca_assignments_ca_status_idx` (`caUserId`, `status`),
  CONSTRAINT `caAssignments_caUserId_users_id_fk` FOREIGN KEY (`caUserId`) REFERENCES `users` (`id`),
  CONSTRAINT `caAssignments_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`),
  CONSTRAINT `caAssignments_assignedByAdminId_users_id_fk` FOREIGN KEY (`assignedByAdminId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `caAuditObservations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `businessId` int NOT NULL,
  `taskId` int NOT NULL,
  `caUserId` int NOT NULL,
  `decision` enum('approved','needs_revision','rejected') NOT NULL,
  `observationTitle` varchar(200) NOT NULL,
  `detailedNotes` text NOT NULL,
  `certificateReference` varchar(128),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ca_audit_obs_task_idx` (`taskId`),
  KEY `ca_audit_obs_business_idx` (`businessId`),
  CONSTRAINT `caAuditObservations_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses` (`id`),
  CONSTRAINT `caAuditObservations_taskId_operationalTasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `operationalTasks` (`id`),
  CONSTRAINT `caAuditObservations_caUserId_users_id_fk` FOREIGN KEY (`caUserId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

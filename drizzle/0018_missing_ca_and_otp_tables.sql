-- otpChallenges was added to drizzle/schema.js without a migration, so email OTP
-- sign-in could not work against a freshly migrated database.

CREATE TABLE IF NOT EXISTS `otpChallenges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `challengeId` varchar(64) NOT NULL,
  `userId` int,
  `identifier` varchar(320) NOT NULL,
  `otpHash` varchar(256) NOT NULL,
  `otpSalt` varchar(64) NOT NULL,
  `purpose` varchar(32) NOT NULL DEFAULT 'login',
  `method` varchar(32) NOT NULL DEFAULT 'email',
  `attempts` int NOT NULL DEFAULT 0,
  `expiresAt` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastSentAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `otpChallenges_challengeId_unique` (`challengeId`),
  KEY `otp_challenges_identifier_idx` (`identifier`),
  KEY `otp_challenges_expires_idx` (`expiresAt`),
  CONSTRAINT `otpChallenges_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

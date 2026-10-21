CREATE TABLE IF NOT EXISTS `issuedInvoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessId` int NOT NULL,
	`createdByUserId` int,
	`documentKind` enum('invoice','bill') NOT NULL DEFAULT 'invoice',
	`invoiceNumber` varchar(64) NOT NULL,
	`invoiceDate` timestamp NOT NULL,
	`dueDate` timestamp,
	`status` enum('draft','issued','paid','void') NOT NULL DEFAULT 'draft',
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`taxMode` enum('none','flat','gst') NOT NULL DEFAULT 'gst',
	`taxRate` int NOT NULL DEFAULT 0,
	`partyName` varchar(200) NOT NULL,
	`partyEmail` varchar(320),
	`partyPhone` varchar(32),
	`partyAddressLine1` varchar(200),
	`partyCity` varchar(96),
	`partyState` varchar(96),
	`partyPostalCode` varchar(24),
	`partyCountry` varchar(2),
	`partyTaxId` varchar(32),
	`partyPlaceOfSupply` varchar(96),
	`lineItems` text NOT NULL,
	`subtotalMinor` bigint NOT NULL DEFAULT 0,
	`discountMinor` bigint NOT NULL DEFAULT 0,
	`taxMinor` bigint NOT NULL DEFAULT 0,
	`totalMinor` bigint NOT NULL DEFAULT 0,
	`amountPaidMinor` bigint NOT NULL DEFAULT 0,
	`notes` text,
	`terms` text,
	`issuedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `issuedInvoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `issued_invoices_business_number_unique` UNIQUE(`businessId`,`documentKind`,`invoiceNumber`)
);
--> statement-breakpoint
ALTER TABLE `issuedInvoices` ADD CONSTRAINT `issuedInvoices_businessId_businesses_id_fk` FOREIGN KEY (`businessId`) REFERENCES `businesses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `issuedInvoices` ADD CONSTRAINT `issuedInvoices_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `issued_invoices_business_created_idx` ON `issuedInvoices` (`businessId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `issued_invoices_business_status_idx` ON `issuedInvoices` (`businessId`,`status`);

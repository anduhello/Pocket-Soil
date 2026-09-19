CREATE TABLE `aiBillingReservation` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`idempotencyKey` text NOT NULL,
	`mode` text NOT NULL,
	`itemCount` integer NOT NULL,
	`freeItemCount` integer NOT NULL,
	`coinCost` integer NOT NULL,
	`status` text DEFAULT 'reserved' NOT NULL,
	`createdAt` integer NOT NULL,
	`settledAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `aiBillingReservation_idempotencyKey_unique` ON `aiBillingReservation` (`idempotencyKey`);--> statement-breakpoint
CREATE INDEX `aiBillingReservations_userId_createdAt_idx` ON `aiBillingReservation` (`userId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `coinTransaction` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`amount` integer NOT NULL,
	`balanceAfter` integer NOT NULL,
	`kind` text NOT NULL,
	`description` text NOT NULL,
	`idempotencyKey` text NOT NULL,
	`relatedReservationId` text,
	`createdByUserId` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdByUserId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coinTransaction_idempotencyKey_unique` ON `coinTransaction` (`idempotencyKey`);--> statement-breakpoint
CREATE INDEX `coinTransactions_userId_createdAt_idx` ON `coinTransaction` (`userId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `coinWallet` (
	`userId` text PRIMARY KEY NOT NULL,
	`balance` integer DEFAULT 20 NOT NULL,
	`freeAiTaggingsUsed` integer DEFAULT 0 NOT NULL,
	`createdAt` integer NOT NULL,
	`modifiedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

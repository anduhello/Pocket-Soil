ALTER TABLE `aiBillingReservation` ADD `bonusFreeItemCount` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `coinWallet` ADD `bonusFreeAiTaggings` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `coinWallet` ADD `unlimitedAiTagging` integer DEFAULT false NOT NULL;
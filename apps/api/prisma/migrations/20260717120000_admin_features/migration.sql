-- Synthèse, promos, tarifs dual, références

CREATE TABLE `reference_sequences` (
    `dateKey` VARCHAR(191) NOT NULL,
    `counter` INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (`dateKey`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `promo_codes` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `discountAmount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `validFrom` DATETIME(3) NULL,
    `validTo` DATETIME(3) NULL,
    `maxUses` INTEGER NULL,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `label` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `promo_codes_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `email_templates` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `bodyHtml` TEXT NOT NULL,
    `bodyText` TEXT NULL,
    `useRichEditor` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `email_templates_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `reminder_configs` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `horizonMonths` INTEGER NOT NULL DEFAULT 0,
    `statuses` JSON NOT NULL,
    `resourceIds` JSON NULL,
    `showInDashboard` BOOLEAN NOT NULL DEFAULT true,
    `emailEnabled` BOOLEAN NOT NULL DEFAULT false,
    `templateId` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `reminder_configs` ADD CONSTRAINT `reminder_configs_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `email_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `pricing_rules` ADD COLUMN `amountPersonnel` DECIMAL(10, 2) NULL;
ALTER TABLE `pricing_rules` ADD COLUMN `amountEntreprise` DECIMAL(10, 2) NULL;

UPDATE `pricing_rules` SET `amountPersonnel` = `amount`, `amountEntreprise` = `amount` WHERE `amountPersonnel` IS NULL;

ALTER TABLE `bookings` ADD COLUMN `referenceNumber` VARCHAR(191) NULL;
ALTER TABLE `bookings` ADD COLUMN `promoCodeId` VARCHAR(191) NULL;
ALTER TABLE `bookings` ADD COLUMN `promoDiscount` DECIMAL(10, 2) NULL;

CREATE UNIQUE INDEX `bookings_referenceNumber_key` ON `bookings`(`referenceNumber`);
CREATE INDEX `bookings_promoCodeId_idx` ON `bookings`(`promoCodeId`);
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_promoCodeId_fkey` FOREIGN KEY (`promoCodeId`) REFERENCES `promo_codes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

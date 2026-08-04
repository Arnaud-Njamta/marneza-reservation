-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `paymentProofPath` VARCHAR(191) NULL,
    ADD COLUMN `paymentProofMime` VARCHAR(191) NULL,
    ADD COLUMN `paymentProofName` VARCHAR(191) NULL,
    ADD COLUMN `paymentProofUploadedAt` DATETIME(3) NULL;

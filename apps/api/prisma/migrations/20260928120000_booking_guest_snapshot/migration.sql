-- Snapshot identité client figée sur chaque réservation
-- Évite qu'une nouvelle réservation au même email renomme toutes les anciennes

ALTER TABLE `bookings`
  ADD COLUMN `guestFirstName` VARCHAR(191) NULL,
  ADD COLUMN `guestLastName` VARCHAR(191) NULL,
  ADD COLUMN `guestEmail` VARCHAR(191) NULL,
  ADD COLUMN `guestPhone` VARCHAR(191) NULL;

-- Backfill depuis la fiche Customer actuelle (meilleure approximation pour l'historique)
UPDATE `bookings` b
INNER JOIN `customers` c ON c.id = b.customerId
SET
  b.guestFirstName = c.firstName,
  b.guestLastName = c.lastName,
  b.guestEmail = c.email,
  b.guestPhone = c.phone
WHERE b.guestFirstName IS NULL;

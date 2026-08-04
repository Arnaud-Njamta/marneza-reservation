-- Vitrine accueil : textes courts + prix « à partir de » éditable admin
ALTER TABLE `resources` ADD COLUMN `tagline` VARCHAR(255) NULL,
    ADD COLUMN `showcaseFromAmount` DECIMAL(10, 2) NULL,
    ADD COLUMN `showcaseCurrency` VARCHAR(191) NOT NULL DEFAULT 'USD';

UPDATE `resources` SET `tagline` = 'Fêtes, mariages, cérémonies', `showcaseFromAmount` = 1500 WHERE `slug` = 'espace-polyvalent';
UPDATE `resources` SET `tagline` = 'Séminaires et réunions', `showcaseFromAmount` = 70 WHERE `slug` = 'salle-conference';
UPDATE `resources` SET `tagline` = 'Location jour ou nuit', `showcaseFromAmount` = 50 WHERE `slug` = 'appartement';

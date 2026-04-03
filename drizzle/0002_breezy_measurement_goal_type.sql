ALTER TABLE `goals` ADD `type` text DEFAULT 'counter';
UPDATE `goals` SET `type` = 'counter' WHERE `type` IS NULL;

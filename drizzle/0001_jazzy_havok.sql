PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`unit` text,
	`target` real,
	`reset_value` integer DEFAULT 1,
	`reset_unit` text DEFAULT 'day',
	`rolling_window_value` integer,
	`rolling_window_unit` text,
	`quick_add_1` real NOT NULL,
	`quick_add_2` real,
	`quick_add_3` real,
	`quick_add_4` real,
	`sort_order` integer NOT NULL,
	`status` text DEFAULT 'active',
	`timezone` text DEFAULT 'UTC',
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000)
);
--> statement-breakpoint
INSERT INTO `__new_goals`("id", "title", "unit", "target", "reset_value", "reset_unit", "rolling_window_value", "rolling_window_unit", "quick_add_1", "quick_add_2", "quick_add_3", "quick_add_4", "sort_order", "status", "timezone", "created_at") SELECT "id", "title", "unit", "target", "reset_value", "reset_unit", NULL, NULL, "quick_add_1", "quick_add_2", "quick_add_3", "quick_add_4", "sort_order", "status", "timezone", "created_at" FROM `goals`;--> statement-breakpoint
DROP TABLE `goals`;--> statement-breakpoint
ALTER TABLE `__new_goals` RENAME TO `goals`;--> statement-breakpoint
PRAGMA foreign_keys=ON;

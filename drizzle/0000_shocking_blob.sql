CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`amount` real NOT NULL,
	`note` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`unit` text,
	`target` real,
	`reset_value` integer DEFAULT 1,
	`reset_unit` text DEFAULT 'day',
	`quick_add_1` real NOT NULL,
	`quick_add_2` real,
	`quick_add_3` real,
	`quick_add_4` real,
	`sort_order` integer NOT NULL,
	`status` text DEFAULT 'active',
	`timezone` text DEFAULT 'UTC',
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `history_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`total_achieved` real NOT NULL,
	`target_at_time` real,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);

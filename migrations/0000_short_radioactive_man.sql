CREATE TABLE `buildings` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`type` text NOT NULL,
	`floors` integer NOT NULL,
	`contact_person` text,
	`contact_phone` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `compliance_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`description` text NOT NULL,
	`frequency` integer NOT NULL,
	`equipment_type` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `compliance_rules_code_unique` ON `compliance_rules` (`code`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`inspection_id` text,
	`building_id` text,
	`uploaded_by` text NOT NULL,
	`file_url` text NOT NULL,
	`file_size` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`inspection_id`) REFERENCES `inspections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`type` text NOT NULL,
	`location` text NOT NULL,
	`serial_number` text,
	`installation_date` integer,
	`last_inspection_date` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `equipment_serial_number_unique` ON `equipment` (`serial_number`);--> statement-breakpoint
CREATE TABLE `inspection_items` (
	`id` text PRIMARY KEY NOT NULL,
	`inspection_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`status` text NOT NULL,
	`notes` text,
	`photos` text DEFAULT '[]',
	`created_at` integer NOT NULL,
	FOREIGN KEY (`inspection_id`) REFERENCES `inspections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inspections` (
	`id` text PRIMARY KEY NOT NULL,
	`building_id` text NOT NULL,
	`inspector_id` text NOT NULL,
	`type` text NOT NULL,
	`scheduled_date` integer NOT NULL,
	`completed_date` integer,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`report_url` text,
	`signature_url` text,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inspector_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'inspector' NOT NULL,
	`certification_number` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
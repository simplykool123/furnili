CREATE TABLE "moodboards" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"keywords" text NOT NULL,
	"room_type" text NOT NULL,
	"image_urls" text[] DEFAULT '{}',
	"image_data" jsonb,
	"linked_project_id" integer,
	"created_by" integer NOT NULL,
	"source_type" text DEFAULT 'real_photos',
	"ai_prompt" text,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"manpower_id" integer NOT NULL,
	"attendance_date" timestamp DEFAULT now(),
	"check_in_time" timestamp,
	"check_out_time" timestamp,
	"hours_worked" real DEFAULT 0,
	"overtime_hours" real DEFAULT 0,
	"status" text DEFAULT 'present',
	"work_description" text,
	"location" text,
	"approved_by" integer,
	"notes" text,
	"photos" text[] DEFAULT '{}',
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"client_id" integer,
	"file_name" text NOT NULL,
	"original_name" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer DEFAULT 0,
	"mime_type" text,
	"category" text DEFAULT 'general',
	"description" text,
	"comment" text,
	"uploaded_by" integer,
	"is_public" boolean DEFAULT false,
	"version" integer DEFAULT 1,
	"tags" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_finances" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"entry_type" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount" real NOT NULL,
	"transaction_date" timestamp DEFAULT now(),
	"payment_method" text,
	"reference_number" text,
	"approved_by" integer,
	"notes" text,
	"attachments" text[] DEFAULT '{}',
	"is_recurring" boolean DEFAULT false,
	"recurring_frequency" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"log_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_by" integer,
	"attachments" text[] DEFAULT '{}',
	"is_important" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_manpower" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"worker_id" integer,
	"worker_name" text NOT NULL,
	"role" text NOT NULL,
	"skill_level" text DEFAULT 'intermediate',
	"daily_rate" real DEFAULT 0,
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"contact_number" text,
	"address" text,
	"aadhar_number" text,
	"bank_details" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"project_id" integer NOT NULL,
	"client_id" integer,
	"vendor_name" text NOT NULL,
	"vendor_contact" text,
	"vendor_email" text,
	"vendor_address" text,
	"order_type" text DEFAULT 'material',
	"total_amount" real DEFAULT 0,
	"paid_amount" real DEFAULT 0,
	"status" text DEFAULT 'pending',
	"expected_delivery" timestamp,
	"actual_delivery" timestamp,
	"items" jsonb DEFAULT '[]'::jsonb,
	"payment_terms" text,
	"delivery_address" text,
	"notes" text,
	"attachments" text[] DEFAULT '{}',
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "project_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "project_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_number" text NOT NULL,
	"project_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"subtotal" real DEFAULT 0,
	"tax_amount" real DEFAULT 0,
	"total_amount" real DEFAULT 0,
	"valid_until" timestamp,
	"status" text DEFAULT 'draft',
	"terms" text,
	"items" jsonb DEFAULT '[]'::jsonb,
	"created_by" integer,
	"sent_at" timestamp,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"notes" text,
	"attachments" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "project_quotes_quote_number_unique" UNIQUE("quote_number")
);
--> statement-breakpoint
CREATE TABLE "project_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"client_id" integer,
	"title" text NOT NULL,
	"description" text,
	"assigned_to" integer,
	"created_by" integer,
	"priority" text DEFAULT 'medium',
	"status" text DEFAULT 'pending',
	"category" text DEFAULT 'general',
	"start_date" timestamp,
	"due_date" timestamp,
	"completed_at" timestamp,
	"estimated_hours" real DEFAULT 0,
	"actual_hours" real DEFAULT 0,
	"dependencies" text[] DEFAULT '{}',
	"attachments" text[] DEFAULT '{}',
	"comments" jsonb DEFAULT '[]'::jsonb,
	"tags" text[] DEFAULT '{}',
	"is_recurring" boolean DEFAULT false,
	"recurring_frequency" text,
	"reminder_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"client_id" integer NOT NULL,
	"stage" text DEFAULT 'prospect' NOT NULL,
	"budget" real DEFAULT 0,
	"address_line_1" text,
	"address_line_2" text,
	"state" text,
	"city" text,
	"location" text,
	"pincode" text,
	"completion_percentage" integer DEFAULT 0,
	"notes" text,
	"files" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "projects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_aadhar_number_unique";--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payroll" ALTER COLUMN "actual_working_days" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "documents_urls" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "mobile" text NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "city" text NOT NULL;--> statement-breakpoint
ALTER TABLE "material_requests" ADD COLUMN "project_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "project_id" integer;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "start_date" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "completed_date" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "estimated_hours" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "actual_hours" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "tags" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "attachments" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "comments" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "updated_by" integer;--> statement-breakpoint
ALTER TABLE "moodboards" ADD CONSTRAINT "moodboards_linked_project_id_projects_id_fk" FOREIGN KEY ("linked_project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moodboards" ADD CONSTRAINT "moodboards_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_attendance" ADD CONSTRAINT "project_attendance_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_attendance" ADD CONSTRAINT "project_attendance_manpower_id_project_manpower_id_fk" FOREIGN KEY ("manpower_id") REFERENCES "public"."project_manpower"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_attendance" ADD CONSTRAINT "project_attendance_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_attendance" ADD CONSTRAINT "project_attendance_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_finances" ADD CONSTRAINT "project_finances_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_finances" ADD CONSTRAINT "project_finances_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_finances" ADD CONSTRAINT "project_finances_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_finances" ADD CONSTRAINT "project_finances_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_logs" ADD CONSTRAINT "project_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_logs" ADD CONSTRAINT "project_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_manpower" ADD CONSTRAINT "project_manpower_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_manpower" ADD CONSTRAINT "project_manpower_worker_id_users_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_manpower" ADD CONSTRAINT "project_manpower_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_orders" ADD CONSTRAINT "project_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_orders" ADD CONSTRAINT "project_orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_orders" ADD CONSTRAINT "project_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_quotes" ADD CONSTRAINT "project_quotes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_quotes" ADD CONSTRAINT "project_quotes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_quotes" ADD CONSTRAINT "project_quotes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_requests" ADD CONSTRAINT "material_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"store_name" text NOT NULL,
	"owner_name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"phone" text NOT NULL,
	"whatsapp" text NOT NULL,
	"store_slug" text NOT NULL,
	"store_type" text DEFAULT 'celulares' NOT NULL,
	"description" text DEFAULT '',
	"city" text DEFAULT 'Rio de Janeiro',
	"state" text DEFAULT 'RJ',
	"store_cep" text DEFAULT '',
	"store_address" text DEFAULT '',
	"store_address_number" text DEFAULT '',
	"store_neighborhood" text DEFAULT '',
	"store_latitude" text DEFAULT '',
	"store_longitude" text DEFAULT '',
	"logo_url" text DEFAULT '',
	"cover_url" text DEFAULT '',
	"theme_primary" text DEFAULT '#dc2626',
	"theme_secondary" text DEFAULT '#111827',
	"theme_accent" text DEFAULT '#ffffff',
	"plan" text DEFAULT 'free',
	"free_forever" boolean DEFAULT false,
	"active" boolean DEFAULT true,
	"mp_access_token" text,
	"mp_refresh_token" text,
	"mp_user_id" text,
	"mp_connected_at" timestamp,
	"mp_access_token_expires_at" timestamp,
	"mp_refresh_token_expires_at" timestamp,
	"onboarding_completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"last_login_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_store_slug_unique" UNIQUE("store_slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'iPhone',
	"storage" text DEFAULT '',
	"price" numeric(12, 2) NOT NULL,
	"condition" text DEFAULT 'Vitrine',
	"battery" text DEFAULT '',
	"warranty" text DEFAULT '',
	"stock" integer DEFAULT 1,
	"unlimited_stock" boolean DEFAULT true,
	"status" text DEFAULT 'disponivel',
	"description" text DEFAULT '',
	"options" text DEFAULT '[]',
	"photos" text DEFAULT '[]',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text,
	"product_name" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_whatsapp" text DEFAULT '',
	"sale_date" date NOT NULL,
	"product_price" numeric(12, 2) NOT NULL,
	"amount_paid" numeric(12, 2) NOT NULL,
	"payment_method" text DEFAULT 'pix',
	"notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_whatsapp" text NOT NULL,
	"customer_email" text DEFAULT '',
	"customer_document" text DEFAULT '',
	"delivery_method" text DEFAULT 'delivery',
	"cep" text DEFAULT '',
	"street" text DEFAULT '',
	"number" text DEFAULT '',
	"complement" text DEFAULT '',
	"neighborhood" text DEFAULT '',
	"city" text DEFAULT '',
	"state" text DEFAULT '',
	"reference" text DEFAULT '',
	"payment_method" text DEFAULT 'pix',
	"notes" text DEFAULT '',
	"items" text DEFAULT '[]' NOT NULL,
	"coupon_code" text DEFAULT '',
	"discount" numeric(12, 2) DEFAULT 0,
	"total" numeric(12, 2) NOT NULL,
	"payment_provider" text DEFAULT 'whatsapp',
	"payment_status" text DEFAULT 'pending',
	"mp_payment_id" text,
	"mp_qr_code" text,
	"mp_qr_code_base64" text,
	"mp_ticket_url" text,
	"mp_status_detail" text,
	"paid_at" timestamp,
	"status" text DEFAULT 'pendente',
	"whatsapp_clicked_at" timestamp DEFAULT now(),
	"confirmed_at" timestamp,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text DEFAULT 'melhoria',
	"title" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'aberto',
	"admin_note" text DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"type" text DEFAULT 'percent',
	"value" numeric(12, 2) NOT NULL,
	"active" boolean DEFAULT true,
	"max_uses" integer,
	"used_count" integer DEFAULT 0,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"area" text DEFAULT 'merchant',
	"prompt" text NOT NULL,
	"response" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_logs" ADD CONSTRAINT "ai_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
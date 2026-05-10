CREATE TABLE "chat_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tg_chat_id" bigint NOT NULL,
	"chat_name" varchar(500),
	"chat_type" varchar(20),
	"is_me" boolean DEFAULT false NOT NULL,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"sent_messages" integer DEFAULT 0 NOT NULL,
	"received_messages" integer DEFAULT 0 NOT NULL,
	"total_chars" bigint DEFAULT 0 NOT NULL,
	"total_words" bigint DEFAULT 0 NOT NULL,
	"media_count" integer DEFAULT 0 NOT NULL,
	"voice_count" integer DEFAULT 0 NOT NULL,
	"sticker_count" integer DEFAULT 0 NOT NULL,
	"file_count" integer DEFAULT 0 NOT NULL,
	"first_message_at" timestamp with time zone,
	"last_message_at" timestamp with time zone,
	"avg_response_sec" integer,
	"i_write_first_pct" integer,
	"top_words" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"top_emoji" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hourly_activity" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"sent" integer DEFAULT 0 NOT NULL,
	"received" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_chats" integer DEFAULT 0 NOT NULL,
	"total_messages" bigint DEFAULT 0 NOT NULL,
	"total_sent" bigint DEFAULT 0 NOT NULL,
	"total_received" bigint DEFAULT 0 NOT NULL,
	"total_chars" bigint DEFAULT 0 NOT NULL,
	"top_emoji" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"top_words" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"first_ever_msg" timestamp with time zone,
	"last_ever_msg" timestamp with time zone,
	"most_active_hour" integer,
	"most_active_day" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "global_stats_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "parse_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bull_job_id" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"total_chats" integer DEFAULT 0 NOT NULL,
	"parsed_chats" integer DEFAULT 0 NOT NULL,
	"total_messages" bigint DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_id" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_sessions_token_id_unique" UNIQUE("token_id")
);
--> statement-breakpoint
CREATE TABLE "telegram_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_string" text NOT NULL,
	"session_iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"dc_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tg_user_id" bigint NOT NULL,
	"tg_phone" varchar(20),
	"username" varchar(255),
	"first_name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login" timestamp with time zone,
	CONSTRAINT "users_tg_user_id_unique" UNIQUE("tg_user_id")
);
--> statement-breakpoint
ALTER TABLE "chat_stats" ADD CONSTRAINT "chat_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_activity" ADD CONSTRAINT "daily_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_stats" ADD CONSTRAINT "global_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parse_jobs" ADD CONSTRAINT "parse_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_sessions" ADD CONSTRAINT "telegram_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_stats_user_chat_idx" ON "chat_stats" USING btree ("user_id","tg_chat_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_activity_user_date_idx" ON "daily_activity" USING btree ("user_id","date");
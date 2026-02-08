CREATE TABLE IF NOT EXISTS "user_settings" (
  "user_id" text PRIMARY KEY NOT NULL,
  "google_service_account_json" text,
  "apple_issuer_id" text,
  "apple_key_id" text,
  "apple_private_key" text,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "app_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "google_package_name" text,
  "google_name" text,
  "apple_app_id" text,
  "apple_name" text,
  "apple_bundle_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

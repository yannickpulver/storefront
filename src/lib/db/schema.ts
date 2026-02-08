import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userSettings = pgTable("user_settings", {
  userId: text("user_id").primaryKey(),
  googleServiceAccountJson: text("google_service_account_json"),
  appleIssuerId: text("apple_issuer_id"),
  appleKeyId: text("apple_key_id"),
  applePrivateKey: text("apple_private_key"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appGroups = pgTable("app_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  googlePackageName: text("google_package_name"),
  googleName: text("google_name"),
  appleAppId: text("apple_app_id"),
  appleName: text("apple_name"),
  appleBundleId: text("apple_bundle_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

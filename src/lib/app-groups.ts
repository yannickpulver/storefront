import { appGroups } from "@/lib/db/schema";
import type { AppGroup } from "@/lib/types";

type AppGroupRow = typeof appGroups.$inferSelect;

export function toAppGroup(row: AppGroupRow): AppGroup {
  return {
    id: row.id,
    name: row.name,
    ...(row.customIcon ? { customIcon: row.customIcon } : {}),
    google: row.googlePackageName
      ? {
          packageName: row.googlePackageName,
          name: row.googleName ?? row.googlePackageName,
          ...(row.googleConsoleUrl ? { consoleUrl: row.googleConsoleUrl } : {}),
        }
      : undefined,
    apple: row.appleAppId
      ? {
          appId: row.appleAppId,
          name: row.appleName ?? "",
          bundleId: row.appleBundleId ?? "",
          ...(row.applePlatforms ? { platforms: row.applePlatforms.split(",") } : {}),
        }
      : undefined,
  };
}

/** Columns for the parts of a group the body sets; a store set to null is unlinked. */
export function toAppGroupValues(body: Partial<AppGroup>): Partial<AppGroupRow> {
  const values: Partial<AppGroupRow> = {};
  if (body.name !== undefined) values.name = body.name;
  if (body.customIcon !== undefined) {
    // A dropped icon is a resized PNG data URL; anything else or much larger is refused.
    const icon = body.customIcon;
    values.customIcon =
      icon && icon.startsWith("data:image/") && icon.length <= 500_000 ? icon : null;
  }
  if (body.google !== undefined) {
    values.googlePackageName = body.google?.packageName ?? null;
    values.googleName = body.google?.name ?? null;
    values.googleConsoleUrl = body.google?.consoleUrl ?? null;
  }
  if (body.apple !== undefined) {
    values.appleAppId = body.apple?.appId ?? null;
    values.appleName = body.apple?.name ?? null;
    values.appleBundleId = body.apple?.bundleId ?? null;
    values.applePlatforms = body.apple?.platforms?.length ? body.apple.platforms.join(",") : null;
  }
  return values;
}

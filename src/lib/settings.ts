import fs from "fs";
import path from "path";

export interface ApiSettings {
  googleServiceAccountJson?: string;
  appleIssuerId?: string;
  appleKeyId?: string;
  applePrivateKey?: string;
}

const SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");

export function readSettings(): ApiSettings {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function writeSettings(settings: ApiSettings): void {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export function getSetting<K extends keyof ApiSettings>(
  key: K,
  envFallback?: string
): string | undefined {
  const settings = readSettings();
  return settings[key] || envFallback || undefined;
}

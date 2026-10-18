// Google Play's daily crash and ANR ("Application Not Responding", an app freeze) rates per app
// version, from the Play Developer Reporting API. Its daily figures come only in Los Angeles
// calendar days, and each metric set says up to which day its figures are complete.

import type { playdeveloperreporting_v1beta1 } from "@googleapis/playdeveloperreporting";
import type { AppVersionVitals } from "@/lib/types";

type Reporting = playdeveloperreporting_v1beta1.Playdeveloperreporting;
type DateTime = playdeveloperreporting_v1beta1.Schema$GoogleTypeDateTime;
type MetricsRow =
  playdeveloperreporting_v1beta1.Schema$GooglePlayDeveloperReportingV1beta1MetricsRow;
type MetricSet = "crashRateMetricSet" | "anrRateMetricSet";

/**
 * Google Play shows an app less prominently once its users see crashes or freezes above these
 * shares; the same bars sit in Play Console's Android vitals.
 */
export const BAD_BEHAVIOUR = { crash: 0.0109, anr: 0.0047 } as const;

// One week smooths a single bad day without hiding a bad release for long.
const WINDOW_DAYS = 7;

const DAY_MS = 86_400_000;
const TIME_ZONE = { id: "America/Los_Angeles" };

const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

const dateTimeOf = (day: string): DateTime => {
  const [year, month, date] = day.split("-").map(Number);
  return { year, month, day: date, timeZone: TIME_ZONE };
};

const dayOf = ({ year, month, day }: DateTime) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const METRICS: Record<MetricSet, string[]> = {
  crashRateMetricSet: ["userPerceivedCrashRate", "distinctUsers"],
  anrRateMetricSet: ["userPerceivedAnrRate", "distinctUsers"],
};

/** The day after the last complete one: the exclusive end of what can be queried. */
async function completeUntil(client: Reporting, packageName: string, set: MetricSet) {
  const name = `apps/${packageName}/${set}`;
  const { data } =
    set === "crashRateMetricSet"
      ? await client.vitals.crashrate.get({ name })
      : await client.vitals.anrrate.get({ name });
  const daily = data.freshnessInfo?.freshnesses?.find((f) => f.aggregationPeriod === "DAILY");
  return daily?.latestEndTime ? dayOf(daily.latestEndTime) : null;
}

async function queryRows(
  client: Reporting,
  packageName: string,
  set: MetricSet,
  start: string,
  end: string
): Promise<MetricsRow[]> {
  const name = `apps/${packageName}/${set}`;
  const rows: MetricsRow[] = [];
  let pageToken: string | undefined;
  do {
    const requestBody = {
      timelineSpec: {
        aggregationPeriod: "DAILY",
        startTime: dateTimeOf(start),
        endTime: dateTimeOf(end),
      },
      dimensions: ["versionCode"],
      metrics: METRICS[set],
      pageSize: 1000,
      ...(pageToken ? { pageToken } : {}),
    };
    const { data } =
      set === "crashRateMetricSet"
        ? await client.vitals.crashrate.query({ name, requestBody })
        : await client.vitals.anrrate.query({ name, requestBody });
    rows.push(...(data.rows ?? []));
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);
  return rows;
}

// A decimal comes as a string; Google sends an empty one for 0.
const decimal = (row: MetricsRow, metric: string): number | null => {
  const value = row.metrics?.find((m) => m.metric === metric)?.decimalValue?.value;
  if (value === undefined || value === null) return null;
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : null;
};

const versionCodeOf = (row: MetricsRow) =>
  row.dimensions?.find((d) => d.dimension === "versionCode")?.int64Value ?? null;

/** Each version's rate over the rows, weighted by each day's users. */
function weightedByVersion(rows: MetricsRow[], metric: string) {
  const sums = new Map<string, { sum: number; weight: number; days: Set<string> }>();
  for (const row of rows) {
    const versionCode = versionCodeOf(row);
    const value = decimal(row, metric);
    if (!versionCode || !row.startTime || value === null) continue;
    const users = decimal(row, "distinctUsers") || 1;
    const entry = sums.get(versionCode) ?? { sum: 0, weight: 0, days: new Set() };
    entry.sum += value * users;
    entry.weight += users;
    entry.days.add(dayOf(row.startTime));
    sums.set(versionCode, entry);
  }
  return sums;
}

/** Each version's crash and freeze rate over the last WINDOW_DAYS complete days. */
export async function fetchGoogleVitals(
  client: Reporting,
  packageName: string
): Promise<AppVersionVitals> {
  const ends = await Promise.all([
    completeUntil(client, packageName, "crashRateMetricSet"),
    completeUntil(client, packageName, "anrRateMetricSet"),
  ]);
  if (ends.some((end) => end === null)) return {};
  const end = (ends as string[]).sort()[0];
  const start = addDays(end, -WINDOW_DAYS);

  const [crashRows, anrRows] = await Promise.all([
    queryRows(client, packageName, "crashRateMetricSet", start, end),
    queryRows(client, packageName, "anrRateMetricSet", start, end),
  ]);
  const crash = weightedByVersion(crashRows, "userPerceivedCrashRate");
  const anr = weightedByVersion(anrRows, "userPerceivedAnrRate");
  const through = addDays(end, -1);

  const result: AppVersionVitals = {};
  for (const versionCode of new Set([...crash.keys(), ...anr.keys()])) {
    const c = crash.get(versionCode);
    const a = anr.get(versionCode);
    result[versionCode] = {
      crashRate: c && c.weight > 0 ? c.sum / c.weight : null,
      anrRate: a && a.weight > 0 ? a.sum / a.weight : null,
      days: Math.max(c?.days.size ?? 0, a?.days.size ?? 0),
      through,
    };
  }
  return result;
}

/** "0.42 %", with two decimals like Google's own bars (1.09 %, 0.47 %). */
export const formatRate = (rate: number) => `${(rate * 100).toFixed(2)} %`;

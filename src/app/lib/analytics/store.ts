import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type LoadTimeEntry = {
  totalMs: number;
  count: number;
};

export type AnalyticsData = {
  visitorIds: string[];
  pageVisits: Record<string, number>;
  loadTimes: Record<string, LoadTimeEntry>;
  dailyUniqueVisitors?: Record<string, string[]>;
};

export type PageStat = {
  path: string;
  visits: number;
  avgLoadMs: number | null;
};

export type DayVisitorStat = {
  date: string;
  label: string;
  visitors: number;
};

export type AnalyticsSummary = {
  uniqueVisitors: number;
  totalVisits: number;
  pages: PageStat[];
  visitorTrend: DayVisitorStat[];
};

const MAX_VISITOR_IDS = 10_000;
const DAILY_RETENTION_DAYS = 90;
const TREND_DAYS = 30;
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "analytics.json");

const emptyData = (): AnalyticsData => ({
  visitorIds: [],
  pageVisits: {},
  loadTimes: {},
  dailyUniqueVisitors: {},
});

let memory: AnalyticsData | null = null;

async function readData(): Promise<AnalyticsData> {
  if (memory) return memory;

  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as AnalyticsData;
    if (!parsed.dailyUniqueVisitors) {
      parsed.dailyUniqueVisitors = {};
    }
    memory = parsed;
    return memory;
  } catch {
    memory = emptyData();
    return memory;
  }
}

async function writeData(data: AnalyticsData): Promise<void> {
  memory = data;
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(data), "utf8");
}

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.length > 200 ? pathname.slice(0, 200) : pathname;
}

function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function pruneOldDailyVisitors(data: AnalyticsData): void {
  if (!data.dailyUniqueVisitors) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAILY_RETENTION_DAYS);
  const cutoffKey = dateKey(cutoff);
  for (const key of Object.keys(data.dailyUniqueVisitors)) {
    if (key < cutoffKey) {
      delete data.dailyUniqueVisitors[key];
    }
  }
}

function buildVisitorTrend(
  dailyUniqueVisitors: Record<string, string[]>
): DayVisitorStat[] {
  const trend: DayVisitorStat[] = [];
  const today = new Date();

  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dateKey(d);
    trend.push({
      date: key,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      visitors: dailyUniqueVisitors[key]?.length ?? 0,
    });
  }

  return trend;
}

export async function recordVisit(
  pathname: string,
  visitorId: string
): Promise<void> {
  const pathKey = normalizePath(pathname);
  const data = await readData();

  if (!data.visitorIds.includes(visitorId)) {
    data.visitorIds.push(visitorId);
    if (data.visitorIds.length > MAX_VISITOR_IDS) {
      data.visitorIds = data.visitorIds.slice(-MAX_VISITOR_IDS);
    }
  }

  data.pageVisits[pathKey] = (data.pageVisits[pathKey] ?? 0) + 1;

  const day = dateKey(new Date());
  if (!data.dailyUniqueVisitors) data.dailyUniqueVisitors = {};
  const dayVisitors = data.dailyUniqueVisitors[day] ?? [];
  if (!dayVisitors.includes(visitorId)) {
    data.dailyUniqueVisitors[day] = [...dayVisitors, visitorId];
  }
  pruneOldDailyVisitors(data);

  await writeData(data);
}

export async function recordLoadTime(
  pathname: string,
  loadMs: number
): Promise<void> {
  if (!Number.isFinite(loadMs) || loadMs < 0 || loadMs > 120_000) return;

  const pathKey = normalizePath(pathname);
  const data = await readData();
  const entry = data.loadTimes[pathKey] ?? { totalMs: 0, count: 0 };
  entry.totalMs += loadMs;
  entry.count += 1;
  data.loadTimes[pathKey] = entry;
  await writeData(data);
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const data = await readData();
  const paths = new Set([
    ...Object.keys(data.pageVisits),
    ...Object.keys(data.loadTimes),
  ]);

  const pages: PageStat[] = [...paths].map((pathKey) => {
    const load = data.loadTimes[pathKey];
    return {
      path: pathKey,
      visits: data.pageVisits[pathKey] ?? 0,
      avgLoadMs:
        load && load.count > 0
          ? Math.round(load.totalMs / load.count)
          : null,
    };
  });

  pages.sort((a, b) => b.visits - a.visits || a.path.localeCompare(b.path));

  const totalVisits = Object.values(data.pageVisits).reduce(
    (sum, count) => sum + count,
    0
  );

  return {
    uniqueVisitors: data.visitorIds.length,
    totalVisits,
    pages,
    visitorTrend: buildVisitorTrend(data.dailyUniqueVisitors ?? {}),
  };
}

export function isAnalyticsAuthorized(key: string | undefined): boolean {
  const secret = process.env.ANALYTICS_SECRET;
  if (!secret) return true;
  return key === secret;
}

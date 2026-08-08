/**
 * Persistent cache backend (Python FastAPI server).
 * Set FSM_CACHE_URL or defaults to http://127.0.0.1:8787
 */

const CACHE_URL = (
  process.env.FSM_CACHE_URL ?? "http://127.0.0.1:8787"
).replace(/\/$/, "");

const DEV = process.env.NODE_ENV !== "production";

function logCacheError(op: string, detail: string) {
  if (DEV) console.warn(`[cache] ${op} failed: ${detail}`);
}

export function isCacheBackendEnabled(): boolean {
  return Boolean(CACHE_URL);
}

export function getCacheBackendUrl(): string {
  return CACHE_URL;
}

type CacheEnvelope<T> = {
  key: string;
  data: T;
  updated_at: number;
  stale?: boolean;
  frozen?: boolean;
  phase?: string;
};

export async function cacheGet<T>(
  key: string,
  options?: { allowStale?: boolean }
): Promise<CacheEnvelope<T> | null> {
  if (!CACHE_URL) return null;
  try {
    const params = options?.allowStale ? "?allow_stale=true" : "";
    const res = await fetch(
      `${CACHE_URL}/v1/cache/${encodeURIComponent(key)}${params}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      if (DEV && res.status !== 404) {
        logCacheError("GET", `${key} -> HTTP ${res.status}`);
      }
      return null;
    }
    return (await res.json()) as CacheEnvelope<T>;
  } catch (err) {
    logCacheError("GET", `${key} -> ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

export async function cacheGetMany<T>(
  keys: string[],
  options?: { allowStale?: boolean }
): Promise<Record<string, CacheEnvelope<T>>> {
  if (!CACHE_URL || keys.length === 0) return {};
  const merged: Record<string, CacheEnvelope<T>> = {};
  const chunkSize = 500;
  try {
    for (let i = 0; i < keys.length; i += chunkSize) {
      const slice = keys.slice(i, i + chunkSize);
      const res = await fetch(`${CACHE_URL}/v1/cache/mget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keys: slice,
          allow_stale: Boolean(options?.allowStale),
        }),
        cache: "no-store",
      });
      if (!res.ok) {
        if (DEV) logCacheError("MGET", `HTTP ${res.status}`);
        continue;
      }
      const payload = (await res.json()) as {
        entries: Record<string, CacheEnvelope<T>>;
      };
      Object.assign(merged, payload.entries ?? {});
    }
    return merged;
  } catch (err) {
    logCacheError(
      "MGET",
      err instanceof Error ? err.message : String(err)
    );
    return merged;
  }
}

export async function cachePut(
  key: string,
  data: unknown,
  meta?: {
    event_start?: string;
    event_end?: string;
    force_frozen?: boolean;
  }
): Promise<void> {
  if (!CACHE_URL) return;
  try {
    const res = await fetch(`${CACHE_URL}/v1/cache/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, ...meta }),
      cache: "no-store",
    });
    if (!res.ok) {
      logCacheError("PUT", `${key} -> HTTP ${res.status}`);
    }
  } catch (err) {
    logCacheError("PUT", `${key} -> ${err instanceof Error ? err.message : err}`);
  }
}

/** Fetch a TBA API path via the cache server (path without /api/v3 prefix). */
export async function fetchTbaCached<T>(path: string): Promise<T | null> {
  if (!CACHE_URL) return null;
  try {
    const clean = path.replace(/^\//, "");
    const res = await fetch(`${CACHE_URL}/v1/tba/${clean}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      if (DEV) logCacheError("TBA", `${path} -> HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    logCacheError("TBA", `${path} -> ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

export function tbaEventKey(eventCode: string, resource: string): string {
  return `tba:event:${eventCode}:${resource}`;
}

export function computedEventTeamsKey(eventCode: string): string {
  return `computed:event-teams:${eventCode}`;
}

export function computedGeneralStatsKey(
  year: number,
  includeOffseason: boolean
): string {
  return `computed:general-stats:${year}:${includeOffseason ? 1 : 0}`;
}

export function computedGlobalStatsKey(
  year: number,
  includeOffseason: boolean
): string {
  return `computed:global-stats:${year}:${includeOffseason ? 1 : 0}`;
}

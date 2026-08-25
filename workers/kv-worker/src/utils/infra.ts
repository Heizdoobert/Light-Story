/** Shared infrastructure metrics — used by /analytics/infrastructure and /admin/analytics/dashboard */

type SqlRow = Record<string, string | number>;

// Must match the wrangler.jsonc analytics_engine_datasets entry.
const ANALYTICS_DATASET = 'lightstory_analytics';

async function queryAnalyticsSql(env: Env, sql: string): Promise<SqlRow[] | null> {
  const token = (env as any).CLOUDFLARE_API_TOKEN as string | undefined;
  const accountId = (env as any).CLOUDFLARE_ACCOUNT_ID as string | undefined;
  if (!token || !accountId) return null;
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
        body: sql,
      },
    );
    if (!res.ok) {
      console.error(`[AnalyticsSql] status ${res.status}: ${sql.slice(0, 120)}`);
      return null;
    }
    const payload: { data?: SqlRow[] } = await res.json();
    return Array.isArray(payload.data) ? payload.data : null;
  } catch (err) {
    console.error('[AnalyticsSql] failed:', err);
    return null;
  }
}

function rowNum(row: SqlRow | undefined, key: string): number {
  if (!row) return 0;
  const value = row[key];
  return typeof value === 'number' ? value : Number(value ?? 0) || 0;
}

export async function getInfrastructurePayload(env: Env) {
  // Cache: full R2 listing (~13k objects) + AE SQL ~8s — KV TTL 300s.
  const CACHE_KEY = 'infra:metrics';
  if (env.APP_KV) {
    const cached = await env.APP_KV.get(CACHE_KEY, 'json');
    if (cached) return cached;
  }

  let r2ObjectCount = 0;
  let r2SizeBytes = 0;

  if (env.R2_BUCKET) {
    let cursor: string | undefined = undefined;
    try {
      do {
        const listRes: any = await env.R2_BUCKET.list({ cursor, limit: 1000 });
        r2ObjectCount += listRes.objects.length;
        for (const obj of listRes.objects) {
          r2SizeBytes += obj.size || 0;
        }
        cursor = listRes.truncated ? listRes.cursor : undefined;
      } while (cursor);
    } catch (e) {
      console.error('[Infra] R2 metrics failed:', e);
    }
  }

  let queueBacklog = 0;
  if (env.LIGHTSTORY_QUEUE) {
    try {
      const qm = await env.LIGHTSTORY_QUEUE.metrics();
      queueBacklog = Number(qm.backlogCount ?? 0);
    } catch (e) {
      console.error('[Infra] queue metrics failed:', e);
    }
  }

  const r2UsageGb = Number((r2SizeBytes / (1024 * 1024 * 1024)).toFixed(4));
  // ponytail: R2 free tier cap (10 GB) is the real plan constant, not telemetry.
  const r2AllocatedGb = 10;
  const storageEfficiencyPct =
    r2AllocatedGb > 0 ? Number(((r2UsageGb / r2AllocatedGb) * 100).toFixed(2)) : 0;

  // Real traffic stats from Analytics Engine (dataset lightstory_analytics).
  const since = "timestamp > NOW() - INTERVAL '30' DAY";
  const rows = await queryAnalyticsSql(
    env,
    `SELECT blob1 AS host, blob2 AS device, count() AS cnt FROM ${ANALYTICS_DATASET} WHERE ${since} GROUP BY blob1, blob2`,
  );

  let pageViews = 0;
  const deviceCounts = new Map<string, number>();
  const zoneCounts = new Map<string, number>();
  for (const row of rows ?? []) {
    const count = rowNum(row, 'cnt');
    pageViews += count;
    const device = String(row['device'] ?? 'unknown');
    deviceCounts.set(device, (deviceCounts.get(device) ?? 0) + count);
    const host = String(row['host'] ?? '');
    if (host) zoneCounts.set(host, (zoneCounts.get(host) ?? 0) + count);
  }
  const totalDevices = [...deviceCounts.values()].reduce((s, n) => s + n, 0) || 1;
  const devicePct = (key: string) => Math.round(((deviceCounts.get(key) ?? 0) / totalDevices) * 1000) / 10;

  const topZones = [...zoneCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([zone, requests]) => ({ zone, requests }));

  const payload = {
    r2_usage_gb: r2UsageGb,
    r2_allocated_gb: r2AllocatedGb,
    r2_object_count: r2ObjectCount,
    storage_efficiency_pct: storageEfficiencyPct,
    page_views: pageViews,
    device_mobile: devicePct('mobile'),
    device_desktop: devicePct('desktop'),
    device_tablet: devicePct('tablet'),
    top_zones: topZones,
    queue_binding: env.LIGHTSTORY_QUEUE ? 'bound' : 'unbound',
    queue_backlog: queueBacklog,
    workflow_binding: env.LIGHTSTORY_WORKFLOW ? 'bound' : 'unbound',
    kv_binding: env.APP_KV ? 'bound' : 'unbound',
    recorded_at: new Date().toISOString(),
  };

  if (env.APP_KV) {
    await env.APP_KV
      .put(CACHE_KEY, JSON.stringify(payload), { expirationTtl: 300 })
      .catch(() => {});
  }

  return payload;
}

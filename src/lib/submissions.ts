
/**
 * Form submissions storage.
 *
 * Uses Upstash Redis over its REST API (no extra packages). On Vercel, add the
 * "Upstash for Redis" integration from the Marketplace (Storage tab); it sets
 * KV_REST_API_URL and KV_REST_API_TOKEN for you. UPSTASH_REDIS_REST_URL /
 * UPSTASH_REDIS_REST_TOKEN also work.
 *
 * Without those variables (e.g. local dev), submissions are kept in memory and
 * disappear when the server restarts.
 */

export type SubmissionKind = "quote" | "waitlist";
export type Submission = {
  id: string;
  kind: SubmissionKind;
  receivedAt: string;
  data: Record<string, string | string[]>;
};

const KEY = "cc:submissions";
const MAX_KEEP = 5000;

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const storageConfigured = Boolean(url && token);

const g = globalThis as unknown as { __ccSubs?: string[] };
const memory = (g.__ccSubs ??= []);

async function redis<T>(cmd: (string | number)[]): Promise<T> {
  const res = await fetch(url!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { result?: T; error?: string };
  if (!res.ok || json.error) throw new Error(`Redis ${cmd[0]} failed: ${json.error ?? res.status}`);
  return json.result as T;
}

/** Keep only plain strings / string lists, trimmed and length-capped. */
export function clean(body: Record<string, unknown>, fields: string[]): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const f of fields) {
    const v = body[f];
    if (Array.isArray(v)) out[f] = v.slice(0, 20).map((x) => String(x).slice(0, 200));
    else if (v !== undefined && v !== null && String(v).trim() !== "") out[f] = String(v).trim().slice(0, 2000);
  }
  return out;
}

export async function saveSubmission(kind: SubmissionKind, data: Submission["data"]): Promise<Submission> {
  const sub: Submission = { id: crypto.randomUUID(), kind, receivedAt: new Date().toISOString(), data };
  const raw = JSON.stringify(sub);
  console.log(`[${kind}]`, raw); // also visible in Vercel logs, as a backup
  if (storageConfigured) {
    await redis(["LPUSH", KEY, raw]);
    await redis(["LTRIM", KEY, 0, MAX_KEEP - 1]);
  } else {
    if (process.env.NODE_ENV === "production") console.warn("[submissions] No Redis configured: kept in memory only.");
    memory.unshift(raw);
    memory.length = Math.min(memory.length, MAX_KEEP);
  }
  return sub;
}

/** Newest first. */
export async function listSubmissions(limit = 1000): Promise<Submission[]> {
  const rows = storageConfigured ? await redis<string[]>(["LRANGE", KEY, 0, limit - 1]) : memory.slice(0, limit);
  return rows.flatMap((r) => {
    try {
      return [JSON.parse(r) as Submission];
    } catch {
      return [];
    }
  });
}

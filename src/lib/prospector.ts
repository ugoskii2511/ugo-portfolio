import "server-only";

/// Server-side client for the Python prospector service. The shared secret
/// never reaches the browser: only server code (admin API routes, server
/// components) calls this, after the admin session has been verified.
export class ProspectorError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ProspectorError";
  }
}

export function prospectorConfigured(): boolean {
  return Boolean(process.env.PROSPECTOR_URL && process.env.PROSPECTOR_API_SECRET);
}

export async function callProspector<T = unknown>(
  path: string,
  init: { method?: "GET" | "POST" | "PUT"; body?: unknown; actor?: string; timeoutMs?: number } = {}
): Promise<T> {
  const base = process.env.PROSPECTOR_URL?.replace(/\/$/, "");
  const secret = process.env.PROSPECTOR_API_SECRET;
  if (!base || !secret) {
    throw new ProspectorError("The prospector service isn't configured (PROSPECTOR_URL / PROSPECTOR_API_SECRET).", 503);
  }
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        ...(init.actor ? { "X-Admin-Actor": init.actor } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: AbortSignal.timeout(init.timeoutMs ?? 58_000),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new ProspectorError(timedOut ? "The prospector service took too long to respond." : "Couldn't reach the prospector service.", 502);
  }
  const data = (await response.json().catch(() => null)) as { detail?: unknown } | null;
  if (!response.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string; loc?: unknown[] }) => `${(d.loc ?? []).slice(-1)[0] ?? "field"}: ${d.msg}`).join("; ")
          : `Prospector error (HTTP ${response.status})`;
    throw new ProspectorError(message, response.status === 401 ? 502 : response.status);
  }
  return data as T;
}

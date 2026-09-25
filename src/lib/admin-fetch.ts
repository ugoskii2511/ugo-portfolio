/// JSON request helper for the admin UI. Same endpoints and methods as
/// before; it only turns failures into readable messages. A zod 400 from
/// handleApiError comes back as "Validation failed" plus `issues`, and this
/// surfaces the first field error ("liveUrl: Invalid URL") instead.
export class AdminRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: Record<string, string[]> = {}
  ) {
    super(message);
    this.name = "AdminRequestError";
  }
}

type Issues = { fieldErrors?: Record<string, string[]>; formErrors?: string[] };

export async function adminRequest<T = unknown>(
  url: string,
  init: { method: "POST" | "PATCH" | "DELETE"; body?: unknown }
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method,
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new AdminRequestError("Network error. Check your connection and try again.", 0);
  }

  const data = (await response.json().catch(() => null)) as
    | ({ error?: string; issues?: Issues } & Record<string, unknown>)
    | null;

  if (!response.ok) {
    if (response.status === 401) {
      throw new AdminRequestError("Your session has expired. Sign in again to continue.", 401);
    }
    const fieldErrors = data?.issues?.fieldErrors ?? {};
    const firstField = Object.entries(fieldErrors).find(([, messages]) => messages?.length);
    const message = firstField
      ? `${humanize(firstField[0])}: ${firstField[1][0]}`
      : data?.issues?.formErrors?.[0] ?? data?.error ?? "Something went wrong. Please try again.";
    throw new AdminRequestError(message, response.status, fieldErrors);
  }

  return data as T;
}

function humanize(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/Url$/i, "URL")
    .replace(/^./, (c) => c.toUpperCase());
}

export function errorMessage(error: unknown, fallback = "Something went wrong.") {
  return error instanceof Error ? error.message : fallback;
}

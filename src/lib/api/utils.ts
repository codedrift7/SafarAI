const defaultBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.CLIENT_URL ||
  "http://localhost:3000";

export function apiUrl(path: string): string {
  if (typeof window !== "undefined") return path;
  return `${defaultBaseUrl}${path}`;
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function* parseSse<T>(response: Response): AsyncGenerator<T> {
  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";

    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .map((value) => value.trim())
        .find((value) => value.startsWith("data:"));

      if (!line) continue;
      const payload = line.replace(/^data:\s*/, "");
      if (!payload) continue;
      yield JSON.parse(payload) as T;
    }
  }
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);
}

export function addDays(date: string, amount: number): string {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result.toISOString();
}

export function inclusiveDayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return 1;
  }
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function asDateOnlyIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

/** Small, deterministic-ish latency so mocked calls behave like real I/O. */
export function delay(milliseconds = 110): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * DTOs contain plain data only. JSON cloning prevents a component from
 * accidentally mutating the in-memory repository by holding a return value.
 */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

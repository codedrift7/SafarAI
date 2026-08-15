import type { Season } from "@/lib/domain/types";

export function seasonForDate(value: Date | string): Season {
  const date = typeof value === "string" ? new Date(value) : value;
  const month = date.getUTCMonth() + 1;
  if (month === 12 || month <= 2) return "WINTER";
  if (month <= 5) return "SPRING";
  if (month <= 8) return "SUMMER";
  return "AUTUMN";
}

export function seasonsForRange(startDate: Date | string, endDate: Date | string): Season[] {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  const found = new Set<Season>();
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cursor <= endMonth) {
    found.add(seasonForDate(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return [...found];
}

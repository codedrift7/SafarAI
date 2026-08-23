/**
 * Open-Meteo weather integration for gap-filler decisions.
 * Free API, no key needed. ~100ms latency per call.
 * Falls back to seasonal heuristic if unreachable or date is outside forecast window.
 */

export interface WeatherCondition {
  precipitationMm: number;
  windSpeedKmh: number;
  isOutdoorFriendly: boolean;
}

// In-memory cache keyed by "lat,lng,date" to avoid duplicate API calls
// for multiple gaps on the same day/location.
const weatherCache = new Map<string, WeatherCondition[]>();

/**
 * Fetch hourly weather for a specific location and date from Open-Meteo.
 * Returns the condition for the requested hour.
 *
 * Falls back to seasonal heuristic when:
 * - API is unreachable (timeout, network error)
 * - Date is outside Open-Meteo's forecast window (~16 days)
 * - Response is malformed
 */
export async function getWeatherForHour(
  latitude: number,
  longitude: number,
  date: string, // "2026-09-15"
  hour: number, // 0-23
): Promise<WeatherCondition> {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)},${date}`;

  // Check cache first — all hours for this location+date are fetched together
  const cached = weatherCache.get(cacheKey);
  if (cached && cached[hour]) {
    return cached[hour];
  }

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&hourly=precipitation,wind_speed_10m` +
      `&start_date=${date}&end_date=${date}` +
      `&timezone=auto`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return seasonalFallback(date, hour);
    }

    const data = await response.json();

    if (
      !data?.hourly?.precipitation ||
      !data?.hourly?.wind_speed_10m ||
      !Array.isArray(data.hourly.precipitation)
    ) {
      return seasonalFallback(date, hour);
    }

    // Cache all 24 hours for this location+date
    const hourlyConditions: WeatherCondition[] = [];
    for (let h = 0; h < 24; h++) {
      const precip = data.hourly.precipitation[h] ?? 0;
      const wind = data.hourly.wind_speed_10m[h] ?? 0;
      hourlyConditions.push({
        precipitationMm: precip,
        windSpeedKmh: wind,
        isOutdoorFriendly: precip < 2 && wind < 25,
      });
    }
    weatherCache.set(cacheKey, hourlyConditions);

    return hourlyConditions[hour] ?? seasonalFallback(date, hour);
  } catch {
    // Network error, timeout, or abort — use seasonal fallback
    return seasonalFallback(date, hour);
  }
}

/**
 * Seasonal heuristic fallback when Open-Meteo is unreachable.
 * Jul–Sep (monsoon) → assume indoor weather.
 * Oct–Jun → assume outdoor-friendly.
 * Night hours (before 6am, after 8pm) → indoor.
 */
function seasonalFallback(date: string, hour: number): WeatherCondition {
  const month = new Date(date).getMonth(); // 0-indexed
  const isMonsoon = month >= 6 && month <= 8; // Jul=6, Aug=7, Sep=8
  const isNight = hour < 6 || hour >= 20;

  const isOutdoorFriendly = !isMonsoon && !isNight;

  return {
    precipitationMm: isMonsoon ? 5 : 0,
    windSpeedKmh: 10,
    isOutdoorFriendly,
  };
}

/**
 * Batch-fetch weather for multiple (lat, lng, date, hour) tuples in parallel.
 * Deduplicates by (lat, lng, date) so the same API call isn't made twice.
 */
export async function batchGetWeather(
  requests: Array<{ latitude: number; longitude: number; date: string; hour: number }>,
): Promise<WeatherCondition[]> {
  // Pre-warm cache: group by unique (lat,lng,date) and fetch each once
  const uniqueKeys = new Map<string, { latitude: number; longitude: number; date: string }>();
  for (const req of requests) {
    const key = `${req.latitude.toFixed(4)},${req.longitude.toFixed(4)},${req.date}`;
    if (!uniqueKeys.has(key)) {
      uniqueKeys.set(key, { latitude: req.latitude, longitude: req.longitude, date: req.date });
    }
  }

  // Fetch all unique location+date combos in parallel
  await Promise.all(
    Array.from(uniqueKeys.values()).map((u) =>
      getWeatherForHour(u.latitude, u.longitude, u.date, 12), // hour doesn't matter, caches all 24
    ),
  );

  // Now resolve each request from cache
  return Promise.all(
    requests.map((req) => getWeatherForHour(req.latitude, req.longitude, req.date, req.hour)),
  );
}

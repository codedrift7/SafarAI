"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map, MapPin, Route } from "lucide-react";
import type { Activity, TripDay } from "@/lib/domain/types";

type MapboxModule = typeof import("mapbox-gl");

type RoutePoint = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

type RegionViewport = {
  center: [longitude: number, latitude: number];
  zoom: number;
};

// Regions currently do not persist a geographic centre. These views keep an
// unverified/empty itinerary anchored in its destination instead of Pakistan.
const regionViewports: Record<string, RegionViewport> = {
  hunza: { center: [74.6679, 36.3243], zoom: 11.5 },
  skardu: { center: [75.633, 35.297], zoom: 11 },
  lahore: { center: [74.3587, 31.5204], zoom: 12 },
  "swat-valley": { center: [72.361, 34.767], zoom: 10.5 },
  islamabad: { center: [73.0479, 33.6844], zoom: 12 },
  "naran-kaghan": { center: [73.649, 34.908], zoom: 10.5 },
  peshawar: { center: [71.544, 34.015], zoom: 12 },
  "chitral-kalash": { center: [71.786, 35.852], zoom: 10.5 },
  "fairy-meadows-nanga-parbat": { center: [74.589, 35.421], zoom: 11 },
  multan: { center: [71.474, 30.158], zoom: 12 },
  karachi: { center: [67.01, 24.86], zoom: 10.5 },
};

const fallbackBackground = {
  backgroundImage:
    "linear-gradient(24deg, transparent 48%, rgba(18,35,43,.27) 49%, rgba(18,35,43,.27) 51%, transparent 52%), linear-gradient(150deg, transparent 46%, rgba(255,255,255,.65) 47%, rgba(255,255,255,.65) 50%, transparent 51%), radial-gradient(ellipse at 28% 44%, #4f8f75 0 18%, transparent 18.5%), radial-gradient(ellipse at 72% 64%, #729e5a 0 13%, transparent 13.5%), radial-gradient(ellipse at 62% 18%, #eef0e7 0 15%, transparent 15.5%)",
};

function toRoutePoints(activities: Activity[]): RoutePoint[] {
  return [...activities]
    .sort((first, second) => first.orderIndex - second.orderIndex)
    .flatMap((activity) => {
      const latitude = activity.poi?.latitude;
      const longitude = activity.poi?.longitude;
      if (latitude == null || longitude == null) return [];

      return [{
        id: activity.id,
        label: activity.poi?.name ?? activity.customTitle ?? "Route stop",
        latitude,
        longitude,
      }];
    });
}

function FallbackMap({ points }: { points: RoutePoint[] }) {
  return <>
    <div className="absolute inset-0 opacity-90" style={fallbackBackground} />
    <svg className="absolute inset-0 size-full" viewBox="0 0 600 350" preserveAspectRatio="none" aria-hidden="true"><path d="M75 270 C145 230, 160 160, 250 175 S355 90, 435 135 S520 84, 555 74" fill="none" stroke="#D6336C" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 10" /></svg>
    {points.length > 0 && <div className="absolute inset-0 flex items-center justify-around px-[12%] pt-8" aria-hidden="true">{points.slice(0, 4).map((point, index) => <div key={point.id} className="relative" style={{ transform: `translateY(${[58, -25, 10, -62][index] ?? 0}px)` }}><span className="grid size-8 place-items-center rounded-full border-2 border-white bg-karakoram-ink text-xs font-bold text-white shadow-lg">{index + 1}</span><span className="absolute left-1/2 top-9 w-24 -translate-x-1/2 rounded-md bg-white/90 px-1 py-0.5 text-center text-[9px] font-bold text-karakoram-ink shadow-sm">{point.label}</span></div>)}</div>}
  </>;
}

export function TripMap({ day }: { day: TripDay | undefined }) {
  const points = useMemo(() => toRoutePoints(day?.activities ?? []), [day]);
  const hasPoints = points.length > 0;
  const regionViewport = day?.region?.slug ? regionViewports[day.region.slug] : undefined;
  const canShowLiveMap = hasPoints || Boolean(regionViewport);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<MapboxModule["default"]["Map"]> | null>(null);
  const mapboxRef = useRef<MapboxModule["default"] | null>(null);
  const markersRef = useRef<InstanceType<MapboxModule["default"]["Marker"]>[]>([]);
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [mapState, setMapState] = useState<"loading" | "live" | "fallback">("loading");
  const [mapVersion, setMapVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/v1/maps/token")
      .then(async (response) => {
        if (!response.ok) throw new Error("Map token request failed");
        return response.json() as Promise<{ token?: unknown }>;
      })
      .then((data) => {
        if (!cancelled) setToken(typeof data.token === "string" ? data.token : null);
      })
      .catch(() => {
        if (!cancelled) setToken(null);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let map: InstanceType<MapboxModule["default"]["Map"]> | null = null;
    let mapLoaded = false;
    let loadTimeout: number | undefined;

    if (!canShowLiveMap || !token || !containerRef.current || mapRef.current) return;
    setMapState("loading");

    void import("mapbox-gl")
      .then(({ default: mapboxgl }) => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        mapboxgl.accessToken = token;
        mapboxRef.current = mapboxgl;
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/outdoors-v12",
          center: regionViewport?.center ?? [72.8, 35.9],
          zoom: regionViewport?.zoom ?? 7,
          attributionControl: true,
        });

        mapRef.current = map;
        map.on("load", () => {
          mapLoaded = true;
          if (loadTimeout) window.clearTimeout(loadTimeout);
          if (!cancelled) {
            setMapState("live");
            setMapVersion((version) => version + 1);
          }
        });
        // Mapbox can emit recoverable errors for an individual tile or glyph.
        // A fallback is only appropriate when the map itself never loads.
        loadTimeout = window.setTimeout(() => {
          if (!cancelled && !mapLoaded) setMapState("fallback");
        }, 10_000);
      })
      .catch(() => {
        if (!cancelled) setMapState("fallback");
      });

    return () => {
      cancelled = true;
      if (loadTimeout) window.clearTimeout(loadTimeout);
    };
  }, [canShowLiveMap, regionViewport, token]);

  useEffect(() => () => {
    mapRef.current?.remove();
    mapRef.current = null;
    mapboxRef.current = null;
    markersRef.current = [];
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl) return;
    if (!hasPoints) {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (map.getLayer("safar-route-line")) map.setLayoutProperty("safar-route-line", "visibility", "none");
      if (regionViewport) map.easeTo({ center: regionViewport.center, zoom: regionViewport.zoom, duration: 0 });
      return;
    }

    const updateRoute = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = points.map((point, index) => {
        const element = document.createElement("button");
        element.type = "button";
        element.className = "safar-map-marker";
        element.textContent = String(index + 1);
        element.setAttribute("aria-label", `${index + 1}. ${point.label}`);
        return new mapboxgl.Marker({ element, anchor: "bottom" })
          .setLngLat([point.longitude, point.latitude])
          .addTo(map);
      });

      if (points.length > 1) {
        const lineData = {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: points.map((point) => [point.longitude, point.latitude] as [number, number]),
          },
        };
        const source = map.getSource("safar-route") as { setData?: (data: typeof lineData) => void } | undefined;
        if (source?.setData) {
          source.setData(lineData);
          map.setLayoutProperty("safar-route-line", "visibility", "visible");
        } else {
          map.addSource("safar-route", { type: "geojson", data: lineData });
          map.addLayer({
            id: "safar-route-line",
            type: "line",
            source: "safar-route",
            paint: {
              "line-color": "#D6336C",
              "line-width": 4,
              "line-opacity": 0.88,
              "line-dasharray": [1, 2],
            },
          });
        }
      } else if (map.getLayer("safar-route-line")) {
        map.setLayoutProperty("safar-route-line", "visibility", "none");
      }

      if (points.length === 1) {
        map.easeTo({ center: [points[0].longitude, points[0].latitude], zoom: 13, duration: 0 });
        return;
      }

      const bounds = new mapboxgl.LngLatBounds();
      points.forEach((point) => bounds.extend([point.longitude, point.latitude]));
      map.fitBounds(bounds, { padding: { top: 48, right: 48, bottom: 48, left: 48 }, maxZoom: 14, duration: 0 });
    };

    if (map.isStyleLoaded()) updateRoute();
    else map.once("load", updateRoute);
  }, [hasPoints, mapVersion, points, regionViewport]);

  const resetView = () => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl) return;
    if (!points[0] && regionViewport) {
      map.easeTo({ center: regionViewport.center, zoom: regionViewport.zoom });
      return;
    }
    if (!points[0]) return;
    if (points.length === 1) {
      map.easeTo({ center: [points[0].longitude, points[0].latitude], zoom: 13 });
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();
    points.forEach((point) => bounds.extend([point.longitude, point.latitude]));
    map.fitBounds(bounds, { padding: { top: 48, right: 48, bottom: 48, left: 48 }, maxZoom: 14 });
  };

  const showFallback = !canShowLiveMap || mapState !== "live";
  const status = mapState === "live" && canShowLiveMap ? "Live map" : token === undefined && canShowLiveMap ? "Loading live map…" : "Map preview · token-free mode";

  return <div className="safar-map relative min-h-[280px] overflow-hidden rounded-[1.3rem] border border-karakoram-ink/12 bg-[#c6dde0] sm:min-h-[350px]" role="region" aria-label={day ? `Map overview for day ${day.dayNumber}` : "Map overview"}>
    <div ref={containerRef} className={`absolute inset-0 transition-opacity ${showFallback ? "pointer-events-none opacity-0" : "opacity-100"}`} />
    {showFallback && <FallbackMap points={points} />}
    <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-white/88 px-3 py-2 text-xs font-semibold text-karakoram-ink shadow"><Map size={14} className="text-attabad-turquoise" /> {status.includes("token-free") ? <>Map preview <span className="text-karakoram-ink/45">· token-free mode</span></> : status}</div>
    <button type="button" onClick={resetView} disabled={showFallback || !canShowLiveMap} className="absolute right-3 top-3 grid size-9 place-items-center rounded-xl bg-karakoram-ink text-sandstone-mist shadow transition hover:bg-karakoram-ink/90 disabled:cursor-default disabled:opacity-75" aria-label="Fit map to today’s route"><Route size={17} /></button>
    {!hasPoints && !regionViewport && <div className="absolute inset-0 grid place-items-center text-center"><span className="rounded-xl bg-white/85 p-4 text-xs font-semibold text-karakoram-ink"><MapPin className="mx-auto mb-1 text-attabad-turquoise" size={18} /> Route points appear here</span></div>}
  </div>;
}

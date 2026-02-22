"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getSchoolMapData, type MapSchool } from "@/lib/api";
import { computeTier, getTierConfig } from "./TierBadge";

// Free dark map tile styles (no API key required)
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface MapProps {
  onSchoolClick?: (school: MapSchool) => void;
  flyTo?: { lng: number; lat: number; zoom?: number } | null;
  showTwoYear?: boolean;
  fratSchoolIds?: string[];
}

export default function Map({ onSchoolClick, flyTo, showTwoYear = false, fratSchoolIds }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const schoolsRef = useRef<MapSchool[]>([]);
  const onSchoolClickRef = useRef(onSchoolClick);

  // Keep ref in sync with latest callback
  useEffect(() => {
    onSchoolClickRef.current = onSchoolClick;
  }, [onSchoolClick]);

  const addSchoolData = useCallback(async (mapInstance: maplibregl.Map) => {
    try {
      const schools = await getSchoolMapData();
      schoolsRef.current = schools;

      // Create GeoJSON from schools
      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: schools.map((s) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [s.longitude, s.latitude],
          },
          properties: {
            id: s.id,
            name: s.name,
            state: s.state,
            control: s.control,
            iclevel: s.iclevel || 1,
            venue_count: s.venue_count || 0,
            avg_rating: s.avg_rating || 0,
          },
        })),
      };

      // Add source — no clustering, every school is its own dot
      mapInstance.addSource("schools", {
        type: "geojson",
        data: geojson,
      });

      // Default filter: only 4-year schools (iclevel=1)
      const defaultFilter: maplibregl.FilterSpecification = ["==", ["get", "iclevel"], 1];

      // Outer neon glow — scales with zoom
      mapInstance.addLayer({
        id: "school-glow",
        type: "circle",
        source: "schools",
        filter: defaultFilter,
        paint: {
          "circle-color": [
            "match", ["get", "control"],
            "public", "#00ffaa",
            "private_nonprofit", "#bf5fff",
            "private_forprofit", "#ff6b6b",
            "#bf5fff",
          ],
          "circle-radius": [
            "interpolate", ["exponential", 1.5], ["zoom"],
            3, 4,
            7, 8,
            10, 14,
            14, 24,
          ],
          "circle-blur": 1,
          "circle-opacity": [
            "interpolate", ["linear"], ["zoom"],
            3, 0.15,
            8, 0.25,
            14, 0.35,
          ],
        },
      });

      // Core neon dots — scale with zoom for easy clicking when close
      mapInstance.addLayer({
        id: "school-points",
        type: "circle",
        source: "schools",
        filter: defaultFilter,
        paint: {
          "circle-color": [
            "match", ["get", "control"],
            "public", "#00ffaa",
            "private_nonprofit", "#bf5fff",
            "private_forprofit", "#ff6b6b",
            "#bf5fff",
          ],
          "circle-radius": [
            "interpolate", ["exponential", 1.5], ["zoom"],
            3, 1.5,
            7, 3,
            10, 6,
            14, 12,
          ],
          "circle-stroke-width": [
            "interpolate", ["linear"], ["zoom"],
            3, 0,
            10, 0.5,
            14, 1,
          ],
          "circle-stroke-color": [
            "match", ["get", "control"],
            "public", "#00ffcc",
            "private_nonprofit", "#d08fff",
            "private_forprofit", "#ff8a8a",
            "#d08fff",
          ],
          "circle-opacity": 0.9,
        },
      });

      // Click on school point
      mapInstance.on("click", "school-points", (e) => {
        const feature = e.features?.[0];
        if (!feature || !feature.properties) return;

        const school = schoolsRef.current.find(
          (s) => s.id === feature.properties!.id
        );
        if (school && onSchoolClickRef.current) {
          onSchoolClickRef.current(school);
        }

        // Show popup with tier badge
        const geom = feature.geometry;
        if (geom.type === "Point") {
          const vc = feature.properties!.venue_count || 0;
          const ar = feature.properties!.avg_rating || 0;
          const tier = computeTier(vc, ar);
          const tierCfg = getTierConfig(tier);

          new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            className: "school-popup",
          })
            .setLngLat(geom.coordinates as [number, number])
            .setHTML(
              `<div style="padding:10px 32px 10px 12px">
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;font-size:11px;font-weight:800;color:${tierCfg.color};background:rgba(255,255,255,0.05);border:1px solid ${tierCfg.color}33;">${tier}</span>
                  <div class="font-semibold text-sm">${feature.properties!.name}</div>
                </div>
                <div class="text-xs mt-1" style="color:#a1a1aa">${feature.properties!.state} &middot; ${
                  feature.properties!.control === "public" ? "Public" : feature.properties!.control === "private_forprofit" ? "Private For-Profit" : "Private"
                }${vc > 0 ? ` &middot; ${vc} venue${vc > 1 ? "s" : ""}` : ""}</div>
              </div>`
            )
            .addTo(mapInstance);
        }
      });

      // Cursor changes
      mapInstance.on("mouseenter", "school-points", () => {
        mapInstance.getCanvas().style.cursor = "pointer";
      });
      mapInstance.on("mouseleave", "school-points", () => {
        mapInstance.getCanvas().style.cursor = "";
      });

      // Breathing glow pulse — animate school-glow radius + opacity with sine wave
      let glowFrame: number;
      const startTime = performance.now();
      const pulseGlow = (now: number) => {
        const elapsed = (now - startTime) / 1000;
        // 4-second cycle, noticeable swing
        const wave = Math.sin(elapsed * ((2 * Math.PI) / 4));
        const opacityOffset = wave * 0.12;
        const radiusScale = 1 + wave * 0.15; // radius pulses +/- 15%
        try {
          mapInstance.setPaintProperty("school-glow", "circle-opacity", [
            "interpolate", ["linear"], ["zoom"],
            3, 0.15 + opacityOffset,
            8, 0.25 + opacityOffset,
            14, 0.35 + opacityOffset,
          ]);
          mapInstance.setPaintProperty("school-glow", "circle-radius", [
            "interpolate", ["exponential", 1.5], ["zoom"],
            3, 4 * radiusScale,
            7, 8 * radiusScale,
            10, 14 * radiusScale,
            14, 24 * radiusScale,
          ]);
        } catch {
          // Layer may not exist yet during cleanup
        }
        glowFrame = requestAnimationFrame(pulseGlow);
      };
      glowFrame = requestAnimationFrame(pulseGlow);

      // Store cleanup for glow pulse
      mapInstance.on("remove", () => {
        cancelAnimationFrame(glowFrame);
      });
    } catch (err) {
      console.error("Failed to load school data:", err);
    }
  }, []);

  const initMap = useCallback(() => {
    if (!mapContainer.current || map.current) return;

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: DARK_STYLE,
      center: [-98.5795, 39.8283], // Center of US
      zoom: 4,
      pitch: 0,
      attributionControl: false,
    });

    map.current = mapInstance;

    mapInstance.addControl(new maplibregl.NavigationControl(), "bottom-right");
    mapInstance.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      "bottom-right"
    );

    mapInstance.on("load", async () => {
      setLoaded(true);
      await addSchoolData(mapInstance);
    });
  }, [addSchoolData]);

  useEffect(() => {
    initMap();
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [initMap]);

  // Handle flyTo — dramatic sweeping arc
  useEffect(() => {
    if (flyTo && map.current && loaded) {
      map.current.flyTo({
        center: [flyTo.lng, flyTo.lat],
        zoom: flyTo.zoom || 13,
        speed: 0.8,
        curve: 1.8,
        duration: 3000,
        essential: true,
      });
    }
  }, [flyTo, loaded]);

  // Update map filters when showTwoYear or fratSchoolIds changes
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;

    const filters: maplibregl.FilterSpecification[] = [];
    if (!showTwoYear) {
      filters.push(["==", ["get", "iclevel"], 1]);
    }
    if (fratSchoolIds) {
      filters.push(["in", ["get", "id"], ["literal", fratSchoolIds]]);
    }

    const combined: maplibregl.FilterSpecification | null =
      filters.length > 1
        ? (["all", ...filters] as maplibregl.FilterSpecification)
        : filters[0] ?? null;

    try {
      m.setFilter("school-points", combined);
      m.setFilter("school-glow", combined);
    } catch {
      // Layers might not exist yet
    }
  }, [showTwoYear, fratSchoolIds, loaded]);

  return (
    <>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl skeleton-shimmer" />
            <div className="w-28 h-3 rounded-lg skeleton-shimmer" />
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getSchoolMapData, type MapSchool } from "@/lib/api";

// Free dark map tile styles (no API key required)
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface MapProps {
  onSchoolClick?: (school: MapSchool) => void;
  flyTo?: { lng: number; lat: number; zoom?: number } | null;
}

export default function Map({ onSchoolClick, flyTo }: MapProps) {
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
          
          },
        })),
      };

      // Add source — no clustering, every school is its own dot
      mapInstance.addSource("schools", {
        type: "geojson",
        data: geojson,
      });

      // Outer neon glow — scales with zoom
      mapInstance.addLayer({
        id: "school-glow",
        type: "circle",
        source: "schools",
        paint: {
          "circle-color": [
            "case",
            ["==", ["get", "control"], "public"],
            "#00ffaa",
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
        paint: {
          "circle-color": [
            "case",
            ["==", ["get", "control"], "public"],
            "#00ffaa", // neon green
            "#bf5fff", // neon purple
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
            "case",
            ["==", ["get", "control"], "public"],
            "#00ffcc",
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

        // Show popup
        const geom = feature.geometry;
        if (geom.type === "Point") {
          new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            className: "school-popup",
          })
            .setLngLat(geom.coordinates as [number, number])
            .setHTML(
              `<div style="padding:10px 32px 10px 12px">
                <div class="font-semibold text-sm">${feature.properties!.name}</div>
                <div class="text-xs mt-1" style="color:#a1a1aa">${feature.properties!.state} &middot; ${
                  feature.properties!.control === "public" ? "Public" : "Private"
                }</div>
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

      // Breathing glow pulse — animate school-glow opacity with sine wave
      let glowFrame: number;
      const startTime = performance.now();
      const pulseGlow = (now: number) => {
        const elapsed = (now - startTime) / 1000;
        // Oscillate between -0.08 and +0.08 over ~3s cycle
        const offset = Math.sin(elapsed * ((2 * Math.PI) / 3)) * 0.08;
        try {
          mapInstance.setPaintProperty("school-glow", "circle-opacity", [
            "interpolate", ["linear"], ["zoom"],
            3, 0.15 + offset,
            8, 0.25 + offset,
            14, 0.35 + offset,
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

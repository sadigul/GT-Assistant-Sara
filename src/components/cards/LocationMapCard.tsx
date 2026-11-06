"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { LocationMapData } from "@/types/gt-operations";
import {
  MapPin,
  Copy,
  Check,
  Truck,
  Phone,
  ArrowUpRight,
  Navigation,
  Plus,
  Minus,
  LocateFixed,
  Maximize2,
} from "lucide-react";

interface LocationMapCardProps {
  location: LocationMapData | LocationMapData[];
  onQuickQuery?: (q: string) => void;
  compact?: boolean;
}

const KNOWN_COORDINATE_FALLBACKS: Record<string, [number, number]> = {
  "talbott auto 2 ford": [39.3952611, -81.4063936],
  "talbot auto 2 ford": [39.3952611, -81.4063936],
  "1314 pike st": [39.3952611, -81.4063936],
  "generations ford": [38.4392194, -82.0223645],
  "201 orchard park rd": [38.4392194, -82.0223645],
  "pauley motors": [38.3498, -81.6326],
  "victory toyota": [39.4153, -81.4547],
  "moses ford": [38.3684, -81.6996],
  "moses nissan": [38.3512, -81.6389],
  "todd judy ford": [38.3491, -81.6335],
  "university ford": [39.6295, -79.9559],
};

function resolveInitialCoords(loc: LocationMapData): [number, number] | null {
  if (
    typeof loc.latitude === "number" &&
    !Number.isNaN(loc.latitude) &&
    typeof loc.longitude === "number" &&
    !Number.isNaN(loc.longitude)
  ) {
    return [loc.latitude, loc.longitude];
  }

  const hay = [
    loc.name,
    loc.address_line1,
    loc.formatted_address,
    loc.city,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const [key, coords] of Object.entries(KNOWN_COORDINATE_FALLBACKS)) {
    if (hay.includes(key)) {
      return coords;
    }
  }

  return null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const LocationMapCard: React.FC<LocationMapCardProps> = ({
  location,
  onQuickQuery,
  compact = false,
}) => {
  const locations = useMemo(
    () => (Array.isArray(location) ? location.filter(Boolean) : [location].filter(Boolean)),
    [location]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mapLayer, setMapLayer] = useState<"roadmap" | "satellite">("roadmap");
  const [copied, setCopied] = useState(false);
  const [geocodedCoords, setGeocodedCoords] = useState<Record<number, [number, number]>>({});

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const leafletModRef = useRef<any>(null);

  const activeLoc = locations[selectedIndex] || locations[0];

  const getAddressForLoc = (loc: LocationMapData) => {
    const cleanStreet = [
      loc.address_line1,
      loc.address_line2,
      loc.city,
      loc.state,
      loc.zip_code,
    ]
      .filter(Boolean)
      .join(", ");
    return (
      loc.formatted_address ||
      cleanStreet ||
      [loc.city, loc.state, loc.zip_code].filter(Boolean).join(", ") ||
      loc.name
    );
  };

  // Geocode any location missing exact latitude/longitude (e.g., synthesized legacy messages)
  useEffect(() => {
    let cancelled = false;

    locations.forEach((loc, idx) => {
      const existing = resolveInitialCoords(loc) || geocodedCoords[idx];
      if (existing) return;

      const queryStr = getAddressForLoc(loc);
      if (!queryStr) return;

      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          queryStr
        )}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          if (Array.isArray(data) && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
              setGeocodedCoords((prev) => ({ ...prev, [idx]: [lat, lon] }));
            }
          }
        })
        .catch(() => {});
    });

    return () => {
      cancelled = true;
    };
  }, [locations, geocodedCoords]);

  const resolvedPoints = useMemo(() => {
    return locations.map((loc, idx) => {
      const coords =
        resolveInitialCoords(loc) ||
        geocodedCoords[idx] || [38.95, -81.52]; // Default Mid-Ohio Valley / WV-OH service territory center while resolving
      return {
        loc,
        idx,
        coords,
        hasExactCoords: Boolean(resolveInitialCoords(loc) || geocodedCoords[idx]),
      };
    });
  }, [locations, geocodedCoords]);

  const activePoint = resolvedPoints[selectedIndex] || resolvedPoints[0];

  // Initialize interactive Leaflet map once on client
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current) return;
      leafletModRef.current = L;

      const initialCenter = activePoint?.coords || [39.3952611, -81.4063936];

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
      });

      // Enable scroll wheel zoom only after clicking inside the map, disable on mouseleave so chat scroll is never hijacked
      map.on("click", () => {
        map.scrollWheelZoom.enable();
      });
      map.on("mouseout", () => {
        map.scrollWheelZoom.disable();
      });

      const isSat = mapLayer === "satellite";
      const tileUrl = isSat
        ? "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        : "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 20,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      tileLayerRef.current = tileLayer;
      markersLayerRef.current = markersLayer;

      renderMarkers(L, map, markersLayer, resolvedPoints, selectedIndex, true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
        markersLayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Instant tile layer switching (Google Maps Roadmap <-> Google Hybrid Satellite)
  useEffect(() => {
    const L = leafletModRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const isSat = mapLayer === "satellite";
    const nextUrl = isSat
      ? "https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
      : "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";

    const nextLayer = L.tileLayer(nextUrl, {
      maxZoom: 20,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
    }).addTo(map);

    tileLayerRef.current = nextLayer;
  }, [mapLayer]);

  // Update markers and camera when active location or coordinates update
  useEffect(() => {
    const L = leafletModRef.current;
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!L || !map || !markersLayer) return;

    renderMarkers(L, map, markersLayer, resolvedPoints, selectedIndex, false);
  }, [resolvedPoints, selectedIndex]);

  function renderMarkers(
    L: any,
    map: any,
    markersLayer: any,
    points: typeof resolvedPoints,
    activeIdx: number,
    initialFit: boolean
  ) {
    markersLayer.clearLayers();

    points.forEach(({ loc, idx, coords }) => {
      const isSelected = idx === activeIdx;
      const safeName = escapeHtml(loc.name || "Dealership");
      const shortStreet = escapeHtml(
        loc.address_line1 || [loc.city, loc.state].filter(Boolean).join(", ") || ""
      );

      const html = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); pointer-events: auto;">
          <!-- Refined Frosted Glass Callout Pill -->
          <div style="
            position: relative;
            margin-bottom: 9px;
            padding: ${isSelected ? "6px 13px" : "4px 10px"};
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.95);
            color: #0f172a;
            box-shadow: 0 10px 28px -4px rgba(15, 23, 42, 0.22), 0 2px 6px rgba(15, 23, 42, 0.08);
            white-space: nowrap;
            display: flex;
            flex-direction: column;
            align-items: center;
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
          ">
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; letter-spacing: -0.015em; line-height: 1.2; color: #0f172a;">
              <span>${safeName}</span>
            </div>
            ${
              isSelected && shortStreet
                ? `<div style="font-size: 10px; font-weight: 500; color: #64748b; margin-top: 1.5px; letter-spacing: -0.01em;">${shortStreet}</div>`
                : ""
            }
            <div style="
              position: absolute;
              bottom: -4px;
              left: 50%;
              width: 8px;
              height: 8px;
              background: rgba(255, 255, 255, 0.95);
              transform: translateX(-50%) rotate(45deg);
              border-radius: 1.5px;
            "></div>
          </div>

          <!-- Refined Google/iOS 3D Pin Badge -->
          <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
            ${
              isSelected
                ? `<span class="sara-map-pin-pulse" style="position: absolute; inset: 1px; border-radius: 9999px; background: rgba(26, 115, 232, 0.32);"></span>`
                : ""
            }
            <div style="
              position: relative;
              width: ${isSelected ? "30px" : "24px"};
              height: ${isSelected ? "30px" : "24px"};
              border-radius: 9999px;
              background: ${isSelected ? "linear-gradient(180deg, #3B82F6 0%, #1A73E8 100%)" : "#334155"};
              border: 2.5px solid #ffffff;
              box-shadow: 0 6px 16px rgba(26, 115, 232, 0.38), 0 2px 6px rgba(15, 23, 42, 0.24);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="width: 8.5px; height: 8.5px; border-radius: 9999px; background: #ffffff;"></div>
            </div>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: "sara-map-pin-icon",
        html,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker(coords, {
        icon,
        zIndexOffset: isSelected ? 1000 : 100,
      });

      marker.on("click", () => {
        setSelectedIndex(idx);
      });

      marker.addTo(markersLayer);
    });

    const target = points[activeIdx] || points[0];
    if (!target) return;

    if (initialFit && points.length > 1) {
      const bounds = L.latLngBounds(points.map((p) => p.coords));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    } else {
      map.flyTo(target.coords, 16, {
        animate: true,
        duration: 0.65,
      });
    }
  }

  if (!activeLoc) return null;

  const displayAddress = getAddressForLoc(activeLoc);

  const handleCopy = () => {
    if (!displayAddress) return;
    navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current && activePoint) {
      mapInstanceRef.current.flyTo(activePoint.coords, 16, {
        animate: true,
        duration: 0.6,
      });
    }
  };

  const handleFitAll = () => {
    const L = leafletModRef.current;
    const map = mapInstanceRef.current;
    if (L && map && resolvedPoints.length > 1) {
      const bounds = L.latLngBounds(resolvedPoints.map((p) => p.coords));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    }
  };

  const gpsText = activePoint?.hasExactCoords
    ? `${activePoint.coords[0].toFixed(5)}, ${activePoint.coords[1].toFixed(5)}`
    : null;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    displayAddress
  )}`;

  return (
    <div
      className={`${
        compact ? "mt-0" : "mt-2.5"
      } rounded-[24px] ring-1 ring-slate-900/[0.06] dark:ring-white/[0.08] bg-white dark:bg-slate-900 shadow-[0_10px_35px_-10px_rgba(15,23,42,0.08)] overflow-hidden`}
    >
      {/* Multi-location switcher bar (only shown when multiple dealerships are plotted) */}
      {locations.length > 1 && (
        <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {locations.map((loc, idx) => (
              <button
                key={loc.id || `${loc.name}-${idx}`}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  idx === selectedIndex
                    ? "bg-[#1A73E8] text-white shadow-2xs"
                    : "bg-white/80 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                {loc.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleFitAll}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white dark:bg-slate-900 text-[#1A73E8] transition-colors shrink-0 cursor-pointer shadow-2xs"
            title="Fit all pins on map"
          >
            <Maximize2 className="w-3 h-3 shrink-0" />
            <span>All ({locations.length})</span>
          </button>
        </div>
      )}

      {/* Refined Google Maps Canvas */}
      <div
        className={`relative w-full ${
          compact ? "h-[245px]" : "h-[300px]"
        } bg-[#f4f3ef] dark:bg-slate-950 select-none overflow-hidden`}
      >
        <div
          ref={mapContainerRef}
          className="sara-leaflet-map w-full h-full"
        />

        {/* Top-Right Frosted Glass Map / Satellite Switcher */}
        <div className="absolute top-3.5 right-3.5 z-20 pointer-events-auto">
          <div className="inline-flex items-center rounded-full p-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-[0_4px_20px_rgba(15,23,42,0.14)]">
            <button
              type="button"
              onClick={() => setMapLayer("roadmap")}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                mapLayer === "roadmap"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setMapLayer("satellite")}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                mapLayer === "satellite"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Satellite
            </button>
          </div>
        </div>

        {/* Bottom-Right Frosted Glass Zoom & Navigation Pill */}
        <div className="absolute bottom-3.5 right-3.5 z-20 flex flex-col gap-1.5 pointer-events-auto">
          <div className="flex flex-col rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-[0_4px_20px_rgba(15,23,42,0.14)] divide-y divide-slate-200/40 dark:divide-slate-700/50">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center justify-center"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center justify-center"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <Minus className="w-3.5 h-3.5 shrink-0" />
            </button>
            <button
              type="button"
              onClick={handleRecenter}
              className="p-2.5 text-[#1A73E8] hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors cursor-pointer flex items-center justify-center"
              title="Center on dealership"
              aria-label="Center on dealership"
            >
              <Navigation className="w-3.5 h-3.5 shrink-0 fill-current" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Place Card Sheet (Borderless & Clean) */}
      <div className="px-4 py-3.5 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1A73E8]/10 dark:bg-[#1A73E8]/15 text-[#1A73E8]">
            <MapPin className="w-5 h-5 shrink-0" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-[14px] font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {activeLoc.name}
              </h4>
              {activeLoc.code && (
                <span className="text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500">
                  {activeLoc.code}
                </span>
              )}
              {activeLoc.delivery_route && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Truck className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                  {activeLoc.delivery_route}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="truncate">{displayAddress}</span>
              {activeLoc.phone && activeLoc.phone !== "On File" && (
                <a
                  href={`tel:${activeLoc.phone}`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1A73E8] hover:underline shrink-0"
                >
                  {activeLoc.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right Place Card Actions: Copy Address & Google Maps Directions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Copy full address"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>Copy</span>
              </>
            )}
          </button>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-2xs transition-all cursor-pointer"
            title="Open turn-by-turn directions in Google Maps"
          >
            <Navigation className="w-3 h-3 shrink-0 fill-current" />
            <span>Directions</span>
          </a>
        </div>
      </div>
    </div>
  );
};

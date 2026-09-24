import React, { useEffect, useRef, useState } from 'react';
import { DemolitionPermit, RadiusFilter } from '../types';
import {
  formatCurrency,
  formatDate,
  formatDaysAgo,
  getOsmTileUrl,
  getPermitLinks,
} from '../services/accelaService';
import L from 'leaflet';
import {
  Layers,
  Flame,
  Camera,
  Maximize2,
  ExternalLink,
  Sparkles,
  Sliders,
  Eye,
  EyeOff,
  MapPin,
  CircleDot,
  Crosshair,
  X,
} from 'lucide-react';

// Setup leaflet.heat for browser runtime
if (typeof window !== 'undefined' && !(window as unknown as { L: typeof L }).L) {
  (window as unknown as { L: typeof L }).L = L;
}
import 'leaflet.heat';

interface MapViewProps {
  permits: DemolitionPermit[];
  onSelectPermit: (permit: DemolitionPermit) => void;
  radiusFilter?: RadiusFilter | null;
  onRadiusChange?: (filter: RadiusFilter | null) => void;
}

/**
 * Calculates permit age in days relative to current time
 */
function getPermitAgeDays(dateIssued: number | null): number {
  if (!dateIssued) return 90;
  const now = Date.now();
  const diffMs = Math.max(0, now - dateIssued);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get color corresponding to permit age
 */
function getAgeColor(ageDays: number): {
  hex: string;
  label: string;
  badgeBg: string;
  badgeText: string;
} {
  if (ageDays <= 14) {
    return {
      hex: '#ef4444', // Hot red/coral
      label: 'Fresh (< 14d)',
      badgeBg: 'bg-rose-500/20 border-rose-500/40',
      badgeText: 'text-rose-400',
    };
  }
  if (ageDays <= 30) {
    return {
      hex: '#f97316', // Orange
      label: '15 – 30d',
      badgeBg: 'bg-orange-500/20 border-orange-500/40',
      badgeText: 'text-orange-400',
    };
  }
  if (ageDays <= 60) {
    return {
      hex: '#eab308', // Amber / Gold
      label: '31 – 60d',
      badgeBg: 'bg-amber-500/20 border-amber-500/40',
      badgeText: 'text-amber-400',
    };
  }
  return {
    hex: '#3b82f6', // Blue / Cool
    label: '61 – 90d+',
    badgeBg: 'bg-blue-500/20 border-blue-500/40',
    badgeText: 'text-blue-400',
  };
}

export const MapView: React.FC<MapViewProps> = ({
  permits,
  onSelectPermit,
  radiusFilter,
  onRadiusChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const ageHalosLayerRef = useRef<L.LayerGroup | null>(null);
  const radiusLayerRef = useRef<L.LayerGroup | null>(null);

  // Layer Visibility & Configuration States
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [scaleByAge, setScaleByAge] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showAgeHalos, setShowAgeHalos] = useState(false);
  const [mapStyle, setMapStyle] = useState<'voyager' | 'dark' | 'osm'>('voyager');
  const [isRadiusToolActive, setIsRadiusToolActive] = useState(false);
  const [activeRadiusMiles, setActiveRadiusMiles] = useState<number>(1.0);

  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const isRadiusToolActiveRef = useRef(isRadiusToolActive);
  isRadiusToolActiveRef.current = isRadiusToolActive;
  const activeRadiusMilesRef = useRef(activeRadiusMiles);
  activeRadiusMilesRef.current = activeRadiusMiles;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    // Centered over Denver
    const map = L.map(mapContainerRef.current, {
      center: [39.7392, -104.9903],
      zoom: 12,
      zoomControl: true,
    });

    const tileUrl =
      mapStyle === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : mapStyle === 'osm'
        ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Layer groups for markers, heatmap, halos, and radius circle
    const markersGroup = L.layerGroup().addTo(map);
    const halosGroup = L.layerGroup().addTo(map);
    const radiusGroup = L.layerGroup().addTo(map);

    markersLayerRef.current = markersGroup;
    ageHalosLayerRef.current = halosGroup;
    radiusLayerRef.current = radiusGroup;

    // Map click for radius tool
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (isRadiusToolActiveRef.current && onRadiusChange) {
        onRadiusChange({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          radiusMiles: activeRadiusMilesRef.current,
        });
        setIsRadiusToolActive(false);
      }
    });

    leafletMapRef.current = map;

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [mapStyle, onRadiusChange]);

  // Update Radius Visual Overlay
  useEffect(() => {
    const map = leafletMapRef.current;
    const radiusGroup = radiusLayerRef.current;
    if (!map || !radiusGroup) return;

    radiusGroup.clearLayers();

    if (!radiusFilter) return;

    const center = [radiusFilter.lat, radiusFilter.lng] as [number, number];
    const radiusMeters = radiusFilter.radiusMiles * 1609.34;

    // Center pulse pin
    const pinIcon = L.divIcon({
      className: 'radius-pin-icon',
      html: `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <span class="w-8 h-8 rounded-full bg-amber-500/40 border-2 border-amber-400 animate-ping absolute"></span>
          <span class="w-6 h-6 rounded-full bg-amber-500 border-2 border-slate-900 shadow-xl flex items-center justify-center text-slate-950 text-[10px] font-black">
            🎯
          </span>
        </div>
      `,
      iconSize: [24, 24],
    });

    const marker = L.marker(center, { icon: pinIcon });
    marker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 11px;">
        <strong>Center Pin</strong><br/>
        Radius: ${radiusFilter.radiusMiles} miles (${radiusFilter.lat.toFixed(4)}, ${radiusFilter.lng.toFixed(4)})
      </div>
    `);

    // Radius circle boundary
    const circle = L.circle(center, {
      radius: radiusMeters,
      color: '#f59e0b',
      fillColor: '#f59e0b',
      fillOpacity: 0.1,
      weight: 2,
      dashArray: '6, 6',
    });

    radiusGroup.addLayer(circle);
    radiusGroup.addLayer(marker);
  }, [radiusFilter]);

  // Update Age Heatmap Layer
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    // Remove existing heatmap layer if any
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!showHeatmap || permits.length === 0) return;

    const heatPoints: [number, number, number][] = [];

    permits.forEach((permit) => {
      const lat = permit.geometry?.y;
      const lon = permit.geometry?.x;
      if (!lat || !lon) return;

      const ageDays = getPermitAgeDays(permit.attributes.DATE_ISSUED);
      const intensity = Math.max(0.2, 1 - (Math.min(ageDays, 90) / 90) * 0.8);
      heatPoints.push([lat, lon, intensity]);
    });

    try {
      const heat = (
        L as unknown as {
          heatLayer: (
            latlngs: [number, number, number][],
            options: Record<string, unknown>
          ) => L.Layer;
        }
      ).heatLayer(heatPoints, {
        radius: 28,
        blur: 20,
        maxZoom: 15,
        max: 1.0,
        minOpacity: 0.35,
        gradient: {
          0.15: '#3b82f6',
          0.35: '#06b6d4',
          0.55: '#eab308',
          0.75: '#f97316',
          1.0: '#ef4444',
        },
      });

      heat.addTo(map);
      heatLayerRef.current = heat;
    } catch (err) {
      console.warn('Leaflet heatLayer error:', err);
    }
  }, [permits, showHeatmap]);

  // Update Age Halos & Markers (Thumbnails scaled by age)
  useEffect(() => {
    const map = leafletMapRef.current;
    const markersGroup = markersLayerRef.current;
    const halosGroup = ageHalosLayerRef.current;
    if (!map || !markersGroup || !halosGroup) return;

    markersGroup.clearLayers();
    halosGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    permits.forEach((permit) => {
      const lat = permit.geometry?.y;
      const lon = permit.geometry?.x;
      if (!lat || !lon) return;

      bounds.extend([lat, lon]);

      const ageDays = getPermitAgeDays(permit.attributes.DATE_ISSUED);
      const ageColor = getAgeColor(ageDays);
      const thumbUrl = getOsmTileUrl(lat, lon, 18);
      const links = getPermitLinks(permit);

      // Render Age Halos if enabled
      if (showAgeHalos) {
        const haloRadius = Math.max(25, 60 - Math.min(ageDays, 60));
        const halo = L.circle([lat, lon], {
          radius: haloRadius,
          color: ageColor.hex,
          fillColor: ageColor.hex,
          fillOpacity: 0.18,
          weight: 1.5,
          dashArray: ageDays <= 14 ? undefined : '3, 4',
        });
        halosGroup.addLayer(halo);
      }

      // Determine Thumbnail Dimensions by Age
      let sizePx = 36;
      if (scaleByAge) {
        if (ageDays <= 14) {
          sizePx = 48; // Freshest permits are prominent
        } else if (ageDays <= 45) {
          sizePx = 34; // Moderate
        } else {
          sizePx = 24; // Older permits are smaller dots/thumbnails
        }
      }

      if (showThumbnails) {
        const customIcon = L.divIcon({
          className: 'custom-thumbnail-marker',
          html: `
            <div class="group relative cursor-pointer" style="width: ${sizePx}px; height: ${sizePx}px;">
              <div 
                style="
                  width: ${sizePx}px; 
                  height: ${sizePx}px; 
                  border: 2px solid ${ageColor.hex};
                  box-shadow: 0 4px 12px rgba(0,0,0,0.5), 0 0 8px ${ageColor.hex}40;
                "
                class="rounded-xl overflow-hidden bg-slate-900 transition-transform duration-200 hover:scale-125 hover:z-50"
              >
                <img 
                  src="${thumbUrl}" 
                  alt="Permit Thumbnail" 
                  class="w-full h-full object-cover" 
                  loading="lazy"
                />
              </div>
              ${
                ageDays <= 14
                  ? `<span class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border border-white animate-pulse"></span>`
                  : ''
              }
            </div>
          `,
          iconSize: [sizePx, sizePx],
          iconAnchor: [sizePx / 2, sizePx / 2],
        });

        const marker = L.marker([lat, lon], { icon: customIcon });

        const popupContent = `
          <div style="font-family: sans-serif; font-size: 12px; color: #1e293b; min-width: 220px; max-width: 260px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="background: ${ageColor.hex}20; color: ${ageColor.hex}; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px; border: 1px solid ${ageColor.hex}40;">
                ${ageColor.label}
              </span>
              <span style="font-weight: 600; color: #64748b; font-size: 10px;">
                ${formatDaysAgo(permit.attributes.DATE_ISSUED)}
              </span>
            </div>

            <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 2px;">
              ${permit.attributes.ADDRESS}
            </div>

            <div style="color: #475569; font-size: 11px; margin-bottom: 4px;">
              ${permit.attributes.NEIGHBORHOOD || 'Denver Metro'} &bull; ${permit.attributes.PERMIT_NUM}
            </div>

            <div style="background: #f8fafc; padding: 6px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: #64748b;">Valuation:</span>
                <span style="font-weight: 700; color: #059669;">${formatCurrency(permit.attributes.VALUATION)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px;">
                <span style="color: #64748b;">Contractor:</span>
                <span style="font-weight: 500; color: #334155; max-width: 130px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                  ${permit.attributes.CONTRACTOR_NAME || 'Owner'}
                </span>
              </div>
            </div>

            <button id="map-thumb-popup-btn-${permit.attributes.OBJECTID}" style="
              width: 100%;
              padding: 6px 10px;
              background: #0f172a;
              color: white;
              border: 1px solid #334155;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 600;
              cursor: pointer;
            ">
              Open 360° Panorama & Details
            </button>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const btn = document.getElementById(
            `map-thumb-popup-btn-${permit.attributes.OBJECTID}`
          );
          if (btn) {
            btn.onclick = () => onSelectPermit(permit);
          }
        });

        markersGroup.addLayer(marker);
      }
    });

    // Fit bounds on initial load or count change
    if (permits.length > 0 && bounds.isValid() && !radiusFilter) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [permits, showThumbnails, scaleByAge, showAgeHalos, radiusFilter, onSelectPermit]);

  return (
    <div className="relative w-full h-[680px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md flex flex-col">
      {/* Top Map Layer Control Bar */}
      <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 z-20 text-xs text-slate-200 backdrop-blur-sm">
        {/* Layer Toggles */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Age Scaled Thumbnails Toggle */}
          <button
            id="btn-toggle-thumbnails"
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
              showThumbnails
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle street view thumbnails on map"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>Thumbnails</span>
            {showThumbnails ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
          </button>

          {/* Scale by Age Toggle */}
          <button
            id="btn-toggle-scale-age"
            onClick={() => setScaleByAge(!scaleByAge)}
            disabled={!showThumbnails}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer disabled:opacity-40 ${
              scaleByAge
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title="Scale thumbnail sizes: newest permits are largest"
          >
            <Sliders className="w-3.5 h-3.5 text-rose-400" />
            <span>Scale Age ({scaleByAge ? 'Dynamic' : 'Fixed'})</span>
          </button>

          {/* Colored Heatmap by Age Toggle */}
          <button
            id="btn-toggle-heatmap"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
              showHeatmap
                ? 'bg-gradient-to-r from-blue-500/20 via-amber-500/20 to-rose-500/20 text-white border-amber-500/40 font-semibold'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle colored heatmap layer by permit age"
          >
            <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'text-rose-400' : 'text-slate-400'}`} />
            <span>Heatmap</span>
            {showHeatmap && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
          </button>

          {/* Age Halos Toggle */}
          <button
            id="btn-toggle-halos"
            onClick={() => setShowAgeHalos(!showAgeHalos)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
              showAgeHalos
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle radial age halos around locations"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Halos</span>
          </button>

          {/* Radius Filter Tool Toggle */}
          {onRadiusChange && (
            <button
              id="btn-toggle-radius-mode"
              onClick={() => setIsRadiusToolActive(!isRadiusToolActive)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition cursor-pointer ${
                isRadiusToolActive || radiusFilter
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="Pin a center and filter permits by radius miles"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Radius Filter</span>
              {radiusFilter && (
                <span className="px-1.5 py-0.2 bg-slate-950 text-amber-400 rounded text-[10px]">
                  {radiusFilter.radiusMiles}mi
                </span>
              )}
            </button>
          )}
        </div>

        {/* Map Base Tile Style Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 hidden sm:inline">Base:</span>
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value as 'voyager' | 'dark' | 'osm')}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2 py-1 focus:outline-none focus:border-amber-500"
          >
            <option value="voyager">CARTO Voyager (Light)</option>
            <option value="dark">CARTO Dark Matter (Night)</option>
            <option value="osm">Standard OpenStreetMap</option>
          </select>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="relative flex-1 w-full h-full">
        <div
          ref={mapContainerRef}
          className={`w-full h-full z-10 ${isRadiusToolActive ? 'cursor-crosshair' : ''}`}
        />

        {/* Radius Tool Instructions & Distance Selector Bar */}
        {(isRadiusToolActive || radiusFilter) && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 border border-amber-500/50 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs text-white max-w-[90%] sm:max-w-md">
            <Crosshair className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <div className="flex-1">
              <p className="font-semibold text-amber-300">
                {isRadiusToolActive
                  ? 'Click anywhere on map to pin center'
                  : `Active: ${radiusFilter?.radiusMiles} mi radius`}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-slate-400">Radius:</span>
                {[0.5, 1.0, 2.0, 5.0].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setActiveRadiusMiles(r);
                      if (radiusFilter && onRadiusChange) {
                        onRadiusChange({
                          ...radiusFilter,
                          radiusMiles: r,
                        });
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                      (radiusFilter?.radiusMiles || activeRadiusMiles) === r
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {r} mi
                  </button>
                ))}
              </div>
            </div>

            {radiusFilter && onRadiusChange && (
              <button
                onClick={() => onRadiusChange(null)}
                className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 rounded-lg border border-slate-700 transition cursor-pointer"
                title="Clear radius filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Floating Combined Legends: Age-Scaled Thumbnails + Colored Heatmap */}
        <div className="absolute bottom-4 left-4 z-20 flex flex-col sm:flex-row gap-2.5 pointer-events-auto max-w-full sm:max-w-xl">
          {/* Age Size Scaling Legend */}
          {showThumbnails && scaleByAge && (
            <div className="bg-slate-900/95 border border-slate-800 backdrop-blur-md p-3 rounded-xl text-xs text-slate-200 shadow-xl space-y-1.5">
              <p className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Thumbnail Size by Age</span>
              </p>

              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-7 h-7 rounded-md border-2 border-rose-500 bg-slate-800 flex items-center justify-center text-[9px] font-bold text-rose-400">
                    48px
                  </span>
                  <span className="text-[11px] text-slate-300">&lt; 14 days (Fresh)</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md border-2 border-amber-500 bg-slate-800 flex items-center justify-center text-[8px] font-bold text-amber-400">
                    32px
                  </span>
                  <span className="text-[11px] text-slate-300">15 – 45 days</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full border border-blue-400 bg-slate-800 flex items-center justify-center text-[7px] text-blue-400">
                    &bull;
                  </span>
                  <span className="text-[11px] text-slate-400">46 – 90+ days</span>
                </div>
              </div>
            </div>
          )}

          {/* Colored Heatmap Legend */}
          {showHeatmap && (
            <div className="bg-slate-900/95 border border-slate-800 backdrop-blur-md p-3 rounded-xl text-xs text-slate-200 shadow-xl space-y-2">
              <p className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Age Heatmap Gradient</span>
              </p>

              {/* Gradient Bar */}
              <div className="w-48 h-3 rounded-full bg-gradient-to-r from-blue-500 via-amber-400 to-rose-500 border border-slate-700 shadow-inner" />

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="text-blue-400 font-medium">60 – 90d (Older)</span>
                <span className="text-amber-300 font-medium">30d</span>
                <span className="text-rose-400 font-bold">0 – 14d (Newest)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

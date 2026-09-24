import React, { useState } from 'react';
import { FilterOptions, DemolitionPermit } from '../types';
import { exportPermitsToCSV, exportPermitsToGeoJSON } from '../services/exportService';
import {
  Search,
  LayoutGrid,
  Map as MapIcon,
  Table,
  X,
  BarChart3,
  Star,
  Download,
  Sparkles,
  FileSpreadsheet,
  Globe,
  MapPin,
  CircleDot,
} from 'lucide-react';

interface FilterBarProps {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
  neighborhoods: string[];
  classes: string[];
  viewMode: 'grid' | 'map' | 'table' | 'analytics';
  onViewModeChange: (mode: 'grid' | 'map' | 'table' | 'analytics') => void;
  resultCount: number;
  savedCount?: number;
  onOpenAiInsights?: () => void;
  permitsForExport?: DemolitionPermit[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onChange,
  neighborhoods,
  classes,
  viewMode,
  onViewModeChange,
  resultCount,
  savedCount = 0,
  onOpenAiInsights,
  permitsForExport = [],
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, searchQuery: e.target.value });
  };

  const clearSearch = () => {
    onChange({ ...filters, searchQuery: '' });
  };

  const toggleWatchlistOnly = () => {
    onChange({ ...filters, onlySaved: !filters.onlySaved });
  };

  const clearRadiusFilter = () => {
    onChange({ ...filters, radiusFilter: null });
  };

  const handleExportCSV = () => {
    exportPermitsToCSV(permitsForExport);
    setShowExportMenu(false);
  };

  const handleExportGeoJSON = () => {
    exportPermitsToGeoJSON(permitsForExport);
    setShowExportMenu(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
      {/* Top row: Search input + Action Buttons (AI Insights, Watchlist, Export) + View switcher */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-permits"
            type="text"
            value={filters.searchQuery}
            onChange={handleSearchChange}
            placeholder="Search address, permit number (2026-DEMO...), contractor, neighborhood..."
            className="w-full pl-9 pr-8 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
          />
          {filters.searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Feature Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* AI Intelligence Brief Button */}
          {onOpenAiInsights && (
            <button
              id="btn-ai-insights"
              onClick={onOpenAiInsights}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600/30 to-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:from-amber-600/50 hover:to-amber-500/30 transition cursor-pointer shadow-sm"
              title="Open Gemini AI Demolition Intelligence Brief"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Insights</span>
            </button>
          )}

          {/* Watchlist / Saved Toggle */}
          <button
            id="btn-toggle-watchlist"
            onClick={toggleWatchlistOnly}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
              filters.onlySaved
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700'
            }`}
            title="Filter by your saved permits watchlist"
          >
            <Star className={`w-3.5 h-3.5 ${filters.onlySaved ? 'fill-current' : 'text-amber-400'}`} />
            <span>Watchlist</span>
            {savedCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  filters.onlySaved
                    ? 'bg-slate-950 text-amber-400'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {savedCount}
              </span>
            )}
          </button>

          {/* Export Menu Dropdown */}
          <div className="relative">
            <button
              id="btn-export-dropdown"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
              title="Export filtered permits to CSV or GeoJSON"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-40 py-1 text-xs">
                <button
                  onClick={handleExportCSV}
                  className="w-full px-3 py-2 text-left hover:bg-slate-700 flex items-center gap-2 text-slate-200 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Export CSV ({permitsForExport.length})</span>
                </button>
                <button
                  onClick={handleExportGeoJSON}
                  className="w-full px-3 py-2 text-left hover:bg-slate-700 flex items-center gap-2 text-slate-200 cursor-pointer"
                >
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span>Export GeoJSON ({permitsForExport.length})</span>
                </button>
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700 shrink-0">
            <button
              id="btn-view-cards"
              onClick={() => onViewModeChange('grid')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Grid cards with street view thumbnails"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Thumbnails</span>
            </button>
            <button
              id="btn-view-map"
              onClick={() => onViewModeChange('map')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Interactive FOSS OpenStreetMap"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Map</span>
            </button>
            <button
              id="btn-view-table"
              onClick={() => onViewModeChange('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Tabular permit data view"
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Table</span>
            </button>
            <button
              id="btn-view-analytics"
              onClick={() => onViewModeChange('analytics')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                viewMode === 'analytics'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Analytics & Trends"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Charts</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Radius Filter Banner if any */}
      {filters.radiusFilter && (
        <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <CircleDot className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Geographic Radius Active: Filtering within{' '}
              <strong>{filters.radiusFilter.radiusMiles} miles</strong> of [
              {filters.radiusFilter.lat.toFixed(4)}, {filters.radiusFilter.lng.toFixed(4)}]
            </span>
          </div>
          <button
            onClick={clearRadiusFilter}
            className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-200 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Radius</span>
          </button>
        </div>
      )}

      {/* Filter Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 pt-1 border-t border-slate-800/80">
        {/* Timeframe Selector */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Timeframe
          </label>
          <select
            id="select-timeframe"
            value={filters.daysRange}
            onChange={(e) =>
              onChange({ ...filters, daysRange: Number(e.target.value) })
            }
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value={30}>Last 30 Days</option>
            <option value={60}>Last 60 Days</option>
            <option value={90}>Last 90 Days (Default)</option>
            <option value={180}>Last 180 Days</option>
            <option value={365}>Last 1 Year</option>
            <option value={0}>All Records</option>
          </select>
        </div>

        {/* Neighborhood Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Neighborhood ({neighborhoods.length})
          </label>
          <select
            id="select-neighborhood"
            value={filters.neighborhood}
            onChange={(e) =>
              onChange({ ...filters, neighborhood: e.target.value })
            }
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Neighborhoods</option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Demolition Class Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Permit Class
          </label>
          <select
            id="select-demo-class"
            value={filters.demolitionClass}
            onChange={(e) =>
              onChange({ ...filters, demolitionClass: e.target.value })
            }
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Sort Order
          </label>
          <select
            id="select-sort-by"
            value={filters.sortBy}
            onChange={(e) =>
              onChange({
                ...filters,
                sortBy: e.target.value as FilterOptions['sortBy'],
              })
            }
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="valDesc">Demolition Valuation (Highest First)</option>
            <option value="valAsc">Demolition Valuation (Lowest First)</option>
            <option value="dateDesc">Newest Issued</option>
            <option value="dateAsc">Oldest Issued</option>
            <option value="address">Address (A-Z)</option>
          </select>
        </div>

        {/* Clear Filters Button & Counter */}
        <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex items-end justify-between lg:justify-end gap-2">
          {(filters.searchQuery ||
            filters.neighborhood ||
            filters.demolitionClass ||
            filters.contractor ||
            filters.onlySaved ||
            filters.radiusFilter ||
            filters.daysRange !== 90 ||
            filters.sortBy !== 'valDesc') && (
            <button
              onClick={() =>
                onChange({
                  searchQuery: '',
                  daysRange: 90,
                  neighborhood: '',
                  contractor: '',
                  demolitionClass: '',
                  minValuation: 0,
                  sortBy: 'valDesc',
                  onlySaved: false,
                  radiusFilter: null,
                })
              }
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 py-1 px-2 rounded hover:bg-slate-800 transition cursor-pointer"
            >
              Reset Filters
            </button>
          )}
          <span className="text-xs text-slate-400 py-1">
            {resultCount} {resultCount === 1 ? 'permit' : 'permits'} found
          </span>
        </div>
      </div>
    </div>
  );
};

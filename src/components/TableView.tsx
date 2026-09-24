import React, { useState } from 'react';
import { DemolitionPermit, FilterOptions } from '../types';
import { formatCurrency, formatDate, getOsmTileUrl, getPermitLinks } from '../services/accelaService';
import { exportPermitsToCSV, exportPermitsToGeoJSON } from '../services/exportService';
import {
  ExternalLink,
  Compass,
  Download,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Star,
  FileSpreadsheet,
  Globe,
} from 'lucide-react';

interface TableViewProps {
  permits: DemolitionPermit[];
  onSelectPermit: (permit: DemolitionPermit) => void;
  sortBy?: FilterOptions['sortBy'];
  onSortChange?: (sortBy: FilterOptions['sortBy']) => void;
  savedPermitIds?: number[];
  onToggleSave?: (permit: DemolitionPermit) => void;
}

export const TableView: React.FC<TableViewProps> = ({
  permits,
  onSelectPermit,
  sortBy = 'valDesc',
  onSortChange,
  savedPermitIds = [],
  onToggleSave,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportCSV = () => {
    exportPermitsToCSV(permits);
    setShowExportMenu(false);
  };

  const handleExportGeoJSON = () => {
    exportPermitsToGeoJSON(permits);
    setShowExportMenu(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Table Header Controls */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-4">
        <span className="text-xs text-slate-400 font-medium">
          Showing {permits.length} demolition permit records
        </span>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
            title="Export filtered records"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Data</span>
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-1 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-30 py-1 text-xs">
              <button
                onClick={handleExportCSV}
                className="w-full px-3 py-2 text-left hover:bg-slate-700 flex items-center gap-2 text-slate-200 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Export as CSV (.csv)</span>
              </button>
              <button
                onClick={handleExportGeoJSON}
                className="w-full px-3 py-2 text-left hover:bg-slate-700 flex items-center gap-2 text-slate-200 cursor-pointer"
              >
                <Globe className="w-4 h-4 text-blue-400" />
                <span>Export as GeoJSON (.geojson)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="p-3 w-10 text-center">★</th>
              <th className="p-3">Thumb</th>
              <th className="p-3">Permit Number</th>
              <th className="p-3">
                <button
                  type="button"
                  onClick={() => onSortChange && onSortChange('address')}
                  className={`flex items-center gap-1 font-semibold uppercase hover:text-amber-400 transition cursor-pointer ${
                    sortBy === 'address' ? 'text-amber-400' : ''
                  }`}
                  title="Sort by Address"
                >
                  <span>Address</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="p-3">Neighborhood</th>
              <th className="p-3">
                <button
                  type="button"
                  onClick={() =>
                    onSortChange &&
                    onSortChange(sortBy === 'valDesc' ? 'valAsc' : 'valDesc')
                  }
                  className={`flex items-center gap-1 font-semibold uppercase hover:text-amber-400 transition cursor-pointer ${
                    sortBy.startsWith('val') ? 'text-amber-400' : ''
                  }`}
                  title="Sort by Valuation"
                >
                  <span>Valuation</span>
                  {sortBy === 'valDesc' ? (
                    <ArrowDown className="w-3 h-3" />
                  ) : sortBy === 'valAsc' ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3" />
                  )}
                </button>
              </th>
              <th className="p-3">
                <button
                  type="button"
                  onClick={() =>
                    onSortChange &&
                    onSortChange(sortBy === 'dateDesc' ? 'dateAsc' : 'dateDesc')
                  }
                  className={`flex items-center gap-1 font-semibold uppercase hover:text-amber-400 transition cursor-pointer ${
                    sortBy.startsWith('date') ? 'text-amber-400' : ''
                  }`}
                  title="Sort by Issue Date"
                >
                  <span>Issued Date</span>
                  {sortBy === 'dateDesc' ? (
                    <ArrowDown className="w-3 h-3" />
                  ) : sortBy === 'dateAsc' ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3" />
                  )}
                </button>
              </th>
              <th className="p-3">Contractor</th>
              <th className="p-3">Class</th>
              <th className="p-3 text-right">Maps (New Tab)</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {permits.map((permit) => {
              const lat = permit.geometry?.y;
              const lon = permit.geometry?.x;
              const thumbUrl = lat && lon ? getOsmTileUrl(lat, lon, 18) : '';
              const links = getPermitLinks(permit);
              const isSaved = savedPermitIds.includes(permit.attributes.OBJECTID);

              return (
                <tr
                  key={permit.attributes.OBJECTID}
                  className="hover:bg-slate-800/50 transition-colors"
                >
                  {/* Bookmark Star */}
                  <td className="p-3 text-center">
                    {onToggleSave && (
                      <button
                        onClick={() => onToggleSave(permit)}
                        className={`p-1 rounded hover:bg-slate-800 transition cursor-pointer ${
                          isSaved ? 'text-amber-400' : 'text-slate-600 hover:text-slate-300'
                        }`}
                        title={isSaved ? 'Remove from saved watchlist' : 'Save to watchlist'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                      </button>
                    )}
                  </td>

                  {/* Thumbnail */}
                  <td className="p-3">
                    <div
                      onClick={() => onSelectPermit(permit)}
                      className="w-12 h-10 rounded-md bg-slate-950 overflow-hidden border border-slate-700 cursor-pointer relative group/tbl-thumb"
                      title="Click thumbnail to view details"
                    >
                      {thumbUrl && (
                        <img
                          src={thumbUrl}
                          alt="thumbnail"
                          loading="lazy"
                          className="w-full h-full object-cover group-hover/tbl-thumb:scale-110 transition-transform"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/30 group-hover/tbl-thumb:bg-black/0 transition-colors" />
                    </div>
                  </td>

                  {/* Permit Number */}
                  <td className="p-3 font-mono font-bold text-amber-400">
                    {permit.attributes.PERMIT_NUM}
                  </td>

                  {/* Address */}
                  <td className="p-3 font-medium text-white max-w-[200px] truncate">
                    <button
                      onClick={() => onSelectPermit(permit)}
                      className="hover:text-amber-400 hover:underline text-left truncate cursor-pointer"
                    >
                      {permit.attributes.ADDRESS}
                    </button>
                  </td>

                  {/* Neighborhood */}
                  <td className="p-3 text-slate-400 truncate max-w-[140px]">
                    {permit.attributes.NEIGHBORHOOD || 'Denver Metro'}
                  </td>

                  {/* Valuation */}
                  <td className="p-3 font-semibold text-emerald-400 whitespace-nowrap">
                    {formatCurrency(permit.attributes.VALUATION)}
                  </td>

                  {/* Issued Date */}
                  <td className="p-3 text-slate-300 whitespace-nowrap">
                    {formatDate(permit.attributes.DATE_ISSUED)}
                  </td>

                  {/* Contractor */}
                  <td className="p-3 text-slate-400 max-w-[150px] truncate">
                    {permit.attributes.CONTRACTOR_NAME || 'Owner / Unlisted'}
                  </td>

                  {/* Class */}
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
                      {permit.attributes.CLASS || 'Demo'}
                    </span>
                  </td>

                  {/* External Map Links */}
                  <td className="p-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5 text-xs text-slate-400">
                      <a
                        href={links.osm}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                        title="Open in OpenStreetMap"
                      >
                        <Compass className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={links.googleStreetView}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                        title="Open in Google Maps Street View"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onSelectPermit(permit)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-medium transition cursor-pointer"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

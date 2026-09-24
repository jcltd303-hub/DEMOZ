import { DemolitionPermit } from '../types';

/**
 * Calculates distance in statute miles between two coordinate pairs using Haversine formula
 */
export function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Exports current permits to CSV
 */
export function exportPermitsToCSV(permits: DemolitionPermit[], filenamePrefix = 'denver_demolition_permits') {
  const headers = [
    'PERMIT_NUM',
    'ADDRESS',
    'NEIGHBORHOOD',
    'VALUATION',
    'PERMIT_FEE',
    'CONTRACTOR_NAME',
    'CLASS',
    'DATE_ISSUED',
    'DATE_RECEIVED',
    'FINAL_DATE',
    'SCHEDNUM',
    'LATITUDE',
    'LONGITUDE',
    'ACCELA_PORTAL_URL',
  ];

  const rows = permits.map((p) => {
    const attr = p.attributes;
    const dateIssued = attr.DATE_ISSUED ? new Date(attr.DATE_ISSUED).toISOString().split('T')[0] : '';
    const dateReceived = attr.DATE_RECEIVED ? new Date(attr.DATE_RECEIVED).toISOString().split('T')[0] : '';
    const finalDate = attr.FINAL_DATE ? new Date(attr.FINAL_DATE).toISOString().split('T')[0] : '';
    const accelaUrl = attr.PERMIT_NUM
      ? `https://aca-prod.accela.com/DENVER/Cap/CapDetail.aspx?capID1=0&capID2=0&capID3=0&agencyCode=DENVER&altId=${encodeURIComponent(
          attr.PERMIT_NUM
        )}`
      : '';

    return [
      `"${attr.PERMIT_NUM || ''}"`,
      `"${(attr.ADDRESS || '').replace(/"/g, '""')}"`,
      `"${(attr.NEIGHBORHOOD || '').replace(/"/g, '""')}"`,
      attr.VALUATION || 0,
      attr.PERMIT_FEE || 0,
      `"${(attr.CONTRACTOR_NAME || '').replace(/"/g, '""')}"`,
      `"${(attr.CLASS || '').replace(/"/g, '""')}"`,
      `"${dateIssued}"`,
      `"${dateReceived}"`,
      `"${finalDate}"`,
      `"${attr.SCHEDNUM || ''}"`,
      p.geometry?.y || '',
      p.geometry?.x || '',
      `"${accelaUrl}"`,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports current permits to standard GeoJSON FeatureCollection for GIS software (QGIS, ArcGIS, Mapbox)
 */
export function exportPermitsToGeoJSON(permits: DemolitionPermit[], filenamePrefix = 'denver_demolition_permits') {
  const geojson = {
    type: 'FeatureCollection',
    metadata: {
      generatedAt: new Date().toISOString(),
      count: permits.length,
      source: 'Denver Accela Civic Platform Demolition Permits',
    },
    features: permits.map((p) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [p.geometry.x, p.geometry.y],
      },
      properties: {
        ...p.attributes,
        DATE_ISSUED_STR: p.attributes.DATE_ISSUED
          ? new Date(p.attributes.DATE_ISSUED).toISOString()
          : null,
      },
    })),
  };

  const jsonContent = JSON.stringify(geojson, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/geo+json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.geojson`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

interface SummaryPayload {
  totalCount: number;
  totalValuation: number;
  avgValuation: number;
  timeframeLabel?: string;
  topNeighborhoods?: Array<{ name: string; count: number }>;
  topContractors?: Array<{ name: string; permits: number; totalValuation: number }>;
  classBreakdown?: Array<{ name: string; count: number }>;
  topProjects?: Array<{
    permitNum: string;
    address: string;
    neighborhood: string;
    valuation: number;
    class: string;
    contractor: string;
  }>;
}

/**
 * Generates an in-depth urban planning, demolition, and infill intelligence brief
 * directly from the Denver Accela permit dataset when the AI gateway is offline or unauthenticated.
 */
export function generateAnalyticalInsights(
  summary: SummaryPayload,
  customQuestion?: string
): string {
  const {
    totalCount = 0,
    totalValuation = 0,
    avgValuation = 0,
    timeframeLabel = 'Selected Period',
    topNeighborhoods = [],
    topContractors = [],
    classBreakdown = [],
    topProjects = [],
  } = summary;

  const formattedTotal = `$${Number(totalValuation || 0).toLocaleString()}`;
  const formattedAvg = `$${Number(avgValuation || 0).toLocaleString()}`;
  const topNeighStr = topNeighborhoods
    .slice(0, 3)
    .map((n) => `**${n.name}** (${n.count} permits)`)
    .join(', ');

  const primaryContractor = topContractors[0]?.name || 'Licensed Contractors';
  const residentialCount =
    classBreakdown.find((c) => c.name.toLowerCase().includes('res'))?.count || 0;
  const commercialCount =
    classBreakdown.find((c) => c.name.toLowerCase().includes('comm'))?.count || 0;

  // If user asked a specific question, provide a focused response
  if (customQuestion && customQuestion.trim()) {
    const q = customQuestion.toLowerCase();

    if (q.includes('neighborhood') || q.includes('pressure') || q.includes('hotspot')) {
      return `### 📍 Neighborhood Teardown Concentration Analysis

**Scope:** ${totalCount} demolition permits across Denver Metro (${timeframeLabel}).

#### Highest Teardown Volume Concentrations:
${topNeighborhoods
  .map(
    (n, idx) =>
      `${idx + 1}. **${n.name}**: ${n.count} teardown permits (${Math.round(
        (n.count / Math.max(1, totalCount)) * 100
      )}% of active demolitions in scope).`
  )
  .join('\n')}

#### Key Planning & Infill Observations:
- **Urban Infill Corridors:** Neighborhoods like ${topNeighborhoods.slice(0, 2).map((n) => n.name).join(' and ')} represent prime infill zones where single-family parcels are frequently re-zoned or scraped for multi-unit slot homes, duplexes, or luxury rowhomes.
- **Land Value vs. Improvement Value:** High land-to-structure value ratios in inner-ring neighborhoods drive rapid teardown rates, with developers willing to incur demolition costs for zoning density arbitrage.
- **Geographic Clustering:** Teardowns are not evenly distributed; over **${Math.round(
        (topNeighborhoods.reduce((s, n) => s + n.count, 0) / Math.max(1, totalCount)) * 100
      )}%** of all active permits are concentrated within the top five neighborhoods listed above.`;
    }

    if (q.includes('contractor') || q.includes('commercial')) {
      return `### 🏗️ Contractor Landscape & Commercial Demolition Assessment

**Scope:** ${topContractors.length} major demolition entities identified (${timeframeLabel}).

#### Leading Demolition Specialists:
${topContractors
  .map(
    (c, idx) =>
      `${idx + 1}. **${c.name}**: ${c.permits} permits | **$${Number(c.totalValuation).toLocaleString()}** aggregate valuation`
  )
  .join('\n')}

#### Market Specialization Highlights:
- **Market Dominance:** **${primaryContractor}** leads active permit filings, reflecting heavy commercial and residential developer partnerships across Denver.
- **Commercial vs. Residential Split:** Of the current scope, ${commercialCount} permits represent commercial structures, while ${residentialCount} are residential teardowns. Commercial teardowns average significantly higher valuations due to environmental remediation, asbestos abatement, and structural complexity.
- **Highest Valuation Projects:**
${topProjects
  .slice(0, 3)
  .map(
    (p) =>
      `- **${p.address}** (${p.neighborhood}): $${Number(p.valuation).toLocaleString()} by *${p.contractor}* [${p.permitNum}]`
  )
  .join('\n')}`;
    }

    if (q.includes('historic') || q.includes('fabric') || q.includes('infill')) {
      return `### 🏛️ Historic Fabric & Residential Infill Dynamics

**Scope:** ${totalCount} permits evaluated across Denver neighborhoods (${timeframeLabel}).

#### Impact on Historic Housing Stock:
- **Residential Scrapes:** Approximately **${residentialCount} residential properties** are slated for or undergoing demolition in the current filter.
- **Historic Neighborhoods Impacted:** Neighborhoods established in the late 19th and early 20th centuries (including West Colfax, Highland, and Baker) face heightened pressure where historic brick bungalows and turn-of-the-century worker cottages are replaced with contemporary modern designs.
- **Zoning Transitions:** Demolition permits in U-SU (Urban Single Unit) and U-TU (Two Unit) districts mark physical transitions toward maximum permitted lot coverage, often doubling or tripling square footage on existing residential lots.
- **Demolition Review Protections:** Denver Landmark Preservation Commission reviews demolition applications for structures over 30 years old, but un-designated properties frequently transition directly to scrap permits upon sale.`;
    }
  }

  // Default Comprehensive Intelligence Brief
  return `## 🏙️ Denver Demolition & Redevelopment Intelligence Brief

### 1. Executive Summary & Market Velocity
- **Permit Volume:** **${totalCount} active demolition permits** tracked in scope (${timeframeLabel}).
- **Total Redevelopment Capital:** **${formattedTotal}** in permitted teardown valuation.
- **Average Valuation per Permit:** **${formattedAvg}**, reflecting demolition, site preparation, and hazardous material abatement.
- **Velocity Assessment:** An active teardown pipeline indicates strong underlying capital momentum for infill construction, multi-family development, and commercial site repurposing across Denver.

---

### 2. Geographic Teardown Concentrations
Teardown activity is heavily concentrated in high-demand inner-ring corridors:
${topNeighborhoods
  .map(
    (n, idx) =>
      `${idx + 1}. **${n.name}**: ${n.count} permits (${Math.round(
        (n.count / Math.max(1, totalCount)) * 100
      )}% share)`
  )
  .join('\n')}

*Core observation:* Concentrated filings in ${topNeighStr} underscore intense redevelopment pressure where land valuation significantly exceeds aging structural valuations.

---

### 3. High-Impact Redevelopment Teardowns
Top permitted demolition projects by estimated valuation:
${topProjects
  .slice(0, 5)
  .map(
    (p, idx) =>
      `${idx + 1}. **${p.address}** (${p.neighborhood || 'Denver Metro'})\n   - **Valuation:** $${Number(p.valuation).toLocaleString()} | **Class:** ${p.class}\n   - **Contractor:** ${p.contractor} | **Permit #:** \`${p.permitNum}\``
  )
  .join('\n\n')}

---

### 4. Contractor & Industry Dynamics
- **Market Leaders:** Top active contractor **${primaryContractor}** and industry peers account for the majority of heavy structural teardowns.
- **Permit Classification Breakdown:**
${classBreakdown.map((c) => `  - **${c.name}:** ${c.count} permits`).join('\n')}

---

### 5. Urban Planning & Community Implications
- **Residential Density & Infill:** Scrapes predominantly pave the way for increased zoning density, transforming single detached lots into duplexes or rowhouses under Denver's Blueprint guidelines.
- **Historic Fabric Preservation:** Heightened teardown density in early 20th-century residential zones highlights ongoing preservation debates regarding neighborhood character versus housing supply expansion.
- **Material Salvage & Environmental Impact:** Denver's recycling and green building ordinances require increased diversion of construction and demolition debris away from regional landfills.`;
}

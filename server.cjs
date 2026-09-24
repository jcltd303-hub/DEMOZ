var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");

// server/insightsEngine.ts
function generateAnalyticalInsights(summary, customQuestion) {
  const {
    totalCount = 0,
    totalValuation = 0,
    avgValuation = 0,
    timeframeLabel = "Selected Period",
    topNeighborhoods = [],
    topContractors = [],
    classBreakdown = [],
    topProjects = []
  } = summary;
  const formattedTotal = `$${Number(totalValuation || 0).toLocaleString()}`;
  const formattedAvg = `$${Number(avgValuation || 0).toLocaleString()}`;
  const topNeighStr = topNeighborhoods.slice(0, 3).map((n) => `**${n.name}** (${n.count} permits)`).join(", ");
  const primaryContractor = topContractors[0]?.name || "Licensed Contractors";
  const residentialCount = classBreakdown.find((c) => c.name.toLowerCase().includes("res"))?.count || 0;
  const commercialCount = classBreakdown.find((c) => c.name.toLowerCase().includes("comm"))?.count || 0;
  if (customQuestion && customQuestion.trim()) {
    const q = customQuestion.toLowerCase();
    if (q.includes("neighborhood") || q.includes("pressure") || q.includes("hotspot")) {
      return `### \u{1F4CD} Neighborhood Teardown Concentration Analysis

**Scope:** ${totalCount} demolition permits across Denver Metro (${timeframeLabel}).

#### Highest Teardown Volume Concentrations:
${topNeighborhoods.map(
        (n, idx) => `${idx + 1}. **${n.name}**: ${n.count} teardown permits (${Math.round(
          n.count / Math.max(1, totalCount) * 100
        )}% of active demolitions in scope).`
      ).join("\n")}

#### Key Planning & Infill Observations:
- **Urban Infill Corridors:** Neighborhoods like ${topNeighborhoods.slice(0, 2).map((n) => n.name).join(" and ")} represent prime infill zones where single-family parcels are frequently re-zoned or scraped for multi-unit slot homes, duplexes, or luxury rowhomes.
- **Land Value vs. Improvement Value:** High land-to-structure value ratios in inner-ring neighborhoods drive rapid teardown rates, with developers willing to incur demolition costs for zoning density arbitrage.
- **Geographic Clustering:** Teardowns are not evenly distributed; over **${Math.round(
        topNeighborhoods.reduce((s, n) => s + n.count, 0) / Math.max(1, totalCount) * 100
      )}%** of all active permits are concentrated within the top five neighborhoods listed above.`;
    }
    if (q.includes("contractor") || q.includes("commercial")) {
      return `### \u{1F3D7}\uFE0F Contractor Landscape & Commercial Demolition Assessment

**Scope:** ${topContractors.length} major demolition entities identified (${timeframeLabel}).

#### Leading Demolition Specialists:
${topContractors.map(
        (c, idx) => `${idx + 1}. **${c.name}**: ${c.permits} permits | **$${Number(c.totalValuation).toLocaleString()}** aggregate valuation`
      ).join("\n")}

#### Market Specialization Highlights:
- **Market Dominance:** **${primaryContractor}** leads active permit filings, reflecting heavy commercial and residential developer partnerships across Denver.
- **Commercial vs. Residential Split:** Of the current scope, ${commercialCount} permits represent commercial structures, while ${residentialCount} are residential teardowns. Commercial teardowns average significantly higher valuations due to environmental remediation, asbestos abatement, and structural complexity.
- **Highest Valuation Projects:**
${topProjects.slice(0, 3).map(
        (p) => `- **${p.address}** (${p.neighborhood}): $${Number(p.valuation).toLocaleString()} by *${p.contractor}* [${p.permitNum}]`
      ).join("\n")}`;
    }
    if (q.includes("historic") || q.includes("fabric") || q.includes("infill")) {
      return `### \u{1F3DB}\uFE0F Historic Fabric & Residential Infill Dynamics

**Scope:** ${totalCount} permits evaluated across Denver neighborhoods (${timeframeLabel}).

#### Impact on Historic Housing Stock:
- **Residential Scrapes:** Approximately **${residentialCount} residential properties** are slated for or undergoing demolition in the current filter.
- **Historic Neighborhoods Impacted:** Neighborhoods established in the late 19th and early 20th centuries (including West Colfax, Highland, and Baker) face heightened pressure where historic brick bungalows and turn-of-the-century worker cottages are replaced with contemporary modern designs.
- **Zoning Transitions:** Demolition permits in U-SU (Urban Single Unit) and U-TU (Two Unit) districts mark physical transitions toward maximum permitted lot coverage, often doubling or tripling square footage on existing residential lots.
- **Demolition Review Protections:** Denver Landmark Preservation Commission reviews demolition applications for structures over 30 years old, but un-designated properties frequently transition directly to scrap permits upon sale.`;
    }
  }
  return `## \u{1F3D9}\uFE0F Denver Demolition & Redevelopment Intelligence Brief

### 1. Executive Summary & Market Velocity
- **Permit Volume:** **${totalCount} active demolition permits** tracked in scope (${timeframeLabel}).
- **Total Redevelopment Capital:** **${formattedTotal}** in permitted teardown valuation.
- **Average Valuation per Permit:** **${formattedAvg}**, reflecting demolition, site preparation, and hazardous material abatement.
- **Velocity Assessment:** An active teardown pipeline indicates strong underlying capital momentum for infill construction, multi-family development, and commercial site repurposing across Denver.

---

### 2. Geographic Teardown Concentrations
Teardown activity is heavily concentrated in high-demand inner-ring corridors:
${topNeighborhoods.map(
    (n, idx) => `${idx + 1}. **${n.name}**: ${n.count} permits (${Math.round(
      n.count / Math.max(1, totalCount) * 100
    )}% share)`
  ).join("\n")}

*Core observation:* Concentrated filings in ${topNeighStr} underscore intense redevelopment pressure where land valuation significantly exceeds aging structural valuations.

---

### 3. High-Impact Redevelopment Teardowns
Top permitted demolition projects by estimated valuation:
${topProjects.slice(0, 5).map(
    (p, idx) => `${idx + 1}. **${p.address}** (${p.neighborhood || "Denver Metro"})
   - **Valuation:** $${Number(p.valuation).toLocaleString()} | **Class:** ${p.class}
   - **Contractor:** ${p.contractor} | **Permit #:** \`${p.permitNum}\``
  ).join("\n\n")}

---

### 4. Contractor & Industry Dynamics
- **Market Leaders:** Top active contractor **${primaryContractor}** and industry peers account for the majority of heavy structural teardowns.
- **Permit Classification Breakdown:**
${classBreakdown.map((c) => `  - **${c.name}:** ${c.count} permits`).join("\n")}

---

### 5. Urban Planning & Community Implications
- **Residential Density & Infill:** Scrapes predominantly pave the way for increased zoning density, transforming single detached lots into duplexes or rowhouses under Denver's Blueprint guidelines.
- **Historic Fabric Preservation:** Heightened teardown density in early 20th-century residential zones highlights ongoing preservation debates regarding neighborhood character versus housing supply expansion.
- **Material Salvage & Environmental Impact:** Denver's recycling and green building ordinances require increased diversion of construction and demolition debris away from regional landfills.`;
}

// server.ts
var genAiClient = null;
function getGenAi() {
  if (!genAiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured");
    }
    genAiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return genAiClient;
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/demolition-insights", async (req, res) => {
    const { summary, customQuestion } = req.body;
    if (!summary) {
      return res.status(400).json({ error: "Missing summary payload" });
    }
    try {
      const ai = getGenAi();
      const systemPrompt = `You are a Denver Urban Planning and Demolition Intelligence Specialist. 
Analyze the provided Denver demolition permit data with high analytical precision. 
Provide realistic, structured urban insights that help residents, journalists, researchers, and investors understand redevelopment trends in Denver, Colorado.
Always format your response in clean Markdown with appropriate bold headings, bullet points, and analytical highlights.
Focus on:
1. Executive Summary & Market Velocity (aggregate spend, permit counts, rate of activity).
2. Neighborhood Hotspots & Infill Patterns (which neighborhoods are most impacted and what type of redevelopment this suggests).
3. Significant Teardowns (notable high-valuation or strategic demolitions).
4. Contractor & Industry Dynamics.
5. Community / Planning Implications (displacement, zoning infill, historic fabric impact).`;
      const userPrompt = `Here is the current Denver Demolition Permit dataset summary:
- Total Permits in current filter: ${summary.totalCount}
- Total Demolition Valuation: $${Number(summary.totalValuation || 0).toLocaleString()}
- Average Valuation per Permit: $${Number(summary.avgValuation || 0).toLocaleString()}
- Active Date Window: ${summary.timeframeLabel || "Selected timeframe"}
- Top Neighborhoods by Volume: ${JSON.stringify(summary.topNeighborhoods || [])}
- Top Demolition Contractors: ${JSON.stringify(summary.topContractors || [])}
- Breakdown by Demolition Class: ${JSON.stringify(summary.classBreakdown || [])}
- Top 10 Highest Valuation Permits: ${JSON.stringify(summary.topProjects || [])}

${customQuestion ? `Specific User Question to answer regarding this dataset: "${customQuestion}"` : `Please produce a comprehensive Demolition & Redevelopment Intelligence Brief based on these figures.`}
`;
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7
        }
      });
      const analysis = response.text || "No response generated.";
      return res.json({ success: true, analysis, source: "gemini" });
    } catch (err) {
      console.warn("Gemini API call failed, falling back to analytical intelligence engine:", err);
      const analysis = generateAnalyticalInsights(summary, customQuestion);
      return res.json({
        success: true,
        analysis,
        source: "analytical_engine",
        notice: "Generated via Denver Demolition Analytical Intelligence Engine (local metrics synthesis)."
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map

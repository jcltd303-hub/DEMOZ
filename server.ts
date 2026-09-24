import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { generateAnalyticalInsights } from './server/insightsEngine.js';

let genAiClient: GoogleGenAI | null = null;
function getGenAi(): GoogleGenAI {
  if (!genAiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    genAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Server-side Gemini API Demolition Insights
  app.post('/api/demolition-insights', async (req, res) => {
    const { summary, customQuestion } = req.body;
    if (!summary) {
      return res.status(400).json({ error: 'Missing summary payload' });
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
- Active Date Window: ${summary.timeframeLabel || 'Selected timeframe'}
- Top Neighborhoods by Volume: ${JSON.stringify(summary.topNeighborhoods || [])}
- Top Demolition Contractors: ${JSON.stringify(summary.topContractors || [])}
- Breakdown by Demolition Class: ${JSON.stringify(summary.classBreakdown || [])}
- Top 10 Highest Valuation Permits: ${JSON.stringify(summary.topProjects || [])}

${
  customQuestion
    ? `Specific User Question to answer regarding this dataset: "${customQuestion}"`
    : `Please produce a comprehensive Demolition & Redevelopment Intelligence Brief based on these figures.`
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });

      const analysis = response.text || 'No response generated.';
      return res.json({ success: true, analysis, source: 'gemini' });
    } catch (err: unknown) {
      console.warn('Gemini API call failed, falling back to analytical intelligence engine:', err);
      // Generate rich analytical report from dataset metrics directly
      const analysis = generateAnalyticalInsights(summary, customQuestion);
      return res.json({
        success: true,
        analysis,
        source: 'analytical_engine',
        notice:
          'Generated via Denver Demolition Analytical Intelligence Engine (local metrics synthesis).',
      });
    }
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

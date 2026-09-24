import React, { useState, useEffect } from 'react';
import { DemolitionPermit, FilterOptions } from '../types';
import { formatCurrency } from '../services/accelaService';
import {
  Sparkles,
  X,
  RefreshCw,
  Copy,
  Check,
  Building2,
  AlertCircle,
  Send,
  HelpCircle,
} from 'lucide-react';
import Markdown from 'react-markdown';

interface AiInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  permits: DemolitionPermit[];
  filters: FilterOptions;
}

export const AiInsightsModal: React.FC<AiInsightsModalProps> = ({
  isOpen,
  onClose,
  permits,
  filters,
}) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [source, setSource] = useState<'gemini' | 'analytical_engine' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Compute dataset summary for AI
  const prepareSummary = () => {
    const totalCount = permits.length;
    const totalValuation = permits.reduce(
      (sum, p) => sum + (p.attributes.VALUATION || 0),
      0
    );
    const avgValuation = totalCount > 0 ? Math.round(totalValuation / totalCount) : 0;

    // Neighborhood counts
    const nMap: Record<string, number> = {};
    permits.forEach((p) => {
      const n = p.attributes.NEIGHBORHOOD || 'Unknown';
      nMap[n] = (nMap[n] || 0) + 1;
    });
    const topNeighborhoods = Object.entries(nMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Contractor counts
    const cMap: Record<string, { count: number; totalVal: number }> = {};
    permits.forEach((p) => {
      const c = p.attributes.CONTRACTOR_NAME || 'Unspecified / Owner';
      if (!cMap[c]) cMap[c] = { count: 0, totalVal: 0 };
      cMap[c].count += 1;
      cMap[c].totalVal += p.attributes.VALUATION || 0;
    });
    const topContractors = Object.entries(cMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({ name, permits: data.count, totalValuation: data.totalVal }));

    // Class breakdown
    const classMap: Record<string, number> = {};
    permits.forEach((p) => {
      const c = p.attributes.CLASS || 'Other';
      classMap[c] = (classMap[c] || 0) + 1;
    });
    const classBreakdown = Object.entries(classMap).map(([name, count]) => ({
      name,
      count,
    }));

    // Top 10 highest valuation projects
    const topProjects = [...permits]
      .sort((a, b) => (b.attributes.VALUATION || 0) - (a.attributes.VALUATION || 0))
      .slice(0, 10)
      .map((p) => ({
        permitNum: p.attributes.PERMIT_NUM,
        address: p.attributes.ADDRESS,
        neighborhood: p.attributes.NEIGHBORHOOD,
        valuation: p.attributes.VALUATION,
        class: p.attributes.CLASS,
        contractor: p.attributes.CONTRACTOR_NAME,
      }));

    return {
      totalCount,
      totalValuation,
      avgValuation,
      timeframeLabel: filters.daysRange === 0 ? 'All Records' : `Last ${filters.daysRange} Days`,
      topNeighborhoods,
      topContractors,
      classBreakdown,
      topProjects,
    };
  };

  const fetchInsights = async (question?: string) => {
    if (permits.length === 0) {
      setError('No permits found in current filter to analyze.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const summary = prepareSummary();
      const response = await fetch('/api/demolition-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          customQuestion: question || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate intelligence brief');
      }

      setAnalysis(data.analysis);
      setSource(data.source || 'analytical_engine');
      setNotice(data.notice || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error generating insights';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Trigger initial generation if opened and no analysis yet
  useEffect(() => {
    if (isOpen && !analysis && !loading) {
      fetchInsights();
    }
  }, [isOpen]);

  const handleCopy = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickQuestion = (q: string) => {
    setCustomQuestion(q);
    fetchInsights(q);
  };

  const totalValuation = permits.reduce(
    (sum, p) => sum + (p.attributes.VALUATION || 0),
    0
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Denver Demolition AI Intelligence Brief
                </h2>
                {source === 'gemini' ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Gemini 3.8
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Demolition Intelligence
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Automated urban redevelopment, gentrification & demolition trends analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dataset Stats Bar */}
        <div className="px-5 py-2.5 bg-slate-800/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4 text-slate-300">
            <span>
              <strong>{permits.length}</strong> Permits in Scope
            </span>
            <span>&bull;</span>
            <span className="text-emerald-400 font-semibold">
              {formatCurrency(totalValuation)} Total Valuation
            </span>
            <span>&bull;</span>
            <span className="text-slate-400">
              {filters.daysRange === 0 ? 'All Time' : `Last ${filters.daysRange} Days`}
            </span>
            {filters.neighborhood && (
              <>
                <span>&bull;</span>
                <span className="text-amber-400 truncate max-w-[150px]">
                  {filters.neighborhood}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchInsights(customQuestion || undefined)}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Analyzing...' : 'Re-analyze'}</span>
            </button>
            {analysis && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Preset Question Chips */}
        <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="text-slate-400 flex items-center gap-1 shrink-0 font-medium">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            Quick Prompts:
          </span>
          {[
            'Executive Demolition Velocity Brief',
            'Which neighborhoods face highest teardown pressure?',
            'Analyze top contractors & commercial teardowns',
            'Historic fabric & residential infill impact',
          ].map((promptText) => (
            <button
              key={promptText}
              onClick={() => handleQuickQuestion(promptText)}
              disabled={loading}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 text-slate-300 border border-slate-700 transition whitespace-nowrap text-[11px] disabled:opacity-50 cursor-pointer"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Unable to generate AI analysis</p>
                <p className="mt-0.5 text-rose-300/90">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-white">
                Synthesizing Denver demolition metrics & trends...
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Correlating neighborhood valuations, contractor clusters, and teardown categories.
              </p>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              {notice && (
                <div className="px-3.5 py-2 rounded-lg bg-slate-800/80 border border-slate-700/70 text-[11px] text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>{notice}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Live Accela Data</span>
                </div>
              )}
              <div className="prose prose-invert prose-amber max-w-none text-slate-200 text-sm leading-relaxed space-y-3">
                <div className="markdown-body">
                  <Markdown>{analysis}</Markdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Click &quot;Re-analyze&quot; or select a prompt above to generate insights.
            </div>
          )}
        </div>

        {/* Interactive Query Input Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customQuestion.trim()) {
                fetchInsights(customQuestion.trim());
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="Ask Gemini a custom question about this demolition dataset..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="submit"
              disabled={loading || !customQuestion.trim()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

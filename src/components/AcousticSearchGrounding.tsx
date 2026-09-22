import React, { useState } from 'react';
import { Search, Globe, ExternalLink, Sparkles, Loader2, BookOpen, ChevronRight } from 'lucide-react';

export const AcousticSearchGrounding: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [answer, setAnswer] = useState<string>('');
  const [groundingSources, setGroundingSources] = useState<Array<{ title: string; url: string }>>([]);
  const [error, setError] = useState<string>('');

  const sampleQueries = [
    'Harman Target Curve 10 band EQ recommendations',
    'Genelec 8030C frequency response specs',
    'Corner bass trap optimal acoustic placement 80Hz',
    'Yamaha HS8 room calibration dip at 1kHz',
  ];

  const handleSearch = async (searchPrompt?: string) => {
    const q = searchPrompt || query;
    if (!q.trim()) return;

    setIsSearching(true);
    setError('');
    setAnswer('');
    setGroundingSources([]);

    try {
      const response = await fetch('/api/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      const data = await response.json();
      if (data.answer) {
        setAnswer(data.answer);
        if (data.groundingSources) {
          setGroundingSources(data.groundingSources);
        }
      } else if (data.error) {
        setError(data.error);
      } else {
        setError('No response received from search engine.');
      }
    } catch (err: any) {
      setError(err.message || 'Search grounding request failed.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Acoustic Knowledge & Gear Search Grounding
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                gemini-3.8-flash + googleSearch
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Query real-time web search data for monitor specs, target EQ curves, and room treatment guides
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Search Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search speaker specs, Harman curve, room modes, or acoustic treatment..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-200" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search</span>
              </>
            )}
          </button>
        </form>

        {/* Preset Sample Search Tags */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Suggested Queries:</span>
          {sampleQueries.map((sq, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(sq);
                handleSearch(sq);
              }}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-center gap-1"
            >
              <span>{sq}</span>
              <ChevronRight className="w-3 h-3 text-slate-500" />
            </button>
          ))}
        </div>
      </div>

      {/* Results & Grounding Citations */}
      {answer && (
        <div className="space-y-4 pt-2">
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Google Search Grounded Answer
            </div>
            <div className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line">
              {answer}
            </div>
          </div>

          {groundingSources.length > 0 && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Verified Search Sources & Citations
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {groundingSources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/50 text-xs text-blue-300 flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <span className="truncate pr-2 font-medium">{source.title || source.url}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && <div className="text-[11px] text-red-400 bg-red-950/40 border border-red-900/50 p-2.5 rounded-xl">{error}</div>}
    </div>
  );
};

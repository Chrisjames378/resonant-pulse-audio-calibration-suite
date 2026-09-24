import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Sliders, Activity, Power, RotateCcw, Volume2, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';

export interface ParametricBand5 {
  id: string;
  name: string;
  type: 'highpass' | 'lowshelf' | 'peaking' | 'highshelf' | 'lowpass';
  freq: number; // Hz
  gain: number; // dB
  q: number; // Q factor
  enabled: boolean;
}

const DEFAULT_5BAND_CONFIG: ParametricBand5[] = [
  { id: 'b1', name: 'Low Cut', type: 'highpass', freq: 30, gain: 0, q: 0.707, enabled: true },
  { id: 'b2', name: 'Low Shelf', type: 'lowshelf', freq: 120, gain: 2.0, q: 0.707, enabled: true },
  { id: 'b3', name: 'Mid Bell', type: 'peaking', freq: 1000, gain: -1.5, q: 1.414, enabled: true },
  { id: 'b4', name: 'High Shelf', type: 'highshelf', freq: 6000, gain: 1.5, q: 0.707, enabled: true },
  { id: 'b5', name: 'High Cut', type: 'lowpass', freq: 18000, gain: 0, q: 0.707, enabled: true },
];

interface ParametricEQ5BandProps {
  onBandsChanged?: (bands: ParametricBand5[]) => void;
}

export const ParametricEQ5Band: React.FC<ParametricEQ5BandProps> = ({ onBandsChanged }) => {
  const [bands, setBands] = useState<ParametricBand5[]>(DEFAULT_5BAND_CONFIG);
  const [selectedBandId, setSelectedBandId] = useState<string>('b3');
  const [masterGain, setMasterGain] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height: 220 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setDimensions({
            width: Math.max(200, entry.contentRect.width),
            height: Math.max(140, entry.contentRect.height),
          });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const updateBand = (id: string, updates: Partial<ParametricBand5>) => {
    setBands((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
      if (onBandsChanged) onBandsChanged(next);
      return next;
    });
  };

  const handleReset = () => {
    setBands(DEFAULT_5BAND_CONFIG);
    if (onBandsChanged) onBandsChanged(DEFAULT_5BAND_CONFIG);
  };

  // Auto-Trim calculation for 5-band Parametric EQ
  const maxParametricBoost = useMemo(() => {
    const boostableBands = bands.filter((b) => b.enabled && b.type !== 'highpass' && b.type !== 'lowpass');
    if (boostableBands.length === 0) return 0;
    return Math.max(0, ...boostableBands.map((b) => b.gain));
  }, [bands]);

  const autoTrimSuggestedGain = useMemo(() => {
    return Math.round(-maxParametricBoost * 2) / 2;
  }, [maxParametricBoost]);

  const estimatedPeakDbFS = masterGain + maxParametricBoost;
  const isClippingRisk = estimatedPeakDbFS > 0.05;

  const handleApplyAutoTrim = () => {
    setMasterGain(autoTrimSuggestedGain);
  };

  const selectedBand = bands.find((b) => b.id === selectedBandId) || bands[2];

  // D3 Scale Calculations
  const { width, height } = dimensions;
  const margin = { top: 20, right: 24, bottom: 28, left: 36 };
  const innerWidth = Math.max(10, width - margin.left - margin.right);
  const innerHeight = Math.max(10, height - margin.top - margin.bottom);

  const xScale = useMemo(() => {
    return d3.scaleLog().domain([20, 20000]).range([0, innerWidth]);
  }, [innerWidth]);

  const yScale = useMemo(() => {
    return d3.scaleLinear().domain([-18, 18]).range([innerHeight, 0]);
  }, [innerHeight]);

  // Compute composite frequency response curve
  const curvePoints = useMemo(() => {
    const numPoints = 120;
    const pts: { x: number; y: number; freq: number; gainDb: number }[] = [];

    for (let i = 0; i < numPoints; i++) {
      // Logarithmic spacing
      const freq = 20 * Math.pow(20000 / 20, i / (numPoints - 1));
      let totalGainDb = masterGain;

      bands.forEach((b) => {
        if (!b.enabled) return;
        const fRatio = freq / b.freq;

        if (b.type === 'peaking') {
          // Bell filter magnitude approximation
          const q = b.q || 1;
          const mag = Math.exp(-0.5 * Math.pow(Math.log(fRatio) * q, 2));
          totalGainDb += b.gain * mag;
        } else if (b.type === 'lowshelf') {
          if (freq < b.freq) {
            totalGainDb += b.gain;
          } else if (freq < b.freq * 2) {
            const t = (freq - b.freq) / b.freq;
            totalGainDb += b.gain * (1 - t);
          }
        } else if (b.type === 'highshelf') {
          if (freq > b.freq) {
            totalGainDb += b.gain;
          } else if (freq > b.freq / 2) {
            const t = (b.freq - freq) / (b.freq / 2);
            totalGainDb += b.gain * (1 - t);
          }
        } else if (b.type === 'highpass') {
          if (freq < b.freq) {
            const dbDrop = -12 * Math.log2(b.freq / Math.max(1, freq));
            totalGainDb += Math.max(-24, dbDrop);
          }
        } else if (b.type === 'lowpass') {
          if (freq > b.freq) {
            const dbDrop = -12 * Math.log2(freq / b.freq);
            totalGainDb += Math.max(-24, dbDrop);
          }
        }
      });

      const clampedGain = Math.max(-18, Math.min(18, totalGainDb));
      pts.push({
        freq,
        gainDb: clampedGain,
        x: xScale(Math.max(20, Math.min(20000, freq))),
        y: yScale(clampedGain),
      });
    }

    return pts;
  }, [bands, masterGain, xScale, yScale]);

  const lineGen = d3
    .line<{ x: number; y: number }>()
    .x((d) => d.x)
    .y((d) => d.y)
    .curve(d3.curveMonotoneX);

  const areaGen = d3
    .area<{ x: number; y: number }>()
    .x((d) => d.x)
    .y0(yScale(0))
    .y1((d) => d.y)
    .curve(d3.curveMonotoneX);

  const pathD = lineGen(curvePoints) || '';
  const areaD = areaGen(curvePoints) || '';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              5-Band Interactive Parametric EQ Studio Suite
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Low Cut • Low Shelf • Mid Bell • High Shelf • High Cut
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Precision frequency cutoff, parametric Q bandwidth, and gain curve editing with real-time response curve
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Peak Ceiling Indicator */}
          <div
            className={`text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 border ${
              isClippingRisk
                ? 'bg-red-950/80 text-red-300 border-red-800/80 animate-pulse'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
            }`}
            title={`Max Parametric Boost: +${maxParametricBoost.toFixed(1)}dB | Master Gain: ${masterGain.toFixed(1)}dB`}
          >
            {isClippingRisk ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>Peak +{estimatedPeakDbFS.toFixed(1)}dB</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Peak {estimatedPeakDbFS.toFixed(1)}dB</span>
              </>
            )}
          </div>

          <button
            onClick={handleApplyAutoTrim}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md ${
              isClippingRisk
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
            }`}
            title="Auto-Trim Master Output Gain to enforce 0dB digital ceiling"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-300 fill-current" />
            <span>Auto-Trim ({autoTrimSuggestedGain > 0 ? `+${autoTrimSuggestedGain}` : autoTrimSuggestedGain}dB)</span>
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset 5-Band</span>
          </button>
        </div>
      </div>

      {/* Interactive D3 Canvas Graph */}
      <div className="relative bg-slate-950 border border-slate-800/80 rounded-2xl p-3 shadow-inner h-56 overflow-hidden">
        <div ref={containerRef} className="absolute inset-0 w-full h-full">
          <svg className="w-full h-full block" viewBox={`0 0 ${width} ${height}`}>
            <defs>
              <linearGradient id="p5Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            <g transform={`translate(${margin.left}, ${margin.top})`}>
              {/* Grid Lines */}
              {[-12, -6, 0, 6, 12].map((gVal) => (
                <g key={gVal}>
                  <line
                    x1={0}
                    y1={yScale(gVal)}
                    x2={innerWidth}
                    y2={yScale(gVal)}
                    stroke={gVal === 0 ? '#475569' : '#1e293b'}
                    strokeDasharray={gVal === 0 ? '4 4' : '2 4'}
                    strokeWidth={gVal === 0 ? '1.5' : '1'}
                  />
                  <text
                    x={-6}
                    y={yScale(gVal) + 3}
                    textAnchor="end"
                    fill={gVal === 0 ? '#38bdf8' : '#64748b'}
                    fontSize="9"
                    fontWeight={gVal === 0 ? 'bold' : 'normal'}
                  >
                    {gVal > 0 ? `+${gVal}` : `${gVal}`}
                  </text>
                </g>
              ))}

              {[100, 1000, 10000].map((fq) => (
                <g key={fq}>
                  <line
                    x1={xScale(fq)}
                    y1={0}
                    x2={xScale(fq)}
                    y2={innerHeight}
                    stroke="#1e293b"
                    strokeDasharray="2 4"
                    strokeWidth="1"
                  />
                  <text
                    x={xScale(fq)}
                    y={innerHeight + 16}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="9"
                  >
                    {fq >= 1000 ? `${fq / 1000}kHz` : `${fq}Hz`}
                  </text>
                </g>
              ))}

              {/* Area & Response Curve */}
              {areaD && <path d={areaD} fill="url(#p5Grad)" />}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* 5 Band Interactive Nodes */}
              {bands.map((b) => {
                const nx = xScale(Math.max(20, Math.min(20000, b.freq)));
                const ny = yScale(b.gain);
                const isSel = b.id === selectedBandId;

                return (
                  <g
                    key={b.id}
                    className="cursor-pointer group"
                    onClick={() => setSelectedBandId(b.id)}
                  >
                    <circle
                      cx={nx}
                      cy={ny}
                      r={isSel ? 10 : 7}
                      fill={isSel ? '#6366f1' : b.enabled ? '#38bdf8' : '#64748b'}
                      fillOpacity={isSel ? 0.9 : 0.6}
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                    <text
                      x={nx}
                      y={ny + 3}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {b.id.replace('b', '')}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* Band Selector Tabs & Parameters */}
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-2">
          {bands.map((b) => {
            const isSel = b.id === selectedBandId;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBandId(b.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                  isSel
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-extrabold ${isSel ? 'text-indigo-300' : 'text-white'}`}>
                    {b.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateBand(b.id, { enabled: !b.enabled });
                    }}
                    className={`p-1 rounded cursor-pointer ${b.enabled ? 'text-emerald-400' : 'text-slate-600'}`}
                    title="Toggle Band Power"
                  >
                    <Power className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 font-mono">
                  {b.freq >= 1000 ? `${(b.freq / 1000).toFixed(1)}kHz` : `${b.freq}Hz`}
                </div>
                <div className="text-[10px] font-bold text-indigo-400">
                  {b.type === 'highpass' || b.type === 'lowpass' ? `${b.q} Q` : `${b.gain > 0 ? '+' : ''}${b.gain}dB`}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Band Fine-Tuning Controls */}
        {selectedBand && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Frequency Control */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Cutoff / Center Frequency</span>
                <span className="font-mono font-bold text-indigo-400">
                  {selectedBand.freq >= 1000 ? `${(selectedBand.freq / 1000).toFixed(2)} kHz` : `${Math.round(selectedBand.freq)} Hz`}
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="20000"
                step="5"
                value={selectedBand.freq}
                onChange={(e) => updateBand(selectedBand.id, { freq: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>

            {/* Gain Control */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Gain (dB)</span>
                <span className={`font-mono font-bold ${selectedBand.gain > 0 ? 'text-emerald-400' : selectedBand.gain < 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {selectedBand.gain > 0 ? `+${selectedBand.gain.toFixed(1)}` : selectedBand.gain.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                min="-18"
                max="18"
                step="0.5"
                disabled={selectedBand.type === 'highpass' || selectedBand.type === 'lowpass'}
                value={selectedBand.gain}
                onChange={(e) => updateBand(selectedBand.id, { gain: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer disabled:opacity-30"
              />
            </div>

            {/* Q Factor Control */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Q Bandwidth (Quality Factor)</span>
                <span className="font-mono font-bold text-blue-400">{selectedBand.q.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={selectedBand.q}
                onChange={(e) => updateBand(selectedBand.id, { q: parseFloat(e.target.value) })}
                className="w-full accent-blue-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

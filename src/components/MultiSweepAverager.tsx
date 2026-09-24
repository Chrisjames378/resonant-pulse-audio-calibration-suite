import React, { useState, useMemo } from 'react';
import { Activity, Layers, Plus, Trash2, CheckCircle2, RotateCcw, Volume2, ShieldCheck, BarChart2 } from 'lucide-react';
import * as d3 from 'd3';

export interface SweepPoint {
  id: string;
  label: string; // e.g. "Center Mix Position", "Left Ear (+30cm)", "Right Ear (-30cm)"
  date: string;
  freqData: { freq: number; db: number }[]; // 10 ISO standard center frequencies
}

const ISO_FREQS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

interface MultiSweepAveragerProps {
  onAverageCalculated?: (averagedEq: { freq: number; db: number }[]) => void;
}

export const MultiSweepAverager: React.FC<MultiSweepAveragerProps> = ({ onAverageCalculated }) => {
  const [sweeps, setSweeps] = useState<SweepPoint[]>([
    {
      id: 'sw-1',
      label: 'Main Listening Position (Mix Chair Center)',
      date: new Date().toLocaleTimeString(),
      freqData: [
        { freq: 31, db: 2.1 },
        { freq: 62, db: 6.8 }, // Sub room mode
        { freq: 125, db: -1.2 },
        { freq: 250, db: 1.5 },
        { freq: 500, db: -2.8 }, // Desk bounce dip
        { freq: 1000, db: -3.5 },
        { freq: 2000, db: 1.2 },
        { freq: 4000, db: -1.8 },
        { freq: 8000, db: 0.5 },
        { freq: 16000, db: -4.2 },
      ],
    },
    {
      id: 'sw-2',
      label: 'Left Ear Offset (+25cm Left)',
      date: new Date().toLocaleTimeString(),
      freqData: [
        { freq: 31, db: 3.5 },
        { freq: 62, db: 5.2 },
        { freq: 125, db: -0.5 },
        { freq: 250, db: 2.1 },
        { freq: 500, db: -1.5 },
        { freq: 1000, db: -2.2 },
        { freq: 2000, db: 0.8 },
        { freq: 4000, db: -2.5 },
        { freq: 8000, db: 1.0 },
        { freq: 16000, db: -3.8 },
      ],
    },
    {
      id: 'sw-3',
      label: 'Right Ear Offset (+25cm Right)',
      date: new Date().toLocaleTimeString(),
      freqData: [
        { freq: 31, db: 1.8 },
        { freq: 62, db: 7.1 },
        { freq: 125, db: -2.0 },
        { freq: 250, db: 0.9 },
        { freq: 500, db: -3.2 },
        { freq: 1000, db: -4.0 },
        { freq: 2000, db: 1.5 },
        { freq: 4000, db: -1.1 },
        { freq: 8000, db: 0.2 },
        { freq: 16000, db: -4.8 },
      ],
    },
  ]);

  const [newLabel, setNewLabel] = useState<string>('Rear Producer Couch (+1m Back)');

  // Compute Logarithmic Power Spatial Average
  const spatialAverage = useMemo(() => {
    if (sweeps.length === 0) return [];

    return ISO_FREQS.map((freq) => {
      let sumPower = 0;
      sweeps.forEach((sw) => {
        const item = sw.freqData.find((f) => f.freq === freq);
        const db = item ? item.db : 0;
        // Convert dB to linear power scale, average, then convert back to dB
        sumPower += Math.pow(10, db / 20);
      });

      const avgLinear = sumPower / sweeps.length;
      const avgDb = 20 * Math.log10(avgLinear);

      return {
        freq,
        db: Math.round(avgDb * 10) / 10,
      };
    });
  }, [sweeps]);

  const handleAddSimulatedSweep = () => {
    if (sweeps.length >= 9) return;

    // Simulate real acoustic variation for position offset
    const randomVariation = ISO_FREQS.map((freq) => {
      const baseDb = spatialAverage.find((f) => f.freq === freq)?.db || 0;
      const jitter = (Math.random() - 0.5) * 3.5;
      return {
        freq,
        db: Math.round((baseDb + jitter) * 10) / 10,
      };
    });

    const newSweep: SweepPoint = {
      id: `sw-${Date.now()}`,
      label: newLabel || `Position #${sweeps.length + 1}`,
      date: new Date().toLocaleTimeString(),
      freqData: randomVariation,
    };

    const next = [...sweeps, newSweep];
    setSweeps(next);
    setNewLabel('');
  };

  const handleRemoveSweep = (id: string) => {
    setSweeps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleApplyToCalibration = () => {
    if (onAverageCalculated && spatialAverage.length > 0) {
      onAverageCalculated(spatialAverage);
    }
  };

  // SVG Render Dimensions
  const width = 680;
  const height = 220;
  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const xScale = d3.scaleLog().domain([20, 20000]).range([0, innerW]);
  const yScale = d3.scaleLinear().domain([-15, 15]).range([innerH, 0]);

  const lineGen = d3
    .line<{ freq: number; db: number }>()
    .x((d) => xScale(d.freq))
    .y((d) => yScale(d.db))
    .curve(d3.curveMonotoneX);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Multi-Point Spatial Measurement Averager
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                3 to 9 POINT MATRIX
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Combines room sweeps across listening position offsets to eliminate single-microphone spot nulls
            </p>
          </div>
        </div>

        <button
          onClick={handleApplyToCalibration}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Apply Spatial Average to AI Suite</span>
        </button>
      </div>

      {/* SVG Frequency Response Overlay Chart */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            Individual Mic Positions vs. Calculated Spatial Power Average
          </span>
          <div className="flex items-center gap-4 text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-0.5 bg-slate-600 inline-block"></span>
              <span>Position Sweeps</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-3.5 h-1 bg-emerald-400 rounded inline-block"></span>
              <span>Composite Average</span>
            </div>
          </div>
        </div>

        <svg className="w-full h-52 block" viewBox={`0 0 ${width} ${height}`}>
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Grid */}
            {[-10, -5, 0, 5, 10].map((val) => (
              <g key={val}>
                <line
                  x1={0}
                  y1={yScale(val)}
                  x2={innerW}
                  y2={yScale(val)}
                  stroke={val === 0 ? '#475569' : '#1e293b'}
                  strokeDasharray={val === 0 ? '4 4' : '2 4'}
                />
                <text x={-6} y={yScale(val) + 3} textAnchor="end" fill="#64748b" fontSize="9">
                  {val > 0 ? `+${val}` : `${val}`}
                </text>
              </g>
            ))}

            {/* Individual Sweep Lines */}
            {sweeps.map((sw, i) => {
              const pathStr = lineGen(sw.freqData) || '';
              return (
                <path
                  key={sw.id}
                  d={pathStr}
                  fill="none"
                  stroke={`hsl(${210 + i * 25}, 60%, 50%)`}
                  strokeWidth="1.5"
                  strokeOpacity="0.45"
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* Composite Spatial Average Line */}
            {spatialAverage.length > 0 && (
              <path
                d={lineGen(spatialAverage) || ''}
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>
        </svg>
      </div>

      {/* Sweep Management Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white">Stored Room Position Sweeps ({sweeps.length}/9)</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="New Mic Position Label..."
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 w-56"
            />
            <button
              onClick={handleAddSimulatedSweep}
              disabled={sweeps.length >= 9}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Record Sweep Slot</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {sweeps.map((sw, i) => (
            <div key={sw.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 block uppercase">Position #{i + 1}</span>
                  <span className="text-xs font-bold text-white leading-tight block">{sw.label}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{sw.date}</span>
                </div>
                {sweeps.length > 1 && (
                  <button
                    onClick={() => handleRemoveSweep(sw.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                    title="Remove sweep"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-[10px] text-slate-400 font-mono bg-slate-900/60 p-2 rounded-lg flex justify-between">
                <span>62Hz: <strong className="text-amber-400">{sw.freqData.find((f) => f.freq === 62)?.db}dB</strong></span>
                <span>1kHz: <strong className="text-indigo-400">{sw.freqData.find((f) => f.freq === 1000)?.db}dB</strong></span>
                <span>8kHz: <strong className="text-emerald-400">{sw.freqData.find((f) => f.freq === 8000)?.db}dB</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

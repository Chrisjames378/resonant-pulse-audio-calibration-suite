import React, { useState, useMemo } from 'react';
import { Compass, Sparkles, Sliders, RotateCcw, Download, Upload, CheckCircle2, Layers } from 'lucide-react';

export interface TargetCurvePoint {
  freq: number;
  gain: number; // dB offset relative to flat
}

export interface PresetTargetCurve {
  id: string;
  name: string;
  description: string;
  curve: TargetCurvePoint[];
}

export const PRESET_TARGET_CURVES: PresetTargetCurve[] = [
  {
    id: 'flat',
    name: 'Flat Reference (0 dB)',
    description: 'An uncompromisingly ruler-flat frequency response. Standard for high-end mastering suites.',
    curve: [
      { freq: 20, gain: 0 },
      { freq: 100, gain: 0 },
      { freq: 1000, gain: 0 },
      { freq: 10000, gain: 0 },
      { freq: 20000, gain: 0 }
    ]
  },
  {
    id: 'harman_in_ear',
    name: 'Harman Target Curve',
    description: 'Industry-standard consumer preference curve with +4dB sub-bass boost and smooth high-frequency roll-off.',
    curve: [
      { freq: 20, gain: 5.5 },
      { freq: 60, gain: 4.8 },
      { freq: 150, gain: 2.0 },
      { freq: 500, gain: 0 },
      { freq: 1000, gain: 0 },
      { freq: 3000, gain: 2.5 },
      { freq: 8000, gain: -1.0 },
      { freq: 20000, gain: -3.5 }
    ]
  },
  {
    id: 'dirac_live',
    name: 'Dirac Live Gentle Tilt',
    description: '+3dB bass lift transitioning to a soft -2dB high-end slope to prevent listening fatigue.',
    curve: [
      { freq: 20, gain: 3.5 },
      { freq: 80, gain: 2.5 },
      { freq: 250, gain: 1.0 },
      { freq: 1000, gain: 0 },
      { freq: 4000, gain: -0.8 },
      { freq: 10000, gain: -1.8 },
      { freq: 20000, gain: -3.0 }
    ]
  },
  {
    id: 'cinema_x_curve',
    name: 'ISO 2969 Cinema X-Curve',
    description: 'SMPTE standard for theatrical dubbing stages and large dub rooms with high-frequency roll-off.',
    curve: [
      { freq: 20, gain: 0 },
      { freq: 1000, gain: 0 },
      { freq: 2000, gain: -1.5 },
      { freq: 4000, gain: -3.0 },
      { freq: 8000, gain: -6.0 },
      { freq: 16000, gain: -10.0 },
      { freq: 20000, gain: -12.0 }
    ]
  },
  {
    id: 'vocal_clarity',
    name: 'Broadcaster & Speech Clarity',
    description: 'Sub-bass tilt cut (-6dB < 60Hz) with +2dB mid-range presence boost (1.5kHz - 4kHz) for podcasting and vocal isolation.',
    curve: [
      { freq: 20, gain: -6.0 },
      { freq: 60, gain: -3.0 },
      { freq: 200, gain: 0 },
      { freq: 2000, gain: 2.2 },
      { freq: 4000, gain: 2.5 },
      { freq: 10000, gain: 0 },
      { freq: 20000, gain: -2.0 }
    ]
  }
];

interface TargetCurveStudioProps {
  activeCurve: TargetCurvePoint[];
  onCurveChange: (newCurve: TargetCurvePoint[]) => void;
  onApplyTargetToEQ: (targetCurve: TargetCurvePoint[]) => void;
}

export const TargetCurveStudio: React.FC<TargetCurveStudioProps> = ({
  activeCurve,
  onCurveChange,
  onApplyTargetToEQ,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('harman_in_ear');
  const [customPoints, setCustomPoints] = useState<TargetCurvePoint[]>(
    PRESET_TARGET_CURVES.find(c => c.id === 'harman_in_ear')?.curve || activeCurve
  );
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  const handleSelectPreset = (preset: PresetTargetCurve) => {
    setSelectedPresetId(preset.id);
    setCustomPoints(preset.curve);
    onCurveChange(preset.curve);
  };

  const handlePointGainChange = (index: number, newGain: number) => {
    const updated = [...customPoints];
    updated[index] = { ...updated[index], gain: Math.max(-12, Math.min(12, newGain)) };
    setCustomPoints(updated);
    setSelectedPresetId('custom');
    onCurveChange(updated);
  };

  const handleApplyToMatrix = () => {
    onApplyTargetToEQ(customPoints);
    setAppliedNotification('Target Curve successfully merged into EQ Matrix!');
    setTimeout(() => setAppliedNotification(null), 3500);
  };

  // SVG SVG Plot width & height
  const width = 680;
  const height = 220;

  // Logarithmic frequency conversion helper
  const freqToX = (freq: number) => {
    const minF = Math.log10(20);
    const maxF = Math.log10(20000);
    const logF = Math.log10(Math.max(20, Math.min(20000, freq)));
    return ((logF - minF) / (maxF - minF)) * (width - 40) + 20;
  };

  // Gain to Y conversion (+12dB to -12dB)
  const gainToY = (gainDb: number) => {
    const minY = -12;
    const maxY = 12;
    const clamped = Math.max(minY, Math.min(maxY, gainDb));
    return height / 2 - (clamped / 12) * (height / 2 - 20);
  };

  const curvePathD = useMemo(() => {
    if (!customPoints || customPoints.length === 0) return '';
    const sorted = [...customPoints].sort((a, b) => a.freq - b.freq);
    return sorted.reduce((acc, pt, idx) => {
      const x = freqToX(pt.freq);
      const y = gainToY(pt.gain);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [customPoints]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              Target Curve Studio
              <span className="text-xs font-normal px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                Acoustic House Curves
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Customize or select professional acoustic house curves (Harman, Dirac Live, ISO 2969 X-Curve) to shape correction target.
            </p>
          </div>
        </div>

        <button
          onClick={handleApplyToMatrix}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg text-xs font-semibold shadow-lg transition-all"
        >
          <Sparkles className="w-4 h-4 text-indigo-200" />
          Apply Target to Correction Matrix
        </button>
      </div>

      {appliedNotification && (
        <div className="mt-3 p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-lg flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {appliedNotification}
        </div>
      )}

      {/* Preset Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 my-4">
        {PRESET_TARGET_CURVES.map((preset) => {
          const isSelected = selectedPresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`text-left p-3 rounded-lg border text-xs transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                  : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="font-semibold text-sm text-slate-100 flex items-center justify-between">
                  {preset.name}
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{preset.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Visualizer Plot */}
      <div className="relative bg-slate-950 border border-slate-800 rounded-lg p-3 my-4 overflow-hidden">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 px-2">
          <span>Target Response Curve (+12 dB to -12 dB)</span>
          <span className="font-mono text-indigo-400">Logarithmic Scale: 20 Hz – 20 kHz</span>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44">
          {/* Grid lines */}
          <line x1="20" y1={gainToY(0)} x2={width - 20} y2={gainToY(0)} stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
          <line x1="20" y1={gainToY(6)} x2={width - 20} y2={gainToY(6)} stroke="#1e293b" strokeDasharray="2 2" strokeWidth="1" />
          <line x1="20" y1={gainToY(-6)} x2={width - 20} y2={gainToY(-6)} stroke="#1e293b" strokeDasharray="2 2" strokeWidth="1" />

          {/* Freq markers */}
          {[100, 1000, 10000].map((f) => (
            <g key={f}>
              <line x1={freqToX(f)} y1="10" x2={freqToX(f)} y2={height - 10} stroke="#1e293b" strokeDasharray="2 2" />
              <text x={freqToX(f)} y={height - 2} fill="#64748b" fontSize="9" textAnchor="middle">
                {f >= 1000 ? `${f / 1000}k` : f}Hz
              </text>
            </g>
          ))}

          {/* Curve Path */}
          <path d={curvePathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />

          {/* Control handles */}
          {customPoints.map((pt, i) => (
            <circle
              key={i}
              cx={freqToX(pt.freq)}
              cy={gainToY(pt.gain)}
              r="4.5"
              fill="#818cf8"
              stroke="#1e1b4b"
              strokeWidth="2"
              className="cursor-pointer hover:r-6 transition-all"
            />
          ))}
        </svg>
      </div>

      {/* Manual Spline Point Controls */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
        <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
          <span>Target Curve Spline Nodes</span>
          <span className="text-[10px] text-slate-400">Adjust individual band targets in dB</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {customPoints.map((pt, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-700/60 rounded p-2 text-center">
              <div className="text-[10px] font-mono text-slate-400">
                {pt.freq >= 1000 ? `${(pt.freq / 1000).toFixed(1)}k` : pt.freq}Hz
              </div>
              <div className="text-xs font-bold text-indigo-300 my-1 font-mono">
                {pt.gain > 0 ? `+${pt.gain.toFixed(1)}` : pt.gain.toFixed(1)} dB
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={pt.gain}
                onChange={(e) => handlePointGainChange(idx, parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-slate-700 rounded cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

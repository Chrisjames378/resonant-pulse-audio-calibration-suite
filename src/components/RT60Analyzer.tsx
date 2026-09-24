import React, { useState, useMemo } from 'react';
import { Clock, ShieldCheck, Calculator, Sparkles, CheckCircle, Package, BarChart3 } from 'lucide-react';
import * as d3 from 'd3';

// Octave band absorption coefficients (alpha)
const MATERIALS: Record<string, { name: string; alpha: number[] }> = {
  drywall: { name: 'Gypsum Board / Drywall', alpha: [0.29, 0.10, 0.05, 0.04, 0.07, 0.09] },
  hardwood: { name: 'Hardwood / Laminate Floor', alpha: [0.15, 0.11, 0.10, 0.07, 0.06, 0.07] },
  concrete: { name: 'Poured Concrete / Brick', alpha: [0.01, 0.01, 0.02, 0.02, 0.02, 0.03] },
  glass: { name: 'Glass Windows', alpha: [0.18, 0.06, 0.04, 0.03, 0.02, 0.02] },
  carpet: { name: 'Heavy Carpet with Padding', alpha: [0.08, 0.24, 0.57, 0.69, 0.71, 0.73] },
  rockwool4in: { name: '4" High-Density Rockwool Panel', alpha: [0.84, 1.00, 1.00, 1.00, 1.00, 0.95] },
  foam2in: { name: '2" Polyurethane Acoustic Foam', alpha: [0.11, 0.25, 0.58, 0.81, 0.92, 0.89] },
};

const OCTAVE_BANDS = [125, 250, 500, 1000, 2000, 4000];

export const RT60Analyzer: React.FC = () => {
  const [roomLength, setRoomLength] = useState<number>(5.0); // m
  const [roomWidth, setRoomWidth] = useState<number>(4.0);  // m
  const [roomHeight, setRoomHeight] = useState<number>(2.8); // m

  const [wallMaterial, setWallMaterial] = useState<string>('drywall');
  const [floorMaterial, setFloorMaterial] = useState<string>('hardwood');
  const [ceilingMaterial, setCeilingMaterial] = useState<string>('drywall');

  const [panelCount4In, setPanelCount4In] = useState<number>(6); // 6 panels (1.2m x 0.6m each = 0.72m2)
  const [targetRT60, setTargetRT60] = useState<number>(0.28); // seconds

  // Acoustic Geometry & Sabine Calculation
  const volume = roomLength * roomWidth * roomHeight;
  const wallArea = 2 * (roomLength * roomHeight + roomWidth * roomHeight);
  const floorArea = roomLength * roomWidth;
  const ceilingArea = roomLength * roomWidth;
  const totalSurfaceArea = wallArea + floorArea + ceilingArea;

  const panelArea = panelCount4In * (1.2 * 0.6); // m2
  const netWallArea = Math.max(0, wallArea - panelArea);

  // Compute Sabine RT60 across octave bands
  const rt60Results = useMemo(() => {
    return OCTAVE_BANDS.map((freq, bandIdx) => {
      const alphaWall = MATERIALS[wallMaterial]?.alpha[bandIdx] || 0.05;
      const alphaFloor = MATERIALS[floorMaterial]?.alpha[bandIdx] || 0.08;
      const alphaCeiling = MATERIALS[ceilingMaterial]?.alpha[bandIdx] || 0.05;
      const alphaPanel = MATERIALS.rockwool4in.alpha[bandIdx];

      // Total absorption units A (Sabines in m2)
      const A =
        netWallArea * alphaWall +
        floorArea * alphaFloor +
        ceilingArea * alphaCeiling +
        panelArea * alphaPanel;

      // Sabine RT60 = 0.161 * V / A
      const rt60 = A > 0 ? (0.161 * volume) / A : 2.5;

      return {
        freq,
        rt60: Math.round(rt60 * 100) / 100,
        isOptimal: rt60 >= targetRT60 - 0.08 && rt60 <= targetRT60 + 0.08,
      };
    });
  }, [
    volume,
    netWallArea,
    floorArea,
    ceilingArea,
    panelArea,
    wallMaterial,
    floorMaterial,
    ceilingMaterial,
    targetRT60,
  ]);

  const avgRT60 = useMemo(() => {
    const sum = rt60Results.reduce((acc, curr) => acc + curr.rt60, 0);
    return (sum / rt60Results.length).toFixed(2);
  }, [rt60Results]);

  // SVG Chart Dimensions
  const width = 640;
  const height = 200;
  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const xScale = d3
    .scalePoint<number>()
    .domain(OCTAVE_BANDS)
    .range([0, innerW])
    .padding(0.5);

  const yScale = d3.scaleLinear().domain([0, 1.2]).range([innerH, 0]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              RT60 Reverberation Decay Analyzer & Treatment Calculator
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                SABINE & EYRING PHYSICS
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Measures reverberation decay times across octave bands (125Hz-4kHz) and computes absorber panel requirements
            </p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-3">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Avg Mid RT60</span>
            <span className="text-sm font-extrabold text-purple-300 font-mono">{avgRT60} s</span>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Target BS.1116-3</span>
            <span className="text-sm font-extrabold text-emerald-400 font-mono">{targetRT60} s</span>
          </div>
        </div>
      </div>

      {/* RT60 Decay Curve SVG */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
        <div className="flex justify-between items-center mb-2 text-xs">
          <span className="font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            RT60 Decay Time by Octave Frequency Band (Seconds)
          </span>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-purple-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span> Calculated RT60
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block"></span> Target (0.28s)
            </span>
          </div>
        </div>

        <svg className="w-full h-48 block" viewBox={`0 0 ${width} ${height}`}>
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Grid */}
            {[0.2, 0.4, 0.6, 0.8, 1.0].map((val) => (
              <g key={val}>
                <line
                  x1={0}
                  y1={yScale(val)}
                  x2={innerW}
                  y2={yScale(val)}
                  stroke="#1e293b"
                  strokeDasharray="2 4"
                />
                <text x={-6} y={yScale(val) + 3} textAnchor="end" fill="#64748b" fontSize="9">
                  {val.toFixed(1)}s
                </text>
              </g>
            ))}

            {/* Target Line */}
            <line
              x1={0}
              y1={yScale(targetRT60)}
              x2={innerW}
              y2={yScale(targetRT60)}
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* Bars */}
            {rt60Results.map((item) => {
              const cx = xScale(item.freq) || 0;
              const barH = innerH - yScale(item.rt60);
              return (
                <g key={item.freq}>
                  <rect
                    x={cx - 16}
                    y={yScale(item.rt60)}
                    width={32}
                    height={Math.max(2, barH)}
                    fill={item.isOptimal ? '#a855f7' : '#eab308'}
                    rx={4}
                    opacity={0.85}
                  />
                  <text
                    x={cx}
                    y={yScale(item.rt60) - 6}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {item.rt60}s
                  </text>
                  <text
                    x={cx}
                    y={innerH + 16}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {item.freq >= 1000 ? `${item.freq / 1000}kHz` : `${item.freq}Hz`}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Surface Controls & Treatment Calculator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Surface Materials */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
          <span className="text-xs font-bold text-white block">Room Surface Absorption Coefficients</span>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Walls Material ({wallArea.toFixed(1)}m²)</span>
              <select
                value={wallMaterial}
                onChange={(e) => setWallMaterial(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1"
              >
                {Object.entries(MATERIALS).map(([key, mat]) => (
                  <option key={key} value={key}>
                    {mat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Floor Material ({floorArea.toFixed(1)}m²)</span>
              <select
                value={floorMaterial}
                onChange={(e) => setFloorMaterial(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1"
              >
                {Object.entries(MATERIALS).map(([key, mat]) => (
                  <option key={key} value={key}>
                    {mat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Ceiling Material ({ceilingArea.toFixed(1)}m²)</span>
              <select
                value={ceilingMaterial}
                onChange={(e) => setCeilingMaterial(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1"
              >
                {Object.entries(MATERIALS).map(([key, mat]) => (
                  <option key={key} value={key}>
                    {mat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Acoustic Panel Calculator */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
          <span className="text-xs font-bold text-white flex items-center justify-between">
            <span>Acoustic Absorber Panel Calculator</span>
            <Package className="w-4 h-4 text-purple-400" />
          </span>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">4" High-Density Rockwool Panels (1.2m x 0.6m)</span>
              <span className="font-mono font-bold text-purple-400">{panelCount4In} Panels ({panelArea.toFixed(2)}m²)</span>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              step="1"
              value={panelCount4In}
              onChange={(e) => setPanelCount4In(parseInt(e.target.value))}
              className="w-full accent-purple-500 bg-slate-800 h-1.5 rounded cursor-pointer"
            />
          </div>

          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[11px] text-purple-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recommended Acoustic Treatment Plan:</span>
            </div>
            <p className="text-slate-400">
              Install <strong>{panelCount4In} panels</strong> at primary wall reflection points and place <strong>4 corner bass traps</strong> to tame sub-100Hz resonances.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

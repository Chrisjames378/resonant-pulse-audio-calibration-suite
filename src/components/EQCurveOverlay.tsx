import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { EQBandConfiguration } from '../App';

interface EQCurveOverlayProps {
  eqMatrix: EQBandConfiguration[];
  onGainChange?: (index: number, newGain: number) => void;
  minGain?: number;
  maxGain?: number;
}

export const EQCurveOverlay: React.FC<EQCurveOverlayProps> = ({
  eqMatrix,
  onGainChange,
  minGain = -12,
  maxGain = 12,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 700,
    height: 176, // 44 * 4 = 176px (h-44)
  });

  // Track active dragging node index
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // Measure container size with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setDimensions({
            width: Math.max(100, entry.contentRect.width),
            height: Math.max(100, entry.contentRect.height),
          });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { width, height } = dimensions;
  const margin = { top: 16, right: 20, bottom: 24, left: 32 };
  const innerWidth = Math.max(10, width - margin.left - margin.right);
  const innerHeight = Math.max(10, height - margin.top - margin.bottom);

  // Logarithmic frequency scale (20Hz to 20,000Hz)
  const xScale = useMemo(() => {
    return d3.scaleLog().domain([20, 20000]).range([0, innerWidth]);
  }, [innerWidth]);

  // Linear gain scale (-12dB to +12dB)
  const yScale = useMemo(() => {
    return d3.scaleLinear().domain([minGain, maxGain]).range([innerHeight, 0]);
  }, [innerHeight, minGain, maxGain]);

  // Generate D3 Line & Area paths
  const { pathD, areaD, points } = useMemo(() => {
    if (!eqMatrix || eqMatrix.length === 0) {
      return { pathD: '', areaD: '', points: [] };
    }

    const pts = eqMatrix.map((band, idx) => ({
      index: idx,
      freq: band.freq,
      gain: band.gain,
      x: xScale(Math.max(20, Math.min(20000, band.freq))),
      y: yScale(band.gain),
    }));

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

    return {
      pathD: lineGen(pts) || '',
      areaD: areaGen(pts) || '',
      points: pts,
    };
  }, [eqMatrix, xScale, yScale]);

  const zeroY = yScale(0);
  const gridFreqs = [100, 1000, 10000];

  // Mouse interaction for dragging EQ nodes directly on the canvas
  const handleMouseDown = (index: number) => {
    setDraggingIndex(index);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingIndex === null || !onGainChange) return;
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - svgRect.top - margin.top;
    
    // Convert Y px back to dB gain
    const rawGain = yScale.invert(mouseY);
    const clampedGain = Math.round(Math.max(minGain, Math.min(maxGain, rawGain)) * 2) / 2; // step 0.5dB
    onGainChange(draggingIndex, clampedGain);
  };

  const handleMouseUp = () => {
    setDraggingIndex(null);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-auto select-none"
    >
      <svg
        className="w-full h-full block cursor-crosshair"
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <linearGradient id="eqAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.02" />
          </linearGradient>

          <filter id="d3Glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Reference dB Lines */}
          <line
            x1={0}
            y1={zeroY}
            x2={innerWidth}
            y2={zeroY}
            stroke="#64748b"
            strokeDasharray="3 3"
            strokeWidth="1.2"
            opacity="0.7"
          />
          <line
            x1={0}
            y1={yScale(6)}
            x2={innerWidth}
            y2={yScale(6)}
            stroke="#334155"
            strokeDasharray="2 4"
            strokeWidth="1"
            opacity="0.4"
          />
          <line
            x1={0}
            y1={yScale(-6)}
            x2={innerWidth}
            y2={yScale(-6)}
            stroke="#334155"
            strokeDasharray="2 4"
            strokeWidth="1"
            opacity="0.4"
          />

          {/* Grid Frequency Lines */}
          {gridFreqs.map((freq) => {
            const gx = xScale(freq);
            return (
              <g key={freq}>
                <line
                  x1={gx}
                  y1={0}
                  x2={gx}
                  y2={innerHeight}
                  stroke="#334155"
                  strokeDasharray="2 4"
                  strokeWidth="1"
                  opacity="0.3"
                />
                <text
                  x={gx}
                  y={innerHeight + 13}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="sans-serif"
                >
                  {freq >= 1000 ? `${freq / 1000}kHz` : `${freq}Hz`}
                </text>
              </g>
            );
          })}

          {/* Y-axis Labels */}
          <text x={-6} y={yScale(12) + 3} textAnchor="end" fill="#64748b" fontSize="8">
            +12dB
          </text>
          <text x={-6} y={zeroY + 3} textAnchor="end" fill="#38bdf8" fontSize="8" fontWeight="bold">
            0dB
          </text>
          <text x={-6} y={yScale(-12) + 3} textAnchor="end" fill="#64748b" fontSize="8">
            -12dB
          </text>

          {/* D3 Filled Area */}
          {areaD && <path d={areaD} fill="url(#eqAreaGrad)" />}

          {/* D3 EQ Curve Stroke */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#d3Glow)"
            />
          )}

          {/* Interactive D3 Node Points */}
          {points.map((pt) => {
            const isDragging = draggingIndex === pt.index;
            return (
              <g
                key={pt.index}
                className="group cursor-ns-resize"
                onMouseDown={() => handleMouseDown(pt.index)}
              >
                {/* Touch / Target halo */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isDragging ? 12 : 8}
                  fill="#38bdf8"
                  fillOpacity={isDragging ? 0.4 : 0.15}
                  className="transition-all duration-100 group-hover:r-10 group-hover:fill-opacity-30"
                />
                {/* Node Center */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isDragging ? 5 : 4}
                  fill={pt.gain > 0 ? '#34d399' : pt.gain < 0 ? '#fbbf24' : '#60a5fa'}
                  stroke="#020617"
                  strokeWidth="1.5"
                />

                {/* Always show value when dragging or hovering */}
                <g className={`transition-opacity duration-150 pointer-events-none ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <rect
                    x={pt.x - 22}
                    y={pt.y - 24}
                    width="44"
                    height="16"
                    rx="4"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text
                    x={pt.x}
                    y={pt.y - 13}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {pt.gain > 0 ? `+${pt.gain.toFixed(1)}` : pt.gain.toFixed(1)}dB
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

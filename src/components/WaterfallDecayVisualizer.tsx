import React, { useState, useEffect, useRef } from 'react';
import { Layers, RotateCcw, Activity, Play, Sparkles, BarChart3, Radio } from 'lucide-react';

export const WaterfallDecayVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [decayTimeMs, setDecayTimeMs] = useState<number>(300);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [highlightResonances, setHighlightResonances] = useState<boolean>(true);

  // Simulated frequency resonance peaks (room modal ringing frequencies)
  const modalPeaks = [38, 76, 114, 152, 220];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let timeOffset = 0;

    const render = () => {
      timeOffset += 0.02;
      const width = canvas.width;
      const height = canvas.height;

      // Clear background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      // Draw grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
      ctx.lineWidth = 1;

      // Frequency grid lines (20Hz, 100Hz, 1kHz, 10kHz)
      [0.1, 0.3, 0.6, 0.9].forEach((xRatio) => {
        ctx.beginPath();
        ctx.moveTo(xRatio * width, 0);
        ctx.lineTo(xRatio * width, height);
        ctx.stroke();
      });

      // Time slice count
      const slices = 25;
      const sliceHeightStep = (height * 0.65) / slices;

      // Render waterfall slices back-to-front
      for (let i = slices - 1; i >= 0; i--) {
        const timeMs = (i / slices) * decayTimeMs;
        const decayFactor = Math.exp(-timeMs / 120);
        const yOffset = height * 0.2 + i * sliceHeightStep;
        const perspectiveXOffset = (slices - i) * 2.5;

        ctx.beginPath();
        ctx.moveTo(perspectiveXOffset, yOffset);

        for (let x = 0; x < width - perspectiveXOffset * 2; x += 3) {
          const normX = x / (width - perspectiveXOffset * 2);
          const freqHz = 20 * Math.pow(1000, normX);

          // Base background decay curve
          let ampDb = -20 * normX + Math.sin(normX * 12 + timeOffset) * 2;

          // Add modal resonance spikes
          modalPeaks.forEach((peak) => {
            const widthHz = peak * 0.12;
            const dist = Math.abs(freqHz - peak);
            if (dist < widthHz) {
              const modalDecay = Math.exp(-timeMs / 250); // Modal ringing decays much slower!
              const spike = (1 - dist / widthHz) * 18 * modalDecay;
              ampDb += spike;
            }
          });

          const currentAmp = Math.max(0, ampDb * decayFactor);
          const drawY = yOffset - currentAmp * 2.2;

          ctx.lineTo(perspectiveXOffset + x, drawY);
        }

        ctx.lineTo(width - perspectiveXOffset, yOffset);

        // Gradient color based on decay time
        const hue = 220 - (i / slices) * 160; // Blue to Cyan to Magenta
        ctx.fillStyle = `hsla(${hue}, 85%, 45%, 0.15)`;
        ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${0.9 - (i / slices) * 0.5})`;
        ctx.lineWidth = i === 0 ? 2 : 1.2;

        ctx.fill();
        ctx.stroke();
      }

      // Render Modal Peak Callout Annotations
      if (highlightResonances) {
        modalPeaks.forEach((peak) => {
          const logMin = Math.log10(20);
          const logMax = Math.log10(20000);
          const normX = (Math.log10(peak) - logMin) / (logMax - logMin);
          const xPos = normX * width;

          ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(xPos, height * 0.15);
          ctx.lineTo(xPos, height * 0.85);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#ef4444';
          ctx.font = '10px monospace';
          ctx.fillText(`Mode: ${peak}Hz (Ringing)`, xPos - 30, height * 0.12);
        });
      }

      if (isSimulating) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [decayTimeMs, isSimulating, highlightResonances]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Waterfall Decay & Spectral Resonance Plot
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                3D Time-Frequency
              </span>
            </h3>
            <p className="text-sm text-slate-400">
              Visualize acoustic room decay, energy dissipation over time (0–500ms), and lingering modal ringing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setHighlightResonances(!highlightResonances)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
              highlightResonances
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Highlight Modal Resonances
          </button>
        </div>
      </div>

      {/* Waterfall Canvas Container */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
          <span>Frequency: 20Hz (Sub-Bass)</span>
          <span>100Hz</span>
          <span>1kHz</span>
          <span>20kHz (Treble)</span>
        </div>

        <canvas ref={canvasRef} width={800} height={320} className="w-full h-80 rounded-lg bg-slate-950" />

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <span>Time Decay Range:</span>
              <input
                type="range"
                min="100"
                max="600"
                step="50"
                value={decayTimeMs}
                onChange={(e) => setDecayTimeMs(parseInt(e.target.value))}
                className="accent-purple-500 h-1.5 w-32 cursor-pointer"
              />
              <span className="font-mono text-purple-400 font-bold">{decayTimeMs} ms</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Fast Fourier Transform (FFT 8192)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

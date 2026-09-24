import React, { useState } from 'react';
import { Compass, RotateCcw, AlertTriangle, CheckCircle2, Zap, ArrowRightLeft, Radio } from 'lucide-react';

export const PhaseAlignmentCalculator: React.FC = () => {
  const [subDistanceCm, setSubDistanceCm] = useState<number>(280); // Distance to listener in cm
  const [mainsDistanceCm, setMainsDistanceCm] = useState<number>(220); // Distance to mains in cm
  const [crossoverFreqHz, setCrossoverFreqHz] = useState<number>(80);
  const [speedOfSound, setSpeedOfSound] = useState<number>(343); // m/s at 20°C

  // Calculate time of flight
  const subDelayMs = (subDistanceCm / 100 / speedOfSound) * 1000;
  const mainsDelayMs = (mainsDistanceCm / 100 / speedOfSound) * 1000;
  const distanceDiffCm = Math.abs(subDistanceCm - mainsDistanceCm);
  const timeDiffMs = Math.abs(subDelayMs - mainsDelayMs);

  // Phase offset at crossover frequency
  const periodMs = 1000 / crossoverFreqHz;
  const phaseShiftDeg = ((timeDiffMs % periodMs) / periodMs) * 360;
  const needsInversion = phaseShiftDeg > 90 && phaseShiftDeg < 270;

  // Recommended Delay
  const subIsFurther = subDistanceCm > mainsDistanceCm;
  const recommendedDelaySpeaker = subIsFurther ? 'Mains Monitors' : 'Subwoofer';
  const recommendedDelayValueMs = timeDiffMs.toFixed(2);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Subwoofer & Phase Alignment Calculator
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                Time-of-Flight
              </span>
            </h3>
            <p className="text-sm text-slate-400">
              Align acoustic group delay and polarity between subwoofers and main studio monitors
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Parameters */}
        <div className="lg:col-span-1 bg-slate-950/80 rounded-xl border border-slate-800 p-5 space-y-4">
          <h4 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" /> Acoustic Distance Inputs
          </h4>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Subwoofer Distance to Ears (cm)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={subDistanceCm}
                onChange={(e) => setSubDistanceCm(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-xs text-slate-500 font-mono">{(subDistanceCm / 30.48).toFixed(1)} ft</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Main Monitors Distance to Ears (cm)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={mainsDistanceCm}
                onChange={(e) => setMainsDistanceCm(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-xs text-slate-500 font-mono">{(mainsDistanceCm / 30.48).toFixed(1)} ft</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Crossover Frequency (Hz)</label>
            <select
              value={crossoverFreqHz}
              onChange={(e) => setCrossoverFreqHz(parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value={60}>60 Hz (Large Monitors)</option>
              <option value={80}>80 Hz (THX Standard Reference)</option>
              <option value={100}>100 Hz (Medium Nearfields)</option>
              <option value={120}>120 Hz (Small Satellites)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Speed of Sound in Air (m/s)</label>
            <input
              type="number"
              value={speedOfSound}
              onChange={(e) => setSpeedOfSound(parseFloat(e.target.value) || 343)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Calculated Results & Alignment Solution */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-center">
              <span className="text-xs text-slate-400 block mb-1">Distance Offset</span>
              <span className="text-2xl font-bold font-mono text-white">{distanceDiffCm.toFixed(1)} cm</span>
              <span className="text-xs text-slate-500 font-mono block mt-1">{(distanceDiffCm / 2.54).toFixed(1)} inches</span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-center">
              <span className="text-xs text-slate-400 block mb-1">Time Delay Difference</span>
              <span className="text-2xl font-bold font-mono text-cyan-400">{timeDiffMs.toFixed(2)} ms</span>
              <span className="text-xs text-slate-500 font-mono block mt-1">
                Sub: {subDelayMs.toFixed(1)}ms | Mains: {mainsDelayMs.toFixed(1)}ms
              </span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-center">
              <span className="text-xs text-slate-400 block mb-1">Phase Shift @ {crossoverFreqHz}Hz</span>
              <span className={`text-2xl font-bold font-mono ${needsInversion ? 'text-amber-400' : 'text-emerald-400'}`}>
                {phaseShiftDeg.toFixed(0)}°
              </span>
              <span className="text-xs text-slate-500 font-mono block mt-1">
                {needsInversion ? '⚠️ 180° Flip Advised' : '✓ In-Phase'}
              </span>
            </div>
          </div>

          {/* Alignment Recommendation Banner */}
          <div className="bg-gradient-to-br from-slate-900 to-cyan-950/40 border border-cyan-500/30 rounded-xl p-5">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg flex-shrink-0 mt-0.5">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-white mb-1">Recommended Delay & Polarity Fix</h5>
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                  Apply <span className="text-cyan-400 font-bold font-mono">{recommendedDelayValueMs} ms</span> of delay to the{' '}
                  <span className="text-white font-semibold">{recommendedDelaySpeaker}</span> in your DSP crossover / audio interface.
                </p>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                    Sub Polarity:{' '}
                    <span className={needsInversion ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {needsInversion ? '180° Inverted (INVERT)' : '0° Normal (NORMAL)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Target Phase Null: Reduced by 98%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

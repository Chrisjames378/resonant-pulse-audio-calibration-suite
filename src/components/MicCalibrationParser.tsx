import React, { useState } from 'react';
import { Mic, Upload, CheckCircle2, FileText, AlertCircle, X, Sliders } from 'lucide-react';

export interface CalibrationPoint {
  freq: number;
  gainOffsetDb: number;
}

interface MicCalibrationParserProps {
  onCalibrationLoaded: (filename: string, points: CalibrationPoint[]) => void;
  activeMicName?: string;
}

export const PRESET_MICS = [
  {
    name: 'MiniDSP UMK-1 (Factory Calibrated)',
    file: 'umk1_default.cal',
    points: [
      { freq: 20, gainOffsetDb: -0.8 },
      { freq: 50, gainOffsetDb: -0.2 },
      { freq: 1000, gainOffsetDb: 0.0 },
      { freq: 10000, gainOffsetDb: +0.6 },
      { freq: 20000, gainOffsetDb: +1.8 }
    ]
  },
  {
    name: 'Behringer ECM8000 (Omni Measurement)',
    file: 'ecm8000.cal',
    points: [
      { freq: 20, gainOffsetDb: -1.2 },
      { freq: 100, gainOffsetDb: -0.3 },
      { freq: 1000, gainOffsetDb: 0.0 },
      { freq: 8000, gainOffsetDb: +1.5 },
      { freq: 20000, gainOffsetDb: +3.2 }
    ]
  },
  {
    name: 'Sonarworks SoundID Measurement Mic',
    file: 'sonarworks_xref.cal',
    points: [
      { freq: 20, gainOffsetDb: -0.4 },
      { freq: 500, gainOffsetDb: 0.0 },
      { freq: 1000, gainOffsetDb: 0.0 },
      { freq: 12000, gainOffsetDb: +0.5 },
      { freq: 20000, gainOffsetDb: +0.9 }
    ]
  }
];

export const MicCalibrationParser: React.FC<MicCalibrationParserProps> = ({
  onCalibrationLoaded,
  activeMicName = 'None (Generic Flat Response)'
}) => {
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [calPoints, setCalPoints] = useState<CalibrationPoint[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const parsedPoints: CalibrationPoint[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('*') || trimmed.startsWith('#')) continue;

          const parts = trimmed.split(/[\s,\t]+/);
          if (parts.length >= 2) {
            const freq = parseFloat(parts[0]);
            const gain = parseFloat(parts[1]);
            if (!isNaN(freq) && !isNaN(gain)) {
              parsedPoints.push({ freq, gainOffsetDb: gain });
            }
          }
        }

        if (parsedPoints.length === 0) {
          setErrorMsg('No valid frequency data found in .cal file. Format should be: "Freq(Hz) Gain(dB)"');
          return;
        }

        setCalPoints(parsedPoints);
        setLoadedFileName(file.name);
        setErrorMsg(null);
        onCalibrationLoaded(file.name, parsedPoints);
      } catch (err) {
        setErrorMsg('Failed to parse .cal file format.');
      }
    };
    reader.readAsText(file);
  };

  const selectPresetMic = (mic: typeof PRESET_MICS[0]) => {
    setCalPoints(mic.points);
    setLoadedFileName(mic.name);
    setErrorMsg(null);
    onCalibrationLoaded(mic.name, mic.points);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Measurement Microphone Calibration (.cal)
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                Hardware Compensation
              </span>
            </h3>
            <p className="text-sm text-slate-400">
              Upload factory calibration files to ensure 100% linear frequency sweep measurements
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* File Upload Drop Area */}
        <div className="bg-slate-950/80 border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center relative">
          <Upload className="w-10 h-10 text-amber-400 mb-3 animate-bounce" />
          <h4 className="text-sm font-semibold text-slate-200 mb-1">Upload .cal or .txt Calibration File</h4>
          <p className="text-xs text-slate-400 max-w-xs mb-4">
            Supports MiniDSP, Earthworks, Sonarworks, and REW formatted 90-degree / 0-degree calibration files.
          </p>

          <label className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg cursor-pointer transition-colors flex items-center gap-2">
            <FileText className="w-4 h-4" /> Browse Calibration File
            <input type="file" accept=".cal,.txt,.csv" onChange={handleFileUpload} className="hidden" />
          </label>

          {loadedFileName && (
            <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Active: {loadedFileName} ({calPoints.length} points)</span>
            </div>
          )}

          {errorMsg && (
            <div className="mt-3 flex items-center gap-2 text-rose-400 text-xs font-mono bg-rose-950/40 border border-rose-800 rounded-lg p-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Preset Mic Selector */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
            Or Select Industry Standard Microphone Profile
          </h4>

          {PRESET_MICS.map((mic, idx) => {
            const isSelected = loadedFileName === mic.name || activeMicName === mic.name;
            return (
              <button
                key={idx}
                onClick={() => selectPresetMic(mic)}
                className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500/80 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                <div>
                  <span className="text-xs font-bold block text-slate-100">{mic.name}</span>
                  <span className="text-[11px] text-slate-400 font-mono">{mic.file}</span>
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

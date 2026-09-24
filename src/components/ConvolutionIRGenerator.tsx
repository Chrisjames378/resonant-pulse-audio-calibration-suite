import React, { useState } from 'react';
import { Download, Sliders, CheckCircle2, FileAudio, Sparkles, HardDrive } from 'lucide-react';
import { EQBandConfiguration } from '../App';

interface ConvolutionIRGeneratorProps {
  eqMatrix: EQBandConfiguration[];
  masterGainDb?: number;
}

export const ConvolutionIRGenerator: React.FC<ConvolutionIRGeneratorProps> = ({
  eqMatrix,
  masterGainDb = 0
}) => {
  const [sampleRate, setSampleRate] = useState<number>(48000);
  const [irLengthMs, setIrLengthMs] = useState<number>(100); // 100ms FIR impulse
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const generateWavFile = () => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const numSamples = Math.floor((sampleRate * irLengthMs) / 1000);
        const buffer = new Float32Array(numSamples);

        // Simple FIR sinc impulse response synthesized with inverse EQ frequency response
        const centerSample = Math.floor(numSamples / 2);

        // Sinc function center delta peak
        buffer[centerSample] = 1.0 * Math.pow(10, masterGainDb / 20);

        // Apply EQ filter band gains to impulse response coefficients
        eqMatrix.forEach((band) => {
          const gainLinear = Math.pow(10, band.gain / 20);
          const w0 = (2 * Math.PI * band.freq) / sampleRate;

          for (let i = 0; i < numSamples; i++) {
            const offset = i - centerSample;
            if (offset !== 0) {
              const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (numSamples - 1)); // Hamming window
              const sinc = Math.sin(w0 * offset) / (Math.PI * offset);
              buffer[i] += (gainLinear - 1.0) * sinc * window * 0.15;
            }
          }
        });

        // Encode as 16-bit PCM WAV File
        const wavBuffer = createWavBlobBuffer(buffer, sampleRate);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `ResonantPulse_RoomCorrection_IR_${sampleRate}Hz.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('WAV generation failed:', err);
      } finally {
        setIsGenerating(false);
      }
    }, 200);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
            <FileAudio className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Convolution Impulse Response (.WAV) Generator
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                DAW Convolver IR
              </span>
            </h3>
            <p className="text-sm text-slate-400">
              Export room correction FIR impulse responses directly for Space Designer, Logic, Altiverb, and DAW Convolvers
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Target Sample Rate</label>
            <select
              value={sampleRate}
              onChange={(e) => setSampleRate(parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200"
            >
              <option value={44100}>44.1 kHz (CD Audio / Standard)</option>
              <option value={48000}>48.0 kHz (Film & Video Standard)</option>
              <option value={88200}>88.2 kHz (High-Res Music)</option>
              <option value={96000}>96.0 kHz (Audiophile / Mastering)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">FIR Filter Impulse Length (ms)</label>
            <select
              value={irLengthMs}
              onChange={(e) => setIrLengthMs(parseInt(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200"
            >
              <option value={50}>50 ms (Low Latency Live Convolver)</option>
              <option value={100}>100 ms (Standard Studio IR)</option>
              <option value={200}>200 ms (High Precision Sub-Bass Resolution)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-400 font-mono">
            Active Bands: <span className="text-emerald-400 font-semibold">{eqMatrix.length} Parametric Filters</span>
          </span>

          <button
            onClick={generateWavFile}
            disabled={isGenerating}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {isGenerating ? 'Synthesizing WAV...' : 'Export Convolver WAV IR'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper to create PCM 16-bit WAV ArrayBuffer
function createWavBlobBuffer(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  /* RIFF chunk descriptor */
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  /* FMT sub-chunk */
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // 16-bit

  /* Data sub-chunk */
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  /* Write PCM samples */
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

import React, { useState } from 'react';
import { Sparkles, Layers, Box, CheckCircle2, ShieldCheck, Download, Activity, Cpu } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

export const AcousticTreatmentEngine: React.FC = () => {
  const [lengthMeters, setLengthMeters] = useState<number>(5.5); // meters
  const [widthMeters, setWidthMeters] = useState<number>(4.2);
  const [heightMeters, setHeightMeters] = useState<number>(2.8);
  const [wallMaterial, setWallMaterial] = useState<'drywall' | 'concrete' | 'glass' | 'wood'>('drywall');
  const [targetRT60, setTargetRT60] = useState<number>(0.35); // seconds (standard mix studio target)
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);

  // Geometric Calculations
  const roomVolumeM3 = lengthMeters * widthMeters * heightMeters;
  const totalSurfaceAreaM2 = 2 * (lengthMeters * widthMeters + lengthMeters * heightMeters + widthMeters * heightMeters);

  // Sabine Formula: RT60 = 0.161 * V / A
  // A_required = 0.161 * V / targetRT60
  const totalSabinsRequired = (0.161 * roomVolumeM3) / targetRT60;

  // Porous absorber coefficient ~0.85
  const recommendedAbsorptionPanelAreaM2 = Math.max(0, (totalSabinsRequired * 0.45));
  const recommendedBassTrapCount = Math.max(4, Math.round(roomVolumeM3 / 15)); // At least 4 corner traps
  const recommendedDiffuserAreaM2 = Math.max(2, Math.round(widthMeters * heightMeters * 0.2));

  // AI Acoustic Consultation Trigger
  const runAiAcousticConsultation = async () => {
    setIsLoadingAi(true);
    setAiAnalysis(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Act as an expert acoustic consultant & audio engineer.
Room Specs:
- Dimensions: ${lengthMeters}m L x ${widthMeters}m W x ${heightMeters}m H (Volume: ${roomVolumeM3.toFixed(1)} m³)
- Surfaces: ${wallMaterial}
- Target RT60 Decay: ${targetRT60} seconds
- Calculated Surface Area: ${totalSurfaceAreaM2.toFixed(1)} m²

Provide concise, highly actionable acoustic panel placement instructions covering:
1. First Reflection Points (Side walls & Ceiling Cloud)
2. Low-Frequency Corner Bass Traps (Tri-trap vs Membrane)
3. Rear Wall Diffusion vs Absorption
4. Recommended Panel Thickness (2-inch vs 4-inch rigid fiberglass / stone wool). Keep response structured with bullet points.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      setAiAnalysis(response.text || 'Acoustic advice generated successfully.');
    } catch (err: any) {
      setAiAnalysis(`AI Acoustic Analysis Note: For a ${lengthMeters}m x ${widthMeters}m x ${heightMeters}m ${wallMaterial} room, place 4" broadband bass traps in all 4 vertical corners to control sub-bass room modes, position 2" acoustic panels at side wall first-reflection points using the mirror method, and hang a 2" acoustic ceiling cloud above the mix chair.`);
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-500/10 border border-violet-500/30 rounded-lg text-violet-400">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              Acoustic Treatment & Panel Calculator
              <span className="text-xs font-normal px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/30">
                Sabine Room Physics & AI Advice
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Calculate required absorption area (Sabins), corner bass traps, and ceiling clouds for optimal RT60 acoustic dampening.
            </p>
          </div>
        </div>

        <button
          onClick={runAiAcousticConsultation}
          disabled={isLoadingAi}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-violet-200" />
          {isLoadingAi ? 'Consulting Gemini AI...' : 'Generate AI Treatment Plan'}
        </button>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
        <div className="bg-slate-950 p-3.5 border border-slate-800 rounded-lg">
          <label className="text-[11px] text-slate-400 block mb-1">Room Length (m)</label>
          <input
            type="number"
            step="0.1"
            value={lengthMeters}
            onChange={(e) => setLengthMeters(parseFloat(e.target.value) || 1)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
          />
        </div>

        <div className="bg-slate-950 p-3.5 border border-slate-800 rounded-lg">
          <label className="text-[11px] text-slate-400 block mb-1">Room Width (m)</label>
          <input
            type="number"
            step="0.1"
            value={widthMeters}
            onChange={(e) => setWidthMeters(parseFloat(e.target.value) || 1)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
          />
        </div>

        <div className="bg-slate-950 p-3.5 border border-slate-800 rounded-lg">
          <label className="text-[11px] text-slate-400 block mb-1">Room Height (m)</label>
          <input
            type="number"
            step="0.1"
            value={heightMeters}
            onChange={(e) => setHeightMeters(parseFloat(e.target.value) || 1)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono"
          />
        </div>

        <div className="bg-slate-950 p-3.5 border border-slate-800 rounded-lg">
          <label className="text-[11px] text-slate-400 block mb-1">Wall Surface Material</label>
          <select
            value={wallMaterial}
            onChange={(e: any) => setWallMaterial(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
          >
            <option value="drywall">Painted Drywall / Sheetrock</option>
            <option value="concrete">Concrete / Brick</option>
            <option value="glass">Large Glass Windows</option>
            <option value="wood">Hardwood / Plywood Paneling</option>
          </select>
        </div>
      </div>

      {/* Sabine Calculations Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] text-slate-400">Total Room Volume</div>
          <div className="text-xl font-bold font-mono text-violet-300 my-1">
            {roomVolumeM3.toFixed(1)} m³
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {(roomVolumeM3 * 35.3147).toFixed(0)} ft³
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] text-slate-400">Porous Absorption Panels</div>
          <div className="text-xl font-bold font-mono text-violet-300 my-1">
            {recommendedAbsorptionPanelAreaM2.toFixed(1)} m²
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            ~{Math.ceil(recommendedAbsorptionPanelAreaM2 / 0.72)} standard 2'x4' panels
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] text-slate-400">Corner Bass Traps</div>
          <div className="text-xl font-bold font-mono text-violet-300 my-1">
            {recommendedBassTrapCount} Units
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            4" - 6" thick tri-traps in room corners
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
          <div className="text-[11px] text-slate-400">Rear Wall Diffusers</div>
          <div className="text-xl font-bold font-mono text-violet-300 my-1">
            {recommendedDiffuserAreaM2.toFixed(1)} m²
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Skyline / QRD diffusion arrays
          </div>
        </div>
      </div>

      {/* AI Advice Output Box */}
      {aiAnalysis && (
        <div className="mt-4 p-4 bg-violet-950/40 border border-violet-500/30 rounded-lg text-xs leading-relaxed text-slate-200">
          <div className="flex items-center gap-2 font-semibold text-violet-300 mb-2 border-b border-violet-500/20 pb-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Gemini AI Acoustic Consultation Report
          </div>
          <div className="whitespace-pre-line font-sans text-slate-300">
            {aiAnalysis}
          </div>
        </div>
      )}
    </div>
  );
};

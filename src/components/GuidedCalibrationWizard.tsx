import React, { useState } from 'react';
import { Compass, CheckCircle2, Play, Volume2, Mic, Activity, ShieldCheck, Download, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';

interface GuidedCalibrationWizardProps {
  onRunSweep: () => Promise<void>;
  onApplyAutoTrim: () => void;
  onExportProfiles: () => void;
}

export const GuidedCalibrationWizard: React.FC<GuidedCalibrationWizardProps> = ({
  onRunSweep,
  onApplyAutoTrim,
  onExportProfiles
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);
  const [micLevelOk, setMicLevelOk] = useState<boolean>(false);

  const steps = [
    { id: 1, title: 'Mic & Room Position', desc: 'Position measurement microphone at ear level' },
    { id: 2, title: 'Signal Level Check', desc: 'Verify pink noise test signal headroom' },
    { id: 3, title: 'Acoustic Sweep', desc: 'Execute 20Hz-20kHz logarithmic sweep' },
    { id: 4, title: 'Target & 0dB Auto-Trim', desc: 'Compute AI EQ & lock digital ceiling' },
    { id: 5, title: 'Export & Lock Calibration', desc: 'Export VST, Equalizer APO, and MiniDSP profiles' }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const executeSweepStep = async () => {
    setIsMeasuring(true);
    try {
      await onRunSweep();
      setMicLevelOk(true);
      handleNext();
    } catch (err) {
      console.error(err);
    } finally {
      setIsMeasuring(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-slate-100">
      <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            Guided Room Calibration Wizard
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
              Step {currentStep} of {steps.length}
            </span>
          </h3>
          <p className="text-sm text-slate-400">
            Automated step-by-step workflow for studio reference room tuning
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mb-8">
        {steps.map((step) => {
          const isDone = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          return (
            <div
              key={step.id}
              className={`p-3 rounded-lg border text-center transition-all ${
                isCurrent
                  ? 'bg-emerald-950/60 border-emerald-500 text-white font-bold'
                  : isDone
                  ? 'bg-slate-800/60 border-slate-700 text-emerald-400'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}
            >
              <span className="text-xs block font-mono">Step 0{step.id}</span>
              <span className="text-xs truncate block">{step.title}</span>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 min-h-[220px] flex flex-col justify-between">
        {currentStep === 1 && (
          <div className="space-y-3">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <Mic className="w-5 h-5 text-emerald-400" /> Step 1: Microphone Setup
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              Place your measurement microphone on a boom stand pointed vertically (90° orientation) at the primary mixing position at ear level (110cm–120cm from floor).
            </p>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 font-mono">
              Tip: Avoid hard reflective surfaces within 30cm of the mic capsule.
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-3">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-emerald-400" /> Step 2: Test Level Check
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              Ensure studio monitor volume is set to reference listening level (~75dB C-Weighted SPL at mix position).
            </p>
            <button
              onClick={() => setMicLevelOk(true)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white text-xs rounded-lg font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Confirm Signal Levels OK
            </button>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-3">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" /> Step 3: Run Acoustic Sweep
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              The system will play a 5-second logarithmic sine sweep (20Hz to 20,000Hz) and capture acoustic impulse response.
            </p>
            <button
              onClick={executeSweepStep}
              disabled={isMeasuring}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              {isMeasuring ? 'Capturing Sweep...' : 'Start Sweep Measurement'}
            </button>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-3">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Step 4: AI EQ Target & 0dB Auto-Trim
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              Apply 10-band parametric EQ inversion and enforce 0dB Master Output Gain trim to prevent digital clipping.
            </p>
            <button
              onClick={onApplyAutoTrim}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Apply 0dB Auto-Trim Protection
            </button>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-3">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-400" /> Step 5: Export Hardware & DAW Profiles
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your room calibration is complete! Export directly to Equalizer APO, MiniDSP, VST Convolver WAV, or PDF Audit Report.
            </p>
            <button
              onClick={onExportProfiles}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Open Exporter Panel
            </button>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 mt-4">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg disabled:opacity-40 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <button
            onClick={handleNext}
            disabled={currentStep === steps.length}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg font-semibold flex items-center gap-1"
          >
            Next Step <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

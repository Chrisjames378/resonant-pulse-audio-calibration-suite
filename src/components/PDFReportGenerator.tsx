import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { FileCheck, Download, Sparkles, Building, User, Calendar, FileText, ShieldCheck } from 'lucide-react';
import { EQMatrixItem } from './CalibrationExporter';

interface PDFReportGeneratorProps {
  eqMatrix?: EQMatrixItem[];
}

export const PDFReportGenerator: React.FC<PDFReportGeneratorProps> = ({ eqMatrix = [] }) => {
  const [studioName, setStudioName] = useState<string>('Skyline Mastering Studio');
  const [engineerName, setEngineerName] = useState<string>('Chris James, Lead Acoustic Engineer');
  const [clientName, setClientName] = useState<string>('Redwood Audio Productions');
  const [studioNotes, setStudioNotes] = useState<string>(
    'Sub-bass room mode peak detected at 62Hz (-4.5dB correction applied). Desk boundary reflection notch dip at 1kHz (+2.5dB boost applied). Recommended 4" Rockwool panel absorbers for side wall 1st reflection points.'
  );

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const generatePDFReport = () => {
    setIsGenerating(true);
    setSuccessMsg(null);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Colors
      const darkSlate = [15, 23, 42]; // #0f172a
      const cyanAccent = [6, 182, 212]; // #06b6d4
      const indigoAccent = [99, 102, 241]; // #6366f1
      const lightBg = [248, 250, 252]; // #f8fafc

      // 1. Header Banner
      doc.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.rect(0, 0, pageWidth, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('ACOUSTIC CALIBRATION & ROOM AUDIT REPORT', 14, 22);

      doc.setFontSize(9);
      doc.setTextColor(cyanAccent[0], cyanAccent[1], cyanAccent[2]);
      doc.text('POWERED BY RESONANT PULSE AUDIO SUITE • PRO CERTIFIED AUDIT', 14, 32);

      // 2. Metadata Grid
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Studio & Audit Metadata', 14, 52);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);

      doc.text(`Studio Facility: ${studioName}`, 14, 60);
      doc.text(`Certified Engineer: ${engineerName}`, 14, 66);
      doc.text(`Client / Project: ${clientName}`, 14, 72);
      doc.text(`Audit Date: ${new Date().toLocaleDateString()}`, 14, 78);

      // Box framing metadata
      doc.setDrawColor(226, 232, 240);
      doc.rect(12, 45, pageWidth - 24, 38);

      // 3. Room Acoustic Health & Notes
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text('Acoustic Telemetry & Diagnostic Summary', 14, 96);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);

      const splitNotes = doc.splitTextToSize(studioNotes, pageWidth - 32);
      doc.text(splitNotes, 16, 104);

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(12, 90, pageWidth - 24, 30 + splitNotes.length * 4, 'S');

      // 4. Inverse 10-Band EQ Calibration Matrix Table
      let currentY = 135 + splitNotes.length * 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      doc.text('Calibrated 10-Band Inverse EQ Correction Matrix', 14, currentY);

      currentY += 8;

      // Table Header
      doc.setFillColor(indigoAccent[0], indigoAccent[1], indigoAccent[2]);
      doc.rect(14, currentY, pageWidth - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text('Band #', 18, currentY + 5.5);
      doc.text('Frequency (Hz)', 50, currentY + 5.5);
      doc.text('Correction Gain (dB)', 105, currentY + 5.5);
      doc.text('Q Bandwidth Factor', 155, currentY + 5.5);

      currentY += 8;

      const matrixData = eqMatrix.length > 0 ? eqMatrix : [
        { freq: 31, gain: 3.5, q: 1.41 },
        { freq: 62, gain: -4.5, q: 1.41 },
        { freq: 125, gain: -1.0, q: 1.41 },
        { freq: 250, gain: 1.5, q: 1.41 },
        { freq: 500, gain: 0.5, q: 1.41 },
        { freq: 1000, gain: 2.5, q: 1.41 },
        { freq: 2000, gain: -1.0, q: 1.41 },
        { freq: 4000, gain: 1.8, q: 1.41 },
        { freq: 8000, gain: 0.5, q: 1.41 },
        { freq: 16000, gain: 3.0, q: 1.41 },
      ];

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      matrixData.forEach((item, idx) => {
        if (idx % 2 === 0) {
          doc.setFillColor(241, 245, 249);
          doc.rect(14, currentY, pageWidth - 28, 6, 'F');
        }

        const gainStr = item.gain >= 0 ? `+${item.gain.toFixed(1)} dB` : `${item.gain.toFixed(1)} dB`;

        doc.text(`Band ${idx + 1}`, 18, currentY + 4.5);
        doc.text(`${item.freq} Hz`, 50, currentY + 4.5);
        doc.text(gainStr, 105, currentY + 4.5);
        doc.text(`${(item.q || 1.41).toFixed(2)}`, 155, currentY + 4.5);

        currentY += 6;
      });

      // Footer Certificate
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Certified by Resonant Pulse Audio Calibration Suite. Confidential report prepared for client presentation.',
        14,
        285
      );

      doc.save(`${studioName.toLowerCase().replace(/\s+/g, '_')}_acoustic_audit_report.pdf`);
      setSuccessMsg('Acoustic Audit PDF Report generated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate PDF report: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Automated White-Label Acoustic Audit PDF Report Generator
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                PRO CONSULTANT BRANDED
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Generate branded studio calibration PDF reports with custom logo, telemetry graphs, and treatment plans
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metadata Form Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-amber-400" />
            Studio Facility Name
          </label>
          <input
            type="text"
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-amber-400" />
            Lead Acoustic Engineer
          </label>
          <input
            type="text"
            value={engineerName}
            onChange={(e) => setEngineerName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            Client / Organization Name
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-300 block">
          Acoustic Engineer Notes & Executive Diagnostic Summary
        </label>
        <textarea
          rows={3}
          value={studioNotes}
          onChange={(e) => setStudioNotes(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={generatePDFReport}
          disabled={isGenerating}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{isGenerating ? 'Generating Audit PDF...' : 'Download Certified PDF Audit Report'}</span>
        </button>
      </div>
    </div>
  );
};

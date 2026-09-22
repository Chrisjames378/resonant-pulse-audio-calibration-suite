import React, { useState, useRef } from 'react';
import { Mic, Square, FileAudio, Copy, Check, Sparkles, Loader2, Volume2, AlignLeft } from 'lucide-react';

interface AudioTranscriberProps {
  onTranscriptReceived?: (text: string) => void;
}

export const AudioTranscriber: React.FC<AudioTranscriberProps> = ({ onTranscriptReceived }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptText, setTranscriptText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    setError('');
    setTranscriptText('');
    setAudioBlob(null);
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (file) {
      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
      setTranscriptText('');
    }
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;
    setIsTranscribing(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Data,
            mimeType: audioBlob.type || 'audio/webm',
            prompt: 'Transcribe this acoustic notes recording accurately. Capture room dimensions, speaker equipment brands, acoustic treatment reflections, or frequency targets clearly.',
          }),
        });

        const data = await response.json();
        if (data.transcription) {
          setTranscriptText(data.transcription);
          if (onTranscriptReceived) {
            onTranscriptReceived(data.transcription);
          }
        } else if (data.error) {
          setError(data.error);
        } else {
          setError('Failed to receive transcription output.');
        }
        setIsTranscribing(false);
      };
    } catch (err: any) {
      setError(err.message || 'Error communicating with transcription service.');
      setIsTranscribing(false);
    }
  };

  const handleCopy = () => {
    if (transcriptText) {
      navigator.clipboard.writeText(transcriptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Microphone Audio Transcribe Assistant
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                gemini-3.5-transcribe
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Dictate room dimensions, microphone specs, listening observations, or equipment notes into text
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recording / Upload Column */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-purple-400" /> Audio Input Source
            </div>

            <div className="flex flex-col items-center justify-center py-4 bg-slate-900/60 rounded-xl border border-dashed border-slate-800">
              {isRecording ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 animate-ping absolute"></div>
                    <button
                      onClick={stopRecording}
                      className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg cursor-pointer z-10 transition-all"
                    >
                      <Square className="w-5 h-5 fill-current" />
                    </button>
                  </div>
                  <div className="text-xs font-mono font-bold text-red-400">
                    RECORDING: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <button
                    onClick={startRecording}
                    className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 cursor-pointer transition-all border border-purple-400/40"
                    title="Start Voice Recording"
                  >
                    <Mic className="w-6 h-6" />
                  </button>
                  <span className="text-xs text-slate-400 font-medium">Click to Record Voice Note</span>
                </div>
              )}
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-800 w-full"></div>
              <span className="bg-slate-950 px-2 text-[10px] text-slate-500 uppercase font-semibold absolute">OR</span>
            </div>

            <div>
              <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs text-slate-300 font-medium cursor-pointer transition-all">
                <FileAudio className="w-4 h-4 text-purple-400" />
                <span>Upload Audio File (.webm, .wav, .mp3)</span>
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {audioUrl && (
            <div className="space-y-2 pt-2 border-t border-slate-900">
              <audio src={audioUrl} controls className="w-full h-8" />
              <button
                onClick={handleTranscribe}
                disabled={isTranscribing}
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
                    <span>Transcribing with Gemini 3.5...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-purple-300" />
                    <span>Transcribe Audio with Gemini 3.5</span>
                  </>
                )}
              </button>
            </div>
          )}

          {error && <div className="text-[11px] text-red-400 bg-red-950/40 border border-red-900/50 p-2.5 rounded-xl">{error}</div>}
        </div>

        {/* Output Transcript Column */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-purple-400" /> Transcribed Text Output
            </span>
            {transcriptText && (
              <button
                onClick={handleCopy}
                className="text-[10px] flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>

          <div className="flex-1 bg-slate-900/50 rounded-xl p-3 border border-slate-800/80 min-h-[140px] max-h-[220px] overflow-y-auto font-sans text-xs leading-relaxed text-slate-200">
            {transcriptText ? (
              transcriptText
            ) : (
              <span className="text-slate-500 italic">
                Recorded or uploaded audio transcript will appear here automatically after processing with model gemini-3.5-transcribe...
              </span>
            )}
          </div>

          <div className="text-[10px] text-slate-500">
            Tip: Record notes like "Sub bass boost +3dB at 60Hz for room reflection compensation" and copy directly into custom presets.
          </div>
        </div>
      </div>
    </div>
  );
};

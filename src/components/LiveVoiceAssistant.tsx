import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, PhoneCall, PhoneOff, Radio, Sparkles, Volume2, Bot } from 'lucide-react';

export const LiveVoiceAssistant: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [transcriptions, setTranscriptions] = useState<Array<{ sender: 'user' | 'agent'; text: string }>>([]);
  const [error, setError] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const startLiveSession = async () => {
    setIsConnecting(true);
    setError('');

    try {
      // Setup audio contexts
      const inputAudioCtx = new AudioContext({ sampleRate: 16000 });
      const outputAudioCtx = new AudioContext({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputAudioCtx;
      outputAudioCtxRef.current = outputAudioCtx;
      nextStartTimeRef.current = outputAudioCtx.currentTime;

      // Connect WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setIsConnecting(false);
        setIsConnected(true);

        // Access microphone
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;

          const source = inputAudioCtx.createMediaStreamSource(stream);
          const processor = inputAudioCtx.createScriptProcessor(2048, 1, 1);
          processorRef.current = processor;

          source.connect(processor);
          processor.connect(inputAudioCtx.destination);

          processor.onaudioprocess = (e) => {
            if (isMuted || ws.readyState !== WebSocket.OPEN) return;
            const float32Data = e.inputBuffer.getChannelData(0);
            
            // Calculate audio visualizer level
            let sum = 0;
            for (let i = 0; i < float32Data.length; i++) {
              sum += Math.abs(float32Data[i]);
            }
            setAudioLevel(Math.min(100, Math.round((sum / float32Data.length) * 300)));

            // Convert Float32Array to 16-bit PCM Base64
            const pcm16 = new Int16Array(float32Data.length);
            for (let i = 0; i < float32Data.length; i++) {
              const s = Math.max(-1, Math.min(1, float32Data[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }

            const binary = String.fromCharCode(...new Uint8Array(pcm16.buffer));
            const base64Audio = btoa(binary);

            ws.send(JSON.stringify({ audio: base64Audio }));
          };
        } catch (micErr: any) {
          setError('Microphone access failed: ' + micErr.message);
          stopLiveSession();
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.error) {
            setError(msg.error);
            stopLiveSession();
            return;
          }

          if (msg.text) {
            setTranscriptions((prev) => [...prev, { sender: 'agent', text: msg.text }]);
          }

          if (msg.audio) {
            // Play back PCM 24kHz audio output chunk
            const binary = atob(msg.audio);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const int16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
              float32[i] = int16[i] / 32768.0;
            }

            const buffer = outputAudioCtx.createBuffer(1, float32.length, 24000);
            buffer.copyToChannel(float32, 0);

            const source = outputAudioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(outputAudioCtx.destination);

            const now = outputAudioCtx.currentTime;
            const startTime = Math.max(now, nextStartTimeRef.current);
            source.start(startTime);
            nextStartTimeRef.current = startTime + buffer.duration;
          }

          if (msg.interrupted) {
            nextStartTimeRef.current = outputAudioCtx.currentTime;
          }
        } catch (err) {
          console.warn('Live message parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('WebSocket live error:', err);
        setError('Live WebSocket connection error.');
        stopLiveSession();
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
      };
    } catch (err: any) {
      setError(err.message || 'Failed to start live session.');
      setIsConnecting(false);
    }
  };

  const stopLiveSession = () => {
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (_) {}
      processorRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      streamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      try {
        if (inputAudioCtxRef.current.state !== 'closed') {
          inputAudioCtxRef.current.close();
        }
      } catch (_) {}
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      try {
        if (outputAudioCtxRef.current.state !== 'closed') {
          outputAudioCtxRef.current.close();
        }
      } catch (_) {}
      outputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close();
        }
      } catch (_) {}
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setAudioLevel(0);
  };

  useEffect(() => {
    return () => stopLiveSession();
  }, []);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Talk with Acoustic AI Agent
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                gemini-3.8-live (Live API)
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Low-latency real-time voice conversation for studio monitor tuning & room treatment advice
            </p>
          </div>
        </div>

        <div>
          {isConnected ? (
            <button
              onClick={stopLiveSession}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Call</span>
            </button>
          ) : (
            <button
              onClick={startLiveSession}
              disabled={isConnecting}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{isConnecting ? 'Connecting...' : 'Start Voice Call'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Voice Status & Wave Visualizer */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
            isConnected
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}>
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              Zephyr Voice Assistant
              {isConnected && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              {isConnected
                ? 'Live 2-Way Audio Stream Active (24kHz PCM)'
                : 'Offline - Click Start Voice Call to begin real-time speech conversation'}
            </div>
          </div>
        </div>

        {isConnected && (
          <div className="flex items-center gap-3">
            {/* Audio Wave Bars */}
            <div className="flex items-center gap-1 h-8 px-3 py-1 bg-slate-900 rounded-lg border border-slate-800">
              {[0.4, 0.8, 0.5, 1.0, 0.6, 0.9, 0.3].map((factor, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-emerald-400 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(4, Math.min(28, audioLevel * factor))}px` }}
                ></div>
              ))}
            </div>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isMuted
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-4 h-4 text-amber-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        )}
      </div>

      {/* Voice Assistant Live Transcript Log */}
      {transcriptions.length > 0 && (
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Live Conversation Transcripts
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {transcriptions.map((t, idx) => (
              <div key={idx} className="text-xs p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200">
                <span className="font-bold text-emerald-400">Zephyr: </span>
                <span>{t.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="text-[11px] text-red-400 bg-red-950/40 border border-red-900/50 p-2.5 rounded-xl">{error}</div>}
    </div>
  );
};

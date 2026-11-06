"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Sparkles,
  Radio,
  Minimize2,
  Maximize2,
  Hand,
  AlertCircle,
  Database,
  CheckCircle2,
  Zap,
} from "lucide-react";
import {
  SarahLiveVoiceSession,
  CallStatus,
  LiveRetrievedRecord,
} from "../lib/live-audio-session";

import { SARA_VOICE_OPTIONS, SaraVoiceOption } from "../lib/sara-voice";

interface LiveVoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceName?: SaraVoiceOption;
  onVoiceChange?: (voice: SaraVoiceOption) => void;
  onRecordRetrieved?: (record: LiveRetrievedRecord) => void;
  onTurnExchange?: (
    userText: string,
    assistantText: string,
    record?: LiveRetrievedRecord | null
  ) => void;
}

const OWNER_QUICK_COMMANDS = [
  {
    label: "Executive Briefing",
    prompt: "Give me our live executive operations briefing and total company revenue.",
  },
  {
    label: "Jumbo Balloons Tiers",
    prompt: "Show me the product details and landing site volume pricing tiers for SKU GTI63689 Jumbo Latex Balloons.",
  },
  {
    label: "Open Receivables",
    prompt: "Check our open accounts receivable invoices and total unpaid balance.",
  },
  {
    label: "K500 Polo Stock",
    prompt: "Check our live warehouse stock and pricing on Port Authority K500 polos.",
  },
];

export const LiveVoiceCallModal: React.FC<LiveVoiceCallModalProps> = ({
  isOpen,
  onClose,
  voiceName = "Aoede",
  onVoiceChange,
  onRecordRetrieved,
  onTurnExchange,
}) => {
  const [callStatus, setCallStatus] = useState<CallStatus>("connecting");
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isSarahSpeaking, setIsSarahSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [userSpokenText, setUserSpokenText] = useState("");
  const [transcriptHistory, setTranscriptHistory] = useState<string[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExecutingTool, setIsExecutingTool] = useState(false);
  const [toolStatusLabel, setToolStatusLabel] = useState<string>("");
  const [retrievedRecord, setRetrievedRecord] = useState<LiveRetrievedRecord | null>(null);

  const sessionRef = useRef<SarahLiveVoiceSession | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const userFreqsRef = useRef<Uint8Array>(new Uint8Array(32));
  const sarahFreqsRef = useRef<Uint8Array>(new Uint8Array(32));
  const transcriptionBufferRef = useRef<string>("");
  const onTurnExchangeRef = useRef(onTurnExchange);
  const onRecordRetrievedRef = useRef(onRecordRetrieved);

  useEffect(() => {
    onTurnExchangeRef.current = onTurnExchange;
    onRecordRetrievedRef.current = onRecordRetrieved;
  }, [onTurnExchange, onRecordRetrieved]);

  // Start call when opened or when voiceName changes
  useEffect(() => {
    if (!isOpen) return;

    setCallStatus("connecting");
    setErrorMessage(null);
    setLiveTranscription("");
    setUserSpokenText("");
    setTranscriptHistory([]);
    setCallDuration(0);
    setIsMinimized(false);
    setIsExecutingTool(false);
    setToolStatusLabel("");
    setRetrievedRecord(null);
    transcriptionBufferRef.current = "";

    const session = new SarahLiveVoiceSession({
      voiceName,
      onStatusChange: (status) => {
        setCallStatus(status);
        if (status === "connected") {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }
      },
      onSarahSpeaking: (speaking) => {
        setIsSarahSpeaking(speaking);
      },
      onUserSpeaking: (speaking) => {
        setIsUserSpeaking(speaking);
      },
      onUserTranscription: (text) => {
        if (text && text.trim()) {
          setUserSpokenText(text.trim());
        }
      },
      onTranscription: (text, isFinal) => {
        if (isFinal) {
          if (transcriptionBufferRef.current.trim()) {
            setTranscriptHistory((prev) => [
              ...prev.slice(-4),
              transcriptionBufferRef.current.trim(),
            ]);
          }
          transcriptionBufferRef.current = "";
          setLiveTranscription("");
        } else {
          transcriptionBufferRef.current += text;
          setLiveTranscription(transcriptionBufferRef.current);
        }
      },
      onToolExecution: (executing, label) => {
        setIsExecutingTool(executing);
        if (label) setToolStatusLabel(label);
      },
      onDataRetrieved: (record) => {
        setRetrievedRecord(record);
        onRecordRetrievedRef.current?.(record);
      },
      onTurnExchange: (userText, assistantText, record) => {
        onTurnExchangeRef.current?.(userText, assistantText, record);
      },
      onError: (err) => {
        setErrorMessage(err);
      },
      onAudioFrequencies: (userFreqs, sarahFreqs) => {
        userFreqsRef.current = userFreqs;
        sarahFreqsRef.current = sarahFreqs;
      },
    });

    sessionRef.current = session;
    session.startCall();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      session.endCall();
      sessionRef.current = null;
    };
  }, [isOpen, voiceName]);

  // Audio Waveform Canvas Animation
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const barCount = 28;
    const barWidth = 4;
    const barGap = 4;
    let phase = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      phase += 0.04;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const totalWidth = barCount * barWidth + (barCount - 1) * barGap;
      const startX = (width - totalWidth) / 2;
      const centerY = height / 2;

      const userFreqs = userFreqsRef.current;
      const sarahFreqs = sarahFreqsRef.current;

      for (let i = 0; i < barCount; i++) {
        const x = startX + i * (barWidth + barGap);

        let rawMagnitude = 0;
        if (isSarahSpeaking && !isSpeakerMuted) {
          const freqIndex = Math.floor((i / barCount) * sarahFreqs.length);
          rawMagnitude = (sarahFreqs[freqIndex] || 0) / 255;
        } else if (isUserSpeaking && !isMicMuted) {
          const freqIndex = Math.floor((i / barCount) * userFreqs.length);
          rawMagnitude = (userFreqs[freqIndex] || 0) / 255;
        }

        const idleWave = Math.sin(phase + i * 0.25) * 0.15 + 0.18;
        const normalized = Math.max(
          0.1,
          rawMagnitude > 0.05 ? rawMagnitude * 0.95 : idleWave
        );
        const barHeight = Math.max(6, normalized * (height - 12));

        if (isSarahSpeaking) {
          const grad = ctx.createLinearGradient(
            0,
            centerY - barHeight / 2,
            0,
            centerY + barHeight / 2
          );
          grad.addColorStop(0, "#fbbf24");
          grad.addColorStop(0.5, "#f59e0b");
          grad.addColorStop(1, "#d97706");
          ctx.fillStyle = grad;
        } else if (isUserSpeaking) {
          const grad = ctx.createLinearGradient(
            0,
            centerY - barHeight / 2,
            0,
            centerY + barHeight / 2
          );
          grad.addColorStop(0, "#34d399");
          grad.addColorStop(0.5, "#10b981");
          grad.addColorStop(1, "#059669");
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
        }

        const radius = barWidth / 2;
        const top = centerY - barHeight / 2;
        ctx.beginPath();
        ctx.roundRect(x, top, barWidth, barHeight, radius);
        ctx.fill();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, isSarahSpeaking, isUserSpeaking, isMicMuted, isSpeakerMuted]);

  const handleToggleMic = () => {
    if (!sessionRef.current) return;
    const nextMuted = !isMicMuted;
    setIsMicMuted(nextMuted);
    sessionRef.current.setMicMuted(nextMuted);
  };

  const handleToggleSpeaker = () => {
    if (!sessionRef.current) return;
    const nextMuted = !isSpeakerMuted;
    setIsSpeakerMuted(nextMuted);
    sessionRef.current.setSpeakerMuted(nextMuted);
  };

  const handleInterrupt = () => {
    if (!sessionRef.current) return;
    sessionRef.current.interruptPlayback();
  };

  const handleSendVoiceCommand = (promptText: string) => {
    if (!sessionRef.current) return;
    sessionRef.current.interruptPlayback();
    setUserSpokenText(promptText);
    sessionRef.current.sendTextPrompt(promptText);
  };

  const handleEndCall = () => {
    if (sessionRef.current) {
      sessionRef.current.endCall();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    onClose();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  // Minimized Floating Pill Mode
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 rounded-full px-4 py-2.5 text-white">
          <div className="relative">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-400 bg-white p-0.5 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="GoldTouch"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
            {isSarahSpeaking && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <span>SARA Owner Line</span>
              <span className="text-[10px] font-mono text-slate-300 font-normal">
                {formatDuration(callDuration)}
              </span>
            </span>
            <span className="text-[10px] text-slate-300">
              {isExecutingTool
                ? "Pulling live records..."
                : isSarahSpeaking
                ? "Briefing Owner..."
                : isUserSpeaking
                ? "Listening to Owner..."
                : isMicMuted
                ? "Mic Muted"
                : "Executive Line Active"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-2 border-l border-slate-700 pl-2">
            <button
              onClick={handleToggleMic}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                isMicMuted
                  ? "bg-rose-500/20 text-rose-400"
                  : "hover:bg-slate-800 text-slate-300"
              }`}
              title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
              title="Expand call view"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleEndCall}
              className="p-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
              title="End Call"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full Floating Modal View
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      {/* Modal Card (Flat, border-only, no corner shadows) */}
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col text-white">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 z-10">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  SARA Executive Operations Line
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400/15 border border-amber-400/30 text-amber-300">
                  Owner Direct Access
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                GoldTouch Dealer Supply — Live Enterprise Data Retrieval
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Call Duration Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{formatDuration(callDuration)}</span>
            </div>

            {/* Minimize button */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Minimize call overlay"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Female Voice Persona Strip */}
        <div className="flex items-center justify-between gap-2 px-6 py-2 bg-slate-950/60 border-b border-slate-800/80 z-10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            SARA Voice Persona
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {SARA_VOICE_OPTIONS.map((v) => {
              const active = voiceName === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onVoiceChange?.(v.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer border ${
                    active
                      ? "bg-amber-400/20 border-amber-400/50 text-amber-300"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                  title={v.description}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Stage: Avatar & Reactive Audio Rings */}
        <div className="flex flex-col items-center justify-center px-6 pt-6 pb-3 relative z-10">
          <div className="relative flex items-center justify-center">
            {isSarahSpeaking && (
              <div className="absolute w-40 h-40 rounded-full border-2 border-amber-400/40 animate-ping pointer-events-none duration-1000" />
            )}

            <div
              className={`absolute w-32 h-32 rounded-full transition-all duration-300 ${
                isSarahSpeaking
                  ? "bg-amber-500/20 border border-amber-400/40 scale-110"
                  : isUserSpeaking
                  ? "bg-emerald-500/20 border border-emerald-400/40 scale-105"
                  : "bg-slate-800/50 scale-100"
              }`}
            />

            <div
              className={`relative w-24 h-24 rounded-full overflow-hidden border-2 transition-all duration-300 bg-white p-2 flex items-center justify-center ${
                isSarahSpeaking
                  ? "border-amber-400 ring-4 ring-amber-400/25"
                  : isUserSpeaking
                  ? "border-emerald-400 ring-4 ring-emerald-400/25"
                  : "border-slate-700"
              }`}
            >
              <img
                src="/logo.png"
                alt="GoldTouch Executive Assistant"
                className="w-full h-full object-contain object-center"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>

            <div className="absolute bottom-1 right-1">
              <span
                className={`flex h-4 w-4 rounded-full ring-2 ring-slate-900 ${
                  isMicMuted
                    ? "bg-rose-500"
                    : isSarahSpeaking
                    ? "bg-amber-400 animate-pulse"
                    : "bg-emerald-500"
                }`}
              />
            </div>
          </div>

          {/* Live Status Pill */}
          <div className="mt-4 flex items-center justify-center">
            {callStatus === "connecting" ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Connecting Owner Direct Line to SARA...</span>
              </div>
            ) : errorMessage ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            ) : isExecutingTool ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-semibold animate-pulse">
                <Database className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                <span>{toolStatusLabel || "Retrieving live GoldTouch records..."}</span>
              </div>
            ) : isMicMuted ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-medium">
                <MicOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Microphone Muted</span>
              </div>
            ) : isSarahSpeaking ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>SARA is briefing you...</span>
              </div>
            ) : isUserSpeaking ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <Mic className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                <span>Listening to Owner command...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium">
                <span>Ready for your command — Speak or tap a lookup below</span>
              </div>
            )}
          </div>

          {/* Live Waveform Canvas */}
          <div className="w-full h-14 mt-2 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={280}
              height={56}
              className="w-full max-w-[280px] h-14"
            />
          </div>
        </div>

        {/* Live Retrieved Enterprise Record Card (Shows when SARA pulls data from Supabase) */}
        {retrievedRecord && (
          <div className="mx-6 mb-3 px-4 py-3 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {retrievedRecord.category}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                  {retrievedRecord.status}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white truncate">
                {retrievedRecord.title}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {retrievedRecord.subtitle}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm sm:text-base font-extrabold text-emerald-400">
                {retrievedRecord.highlightValue}
              </span>
              <p className="text-[10px] text-slate-400">Live Supabase</p>
            </div>
          </div>
        )}

        {/* Live Subtitle Ticker */}
        <div className="px-6 py-2.5 min-h-[60px] max-h-24 overflow-y-auto flex flex-col items-center justify-center text-center border-t border-b border-slate-800 bg-slate-950/50">
          {liveTranscription ? (
            <p className="text-xs sm:text-sm text-amber-200 font-medium leading-relaxed">
              &ldquo;{liveTranscription}&rdquo;
            </p>
          ) : transcriptHistory.length > 0 ? (
            <p className="text-xs text-slate-300 font-normal leading-relaxed line-clamp-2">
              &ldquo;{transcriptHistory[transcriptHistory.length - 1]}&rdquo;
            </p>
          ) : userSpokenText ? (
            <p className="text-xs text-emerald-300 font-medium leading-relaxed">
              You asked: &ldquo;{userSpokenText}&rdquo;
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Ask SARA to pull up any GoldTouch order, today&apos;s revenue briefing, overdue dealership invoices, carrier shipments, or warehouse/apparel stock.
            </p>
          )}
        </div>

        {/* One-Tap Owner Voice Lookup Commands */}
        <div className="px-6 pt-3 pb-1 bg-slate-950/60">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Instant Owner Lookups (Speak or Tap)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {OWNER_QUICK_COMMANDS.map((cmd) => (
              <button
                key={cmd.label}
                type="button"
                onClick={() => handleSendVoiceCommand(cmd.prompt)}
                disabled={callStatus !== "connected"}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-[11px] font-semibold text-slate-200 hover:text-amber-300 transition-colors truncate cursor-pointer disabled:opacity-40"
                title={cmd.prompt}
              >
                {cmd.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="p-5 bg-slate-950/80 z-10 flex flex-col gap-2.5">
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            {/* Mute Mic Button */}
            <button
              onClick={handleToggleMic}
              className={`flex flex-col items-center gap-1.5 transition-all group cursor-pointer ${
                isMicMuted ? "text-rose-400" : "text-slate-300 hover:text-white"
              }`}
              title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isMicMuted
                    ? "bg-rose-500/20 border border-rose-500/40 text-rose-400"
                    : "bg-slate-800 border border-slate-700 group-hover:bg-slate-700"
                }`}
              >
                {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </div>
              <span className="text-[11px] font-medium tracking-tight">
                {isMicMuted ? "Unmute" : "Mute"}
              </span>
            </button>

            {/* Interrupt SARA Button */}
            <button
              onClick={handleInterrupt}
              disabled={!isSarahSpeaking}
              className={`flex flex-col items-center gap-1.5 transition-all group cursor-pointer ${
                isSarahSpeaking
                  ? "text-amber-300 hover:text-amber-200"
                  : "text-slate-600 opacity-40 cursor-not-allowed"
              }`}
              title="Interrupt SARA while she is speaking"
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isSarahSpeaking
                    ? "bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30"
                    : "bg-slate-800/40 border border-slate-800 text-slate-600"
                }`}
              >
                <Hand className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium tracking-tight">
                Interrupt
              </span>
            </button>

            {/* Mute Speaker Button */}
            <button
              onClick={handleToggleSpeaker}
              className={`flex flex-col items-center gap-1.5 transition-all group cursor-pointer ${
                isSpeakerMuted ? "text-amber-400" : "text-slate-300 hover:text-white"
              }`}
              title={isSpeakerMuted ? "Unmute Audio" : "Mute Audio"}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isSpeakerMuted
                    ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                    : "bg-slate-800 border border-slate-700 group-hover:bg-slate-700"
                }`}
              >
                {isSpeakerMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </div>
              <span className="text-[11px] font-medium tracking-tight">
                {isSpeakerMuted ? "Unmute Spk" : "Speaker"}
              </span>
            </button>

            {/* End Call Button */}
            <button
              onClick={handleEndCall}
              className="flex flex-col items-center gap-1.5 transition-all group text-rose-400 hover:text-rose-300 cursor-pointer"
              title="End Executive Voice Call"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-rose-600 hover:bg-rose-500 border border-rose-500 text-white transition-all">
                <PhoneOff className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-rose-400 tracking-tight">
                End Call
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

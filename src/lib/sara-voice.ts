"use client";

import { saraSound } from "./sara-sound";

export type SaraFemaleVoiceId =
  | "Aoede"
  | "Leda"
  | "Sulafat"
  | "Kore"
  | "Puck"
  | "Charon"
  | "Fenrir"
  | "Orus";

export type SaraVoiceOption = SaraFemaleVoiceId;

export const MALE_VOICE_IDS = new Set<string>(["Puck", "Charon", "Fenrir", "Orus"]);

export const SARA_VOICE_OPTIONS: Array<{
  id: SaraFemaleVoiceId;
  label: string;
  gender: "female" | "male";
  description: string;
}> = [
  // Female Studio Voices
  {
    id: "Aoede",
    label: "Aoede • Charming",
    gender: "female",
    description: "Warm, charming, natural executive female voice",
  },
  {
    id: "Leda",
    label: "Leda • Sweet",
    gender: "female",
    description: "Sweet, youthful, graceful professional female voice",
  },
  {
    id: "Sulafat",
    label: "Sulafat • Silky",
    gender: "female",
    description: "Smooth, velvet-toned luxury female voice",
  },
  {
    id: "Kore",
    label: "Kore • Crisp",
    gender: "female",
    description: "Bright, articulate executive female voice",
  },
  // Male Studio Voices
  {
    id: "Puck",
    label: "Puck • Conversational",
    gender: "male",
    description: "Warm, natural, friendly male operations voice",
  },
  {
    id: "Charon",
    label: "Charon • Deep",
    gender: "male",
    description: "Deep, composed, authoritative executive male voice",
  },
  {
    id: "Fenrir",
    label: "Fenrir • Confident",
    gender: "male",
    description: "Clear, resonant, confident professional male voice",
  },
  {
    id: "Orus",
    label: "Orus • Smooth",
    gender: "male",
    description: "Smooth, articulate corporate male voice",
  },
];

export interface SaraVoiceState {
  status: "idle" | "loading" | "speaking";
  activeMessageId: string | null;
}

type VoiceListener = (state: SaraVoiceState) => void;

class SaraVoiceEngine {
  private currentAudio: HTMLAudioElement | null = null;
  private abortController: AbortController | null = null;
  private state: SaraVoiceState = { status: "idle", activeMessageId: null };
  private listeners = new Set<VoiceListener>();
  private audioBlobUrlCache = new Map<string, string>();

  public subscribe(listener: VoiceListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): SaraVoiceState {
    return this.state;
  }

  private setState(next: SaraVoiceState) {
    this.state = next;
    this.listeners.forEach((fn) => {
      try {
        fn(this.state);
      } catch {}
    });
  }

  /**
   * Stops any active SARA speech playback or pending synthesis request.
   */
  public stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    if (this.state.status !== "idle" || this.state.activeMessageId !== null) {
      this.setState({ status: "idle", activeMessageId: null });
    }
  }

  /**
   * Toggle speaking for a specific message ID: stops if already active, otherwise speaks.
   */
  public async toggleSpeak(
    text: string,
    messageId: string,
    options?: { voice?: SaraFemaleVoiceId; rate?: number }
  ) {
    if (
      this.state.activeMessageId === messageId &&
      (this.state.status === "loading" || this.state.status === "speaking")
    ) {
      this.stop();
      return;
    }
    await this.speak(text, messageId, options);
  }

  /**
   * Speaks the given text in the selected studio female or male voice.
   */
  public async speak(
    text: string,
    messageId = "preview",
    options?: { voice?: SaraFemaleVoiceId; rate?: number }
  ): Promise<void> {
    if (typeof window === "undefined" || !text || !text.trim()) return;

    this.stop();
    // Silence typing clicks while speaking aloud
    saraSound.stopTypingLoop(false);
    this.setState({ status: "loading", activeMessageId: messageId });

    const voice: SaraFemaleVoiceId = options?.voice || "Aoede";
    const rate = options?.rate ? Math.max(0.85, Math.min(1.25, options.rate)) : 1.0;
    const cacheKey = `${voice}::${text.trim()}`;

    // Check client-side blob URL cache first for instant playback
    const cachedUrl = this.audioBlobUrlCache.get(cacheKey);
    if (cachedUrl) {
      try {
        await this.playAudioUrl(cachedUrl, messageId, rate);
        return;
      } catch {
        await this.speakBrowserVoiceFallback(text, messageId, rate, voice);
        return;
      }
    }

    const controller = new AbortController();
    this.abortController = controller;

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`TTS HTTP ${res.status}`);
      }

      const data = await res.json();
      if (controller.signal.aborted) return;

      if (data?.audioBase64) {
        const binaryString = window.atob(data.audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: data.mimeType || "audio/wav" });
        const objectUrl = URL.createObjectURL(blob);

        if (this.audioBlobUrlCache.size >= 25) {
          const oldestKey = this.audioBlobUrlCache.keys().next().value;
          if (oldestKey) {
            const oldUrl = this.audioBlobUrlCache.get(oldestKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            this.audioBlobUrlCache.delete(oldestKey);
          }
        }
        this.audioBlobUrlCache.set(cacheKey, objectUrl);

        await this.playAudioUrl(objectUrl, messageId, rate);
        return;
      }

      throw new Error("Empty audio payload");
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return;
      }
      // Graceful fallback to high-grade neural browser female or male voice
      await this.speakBrowserVoiceFallback(text, messageId, rate, voice);
    }
  }

  private playAudioUrl(
    url: string,
    messageId: string,
    rate: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.playbackRate = rate;
      this.currentAudio = audio;
      let startedPlaying = false;

      audio.onplay = () => {
        startedPlaying = true;
        saraSound.stopTypingLoop(false);
        this.setState({ status: "speaking", activeMessageId: messageId });
      };

      audio.onended = () => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
          this.setState({ status: "idle", activeMessageId: null });
        }
        resolve();
      };

      audio.onerror = () => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        if (!startedPlaying) {
          reject(new Error("Audio playback error"));
        } else {
          this.setState({ status: "idle", activeMessageId: null });
          resolve();
        }
      };

      audio.play().catch((err) => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        reject(err);
      });
    });
  }

  /**
   * High-definition neural female or male voice fallback via Web Speech API if offline
   */
  private speakBrowserVoiceFallback(
    rawText: string,
    messageId: string,
    rate: number,
    voiceId: SaraFemaleVoiceId
  ): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        this.setState({ status: "idle", activeMessageId: null });
        resolve();
        return;
      }

      try {
        window.speechSynthesis.cancel();

        const cleanText = rawText
          .replace(/!\[[^\]]*\]\([^\)]+\)/g, "")
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
          .replace(/https?:\/\/[^\s)]+/g, "")
          .replace(/\|[^\n]+\|/g, " ")
          .replace(/[#*`>_~]/g, "")
          .replace(/\bQty\.\s*/gi, "Quantity ")
          .replace(/\s{2,}/g, " ")
          .trim()
          .slice(0, 750);

        if (!cleanText) {
          this.setState({ status: "idle", activeMessageId: null });
          resolve();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voices = window.speechSynthesis.getVoices();
        const isMale = MALE_VOICE_IDS.has(voiceId);

        const preferredMalePatterns = [
          /Microsoft Guy Online \(Natural\)/i,
          /Microsoft Christopher Online \(Natural\)/i,
          /Microsoft Eric Online \(Natural\)/i,
          /Microsoft Roger Online \(Natural\)/i,
          /Microsoft Brian Online \(Natural\)/i,
          /Microsoft Steffan Online \(Natural\)/i,
          /Google UK English Male/i,
          /Daniel/i,
          /Alex/i,
          /Microsoft David/i,
          /Microsoft Mark/i,
          /Aaron/i,
          /Arthur/i,
          /\bMale\b/i,
        ];

        const preferredFemalePatterns = [
          /Microsoft Aria Online \(Natural\)/i,
          /Microsoft Jenny Online \(Natural\)/i,
          /Microsoft Sonia Online \(Natural\)/i,
          /Microsoft Libby Online \(Natural\)/i,
          /Microsoft Michelle Online \(Natural\)/i,
          /Microsoft Ana Online \(Natural\)/i,
          /Natural.*Female/i,
          /Aria/i,
          /Jenny/i,
          /Sonia/i,
          /Samantha/i,
          /Google UK English Female/i,
          /Google US English/i,
          /Victoria/i,
          /Karen/i,
          /Zira/i,
          /female/i,
        ];

        const patterns = isMale ? preferredMalePatterns : preferredFemalePatterns;

        let selectedVoice: SpeechSynthesisVoice | undefined;
        for (const pattern of patterns) {
          selectedVoice = voices.find(
            (v) => v.lang.toLowerCase().startsWith("en") && pattern.test(v.name)
          );
          if (selectedVoice) break;
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.pitch = isMale ? 0.96 : 1.06;
        utterance.rate = Math.max(0.92, Math.min(1.18, rate * 1.02));

        utterance.onstart = () => {
          saraSound.stopTypingLoop(false);
          this.setState({ status: "speaking", activeMessageId: messageId });
        };

        utterance.onend = () => {
          this.setState({ status: "idle", activeMessageId: null });
          resolve();
        };

        utterance.onerror = () => {
          this.setState({ status: "idle", activeMessageId: null });
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        this.setState({ status: "idle", activeMessageId: null });
        resolve();
      }
    });
  }
}

export const saraVoice = new SaraVoiceEngine();

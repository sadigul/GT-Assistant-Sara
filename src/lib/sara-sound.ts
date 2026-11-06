"use client";

/**
 * SARA Luxury Acoustic Engine (Web Audio API)
 * Engineered for an ultra-smooth, whisper-soft luxury acoustic experience
 * inspired by high-end studio felt-damped harmonics & VisionOS-style silk UI acoustics.
 *
 * Key acoustic design principles:
 * 1. Zero white-noise static, zero triangle buzz, and zero steep "bubble-pop" pitch drops.
 * 2. Pillow-soft 9ms linear fade-in attack envelopes so no sharp click transient ever occurs.
 * 3. Legato-overlapping 95ms warm harmonic tails routed through a 520Hz low-passed acoustic
 *    ambience bus so consecutive pulses melt smoothly into one another.
 * 4. Sample-accurate Web Audio hardware clock lookahead scheduling (immune to React render lag).
 */

// Warm, serene Fmaj9 / G6 pentatonic silk contour (Hz) for active streaming
const LUXURY_SILK_CONTOUR = [
  220.0,  // A3
  246.94, // B3
  261.63, // C4
  293.66, // D4
  329.63, // E4
  293.66, // D4
  261.63, // C4
  246.94, // B3
];

// Deep, poised velvet contour (Hz) while retrieving live records from the database
const RETRIEVAL_VELVET_CONTOUR = [
  174.61, // F3
  196.0,  // G3
  220.0,  // A3
  196.0,  // G3
];

export type SaraAcousticMode = "retrieving" | "streaming";

class SaraSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambienceSend: GainNode | null = null;
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private safetyStopTimer: ReturnType<typeof setTimeout> | null = null;
  private isTypingActive = false;
  private mode: SaraAcousticMode = "retrieving";
  private nextNoteTime = 0;
  private stepIndex = 0;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.setupLuxuryAcousticBus(this.ctx);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Builds a persistent warm low-passed master bus + subtle studio room ambience reflection
   * so every sound feels lush, three-dimensional, and velvety smooth.
   */
  private setupLuxuryAcousticBus(ctx: AudioContext) {
    try {
      const masterFilter = ctx.createBiquadFilter();
      masterFilter.type = "lowpass";
      masterFilter.frequency.setValueAtTime(1050, ctx.currentTime);
      masterFilter.Q.setValueAtTime(0.45, ctx.currentTime);

      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.88, ctx.currentTime);

      masterFilter.connect(this.masterGain);
      this.masterGain.connect(ctx.destination);

      // Subtle warm acoustic ambience loop (72ms velvet reflection, low-passed at 460Hz)
      this.ambienceSend = ctx.createGain();
      this.ambienceSend.gain.setValueAtTime(0.26, ctx.currentTime);

      const delay = ctx.createDelay(0.2);
      delay.delayTime.setValueAtTime(0.072, ctx.currentTime);

      const dampingFilter = ctx.createBiquadFilter();
      dampingFilter.type = "lowpass";
      dampingFilter.frequency.setValueAtTime(460, ctx.currentTime);
      dampingFilter.Q.setValueAtTime(0.45, ctx.currentTime);

      const feedback = ctx.createGain();
      feedback.gain.setValueAtTime(0.24, ctx.currentTime);

      this.ambienceSend.connect(delay);
      delay.connect(dampingFilter);
      dampingFilter.connect(this.masterGain);
      dampingFilter.connect(feedback);
      feedback.connect(delay);
    } catch {}
  }

  /**
   * Schedules a single ultra-smooth luxury felt-silk pulse at an exact hardware timestamp.
   * Adapts harmonic warmth and envelope to whether SARA is retrieving live data or streaming text.
   */
  private scheduleKeystrokeAtTime(
    time: number,
    isPhraseBreath = false,
    idx = 0,
    mode: SaraAcousticMode = "streaming"
  ) {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    try {
      const t = Math.max(ctx.currentTime, time);
      const isRetrieving = mode === "retrieving";

      // 1. Deep Muted Felt Sub-Cushion (Steinway felt damper warmth)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = "sine";

      const subStart = isRetrieving ? 82 : isPhraseBreath ? 84 : 94;
      const subEnd = isRetrieving ? 60 : isPhraseBreath ? 62 : 70;
      subOsc.frequency.setValueAtTime(subStart, t);
      subOsc.frequency.exponentialRampToValueAtTime(subEnd, t + 0.052);

      // 9ms pillowy fade-in so there is zero percussive knock
      subGain.gain.setValueAtTime(0.0001, t);
      subGain.gain.linearRampToValueAtTime(
        isRetrieving ? 0.019 : isPhraseBreath ? 0.025 : 0.021,
        t + 0.009
      );
      subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.062);

      subOsc.connect(subGain);
      subGain.connect(this.masterGain);

      subOsc.start(t);
      subOsc.stop(t + 0.066);

      // 2. Velvet Silk Harmonic Pulse (Pure Sine with 10ms pillow attack + 105ms legato tail)
      const silkOsc = ctx.createOscillator();
      const silkGain = ctx.createGain();
      silkOsc.type = "sine";

      const noteFreq = isRetrieving
        ? RETRIEVAL_VELVET_CONTOUR[idx % RETRIEVAL_VELVET_CONTOUR.length]
        : isPhraseBreath
        ? 196.0 // Warm G3 resolution on phrase breath
        : LUXURY_SILK_CONTOUR[idx % LUXURY_SILK_CONTOUR.length];

      // Subtle 1% silk touch micro-settlement
      silkOsc.frequency.setValueAtTime(noteFreq * 1.01, t);
      silkOsc.frequency.exponentialRampToValueAtTime(noteFreq, t + 0.02);

      const silkPeak = isRetrieving ? 0.018 : isPhraseBreath ? 0.021 : 0.024;
      const tailDuration = isRetrieving ? 0.13 : 0.102;
      silkGain.gain.setValueAtTime(0.0001, t);
      silkGain.gain.linearRampToValueAtTime(silkPeak, t + 0.01);
      silkGain.gain.exponentialRampToValueAtTime(0.0001, t + tailDuration);

      silkOsc.connect(silkGain);
      silkGain.connect(this.masterGain);
      if (this.ambienceSend) {
        silkGain.connect(this.ambienceSend);
      }

      silkOsc.start(t);
      silkOsc.stop(t + tailDuration + 0.008);

      // 3. Whisper Octave Shimmer during active response streaming
      if (!isRetrieving) {
        const shimmerOsc = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmerOsc.type = "sine";
        shimmerOsc.frequency.setValueAtTime(noteFreq * 2, t);

        shimmerGain.gain.setValueAtTime(0.0001, t);
        shimmerGain.gain.linearRampToValueAtTime(0.0038, t + 0.011);
        shimmerGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.068);

        shimmerOsc.connect(shimmerGain);
        if (this.ambienceSend) {
          shimmerGain.connect(this.ambienceSend);
        } else {
          shimmerGain.connect(this.masterGain);
        }

        shimmerOsc.start(t);
        shimmerOsc.stop(t + 0.072);
      }
    } catch {
      // Ignore audio errors prior to user interaction
    }
  }

  /**
   * Plays a single luxury silk pulse immediately.
   */
  public playKeystrokeTick(isSpacebar = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    this.stepIndex++;
    this.scheduleKeystrokeAtTime(ctx.currentTime + 0.005, isSpacebar, this.stepIndex, "streaming");
  }

  /**
   * Plays a lush 5-note luxury silk preview phrase when toggling sound ON in Settings.
   */
  public playPreviewSequence() {
    const ctx = this.getContext();
    if (!ctx) return;
    const base = ctx.currentTime + 0.015;
    const offsets = [0, 0.08, 0.16, 0.24, 0.325];
    offsets.forEach((offset, idx) => {
      this.scheduleKeystrokeAtTime(base + offset, idx === offsets.length - 1, idx, "streaming");
    });
  }

  /**
   * Whisper-soft luxury confirmation swell when the user sends a message.
   */
  public playSendSound() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime + 0.005;

      const notes = [
        { freq: 220.0, start: now, dur: 0.11, peak: 0.022 },
        { freq: 329.63, start: now + 0.045, dur: 0.14, peak: 0.024 },
      ];

      for (const n of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(n.freq, n.start);

        gain.gain.setValueAtTime(0.0001, n.start);
        gain.gain.linearRampToValueAtTime(n.peak, n.start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, n.start + n.dur);

        osc.connect(gain);
        gain.connect(this.masterGain);
        if (this.ambienceSend) gain.connect(this.ambienceSend);

        osc.start(n.start);
        osc.stop(n.start + n.dur + 0.01);
      }
    } catch {}
  }

  /**
   * Lush three-note velvet chord bloom when SARA completes her response.
   */
  public playReceiveCompleteSound() {
    const ctx = this.getContext();
    if (!ctx || !this.masterGain) return;

    try {
      const now = ctx.currentTime + 0.015;

      // Serene Cmaj9 silk arpeggio bloom: G4 -> B4 -> E5
      const chord = [
        { freq: 392.0, offset: 0, dur: 0.28, peak: 0.02 },
        { freq: 493.88, offset: 0.055, dur: 0.32, peak: 0.022 },
        { freq: 659.25, offset: 0.11, dur: 0.38, peak: 0.02 },
      ];

      for (const note of chord) {
        const start = now + note.offset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(note.freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(note.peak, start + 0.014);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);

        osc.connect(gain);
        gain.connect(this.masterGain);
        if (this.ambienceSend) {
          gain.connect(this.ambienceSend);
        }

        osc.start(start);
        osc.stop(start + note.dur + 0.015);
      }
    } catch {}
  }

  /**
   * Starts the continuous Web Audio hardware-clock lookahead scheduler.
   * Defaults to "retrieving" mode (calm, deep velvet pulses while fetching live database records)
   * and transitions seamlessly to "streaming" mode when data arrives.
   */
  public startTypingLoop(initialMode: SaraAcousticMode = "retrieving") {
    const ctx = this.getContext();
    if (!ctx) return;

    if (this.safetyStopTimer) {
      clearTimeout(this.safetyStopTimer);
      this.safetyStopTimer = null;
    }

    this.mode = initialMode;

    if (this.isTypingActive) return;
    this.isTypingActive = true;
    this.stepIndex = 0;
    this.nextNoteTime = ctx.currentTime + 0.035;

    const LOOKAHEAD_SECONDS = 0.14;
    const SCHEDULER_INTERVAL_MS = 25;

    const scheduleAhead = () => {
      if (!this.isTypingActive || !this.ctx) return;

      while (this.nextNoteTime < this.ctx.currentTime + LOOKAHEAD_SECONDS) {
        const isRetrieving = this.mode === "retrieving";
        const isPhraseBreath = !isRetrieving && (this.stepIndex + 1) % 8 === 0;

        this.scheduleKeystrokeAtTime(
          this.nextNoteTime,
          isPhraseBreath,
          this.stepIndex,
          this.mode
        );

        this.stepIndex++;

        if (isRetrieving) {
          // Calm, poised 142ms velvet pulse while querying live database tables
          const breathWave = Math.sin(this.stepIndex * 0.6) * 0.008;
          this.nextNoteTime += 0.142 + breathWave;
        } else {
          // Flowing 80ms legato silk stream while rendering retrieved words
          const gentleWave = Math.sin(this.stepIndex * 0.7) * 0.004;
          const stepDuration = isPhraseBreath ? 0.108 : 0.08 + gentleWave;
          this.nextNoteTime += stepDuration;
        }
      }
    };

    scheduleAhead();
    this.schedulerTimer = setInterval(scheduleAhead, SCHEDULER_INTERVAL_MS);

    // Safety auto-stop after 25s
    this.safetyStopTimer = setTimeout(() => {
      this.stopTypingLoop(false);
    }, 25000);
  }

  /**
   * Transitions the active loop from deep data-retrieval cadence into flowing legato
   * response streaming matched to the retrieved answer length, then softly concludes.
   */
  public transitionToStreaming(contentLength = 180) {
    const ctx = this.getContext();
    if (!ctx) return;

    if (!this.isTypingActive) {
      this.startTypingLoop("streaming");
    } else {
      this.mode = "streaming";
      this.stepIndex = 0;
    }

    if (this.safetyStopTimer) {
      clearTimeout(this.safetyStopTimer);
      this.safetyStopTimer = null;
    }

    // Calculate a graceful silk streaming duration proportional to the retrieved data length (380ms – 920ms)
    const streamDurationMs = Math.min(Math.max(Math.round(contentLength * 2.2), 380), 920);
    this.safetyStopTimer = setTimeout(() => {
      this.stopTypingLoop(true);
    }, streamDurationMs);
  }

  /**
   * Stops the luxury typing stream and optionally blooms into the completion chord.
   */
  public stopTypingLoop(playCompleteChime = false) {
    const wasActive = this.isTypingActive;
    this.isTypingActive = false;

    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.safetyStopTimer) {
      clearTimeout(this.safetyStopTimer);
      this.safetyStopTimer = null;
    }

    if (wasActive && playCompleteChime) {
      this.playReceiveCompleteSound();
    }
  }
}

export const saraSound = new SaraSoundEngine();

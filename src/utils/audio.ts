import { AudioSettings, loadAudioSettings } from './storage';

/**
 * Procedural Web Audio API Medieval & Game of Thrones-Inspired Sound & Theme Engine.
 * Features:
 * - Gentle, continuous Game of Thrones-style bowed cello & medieval lute/harp ostinato in C minor
 * - Tactile card decision seal thumps, sword overtones, undo chimes, and fanfares
 */
class MedievalSoundEngine {
  private ctx: AudioContext | null = null;
  private settings: AudioSettings = loadAudioSettings();
  private musicTimerId: number | null = null;
  private musicStep: number = 0;
  private isMusicPlaying: boolean = false;

  public updateSettings(next: AudioSettings) {
    this.settings = next;
    if (!next.musicEnabled || next.volume <= 0) {
      this.stopBackgroundMusic();
    } else if (!this.isMusicPlaying) {
      this.startBackgroundMusic();
    }
  }

  public getSettings(): AudioSettings {
    return this.settings;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          return null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Starts the gentle Game of Thrones-inspired cello & lute ostinato background score.
   * Safe to call on any user interaction.
   */
  public startBackgroundMusic() {
    if (typeof window === 'undefined') return;
    if (!this.settings.musicEnabled || this.settings.volume <= 0) return;
    if (this.isMusicPlaying && this.musicTimerId !== null) return;

    const ctx = this.ensureContext();
    if (!ctx) return;

    this.isMusicPlaying = true;

    // Iconic 3/4 medieval cello ostinato pattern in C minor / Bb major / Ab major / G minor
    // Frequencies in Hz:
    // G3=196.0, C3=130.81, Eb3=155.56, F3=174.61, D3=146.83, Bb2=116.54, Ab2=103.83, G2=98.0
    const ostinatoMeasures: Array<{
      bassDrone: number;
      notes: Array<{ freq: number; dur: number; isAccent?: boolean }>;
    }> = [
      // Bar 1-2: G3 - C3 - Eb3 - F3 - G3 - C3 - Eb3 - F3
      {
        bassDrone: 65.41, // C2
        notes: [
          { freq: 196.0, dur: 0.72, isAccent: true }, // G3
          { freq: 130.81, dur: 0.72 },                // C3
          { freq: 155.56, dur: 0.36 },                // Eb3
          { freq: 174.61, dur: 0.36 },                // F3
          { freq: 196.0, dur: 0.72, isAccent: true }, // G3
          { freq: 130.81, dur: 0.72 },                // C3
          { freq: 155.56, dur: 0.36 },                // Eb3
          { freq: 174.61, dur: 0.36 },                // F3
        ],
      },
      // Bar 3-4: D3 settle with medieval harp overtones
      {
        bassDrone: 73.42, // D2
        notes: [
          { freq: 146.83, dur: 1.08, isAccent: true }, // D3
          { freq: 98.0, dur: 0.72 },                   // G2
          { freq: 116.54, dur: 0.36 },                 // Bb2
          { freq: 130.81, dur: 0.36 },                 // C3
          { freq: 146.83, dur: 1.08, isAccent: true }, // D3
          { freq: 98.0, dur: 0.72 },                   // G2
        ],
      },
      // Bar 5-6: F3 - Bb2 -Eb3 - D3 - F3 - Bb2 - Eb3 - D3
      {
        bassDrone: 58.27, // Bb1
        notes: [
          { freq: 174.61, dur: 0.72, isAccent: true }, // F3
          { freq: 116.54, dur: 0.72 },                 // Bb2
          { freq: 155.56, dur: 0.36 },                 // Eb3
          { freq: 146.83, dur: 0.36 },                 // D3
          { freq: 174.61, dur: 0.72, isAccent: true }, // F3
          { freq: 116.54, dur: 0.72 },                 // Bb2
          { freq: 155.56, dur: 0.36 },                 // Eb3
          { freq: 146.83, dur: 0.36 },                 // D3
        ],
      },
      // Bar 7-8: C3 cadence back to C minor
      {
        bassDrone: 65.41, // C2
        notes: [
          { freq: 130.81, dur: 1.44, isAccent: true }, // C3
          { freq: 155.56, dur: 0.72 },                 // Eb3
          { freq: 146.83, dur: 0.72 },                 // D3
          { freq: 130.81, dur: 1.44, isAccent: true }, // C3
        ],
      },
    ];

    const playMeasure = () => {
      if (!this.isMusicPlaying || !this.settings.musicEnabled || this.settings.volume <= 0) {
        return;
      }
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      const audioCtx = this.ensureContext();
      if (!audioCtx || audioCtx.state !== 'running') return;

      const measure = ostinatoMeasures[this.musicStep % ostinatoMeasures.length];
      this.musicStep++;

      const baseVol = 0.042 * this.settings.volume;
      const startTime = audioCtx.currentTime + 0.05;

      try {
        // 1. Warm Deep Castle Drone (Cello/Bass pad)
        const droneOsc = audioCtx.createOscillator();
        const droneFilter = audioCtx.createBiquadFilter();
        const droneGain = audioCtx.createGain();

        droneOsc.type = 'triangle';
        droneOsc.frequency.setValueAtTime(measure.bassDrone, startTime);

        droneFilter.type = 'lowpass';
        droneFilter.frequency.setValueAtTime(220, startTime);

        droneGain.gain.setValueAtTime(0.0001, startTime);
        droneGain.gain.linearRampToValueAtTime(baseVol * 0.75, startTime + 0.6);
        droneGain.gain.linearRampToValueAtTime(baseVol * 0.5, startTime + 3.6);
        droneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 4.3);

        droneOsc.connect(droneFilter);
        droneFilter.connect(droneGain);
        droneGain.connect(audioCtx.destination);

        droneOsc.start(startTime);
        droneOsc.stop(startTime + 4.35);

        // 2. Bowed Cello Ostinato Melody + Gentle Lute Pluck on Accents
        let cursor = startTime;
        for (const n of measure.notes) {
          const osc = audioCtx.createOscillator();
          const filter = audioCtx.createBiquadFilter();
          const gain = audioCtx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(n.freq, cursor);

          // Warm cello body lowpass filter
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(n.isAccent ? 440 : 340, cursor);

          const notePeak = n.isAccent ? baseVol * 1.15 : baseVol * 0.8;
          gain.gain.setValueAtTime(0.0001, cursor);
          gain.gain.linearRampToValueAtTime(notePeak, cursor + Math.min(0.12, n.dur * 0.3));
          gain.gain.exponentialRampToValueAtTime(0.0001, cursor + n.dur * 0.96);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(cursor);
          osc.stop(cursor + n.dur);

          // Subtle higher octave medieval harp/lute harmonic on accented beats
          if (n.isAccent) {
            const harpOsc = audioCtx.createOscillator();
            const harpGain = audioCtx.createGain();
            harpOsc.type = 'sine';
            harpOsc.frequency.setValueAtTime(n.freq * 2, cursor);

            harpGain.gain.setValueAtTime(baseVol * 0.45, cursor);
            harpGain.gain.exponentialRampToValueAtTime(0.0001, cursor + n.dur * 1.1);

            harpOsc.connect(harpGain);
            harpGain.connect(audioCtx.destination);
            harpOsc.start(cursor);
            harpOsc.stop(cursor + n.dur * 1.15);
          }

          cursor += n.dur;
        }
      } catch {
        // ignore audio scheduling errors
      }
    };

    playMeasure();
    this.musicTimerId = window.setInterval(playMeasure, 4320);
  }

  public stopBackgroundMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimerId !== null) {
      window.clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
  }

  public ensureBackgroundMusic() {
    this.startBackgroundMusic();
  }

  public playCardHover() {
    this.startBackgroundMusic();
    if (!this.settings.sfxEnabled || this.settings.volume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(210, now + 0.035);

      gain.gain.setValueAtTime(0.08 * this.settings.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // ignore
    }
  }

  public playUiClick() {
    this.startBackgroundMusic();
    if (!this.settings.sfxEnabled || this.settings.volume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.045);

      gain.gain.setValueAtTime(0.12 * this.settings.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);
    } catch {
      // ignore
    }
  }

  public playUndoSound() {
    this.startBackgroundMusic();
    if (!this.settings.sfxEnabled || this.settings.volume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.14);

      gain.gain.setValueAtTime(0.15 * this.settings.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.17);
    } catch {
      // ignore
    }
  }

  public playCardDecision(side: 'left' | 'right', isHeavy: boolean) {
    this.startBackgroundMusic();
    if (!this.settings.sfxEnabled || this.settings.volume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const pitchShift = side === 'left' ? 0.94 : 1.06;

      // 1. Parchment & Seal Thump
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isHeavy ? 'sawtooth' : 'triangle';
      const startFreq = (isHeavy ? 180 : 240) * pitchShift;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(58, now + (isHeavy ? 0.16 : 0.1));

      gain.gain.setValueAtTime((isHeavy ? 0.28 : 0.18) * this.settings.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.18 : 0.11));

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + (isHeavy ? 0.19 : 0.12));

      // 2. Metallic Chime / Sword Overtones on Heavy Decisions
      if (isHeavy) {
        const chime = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(520 * pitchShift, now + 0.02);
        chime.frequency.exponentialRampToValueAtTime(390 * pitchShift, now + 0.25);

        chimeGain.gain.setValueAtTime(0.12 * this.settings.volume, now + 0.02);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

        chime.connect(chimeGain);
        chimeGain.connect(ctx.destination);
        chime.start(now + 0.02);
        chime.stop(now + 0.27);
      }
    } catch {
      // ignore
    }
  }

  public playCriticalWarning() {
    if (!this.settings.sfxEnabled || this.settings.volume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(82, now + 0.28);

      gain.gain.setValueAtTime(0.16 * this.settings.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    } catch {
      // ignore
    }
  }

  public playVictoryFanfare() {
    if (!this.settings.sfxEnabled || this.settings.volume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.11;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.2 * this.settings.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.46);
      });
    } catch {
      // ignore
    }
  }

  public playDefeatSting() {
    if (!this.settings.sfxEnabled || this.settings.volume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const notes = [196.0, 174.61, 146.83, 110.0]; // G3, F3, D3, A2
      notes.forEach((freq, idx) => {
        const now = ctx.currentTime + idx * 0.15;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.18 * this.settings.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.52);
      });
    } catch {
      // ignore
    }
  }
}

export const soundEngine = new MedievalSoundEngine();

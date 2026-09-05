/**
 * Tiny synthesised sounds — no audio files, nothing to download.
 * Muted by default; the store passes `enabled` through.
 */
let ctx: AudioContext | null = null;

export function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

type Kind = 'pop' | 'page' | 'chime' | 'tick';

export function play(kind: Kind, enabled: boolean) {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  const gain = ac.createGain();
  gain.connect(ac.destination);

  if (kind === 'pop') {
    // a soft round blip that rises then closes quickly
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.07);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.18);
    return;
  }

  if (kind === 'chime') {
    [660, 880, 1170].forEach((f, i) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const t = now + i * 0.075;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.11, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.connect(g);
      g.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    });
    return;
  }

  if (kind === 'tick') {
    const osc = ac.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 1500;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.03, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.06);
    return;
  }

  // 'page' — filtered noise burst, like paper turning over
  const len = Math.floor(ac.sampleRate * 0.26);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const t = i / len;
    // two soft swishes so it reads as a page rather than static
    const env = Math.sin(Math.PI * t) * (0.6 + 0.4 * Math.sin(t * 14));
    data[i] = (Math.random() * 2 - 1) * env;
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1100, now);
  filter.frequency.linearRampToValueAtTime(2600, now + 0.24);
  filter.Q.value = 0.8;
  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
  src.connect(filter);
  filter.connect(gain);
  src.start(now);
}

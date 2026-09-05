/**
 * Cozy background sound, synthesised — no files to download, nothing to host.
 *
 * All three loops are noise put through a filter, which is genuinely how rain
 * and fire sound: a hiss shaped by what it's hissing through. Rain is bright
 * hiss, a café is the same hiss with the top taken off plus the odd cup, and a
 * fire is a low rumble with crackles thrown on top.
 *
 * Off by default and faded in over a second — sound that arrives suddenly is
 * the fastest way to make someone close a tab.
 */
import type { Ambient } from './types';
import { audio } from './sound';

interface Running {
  kind: Ambient;
  /** everything to disconnect when it stops */
  nodes: AudioNode[];
  sources: AudioScheduledSourceNode[];
  gain: GainNode;
  timers: number[];
}

let running: Running | null = null;

/** A few seconds of noise, looped. `brown` rolls off the harshness. */
function noiseBuffer(ac: AudioContext, seconds: number, brown: boolean): AudioBuffer {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    } else {
      data[i] = white;
    }
  }
  // taper the seam so the loop doesn't tick
  const ramp = Math.min(2000, Math.floor(len / 20));
  for (let i = 0; i < ramp; i++) {
    const k = i / ramp;
    data[i] *= k;
    data[len - 1 - i] *= k;
  }
  return buf;
}

function loop(ac: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

export function stopAmbient() {
  if (!running) return;
  const { nodes, sources, gain, timers } = running;
  running = null;
  timers.forEach((t) => window.clearTimeout(t));
  const ac = gain.context;
  const now = ac.currentTime;
  // fade out, then tear down
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
  window.setTimeout(() => {
    sources.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } });
    [...nodes, gain].forEach((n) => { try { n.disconnect(); } catch { /* gone */ } });
  }, 700);
}

export function setAmbientVolume(volume: number) {
  if (!running) return;
  const ac = running.gain.context;
  running.gain.gain.setTargetAtTime(level(running.kind, volume), ac.currentTime, 0.2);
}

/** Each loop needs a different amount of gain to sound like the same loudness. */
function level(kind: Ambient, volume: number): number {
  const v = Math.max(0, Math.min(1, volume));
  const base = kind === 'rain' ? 0.10 : kind === 'cafe' ? 0.13 : 0.16;
  return base * v;
}

export function startAmbient(kind: Ambient, volume = 0.5) {
  if (running?.kind === kind) { setAmbientVolume(volume); return; }
  stopAmbient();
  if (kind === 'off') return;

  const ac = audio();
  if (!ac) return;

  const gain = ac.createGain();
  gain.gain.value = 0.0001;
  gain.connect(ac.destination);

  const nodes: AudioNode[] = [];
  const sources: AudioScheduledSourceNode[] = [];
  const timers: number[] = [];

  if (kind === 'rain') {
    const src = loop(ac, noiseBuffer(ac, 4, false));
    const low = ac.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 2200;
    const high = ac.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 320;
    // a slow sway, so it sounds like weather rather than static
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = 700;
    lfo.connect(lfoGain);
    lfoGain.connect(low.frequency);
    src.connect(high);
    high.connect(low);
    low.connect(gain);
    src.start();
    lfo.start();
    sources.push(src, lfo);
    nodes.push(low, high, lfoGain);
  } else if (kind === 'cafe') {
    const src = loop(ac, noiseBuffer(ac, 5, true));
    const low = ac.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 900;
    src.connect(low);
    low.connect(gain);
    src.start();
    sources.push(src);
    nodes.push(low);

    // the occasional cup on a saucer, at unpredictable intervals
    const clink = () => {
      if (!running || running.kind !== 'cafe') return;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 1400 + Math.random() * 900;
      const t = ac.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.02, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(g);
      g.connect(gain);
      osc.start(t);
      osc.stop(t + 0.3);
      running.timers.push(window.setTimeout(clink, 5000 + Math.random() * 14000));
    };
    timers.push(window.setTimeout(clink, 4000 + Math.random() * 6000));
  } else {
    // fire: a low rumble with crackles on top
    const src = loop(ac, noiseBuffer(ac, 5, true));
    const low = ac.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 420;
    src.connect(low);
    low.connect(gain);
    src.start();
    sources.push(src);
    nodes.push(low);

    const crackle = () => {
      if (!running || running.kind !== 'fire') return;
      const burst = ac.createBufferSource();
      burst.buffer = noiseBuffer(ac, 0.06, false);
      const band = ac.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 900 + Math.random() * 2200;
      band.Q.value = 1.4;
      const g = ac.createGain();
      const t = ac.currentTime;
      g.gain.setValueAtTime(0.25 + Math.random() * 0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      burst.connect(band);
      band.connect(g);
      g.connect(gain);
      burst.start(t);
      running.timers.push(window.setTimeout(crackle, 120 + Math.random() * 900));
    };
    timers.push(window.setTimeout(crackle, 300));
  }

  running = { kind, nodes, sources, gain, timers };
  // fade in
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.linearRampToValueAtTime(level(kind, volume), ac.currentTime + 1.1);
}

export function ambientRunning(): Ambient {
  return running?.kind ?? 'off';
}

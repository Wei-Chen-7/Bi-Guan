/**
 * Web Audio 合成。全部声音都是实时合成的，不引入任何音频文件。
 *
 * 钟磬音：几个非谐波泛音叠加 + 指数衰减包络。
 * 环境音：白噪音过滤波器整形成雨/风/溪流三种质感。
 */

import type { AmbientSound } from '../types';

type Ctor = typeof AudioContext;

function getContextCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: Ctor;
    webkitAudioContext?: Ctor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

let ctx: AudioContext | null = null;

/** 惰性创建 AudioContext（必须在用户手势之后才能出声）。 */
function getContext(): AudioContext | null {
  const Ctor = getContextCtor();
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => undefined);
  }
  return ctx;
}

/** 用户手势时调用一次，解锁音频。 */
export function unlockAudio(): void {
  getContext();
}

/**
 * 一声低沉的钟磬。
 * grand = true 时更厚重、更长，用于跨大境界的突破。
 */
export function playBell(grand = false): void {
  const audio = getContext();
  if (!audio) return;

  const now = audio.currentTime;
  const fundamental = grand ? 96 : 132;
  const duration = grand ? 6.5 : 4.2;

  const master = audio.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(grand ? 0.42 : 0.3, now + 0.012);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  // 低通滤掉高频毛刺，留下木石般的钝响。
  const tone = audio.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.setValueAtTime(2400, now);
  tone.frequency.exponentialRampToValueAtTime(420, now + duration * 0.7);

  // 非谐波泛音比，钟体特有的金属感就来自这里。
  const partials: Array<[ratio: number, gain: number, decay: number]> = [
    [1, 1, 1],
    [2.0, 0.5, 0.75],
    [2.76, 0.34, 0.55],
    [5.4, 0.16, 0.34],
    [8.9, 0.08, 0.22],
  ];

  for (const [ratio, gain, decay] of partials) {
    const osc = audio.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(fundamental * ratio, now);

    const env = audio.createGain();
    env.gain.setValueAtTime(gain, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration * decay);

    osc.connect(env);
    env.connect(tone);
    osc.start(now);
    osc.stop(now + duration + 0.1);
  }

  tone.connect(master);
  master.connect(audio.destination);
}

/** 出关时的轻磬，比突破钟声短促。 */
export function playChime(): void {
  const audio = getContext();
  if (!audio) return;

  const now = audio.currentTime;
  const osc = audio.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(528, now);
  osc.frequency.exponentialRampToValueAtTime(396, now + 1.6);

  const env = audio.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.18, now + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

  osc.connect(env);
  env.connect(audio.destination);
  osc.start(now);
  osc.stop(now + 1.9);
}

/** 渡劫失败时的一记闷响。 */
export function playThud(): void {
  const audio = getContext();
  if (!audio) return;

  const now = audio.currentTime;
  const osc = audio.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(52, now + 0.7);

  const env = audio.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.24, now + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

  osc.connect(env);
  env.connect(audio.destination);
  osc.start(now);
  osc.stop(now + 1.2);
}

/* ------------------------------------------------------------------ *
 * 环境音：白噪音 + 滤波整形，循环播放。
 * ------------------------------------------------------------------ */

let ambientNodes: { source: AudioBufferSourceNode; gain: GainNode } | null =
  null;
let ambientKind: AmbientSound = 'none';
let noiseBuffer: AudioBuffer | null = null;

/** 生成 4 秒的白噪音缓冲，循环使用。 */
function getNoiseBuffer(audio: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const length = audio.sampleRate * 4;
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return buffer;
}

/** 停止环境音。 */
export function stopAmbient(): void {
  if (!ambientNodes || !ctx) {
    ambientKind = 'none';
    return;
  }
  const { source, gain } = ambientNodes;
  const now = ctx.currentTime;
  try {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);
    source.stop(now + 0.7);
  } catch {
    // 已经停了就算了。
  }
  ambientNodes = null;
  ambientKind = 'none';
}

/**
 * 播放环境音。同一种音重复调用不会叠加。
 *   rain   — 密集的高频沙沙，带轻微低频铺底
 *   wind   — 缓慢起伏的低频呼啸
 *   stream — 中频带通，水流的潺潺
 */
export function playAmbient(kind: AmbientSound): void {
  if (kind === ambientKind) return;
  stopAmbient();
  if (kind === 'none') return;

  const audio = getContext();
  if (!audio) return;

  const source = audio.createBufferSource();
  source.buffer = getNoiseBuffer(audio);
  source.loop = true;

  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  const now = audio.currentTime;

  let target = 0.12;
  switch (kind) {
    case 'rain':
      filter.type = 'highpass';
      filter.frequency.value = 900;
      filter.Q.value = 0.6;
      target = 0.075;
      break;
    case 'wind':
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      filter.Q.value = 1.4;
      target = 0.14;
      break;
    case 'stream':
      filter.type = 'bandpass';
      filter.frequency.value = 1100;
      filter.Q.value = 0.8;
      target = 0.1;
      break;
  }

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(target, now + 1.2);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(audio.destination);
  source.start(now);

  // 风声加一个极慢的音量起伏，避免死板。
  if (kind === 'wind') {
    const lfo = audio.createOscillator();
    const lfoGain = audio.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = target * 0.5;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start(now);
  }

  ambientNodes = { source, gain };
  ambientKind = kind;
}

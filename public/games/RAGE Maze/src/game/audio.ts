type SoundName =
  | 'step' | 'thud' | 'boom' | 'ding' | 'hurt' | 'whoosh' | 'chime' | 'slam' | 'zap' | 'laser'
  | 'spike' | 'chomp' | 'rumble' | 'win' | 'click' | 'coin' | 'fuse' | 'fall';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 1.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slideTo?: number, delay = 0) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol = 0.3, filterFreq = 1000, type: BiquadFilterType = 'lowpass', delay = 0) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  play(name: SoundName) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    switch (name) {
      case 'step': this.noise(0.06, 0.08, 600); break;
      case 'thud': this.tone(90, 0.35, 'sine', 0.6, 30); this.noise(0.3, 0.5, 300); break;
      case 'boom': this.tone(70, 0.8, 'sawtooth', 0.5, 20); this.noise(0.9, 0.7, 500); break;
      case 'ding': this.tone(880, 0.25, 'triangle', 0.25); this.tone(1320, 0.3, 'triangle', 0.2, undefined, 0.08); break;
      case 'coin': this.tone(1200, 0.12, 'square', 0.12); this.tone(1800, 0.2, 'square', 0.12, undefined, 0.07); break;
      case 'hurt': this.tone(300, 0.4, 'sawtooth', 0.35, 60); this.noise(0.25, 0.3, 900); break;
      case 'whoosh': this.noise(0.4, 0.3, 1500, 'bandpass'); break;
      case 'chime': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.18, undefined, i * 0.07)); break;
      case 'slam': this.tone(60, 0.5, 'square', 0.4, 25); this.noise(0.4, 0.6, 250); break;
      case 'zap': this.tone(1400, 0.3, 'sawtooth', 0.25, 200); this.noise(0.3, 0.3, 4000, 'highpass'); break;
      case 'laser': this.tone(2000, 0.5, 'square', 0.15, 400); break;
      case 'spike': this.noise(0.15, 0.4, 5000, 'highpass'); this.tone(2500, 0.15, 'triangle', 0.15, 1800); break;
      case 'chomp': this.tone(200, 0.15, 'square', 0.3, 80); this.noise(0.15, 0.4, 800, 'lowpass', 0.05); break;
      case 'rumble': this.noise(1.2, 0.5, 120); this.tone(40, 1.2, 'sine', 0.5); break;
      case 'win': [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.2, undefined, i * 0.1)); break;
      case 'click': this.tone(600, 0.06, 'square', 0.1); break;
      case 'fuse': this.noise(1.0, 0.15, 6000, 'highpass'); break;
      case 'fall': this.tone(600, 1.2, 'sine', 0.3, 80); break;
    }
  }
}

export const audio = new AudioEngine();

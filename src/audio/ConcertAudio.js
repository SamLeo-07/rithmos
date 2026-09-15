export class ConcertAudio {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
    this.filter = null;
    this.guitarGain = null;
    this.subGain = null;
    this.crowdGain = null;
    this.oscillators = [];
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Master bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Dynamic Filter (simulates acoustic transition from intimate jam room to massive arena)
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    this.filter.Q.setValueAtTime(2.0, this.ctx.currentTime);
    this.filter.connect(this.masterGain);

    // 1. Sub Bass Drone (48Hz rock kick/bass body)
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'sawtooth';
    this.subOsc.frequency.setValueAtTime(48, this.ctx.currentTime);
    
    this.subFilter = this.ctx.createBiquadFilter();
    this.subFilter.type = 'lowpass';
    this.subFilter.frequency.setValueAtTime(90, this.ctx.currentTime);

    this.subGain = this.ctx.createGain();
    this.subGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    this.subOsc.connect(this.subFilter);
    this.subFilter.connect(this.subGain);
    this.subGain.connect(this.filter);
    this.subOsc.start();

    // 2. Electric Guitar Feedback Harmonics
    const harmonics = [110, 220, 330, 440, 554.37];
    this.guitarGain = this.ctx.createGain();
    this.guitarGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    harmonics.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 2, this.ctx.currentTime);

      // Subtle vibrato LFO
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(4.5 + idx * 0.5, this.ctx.currentTime);
      lfoGain.gain.setValueAtTime(1.5, this.ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      osc.connect(this.guitarGain);
      osc.start();
      this.oscillators.push(osc);
    });
    this.guitarGain.connect(this.filter);

    // 3. Crowd Ambience Noise Generator
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(380, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.crowdGain = this.ctx.createGain();
    this.crowdGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(this.crowdGain);
    this.crowdGain.connect(this.filter);
    whiteNoise.start();
  }

  toggle() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = !this.isPlaying;
    const targetGain = this.isPlaying ? 0.65 : 0.0;
    this.masterGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.3);
    return this.isPlaying;
  }

  updateScroll(scrollProgress) {
    if (!this.ctx || !this.isPlaying) return;

    // Filter frequency modulation based on environment:
    // Section 1 (Arena Opening): ~2200 Hz
    // Section 2 (Raw Jam Pad): ~450 Hz (muffled, acoustic isolation)
    // Section 3 (Journey): Expands 600 Hz -> 2500 Hz
    // Section 4 & 5 (Grand Live Climax): 5000 Hz+ (full frequency roar)
    let targetFreq = 2200;
    let targetGuitarGain = 0.08;

    if (scrollProgress < 0.20) {
      targetFreq = 2200;
      targetGuitarGain = 0.08;
    } else if (scrollProgress >= 0.20 && scrollProgress < 0.40) {
      const p = (scrollProgress - 0.20) / 0.20;
      targetFreq = 2200 - p * 1750; // drops to 450Hz
      targetGuitarGain = 0.04;
    } else if (scrollProgress >= 0.40 && scrollProgress < 0.65) {
      const p = (scrollProgress - 0.40) / 0.25;
      targetFreq = 450 + p * 2000;
      targetGuitarGain = 0.05 + p * 0.07;
    } else {
      const p = (scrollProgress - 0.65) / 0.35;
      targetFreq = 2450 + p * 3500; // up to 6000Hz!
      targetGuitarGain = 0.12 + p * 0.08;
    }

    this.filter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    this.guitarGain.gain.setTargetAtTime(targetGuitarGain, this.ctx.currentTime, 0.1);
  }
}

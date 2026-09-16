import * as THREE from 'three';

export class Waveform {
  constructor(scene) {
    this.scene = scene;
    this.numPoints = 240;
    this.geometry = null;
    this.line = null;
    this.glowLine = null;
    
    this.initWaveform();
  }

  initWaveform() {
    this.positions = new Float32Array(this.numPoints * 3);
    this.colors = new Float32Array(this.numPoints * 3);

    // Initial line strip coordinates
    for (let i = 0; i < this.numPoints; i++) {
      const u = i / (this.numPoints - 1);
      const x = (u - 0.5) * 28;
      const y = 0;
      const z = -6;

      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;

      // Deep electric crimson gradient with hot white-red center
      const centerDist = Math.abs(u - 0.5) * 2;
      this.colors[i * 3] = 1.0;
      this.colors[i * 3 + 1] = THREE.MathUtils.lerp(0.8, 0.05, centerDist);
      this.colors[i * 3 + 2] = THREE.MathUtils.lerp(0.9, 0.1, centerDist);
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    // Core bright line
    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      linewidth: 3,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false
    });

    this.line = new THREE.Line(this.geometry, this.material);
    this.scene.add(this.line);

    // Secondary wider glowing halo ribbon
    const glowMat = new THREE.LineBasicMaterial({
      color: 0xff002b,
      transparent: true,
      opacity: 0,
      linewidth: 6,
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false
    });
    this.glowLine = new THREE.Line(this.geometry, glowMat);
    this.glowLine.scale.set(1.02, 1.2, 1.02);
    this.scene.add(this.glowLine);
  }

  update(time, scrollProgress, cameraPos) {
    const pos = this.geometry.attributes.position.array;

    // Amplitude and frequency modulation based on section
    let amp = 0.8;
    let freq = 4.0;
    let targetZ = -5;
    let targetY = 1.0;
    let targetOpacity = 0.0;
    let travelX = 0;

    if (scrollProgress < 0.14) {
      // Section 1: hidden at start
      targetOpacity = 0.0;
    } else if (scrollProgress >= 0.14 && scrollProgress < 0.22) {
      // Section 1 climax: waveform emerges and sweeps across screen
      const p = (scrollProgress - 0.14) / 0.08;
      targetOpacity = p * 0.95;
      amp = 1.2 + Math.sin(time * 8.0) * 0.4;
      targetY = 4.0 - p * 2.0;
      targetZ = -4.0;
      travelX = (p - 0.5) * 8.0;
    } else if (scrollProgress >= 0.22 && scrollProgress < 0.42) {
      // Section 2: waveform travels forward as a visual transition line
      const p = (scrollProgress - 0.22) / 0.20;
      targetOpacity = 0.85 - p * 0.4;
      amp = 0.5 + Math.sin(time * 5.0) * 0.2;
      targetY = 0.5 - p * 1.5;
      targetZ = THREE.MathUtils.lerp(-4, 2, p);
    } else if (scrollProgress >= 0.42 && scrollProgress < 0.65) {
      // Section 3: pulses with increasing power
      const p = (scrollProgress - 0.42) / 0.23;
      targetOpacity = 0.5 + p * 0.45;
      amp = 0.8 + p * 1.2 + Math.sin(time * (6 + p * 6)) * 0.6;
      freq = 5.0 + p * 4.0;
      targetY = -1.0 + p * 2.0;
      targetZ = THREE.MathUtils.lerp(1, -3, p);
    } else if (scrollProgress >= 0.65 && scrollProgress < 0.76) {
      // Wraps behind the full band reveal
      const p = (scrollProgress - 0.65) / 0.11;
      targetOpacity = 0.85 * (1.0 - p * 0.3);
      amp = 1.4 + Math.sin(time * 6.0) * 0.4;
      freq = 7.0;
      targetY = -1.2 + Math.sin(p * Math.PI) * 1.5;
      targetZ = THREE.MathUtils.lerp(-4, -8, p);
    } else {
      // Completely remove waveform at the end so it does not clutter the banner & payoff
      const p = Math.min(1.0, (scrollProgress - 0.76) / 0.08);
      targetOpacity = Math.max(0, 0.6 * (1.0 - p));
      amp = 0.5 * (1.0 - p);
      targetY = -2.0;
      targetZ = -12.0;
    }

    this.material.opacity = targetOpacity;
    this.glowLine.material.opacity = targetOpacity * 0.65;
    this.line.visible = targetOpacity > 0.005;
    this.glowLine.visible = targetOpacity > 0.005;

    // Synthesize waveform audio-style points
    for (let i = 0; i < this.numPoints; i++) {
      const u = i / (this.numPoints - 1);
      const x = (u - 0.5) * 28 + travelX;
      
      // Multi-octave harmonic sine waves + noise burst
      const phase = time * 4.5;
      const envelope = Math.sin(u * Math.PI); // Window function: 0 at edges, 1 in center
      
      const wave1 = Math.sin(u * freq * Math.PI * 2 + phase);
      const wave2 = Math.sin(u * freq * 2.4 * Math.PI * 2 - phase * 1.3) * 0.5;
      const wave3 = Math.sin(u * freq * 5.1 * Math.PI * 2 + phase * 2.1) * 0.25;
      
      // In Section 5, form the distinct bar crest of the RITHMOS logo
      let logoCrest = 0;
      if (scrollProgress >= 0.85) {
        const barIndex = Math.floor(u * 14);
        const barHeight = Math.sin((barIndex / 13) * Math.PI);
        logoCrest = Math.sin(u * 50) > 0.3 ? barHeight * 1.2 : 0;
      }

      const y = targetY + (wave1 + wave2 + wave3 + logoCrest) * amp * envelope;
      const z = targetZ + Math.cos(u * Math.PI * 2 + phase) * 0.8 * envelope;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }
}

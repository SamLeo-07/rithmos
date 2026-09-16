import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.count = 320; // Tasteful, non-overwhelming ember count
    this.initParticles();
  }

  initParticles() {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);
    this.scales = new Float32Array(this.count);
    this.colors = new Float32Array(this.count * 3);

    const colorWarm = new THREE.Color(0xff4411);
    const colorRed = new THREE.Color(0xff002b);
    const colorHot = new THREE.Color(0xffeedd);

    for (let i = 0; i < this.count; i++) {
      // Spread in 3D volume
      this.positions[i * 3] = (Math.random() - 0.5) * 45;
      this.positions[i * 3 + 1] = (Math.random() - 0.5) * 25;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * 60 - 5;

      this.velocities[i * 3] = (Math.random() - 0.5) * 0.04;
      this.velocities[i * 3 + 1] = Math.random() * 0.05 + 0.02; // Float upwards
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.04;

      this.scales[i] = Math.random() * 0.8 + 0.2;

      // Color variation between hot red, fiery ember, and bright spark
      const r = Math.random();
      const col = r > 0.8 ? colorHot : (r > 0.4 ? colorRed : colorWarm);
      this.colors[i * 3] = col.r;
      this.colors[i * 3 + 1] = col.g;
      this.colors[i * 3 + 2] = col.b;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    // Create a circular glowing sprite texture procedurally
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.25, 'rgba(255, 60, 40, 0.8)');
    grad.addColorStop(0.6, 'rgba(200, 0, 30, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const sparkTexture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 1.2,
      map: sparkTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  update(time, scrollProgress, scrollVelocity = 0) {
    // Fade out particles completely at the end so they do not clutter the banner & payoff
    if (scrollProgress >= 0.76) {
      const fadeP = Math.min(1.0, (scrollProgress - 0.76) / 0.08);
      this.material.opacity = Math.max(0, 0.65 * (1.0 - fadeP));
    } else {
      this.material.opacity = 0.65;
    }
    this.points.visible = this.material.opacity > 0.005;

    const pos = this.geometry.attributes.position.array;
    const speedMultiplier = 1.0 + Math.abs(scrollVelocity) * 12.0;

    for (let i = 0; i < this.count; i++) {
      let vx = this.velocities[i * 3] * speedMultiplier;
      let vy = this.velocities[i * 3 + 1] * speedMultiplier;
      let vz = this.velocities[i * 3 + 2] * speedMultiplier;

      // Add gentle sine turbulence
      vx += Math.sin(time * 2.0 + pos[i * 3 + 1] * 0.5) * 0.015;

      pos[i * 3] += vx;
      pos[i * 3 + 1] += vy;
      pos[i * 3 + 2] += vz;

      // Wrap around bounds so embers never run out
      if (pos[i * 3 + 1] > 18) pos[i * 3 + 1] = -14;
      if (pos[i * 3 + 1] < -14) pos[i * 3 + 1] = 18;
      if (pos[i * 3] > 26) pos[i * 3] = -26;
      if (pos[i * 3] < -26) pos[i * 3] = 26;
      if (pos[i * 3 + 2] > 25) pos[i * 3 + 2] = -35;
      if (pos[i * 3 + 2] < -45) pos[i * 3 + 2] = 20;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }
}

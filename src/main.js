import Lenis from 'lenis';
import { SceneManager } from './scene/SceneManager.js';
import { LayerCompositor } from './scene/LayerCompositor.js';
import { RehearsalEnvironment } from './scene/RehearsalEnvironment.js';
import { Waveform } from './scene/Waveform.js';
import { ParticleSystem } from './scene/Particles.js';
import { CameraJourney } from './scene/CameraJourney.js';
import { ConcertAudio } from './audio/ConcertAudio.js';
import { ModalManager } from './ui/ModalManager.js';

class RithmosApp {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.initSmoothScroll();
    this.init3D();
    this.initAudio();
    this.initModals();
    this.startLoop();
  }

  initSmoothScroll() {
    this.lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5
    });

    this.scrollProgress = 0;
    this.scrollVelocity = 0;

    this.lenis.on('scroll', (e) => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      this.scrollProgress = maxScroll > 0 ? e.scroll / maxScroll : 0;
      this.scrollVelocity = e.velocity || 0;
    });
  }

  init3D() {
    this.sceneManager = new SceneManager(this.canvas);
    this.layerCompositor = new LayerCompositor(this.sceneManager.scene);
    this.rehearsalEnv = new RehearsalEnvironment(this.sceneManager.scene);
    this.waveform = new Waveform(this.sceneManager.scene);
    this.particles = new ParticleSystem(this.sceneManager.scene);
    this.cameraJourney = new CameraJourney(
      this.sceneManager,
      this.layerCompositor,
      this.rehearsalEnv,
      this.waveform,
      this.particles,
      this.lenis
    );
  }

  initAudio() {
    this.audio = new ConcertAudio();
    const toggleBtn = document.getElementById('audio-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isPlaying = this.audio.toggle();
        if (isPlaying) {
          toggleBtn.classList.add('playing');
        } else {
          toggleBtn.classList.remove('playing');
        }
      });
    }
  }

  initModals() {
    this.modals = new ModalManager(this.lenis);
  }

  startLoop() {
    let lastTime = performance.now();

    const tick = (time) => {
      const delta = (time - lastTime) * 0.001;
      lastTime = time;
      const seconds = time * 0.001;

      // Update Lenis
      this.lenis.raf(time);

      // Mouse parallax
      this.sceneManager.updateMouseParallax(0.06);

      // Update camera trajectory and kinetic typography first so camera is in fresh position
      this.cameraJourney.update(this.scrollProgress, this.sceneManager.mouse);

      // Update layers with camera reference
      this.layerCompositor.update(seconds, this.scrollProgress, this.sceneManager.camera);

      // Update rehearsal environment
      this.rehearsalEnv.update(seconds, this.scrollProgress);

      // Update waveform
      this.waveform.update(seconds, this.scrollProgress, this.sceneManager.camera.position);

      // Update particles
      this.particles.update(seconds, this.scrollProgress, this.scrollVelocity);

      // Update audio filter sweep
      this.audio.updateScroll(this.scrollProgress);

      // Render WebGL
      this.sceneManager.render();

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }
}

// Bootstrap on DOM loaded
window.addEventListener('DOMContentLoaded', () => {
  window.__app = new RithmosApp();
});

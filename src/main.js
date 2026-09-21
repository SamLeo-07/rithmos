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
    this.initStageStepping();
    this.init3D();
    this.initAudio();
    this.initModals();
    this.initScrollReveal();
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

    const heroStage = document.getElementById('hero-stage');
    const hud = document.querySelector('.journey-hud');
    const shot10 = document.getElementById('shot-10');

    this.lenis.on('scroll', (e) => {
      // 3D Hero journey scroll progress clamped strictly to hero stage height
      const heroHeight = heroStage ? Math.max(heroStage.offsetHeight - window.innerHeight, 1) : 5500;
      this.scrollProgress = Math.min(1, Math.max(0, e.scroll / heroHeight));
      this.scrollVelocity = e.velocity || 0;

      // Hide left camera journey HUD when user scrolls past 3D hero stage into landing sections
      if (hud) {
        if (e.scroll > heroHeight + 80) {
          hud.classList.add('hidden');
        } else {
          hud.classList.remove('hidden');
        }
      }

      // Smoothly fade out Shot 12 hero payoff once user enters editorial sections
      if (shot10) {
        if (e.scroll > heroHeight + 120) {
          shot10.style.opacity = '0';
          shot10.style.pointerEvents = 'none';
        } else if (this.scrollProgress >= 0.93) {
          shot10.style.opacity = '1';
          shot10.style.pointerEvents = 'auto';
        }
      }

      // Track active section for top navigation menu
      this.updateActiveNav(e.scroll);
    });

    this.initAnchorLinks();
  }

  initAnchorLinks() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (!targetId || targetId === '#') return;
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          this.lenis.scrollTo(targetEl, {
            offset: targetId === '#hero-stage' ? 0 : -30,
            duration: 1.5,
          });
        }
      });
    });
  }

  initStageStepping() {
    const heroStage = document.getElementById('hero-stage');
    // Person/Climax Story Stops:
    // 0.00: Crowd
    // 0.18: Vocalist
    // 0.36: Guitarist
    // 0.45: Bassist
    // 0.55: Drummer
    // 0.73: Keyboardist
    // 0.82: Full Band
    // 0.91: Stage Reveal
    // 1.00: Backstage Logo
    const PERSON_STAGES = [0.00, 0.18, 0.36, 0.45, 0.55, 0.73, 0.82, 0.91, 1.00];
    let lastStepTime = 0;
    const STEP_COOLDOWN = 650; // ms between discrete steps

    const getHeroHeight = () => {
      return heroStage ? Math.max(heroStage.offsetHeight - window.innerHeight, 1) : 5500;
    };

    const triggerStep = (direction) => {
      const heroHeight = getHeroHeight();
      const currentP = this.scrollProgress;
      const now = performance.now();

      if (direction > 0) {
        // Step forward to next person/stage
        const nextStage = PERSON_STAGES.find(s => s > currentP + 0.025);
        if (nextStage !== undefined) {
          lastStepTime = now;
          this.lenis.scrollTo(nextStage * heroHeight, { duration: 1.15 });
          return true;
        }
        // At 1.00: let natural scroll take user into Section 02
        return false;
      } else {
        // Step backward to previous person/stage
        if (window.scrollY >= heroHeight - 15) {
          // Re-entering hero stage from Section 02: lock cleanly onto Backstage Logo (1.00)
          lastStepTime = now;
          this.lenis.scrollTo(1.00 * heroHeight, { duration: 1.15 });
          return true;
        }
        const prevStages = PERSON_STAGES.filter(s => s < currentP - 0.025);
        if (prevStages.length > 0) {
          lastStepTime = now;
          const prevStage = prevStages[prevStages.length - 1];
          this.lenis.scrollTo(prevStage * heroHeight, { duration: 1.15 });
          return true;
        } else {
          lastStepTime = now;
          this.lenis.scrollTo(0, { duration: 1.15 });
          return true;
        }
      }
    };

    // Wheel Stepping (Discrete person-to-person progression)
    window.addEventListener('wheel', (e) => {
      const heroHeight = getHeroHeight();
      const scrollY = window.scrollY;

      // Active when within hero stage or right at the entry boundary from Section 02
      if (scrollY < heroHeight - 15 || (scrollY <= heroHeight + 40 && e.deltaY < 0)) {
        if (Math.abs(e.deltaY) < 14) return; // ignore subtle jitter

        const now = performance.now();
        if (now - lastStepTime < STEP_COOLDOWN) {
          e.preventDefault();
          return;
        }

        const handled = triggerStep(e.deltaY > 0 ? 1 : -1);
        if (handled) {
          e.preventDefault();
        }
      }
    }, { passive: false });

    // Touch Stepping (Mobile swipe gestures)
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      const touchEndY = e.changedTouches[0].clientY;
      const diffY = touchStartY - touchEndY; // > 0 is swipe up / scroll down

      if (Math.abs(diffY) > 35) {
        const heroHeight = getHeroHeight();
        const scrollY = window.scrollY;

        if (scrollY < heroHeight - 15 || (scrollY <= heroHeight + 40 && diffY < 0)) {
          const now = performance.now();
          if (now - lastStepTime < STEP_COOLDOWN) return;

          triggerStep(diffY > 0 ? 1 : -1);
        }
      }
    }, { passive: true });

    // Keyboard Stepping (Arrow keys & Page keys)
    window.addEventListener('keydown', (e) => {
      const heroHeight = getHeroHeight();
      const scrollY = window.scrollY;

      if (scrollY < heroHeight - 15 || (scrollY <= heroHeight + 40 && (e.key === 'ArrowUp' || e.key === 'PageUp'))) {
        if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
          const handled = triggerStep(1);
          if (handled) e.preventDefault();
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
          const handled = triggerStep(-1);
          if (handled) e.preventDefault();
        }
      }
    });
  }

  updateActiveNav(scrollY) {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = [
      { id: 'hero-stage', el: document.getElementById('hero-stage') },
      { id: 'how-it-works', el: document.getElementById('how-it-works') },
      { id: 'why-enter', el: document.getElementById('why-enter') },
      { id: 'the-competition', el: document.getElementById('the-competition') },
      { id: 'for-bands', el: document.getElementById('for-bands') },
      { id: 'the-big-stage', el: document.getElementById('the-big-stage') },
      { id: 'whats-next', el: document.getElementById('whats-next') },
      { id: 'site-footer', el: document.getElementById('site-footer') }
    ];

    let currentSectionId = 'hero-stage';
    const triggerOffset = window.innerHeight * 0.35;

    sections.forEach(({ id, el }) => {
      if (el) {
        let top = 0;
        let curr = el;
        while (curr) {
          top += curr.offsetTop || 0;
          curr = curr.offsetParent;
        }
        if (scrollY >= top - triggerOffset) {
          currentSectionId = id;
        }
      }
    });

    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href === `#${currentSectionId}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
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

  initScrollReveal() {
    const revealEls = document.querySelectorAll('.reveal-on-scroll');
    if (!revealEls.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
        }
      });
    }, {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.08
    });

    revealEls.forEach((el) => observer.observe(el));
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

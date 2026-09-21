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
    this.initNarrativeCable();
    this.initContinuousStorytelling();
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

  updateActiveNav() {
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname.replace(/\/$/, '');
    navLinks.forEach((link) => {
      const href = link.getAttribute('href').replace(/\/$/, '');
      if (href && (href === currentPath || (currentPath === '' && href === '/'))) {
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
      rootMargin: '60px 0px 60px 0px',
      threshold: 0.01
    });

    revealEls.forEach((el) => observer.observe(el));
  }

  initNarrativeCable() {
    const cable = document.getElementById('cable-path-glow');
    const nodes = document.querySelectorAll('.cable-node-circle');
    const cards = document.querySelectorAll('.step-card');
    const section = document.getElementById('how-it-works');
    if (!cable || cards.length === 0 || !section) return;

    let totalLength = 1200;
    try {
      if (cable.getTotalLength) totalLength = cable.getTotalLength();
    } catch (err) {
      totalLength = 1200;
    }
    cable.style.strokeDasharray = `${totalLength}`;

    const updateCableOnScroll = () => {
      const rect = section.getBoundingClientRect();
      const winH = window.innerHeight;
      // Start drawing as soon as section enters viewport
      const start = winH * 0.90;
      const end = -rect.height * 0.35;
      const raw = (start - rect.top) / (start - end);
      const progress = Math.max(0, Math.min(1, raw));

      // Dash offset to reveal glowing red path progressively
      const offset = totalLength * (1.0 - Math.min(progress * 1.3, 1.0));
      cable.style.strokeDashoffset = `${offset}`;

      // Sequentially energize cards and glowing terminal nodes
      cards.forEach((card, idx) => {
        const threshold = 0.05 + idx * 0.12;
        if (progress >= threshold) {
          card.classList.add('is-energized');
          if (nodes[idx]) {
            nodes[idx].classList.add('is-energized');
          }
        } else {
          card.classList.remove('is-energized');
          if (nodes[idx]) {
            nodes[idx].classList.remove('is-energized');
          }
        }
      });
    };

    window.addEventListener('scroll', updateCableOnScroll, { passive: true });
    updateCableOnScroll();

    // Interactive card hover: surges red node pulse without SVG coordinate distortion
    cards.forEach((card, idx) => {
      card.addEventListener('mouseenter', () => {
        if (nodes[idx]) {
          nodes[idx].classList.add('is-hovered');
        }
      });
      card.addEventListener('mouseleave', () => {
        if (nodes[idx]) {
          nodes[idx].classList.remove('is-hovered');
        }
      });
    });
  }

  initContinuousStorytelling() {
    const storyHud = document.getElementById('landing-story-hud');
    const hudSteps = document.querySelectorAll('.story-hud-step');
    const heroStage = document.getElementById('hero-stage');

    const sections = [
      { id: 'how-it-works', step: '02' },
      { id: 'why-enter', step: '03' },
      { id: 'the-competition', step: '04' },
      { id: 'for-bands', step: '05' },
      { id: 'the-big-stage', step: '06' },
      { id: 'whats-next', step: '07' }
    ];

    // Section 03 Elements
    const sec03 = document.getElementById('why-enter');
    const term03 = document.getElementById('terminal-03');
    const benefitBoxes = sec03 ? sec03.querySelectorAll('.benefit-box') : [];
    const acousticRadar = document.getElementById('acoustic-radar-col');

    // Section 04 Elements
    const sec04 = document.getElementById('the-competition');
    const term04 = document.getElementById('terminal-04');
    const compCableGlow = document.getElementById('comp-cable-glow');
    const compNodes = sec04 ? sec04.querySelectorAll('.timeline-node') : [];

    // Section 05 Elements
    const sec05 = document.getElementById('for-bands');
    const term05 = document.getElementById('terminal-05');
    const panelRedGlowing = document.getElementById('panel-red-glowing');
    const etchedWords = sec05 ? sec05.querySelectorAll('.etched-word') : [];

    // Section 06 Elements
    const sec06 = document.getElementById('the-big-stage');
    const term06 = document.getElementById('terminal-06');
    const isoSteps = [1, 2, 3, 4, 5, 6, 7].map(n => document.getElementById(`step-${n}`));

    // Section 07 Elements
    const sec07 = document.getElementById('whats-next');
    const term07 = document.getElementById('terminal-07');
    const haloFrame = document.getElementById('amphitheater-halo-frame');

    const getProgress = (el, winH) => {
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const start = winH * 0.92;
      const end = -rect.height * 0.30;
      const total = start - end;
      if (total <= 0) return 0;
      return Math.max(0, Math.min(1.2, (start - rect.top) / total));
    };

    const updateStoryJourney = () => {
      const winH = window.innerHeight;
      const scrollY = window.scrollY;
      const heroHeight = heroStage ? Math.max(heroStage.offsetHeight - winH, 1) : 5500;

      // Toggle HUD visibility: show when user scrolls past 3D hero stage into landing sections
      if (storyHud) {
        if (scrollY > heroHeight + 120) {
          storyHud.classList.add('is-visible');
        } else {
          storyHud.classList.remove('is-visible');
        }
      }

      // Track active section for HUD
      let currentActiveStep = '02';
      const readLine = winH * 0.45;
      sections.forEach(({ id, step }) => {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= readLine && rect.bottom >= readLine) {
            currentActiveStep = step;
          }
          // Ensure reveal-on-scroll elements are cleanly visible once section is reached
          if (rect.top < winH * 0.95 && rect.bottom > 0) {
            el.querySelectorAll('.reveal-on-scroll').forEach(rev => rev.classList.add('is-revealed'));
          }
        }
      });

      hudSteps.forEach(link => {
        if (link.getAttribute('data-step') === currentActiveStep) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });

      // Terminals energization
      const checkTerminal = (termEl) => {
        if (!termEl) return;
        const rect = termEl.getBoundingClientRect();
        if (rect.top < winH * 0.88) {
          termEl.classList.add('is-energized');
        } else {
          termEl.classList.remove('is-energized');
        }
      };

      checkTerminal(term03);
      checkTerminal(term04);
      checkTerminal(term05);
      checkTerminal(term06);
      checkTerminal(term07);

      // SECTION 03: Benefit Cards + Equalizers + Acoustic Radar
      if (sec03) {
        const p3 = getProgress(sec03, winH);
        if (acousticRadar) {
          acousticRadar.classList.toggle('is-pulsing', p3 > 0.05 && p3 < 1.05);
        }
        benefitBoxes.forEach((box, idx) => {
          if (p3 >= 0.06 + idx * 0.10) {
            box.classList.add('is-energized');
          } else {
            box.classList.remove('is-energized');
          }
        });
      }

      // SECTION 04: Live SVG Tournament Circuit Cable + Nodes
      if (sec04) {
        const p4 = getProgress(sec04, winH);
        if (compCableGlow) {
          const clamped = Math.min(1.0, Math.max(0, p4 * 1.35));
          const offset = 1000 * (1.0 - clamped);
          compCableGlow.style.strokeDashoffset = `${offset}`;
        }
        compNodes.forEach((node, idx) => {
          if (p4 >= 0.08 + idx * 0.16) {
            node.classList.add('is-energized');
          } else {
            node.classList.remove('is-energized');
          }
        });
      }

      // SECTION 05: Rehearsal Studio Radiant Glass Panel + Etched Typography
      if (sec05) {
        const p5 = getProgress(sec05, winH);
        if (panelRedGlowing) {
          panelRedGlowing.classList.toggle('is-energized', p5 > 0.05 && p5 < 1.05);
        }
        etchedWords.forEach((word, idx) => {
          if (p5 >= 0.10 + idx * 0.12) {
            word.classList.add('is-lit');
          } else {
            word.classList.remove('is-lit');
          }
        });
      }

      // SECTION 06: Isometric Ascending Steps Climbing
      if (sec06) {
        const p6 = getProgress(sec06, winH);
        isoSteps.forEach((step, idx) => {
          if (step) {
            if (p6 >= 0.08 + idx * 0.11) {
              step.classList.add('is-lit');
            } else {
              step.classList.remove('is-lit');
            }
          }
        });
      }

      // SECTION 07: Curved Stadium Halo Shockwave Resonance
      if (sec07) {
        const p7 = getProgress(sec07, winH);
        if (haloFrame) {
          haloFrame.classList.toggle('is-energized', p7 > 0.05 && p7 < 1.05);
        }
      }
    };

    if (this.lenis) {
      this.lenis.on('scroll', updateStoryJourney);
    }
    window.addEventListener('scroll', updateStoryJourney, { passive: true });
    updateStoryJourney();
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

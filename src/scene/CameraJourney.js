import * as THREE from 'three';

export class CameraJourney {
  constructor(sceneManager, layerCompositor, rehearsalEnv, waveform, particles, lenis = null) {
    this.sm = sceneManager;
    this.lc = layerCompositor;
    this.re = rehearsalEnv;
    this.wf = waveform;
    this.pt = particles;
    this.lenis = lenis;

    // =========================================================================
    // 12-SHOT STORYBOARD TRAJECTORY (Image 2: "SAME STAGE, DIFFERENT STORIES. ONE RITHMOS.")
    // Continuous physical trajectory through single concert stage space
    // =========================================================================
    // 8-BEAT NARRATIVE TRAJECTORY
    // Continuous physical trajectory through single concert stage space
    // 01: Every band has a story.
    // 02: Every story needs a stage.
    // 03: Rithmos is the stage.
    // 04: Every dream needs a moment.
    // 05: Every moment needs a stage.
    // 06: Rithmos is the stage.
    // 07: Rithmos brand flashes.
    // 08: Where bands rise (waveform zoom and unzoom).
    // =========================================================================
    this.camPoints = [
      new THREE.Vector3(0.0, 1.2, 34.0),     // 01 STORY (Crowd entrance overview)
      new THREE.Vector3(0.0, 0.0, 4.6),      // 02 STAGE (Dual vocalists close-up: female left, male right, text center)
      new THREE.Vector3(-4.0, 0.1, -3.0),    // 03 RITHMOS (Guitarist & Bassist framing)
      new THREE.Vector3(0.2, 0.5, -5.8),     // 04 MOMENT (Drummer on elevated drum riser)
      new THREE.Vector3(8.2, 0.5, -5.2),     // 05 KEYBOARD (Framing keyboardist and billboard directly from right wing)
      new THREE.Vector3(0.0, 1.4, 16.5),     // 06 RITHMOS (Full Band stadium overview)
      new THREE.Vector3(0.0, 2.2, 18.5),     // 07 FLASH (Stage arena reveal - Rithmos brand flashes!)
      new THREE.Vector3(0.0, 2.8, 14.0)      // 08 RISE (Hero finale lock - Where bands rise animated waveform)
    ];

    // 8-Beat Camera Look-at Target Spline (Smooth, monotonic elevation framing)
    this.targetPoints = [
      new THREE.Vector3(0.0, -0.4, -2.5),    // 01 Looking ahead across crowd at stage
      new THREE.Vector3(0.0, -0.3, -2.5),    // 02 Framing dual vocalists and shared center text
      new THREE.Vector3(-4.0, -0.2, -7.0),   // 03 Focused on guitarist and Rithmos billboard
      new THREE.Vector3(1.4, 0.8, -13.2),    // 04 Looking toward drummer and moment billboard
      new THREE.Vector3(9.2, 0.45, -8.8),    // 05 Centered directly on keyboardist and billboard
      new THREE.Vector3(0.0, 0.4, -8.0),     // 06 Level framing on full band and Rithmos billboard
      new THREE.Vector3(0.0, 1.8, -10.0),    // 07 Overview of illuminated stage and flashing brand
      new THREE.Vector3(0.0, 6.2, -18.6)     // 08 Straight-on lock on radiant RITHMOS and tagline
    ];

    this.camCurve = new THREE.CatmullRomCurve3(this.camPoints, false, 'centripetal');
    this.targetCurve = new THREE.CatmullRomCurve3(this.targetPoints, false, 'centripetal');

    // DOM scene & typography elements
    this.shot01 = document.getElementById('shot-01');
    this.s1Words = [
      document.getElementById('s1-word-1'),
      document.getElementById('s1-word-2'),
      document.getElementById('s1-word-3')
    ];

    this.shot08 = document.getElementById('shot-08');
    this.shot10 = document.getElementById('shot-10');
    this.s5Content = document.getElementById('s5-content');

    // HUD Elements
    this.hudNodes = document.querySelectorAll('.hud-node');
    this.hudIndicator = document.getElementById('hud-indicator');
    this.hudCamZ = document.getElementById('hud-cam-z');

    this.initHUDClicks();
  }

  initHUDClicks() {
    this.hudNodes.forEach(node => {
      node.addEventListener('click', () => {
        const target = parseFloat(node.getAttribute('data-target'));
        const heroStage = document.getElementById('hero-stage');
        const heroHeight = heroStage ? Math.max(heroStage.offsetHeight - window.innerHeight, 1) : 5500;
        const scrollY = target * heroHeight;
        if (this.lenis) {
          this.lenis.scrollTo(scrollY, { duration: 1.6 });
        } else {
          window.scrollTo({ top: scrollY, behavior: 'smooth' });
        }
      });
    });
  }

  getFOV(p) {
    const keys = [
      { p: 0.00, fov: 52 }, // 01 Story (Crowd)
      { p: 0.14, fov: 48 }, // 02 Stage (Dual Vocalists)
      { p: 0.28, fov: 46 }, // 03 Rithmos (Guitarist)
      { p: 0.43, fov: 46 }, // 04 Moment (Drummer)
      { p: 0.57, fov: 52 }, // 05 Stage (Keyboardist)
      { p: 0.71, fov: 54 }, // 06 Rithmos (Full Band)
      { p: 0.85, fov: 54 }, // 07 Flash (Stage Reveal)
      { p: 1.00, fov: 52 }  // 08 Rise (Backstage Finale)
    ];

    if (p <= keys[0].p) return keys[0].fov;
    if (p >= keys[keys.length - 1].p) return keys[keys.length - 1].fov;

    for (let i = 0; i < keys.length - 1; i++) {
      if (p >= keys[i].p && p <= keys[i + 1].p) {
        const segP = (p - keys[i].p) / (keys[i + 1].p - keys[i].p);
        return THREE.MathUtils.lerp(keys[i].fov, keys[i + 1].fov, segP);
      }
    }
    return 50;
  }

  update(scrollProgress, mouse, delta = 0.016) {
    const p = THREE.MathUtils.clamp(scrollProgress, 0, 1);
    const camera = this.sm.camera;

    // 1. Evaluate Catmull-Rom Position and LookAt Target (centripetal parameterization)
    const baseCamPos = this.camCurve.getPoint(p);
    const baseTarget = this.targetCurve.getPoint(p);

    // 2. Compute dynamic FOV (adapted for mobile portrait)
    let fov = this.getFOV(p);
    if (this.sm.aspect < 1.0) {
      // Widen view angle for portrait viewport; smoothly expand at arena & backstage finale so the full band, stage, and logo are framed with clean margins
      const mobileBoost = 20 + (p >= 0.85 ? ((p - 0.85) / 0.15) * 10 : 0);
      fov += mobileBoost;
    }
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // 3. Gentle Mouse Parallax (calm, subtle sway without abrupt jerks)
    const parallaxStrength = 0.30;
    const px = mouse ? mouse.x * parallaxStrength : 0;
    const py = mouse ? mouse.y * (parallaxStrength * 0.25) : 0;

    const desiredCamPos = new THREE.Vector3(
      baseCamPos.x + px,
      baseCamPos.y + py,
      baseCamPos.z
    );

    const desiredTarget = new THREE.Vector3(
      baseTarget.x + (mouse ? mouse.x * 0.15 : 0),
      baseTarget.y + (mouse ? mouse.y * 0.10 : 0),
      baseTarget.z
    );

    // 4. Cinema Steadicam Smoothing: exponential lerp completely dampens any scroll step jitter
    if (!this.currentCamPos) {
      this.currentCamPos = desiredCamPos.clone();
      this.currentTarget = desiredTarget.clone();
    } else {
      const smoothFactor = Math.min(1.0, Math.max(0.05, (delta || 0.016) * 12.0));
      this.currentCamPos.lerp(desiredCamPos, smoothFactor);
      this.currentTarget.lerp(desiredTarget, smoothFactor);
    }

    camera.position.copy(this.currentCamPos);

    // 5. Strictly Level Horizon (Steadicam / Crane on Rails - zero banking roll or wobble)
    camera.up.set(0, 1, 0);
    camera.lookAt(this.currentTarget);

    // 6. Update typography overlays and HUD
    this.updateTypography(p);
    this.updateHUD(p, camera.position.z);
  }

  updateTypography(p) {
    // ----------------------------------------
    // SHOT 01: Hero Opening (0.00 -> 0.08)
    // ----------------------------------------
    if (p < 0.08) {
      if (this.shot01) this.shot01.classList.add('active');
      const s1p = p / 0.07;

      // Word 1: EVERY BAND (visible immediately at p=0)
      if (s1p >= 0.00 && s1p < 0.75) {
        if (this.s1Words[0]) {
          this.s1Words[0].style.opacity = '1';
          this.s1Words[0].style.transform = 'translateY(0) skewX(-5deg)';
        }
      } else if (this.s1Words[0]) {
        this.s1Words[0].style.opacity = '0';
        this.s1Words[0].style.transform = 'translateY(-24px) skewX(-5deg)';
      }

      // Word 2: HAS A STORY. (visible immediately at p=0 in red brush script)
      if (s1p >= 0.00 && s1p < 0.85) {
        if (this.s1Words[1]) {
          this.s1Words[1].style.opacity = '1';
          this.s1Words[1].style.transform = 'translateY(0) rotate(-4deg) skewX(-4deg)';
        }
      } else if (this.s1Words[1]) {
        this.s1Words[1].style.opacity = '0';
        this.s1Words[1].style.transform = 'translateY(-24px) rotate(-4deg) skewX(-4deg)';
      }
    } else {
      if (this.shot01) this.shot01.classList.remove('active');
    }

    // Performer typography (Shots 03 to 10) is handled seamlessly
    // as 3D world-space billboards sticking directly to performers in LayerCompositor!

    // ----------------------------------------
    // SHOT 11: Stage Arena Reveal (0.88 -> 0.94)
    // ----------------------------------------
    if (this.shot08) {
      if (p >= 0.88 && p <= 0.94) this.shot08.classList.add('active');
      else this.shot08.classList.remove('active');
    }

    // ----------------------------------------
    // SHOT 12: RITHMOS Banner Payoff & Conversion (0.93 -> 1.00)
    // ----------------------------------------
    if (this.shot10) {
      if (p >= 0.93) {
        this.shot10.classList.add('active');
        const payoffP = (p - 0.93) / 0.07;
        if (this.s5Content) {
          this.s5Content.style.opacity = `${Math.min(payoffP * 2.5, 1.0)}`;
          this.s5Content.style.transform = `translateY(${(1.0 - Math.min(payoffP * 1.8, 1.0)) * 24}px)`;
        }
      } else {
        this.shot10.classList.remove('active');
      }
    }
  }

  updateHUD(p, camZ) {
    if (this.hudIndicator) {
      // 260px track height minus 20px indicator height = 240px range
      this.hudIndicator.style.top = `${p * 240}px`;
    }

    if (this.hudCamZ) {
      this.hudCamZ.textContent = `${camZ >= 0 ? '+' : ''}${camZ.toFixed(1)}`;
    }

    // 8-Beat Storyboard thresholds
    const shotThresholds = [
      0.00, // 01 STORY
      0.14, // 02 STAGE
      0.28, // 03 RITHMOS
      0.43, // 04 MOMENT
      0.57, // 05 KEYBOARD
      0.71, // 06 RITHMOS
      0.85, // 07 FLASH
      1.00  // 08 RISE
    ];

    let activeIdx = 0;
    let minDiff = Infinity;
    shotThresholds.forEach((thresh, idx) => {
      const diff = Math.abs(p - thresh);
      if (diff < minDiff) {
        minDiff = diff;
        activeIdx = idx;
      }
    });

    this.hudNodes.forEach((node, idx) => {
      if (idx === activeIdx) node.classList.add('active');
      else node.classList.remove('active');
    });
  }
}

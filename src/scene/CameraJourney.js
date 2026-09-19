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
    this.camPoints = [
      new THREE.Vector3(0.0, 1.2, 34.0),     // 01 START (CROWD - far entrance over ocean of hands)
      new THREE.Vector3(0.6, -0.4, 14.0),    // 02 MOVE TO VOCALIST (Glide low over crowd toward stage front)
      new THREE.Vector3(1.3, -0.4, 3.2),     // 03 VOCALIST CU (Intimate close-up framing vocalist on right, text on left)
      new THREE.Vector3(-2.6, -0.6, -0.5),   // 04 MOVE TO GUITARIST (Pan & glide along stage apron to guitarist)
      new THREE.Vector3(-4.2, 0.1, -3.2),    // 05 GUITARIST CU (Balanced framing: guitarist head, guitar & text fully visible)
      new THREE.Vector3(3.6, 0.0, -3.4),     // 06 BASSIST CU (Elevated framing: full bassist on stage deck with navbar margin)
      new THREE.Vector3(0.0, 0.4, -7.0),     // 07 DRUMMER (Upward dynamic angle: drummer center, text on right)
      new THREE.Vector3(4.8, 0.6, -5.4),     // 08 MOVE TO KEYBOARDIST (Smooth transit framing keyboardist head and keys)
      new THREE.Vector3(5.4, 0.4, -4.8),     // 09 KEYS CU (Cinema framing: keyboardist head, hands & synth keys fully in frame)
      new THREE.Vector3(0.0, 4.2, 17.5),     // 10 FULL BAND (High front arena angle: all 5 members together, text in sky)
      new THREE.Vector3(0.0, 11.5, 23.0),    // 11 STAGE REVEAL (Grand crane reveal of stage, lighting, trusses & arena)
      new THREE.Vector3(0.0, 5.2, 0.0)       // 12 BANNER LOCK (Fully framed RITHMOS logo banner without any edge cropping)
    ];

    // 12-Shot Camera Look-at Target Spline
    this.targetPoints = [
      new THREE.Vector3(0.0, -0.4, -2.5),    // 01 Looking ahead across crowd at glowing stage center
      new THREE.Vector3(0.0, -0.6, -2.5),    // 02 Locking onto vocalist
      new THREE.Vector3(-0.6, -0.5, -2.5),   // 03 Framing vocalist and floating text
      new THREE.Vector3(-4.5, -0.8, -6.5),   // 04 Looking towards guitarist
      new THREE.Vector3(-4.8, 0.0, -7.5),    // 05 Balanced between guitarist head/chest and text
      new THREE.Vector3(4.6, -0.4, -7.4),    // 06 Focused on bassist and text with comfortable margin
      new THREE.Vector3(1.2, 1.4, -13.2),    // 07 Looking up at drummer and text
      new THREE.Vector3(7.4, 0.2, -9.2),     // 08 Gliding smoothly toward keyboardist upper body
      new THREE.Vector3(7.2, 0.2, -9.0),     // 09 Balanced framing of keyboardist head, hands, keys, and text
      new THREE.Vector3(0.0, -0.5, -8.5),    // 10 Center stage full band framing
      new THREE.Vector3(0.0, 1.5, -10.0),    // 11 Looking down across stage, arena lighting, and crowd
      new THREE.Vector3(0.0, 5.2, -18.6)     // 12 Direct center lock on RITHMOS logo banner
    ];

    this.camCurve = new THREE.CatmullRomCurve3(this.camPoints, false, 'catmullrom', 0.5);
    this.targetCurve = new THREE.CatmullRomCurve3(this.targetPoints, false, 'catmullrom', 0.5);

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
      { p: 0.00, fov: 52 }, // 01 Crowd
      { p: 0.09, fov: 48 }, // 02 Move to Vocalist
      { p: 0.18, fov: 42 }, // 03 Vocalist CU
      { p: 0.27, fov: 46 }, // 04 Move to Guitarist
      { p: 0.36, fov: 46 }, // 05 Guitarist CU (widened to ensure head and guitar fully visible)
      { p: 0.45, fov: 44 }, // 06 Bassist
      { p: 0.55, fov: 45 }, // 07 Drummer
      { p: 0.64, fov: 48 }, // 08 Move to Keys
      { p: 0.73, fov: 52 }, // 09 Keys CU (wider to frame head, keys, and text properly)
      { p: 0.82, fov: 56 }, // 10 Full Band
      { p: 0.91, fov: 64 }, // 11 Stage Reveal
      { p: 1.00, fov: 52 }  // 12 Banner Payoff (fully framed RITHMOS logo)
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

  update(scrollProgress, mouse) {
    const p = THREE.MathUtils.clamp(scrollProgress, 0, 1);
    const camera = this.sm.camera;

    // 1. Evaluate Catmull-Rom Position and LookAt Target (uniform t across control points)
    const baseCamPos = this.camCurve.getPoint(p);
    const baseTarget = this.targetCurve.getPoint(p);

    // 2. Compute dynamic FOV (adapted for mobile portrait)
    let fov = this.getFOV(p);
    if (this.sm.aspect < 1.0) {
      fov += 14; // Widen view angle for portrait viewport
    }
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // 3. Mouse Parallax (subtle cinematic sway)
    const parallaxStrength = 0.45;
    const px = mouse ? mouse.x * parallaxStrength : 0;
    const py = mouse ? mouse.y * (parallaxStrength * 0.4) : 0;

    camera.position.set(
      baseCamPos.x + px,
      baseCamPos.y + py,
      baseCamPos.z
    );

    // 4. Subtle camera banking / roll into turns
    const tangent = this.camCurve.getTangent(p);
    const roll = -tangent.x * 0.04;
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);

    camera.lookAt(
      baseTarget.x + (mouse ? mouse.x * 0.2 : 0),
      baseTarget.y + (mouse ? mouse.y * 0.15 : 0),
      baseTarget.z
    );

    // 5. Update typography overlays and HUD
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

    // 12-Shot Storyboard thresholds
    const shotThresholds = [
      0.00, // 01 CROWD
      0.09, // 02 MOVE TO VOCALIST
      0.18, // 03 VOCALIST CU
      0.27, // 04 MOVE TO GUITARIST
      0.36, // 05 GUITARIST CU
      0.45, // 06 BASSIST
      0.55, // 07 DRUMMER
      0.64, // 08 MOVE TO KEYS
      0.73, // 09 KEYBOARDIST
      0.82, // 10 FULL BAND
      0.91, // 11 STAGE REVEAL
      1.00  // 12 RITHMOS LOCK
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

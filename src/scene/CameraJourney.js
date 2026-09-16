import * as THREE from 'three';

export class CameraJourney {
  constructor(sceneManager, layerCompositor, rehearsalEnv, waveform, particles, lenis = null) {
    this.sm = sceneManager;
    this.lc = layerCompositor;
    this.re = rehearsalEnv;
    this.wf = waveform;
    this.pt = particles;
    this.lenis = lenis;

    // 10-Shot Camera Position Spline (Physical trajectory through wide concert space)
    // Expansive stadium framing distances (10-12 units from performers) with wide lateral travel
    this.camPoints = [
      new THREE.Vector3(0.0, -0.8, 28.0),   // 01 START (CROWD - wide arena entrance)
      new THREE.Vector3(1.6, -1.5, 7.5),    // 02 VOCALIST (Center mic focus, vocalist on left)
      new THREE.Vector3(-3.2, -1.5, 4.5),   // 03 GUITARIST (Lateral sweep stage right, guitarist on left)
      new THREE.Vector3(-13.5, -1.2, -1.0), // 04 BASSIST (Deep stage right sweep, bassist on left, clear of guitarist)
      new THREE.Vector3(-2.0, 1.2, -4.0),   // 05 DRUMMER (Elevated angle, drummer framed on left)
      new THREE.Vector3(7.0, -1.5, 2.0),    // 06 KEYBOARDIST (Lateral sweep to stage left, keys on right)
      new THREE.Vector3(0.0, 1.8, 16.0),    // 07 PULL BACK (FULL BAND across wide stadium stage)
      new THREE.Vector3(0.0, 8.5, 23.0),    // 08 STAGE REVEAL (High crane arena architecture reveal)
      new THREE.Vector3(0.0, 3.5, 1.0),     // 09 MOVE TO BANNER (Push to giant LED screen)
      new THREE.Vector3(0.0, 4.0, -5.0)     // 10 RITHMOS (FINAL LOCK on stage banner)
    ];

    // 10-Shot Camera Look-at Target Spline
    this.targetPoints = [
      new THREE.Vector3(0.0, -1.0, -6.0),   // 01 Crowd looks ahead to grand stage
      new THREE.Vector3(-0.6, -1.5, -2.5),  // 02 Vocalist center mic (offset for text)
      new THREE.Vector3(-7.2, -1.5, -5.0),  // 03 Guitarist with spotlight
      new THREE.Vector3(-17.5, -1.6, -13.0),// 04 Bassist power groove
      new THREE.Vector3(1.8, -0.6, -14.0),  // 05 Drummer on kit riser
      new THREE.Vector3(14.5, -1.5, -8.5),  // 06 Keyboardist synths
      new THREE.Vector3(0.0, -1.5, -10.0),  // 07 Full band center stage
      new THREE.Vector3(0.0, -0.5, -14.0),  // 08 Wide stage & arena truss
      new THREE.Vector3(0.0, 4.0, -18.2),   // 09 Approach giant banner
      new THREE.Vector3(0.0, 4.0, -18.2)    // 10 Center lock on RITHMOS logo
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

    this.tags = {
      vocalist: document.getElementById('tag-vocalist'),
      guitarist: document.getElementById('tag-guitarist'),
      drummer: document.getElementById('tag-drummer'),
      bassist: document.getElementById('tag-bassist'),
      keyboardist: document.getElementById('tag-keyboardist')
    };

    this.shot07 = document.getElementById('shot-07');
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
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (this.lenis) {
          this.lenis.scrollTo(target * maxScroll, { duration: 1.6 });
        } else {
          window.scrollTo({ top: target * maxScroll, behavior: 'smooth' });
        }
      });
    });
  }

  getFOV(p) {
    const keys = [
      { p: 0.00, fov: 52 },
      { p: 0.11, fov: 42 },
      { p: 0.22, fov: 40 },
      { p: 0.33, fov: 42 },
      { p: 0.44, fov: 46 },
      { p: 0.56, fov: 42 },
      { p: 0.67, fov: 58 },
      { p: 0.78, fov: 62 },
      { p: 0.89, fov: 50 },
      { p: 1.00, fov: 46 }
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
    const parallaxStrength = 0.55;
    const px = mouse ? mouse.x * parallaxStrength : 0;
    const py = mouse ? mouse.y * (parallaxStrength * 0.45) : 0;

    camera.position.set(
      baseCamPos.x + px,
      baseCamPos.y + py,
      baseCamPos.z
    );

    // 4. Subtle camera banking / roll into turns
    const tangent = this.camCurve.getTangent(p);
    const roll = -tangent.x * 0.045;
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);

    camera.lookAt(
      baseTarget.x + (mouse ? mouse.x * 0.25 : 0),
      baseTarget.y + (mouse ? mouse.y * 0.18 : 0),
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

      // Word 1: EVERY BAND
      if (s1p >= 0.00 && s1p < 0.65) {
        if (this.s1Words[0]) {
          this.s1Words[0].style.opacity = '1';
          this.s1Words[0].style.transform = 'translateY(0)';
        }
      } else if (this.s1Words[0]) {
        this.s1Words[0].style.opacity = '0';
        this.s1Words[0].style.transform = 'translateY(-24px)';
      }

      // Word 2: HAS A
      if (s1p >= 0.18 && s1p < 0.75) {
        if (this.s1Words[1]) {
          this.s1Words[1].style.opacity = '1';
          this.s1Words[1].style.transform = 'translateY(0)';
        }
      } else if (this.s1Words[1]) {
        this.s1Words[1].style.opacity = '0';
        this.s1Words[1].style.transform = 'translateY(-24px)';
      }

      // Word 3: STORY.
      if (s1p >= 0.35 && s1p < 0.95) {
        if (this.s1Words[2]) {
          this.s1Words[2].style.opacity = '1';
          this.s1Words[2].style.transform = 'translateY(0)';
        }
      } else if (this.s1Words[2]) {
        this.s1Words[2].style.opacity = '0';
        this.s1Words[2].style.transform = 'translateY(-24px)';
      }
    } else {
      if (this.shot01) this.shot01.classList.remove('active');
    }

    // ----------------------------------------
    // SHOTS 02-06: Performer Focus HUD Badges
    // ----------------------------------------
    // Shot 02 Vocalist (0.07 -> 0.17)
    if (this.tags.vocalist) {
      if (p >= 0.07 && p <= 0.17) this.tags.vocalist.classList.add('active');
      else this.tags.vocalist.classList.remove('active');
    }

    // Shot 03 Guitarist (0.18 -> 0.28)
    if (this.tags.guitarist) {
      if (p >= 0.18 && p <= 0.28) this.tags.guitarist.classList.add('active');
      else this.tags.guitarist.classList.remove('active');
    }

    // Shot 04 Bassist (0.29 -> 0.39)
    if (this.tags.bassist) {
      if (p >= 0.29 && p <= 0.39) this.tags.bassist.classList.add('active');
      else this.tags.bassist.classList.remove('active');
    }

    // Shot 05 Drummer (0.40 -> 0.50)
    if (this.tags.drummer) {
      if (p >= 0.40 && p <= 0.50) this.tags.drummer.classList.add('active');
      else this.tags.drummer.classList.remove('active');
    }

    // Shot 06 Keyboardist (0.51 -> 0.61)
    if (this.tags.keyboardist) {
      if (p >= 0.51 && p <= 0.61) this.tags.keyboardist.classList.add('active');
      else this.tags.keyboardist.classList.remove('active');
    }

    // ----------------------------------------
    // SHOT 07: Full Band Reveal (0.62 -> 0.73)
    // ----------------------------------------
    if (this.shot07) {
      if (p >= 0.62 && p <= 0.73) this.shot07.classList.add('active');
      else this.shot07.classList.remove('active');
    }

    // ----------------------------------------
    // SHOT 08: Stage Arena Reveal (0.74 -> 0.84)
    // ----------------------------------------
    if (this.shot08) {
      if (p >= 0.74 && p <= 0.84) this.shot08.classList.add('active');
      else this.shot08.classList.remove('active');
    }

    // ----------------------------------------
    // SHOT 09-10: RITHMOS Banner Payoff & Conversion (0.85 -> 1.00)
    // ----------------------------------------
    if (this.shot10) {
      if (p >= 0.85) {
        this.shot10.classList.add('active');
        const payoffP = (p - 0.85) / 0.15;
        if (this.s5Content) {
          this.s5Content.style.opacity = `${Math.min(payoffP * 2.0, 1.0)}`;
          this.s5Content.style.transform = `translateY(${(1.0 - Math.min(payoffP * 1.5, 1.0)) * 24}px)`;
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

    // Determine nearest active shot index
    const shotThresholds = [0.00, 0.11, 0.22, 0.33, 0.44, 0.56, 0.67, 0.78, 0.89, 1.00];
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

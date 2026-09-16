import * as THREE from 'three';

export class CameraJourney {
  constructor(sceneManager, layerCompositor, rehearsalEnv, waveform, particles, lenis = null) {
    this.sm = sceneManager;
    this.lc = layerCompositor;
    this.re = rehearsalEnv;
    this.wf = waveform;
    this.pt = particles;
    this.lenis = lenis;

    // 10-Shot Camera Position Spline (Physical trajectory through deep concert space)
    // Snaking through: Crowd -> Vocalist -> Guitarist -> Bassist -> Drummer -> Keyboardist -> Full Band -> Stage Reveal -> Banner Push -> Rithmos Lock
    this.camPoints = [
      new THREE.Vector3(0.0, -0.2, 50.0),    // 01 START (CROWD - far entrance, distant stage, ocean of hands below)
      new THREE.Vector3(1.6, -1.0, 3.4),     // 02 VOCALIST (Clean close-up framing face, curls, mic, torso on left)
      new THREE.Vector3(-6.2, -1.8, -19.2),  // 03 GUITARIST (Low angle close-up on guitar, body & fretboard on left)
      new THREE.Vector3(-7.8, -1.4, -37.5),  // 04 BASSIST (Dynamic close-up on bassist groove, text clear on right)
      new THREE.Vector3(-2.8, 2.0, -56.5),   // 05 DRUMMER (Elevated close-up framing drummer, raised sticks & cymbals)
      new THREE.Vector3(9.8, -1.4, -75.5),   // 06 KEYBOARDIST (Close-up sweep across synth keys and performer)
      new THREE.Vector3(0.0, 8.0, 18.0),     // 07 PULL BACK (FULL BAND - high stadium view of all 5 performers from front)
      new THREE.Vector3(0.0, 18.0, 20.0),    // 08 STAGE REVEAL (Grand crane arena reveal of trusses & full venue)
      new THREE.Vector3(0.0, 8.0, -66.0),    // 09 MOVE TO BANNER (High-speed forward drive down arena center)
      new THREE.Vector3(0.0, 8.2, -84.0)     // 10 RITHMOS (FINAL LOCK on giant glowing stage banner)
    ];

    // 10-Shot Camera Look-at Target Spline
    this.targetPoints = [
      new THREE.Vector3(0.0, 0.5, -20.0),    // 01 Looks ahead across crowd toward glowing distant stage
      new THREE.Vector3(-0.4, -0.8, 0.0),    // 02 Center-left lock on vocalist silhouette
      new THREE.Vector3(-8.6, -1.8, -22.0),  // 03 Low lock on guitarist
      new THREE.Vector3(-11.5, -1.6, -42.0), // 04 Lock on bassist
      new THREE.Vector3(-0.2, 0.8, -62.0),   // 05 Lock on drummer on kit riser
      new THREE.Vector3(12.5, -1.8, -80.0),  // 06 Lock on keyboardist synths
      new THREE.Vector3(0.0, 0.5, -45.0),    // 07 Looking center stage at full band formation
      new THREE.Vector3(0.0, 3.0, -55.0),    // 08 Looking wide across grand stage and arena truss
      new THREE.Vector3(0.0, 8.0, -104.0),   // 09 Approach giant banner
      new THREE.Vector3(0.0, 8.0, -104.0)    // 10 Center lock on RITHMOS logo
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
      { p: 0.11, fov: 36 },
      { p: 0.22, fov: 38 },
      { p: 0.33, fov: 40 },
      { p: 0.44, fov: 42 },
      { p: 0.56, fov: 40 },
      { p: 0.67, fov: 62 },
      { p: 0.78, fov: 66 },
      { p: 0.89, fov: 52 },
      { p: 1.00, fov: 48 }
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

      // Word 1: EVERY BAND (visible immediately at p=0)
      if (s1p >= 0.00 && s1p < 0.70) {
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

      // Word 3 (if present in DOM)
      if (this.s1Words[2]) {
        this.s1Words[2].style.display = 'none';
      }
    } else {
      if (this.shot01) this.shot01.classList.remove('active');
    }

    // ----------------------------------------
    // SHOTS 02-06: Performer Focus HUD Badges (Strictly synchronized to camera framing)
    // ----------------------------------------
    // Shot 02 Vocalist: Control point 0.111. Visible when camera is framing vocalist (0.08 -> 0.14)
    if (this.tags.vocalist) {
      if (p >= 0.08 && p <= 0.14) this.tags.vocalist.classList.add('active');
      else this.tags.vocalist.classList.remove('active');
    }

    // Shot 03 Guitarist: Control point 0.222. Visible when camera is framing guitarist (0.18 -> 0.25)
    if (this.tags.guitarist) {
      if (p >= 0.18 && p <= 0.25) this.tags.guitarist.classList.add('active');
      else this.tags.guitarist.classList.remove('active');
    }

    // Shot 04 Bassist: Control point 0.333. Visible when camera is framing bassist (0.29 -> 0.36)
    if (this.tags.bassist) {
      if (p >= 0.29 && p <= 0.36) this.tags.bassist.classList.add('active');
      else this.tags.bassist.classList.remove('active');
    }

    // Shot 05 Drummer: Control point 0.444. Visible when camera is framing drummer (0.40 -> 0.47)
    if (this.tags.drummer) {
      if (p >= 0.40 && p <= 0.47) this.tags.drummer.classList.add('active');
      else this.tags.drummer.classList.remove('active');
    }

    // Shot 06 Keyboardist: Control point 0.556. Visible when camera is framing keyboardist (0.51 -> 0.58)
    if (this.tags.keyboardist) {
      if (p >= 0.51 && p <= 0.58) this.tags.keyboardist.classList.add('active');
      else this.tags.keyboardist.classList.remove('active');
    }

    // ----------------------------------------
    // SHOT 07: Full Band Reveal: Control point 0.667. Visible when camera is pulled back (0.62 -> 0.72)
    // ----------------------------------------
    if (this.shot07) {
      if (p >= 0.62 && p <= 0.72) this.shot07.classList.add('active');
      else this.shot07.classList.remove('active');
    }

    // ----------------------------------------
    // SHOT 08: Stage Arena Reveal: Control point 0.778. Visible during crane reveal (0.73 -> 0.83)
    // ----------------------------------------
    if (this.shot08) {
      if (p >= 0.73 && p <= 0.83) this.shot08.classList.add('active');
      else this.shot08.classList.remove('active');
    }

    // ----------------------------------------
    // SHOT 09-10: RITHMOS Banner Payoff & Conversion: Control points 0.889 - 1.000. (0.87 -> 1.00)
    // ----------------------------------------
    if (this.shot10) {
      if (p >= 0.87) {
        this.shot10.classList.add('active');
        const payoffP = (p - 0.87) / 0.13;
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

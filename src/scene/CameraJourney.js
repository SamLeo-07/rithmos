import * as THREE from 'three';

export class CameraJourney {
  constructor(sceneManager, layerCompositor, rehearsalEnv, waveform, particles) {
    this.sm = sceneManager;
    this.lc = layerCompositor;
    this.re = rehearsalEnv;
    this.wf = waveform;
    this.pt = particles;

    // DOM scene & typography elements
    this.domScenes = {
      s1: document.getElementById('scene-1'),
      s2: document.getElementById('scene-2'),
      s3: document.getElementById('scene-3'),
      s4: document.getElementById('scene-4'),
      s5: document.getElementById('scene-5')
    };

    this.s1Words = [
      document.getElementById('s1-word-1'),
      document.getElementById('s1-word-2'),
      document.getElementById('s1-word-3')
    ];

    this.s2Cards = [
      document.getElementById('s2-card-1'),
      document.getElementById('s2-card-2')
    ];

    this.s3Milestones = document.querySelectorAll('.evolution-milestones .milestone');
    this.s3Verbs = document.querySelectorAll('.kinetic-verbs .k-verb');
    this.s3Statement = document.getElementById('s3-statement');

    this.s4Words = {
      w1: document.getElementById('s4-w1'),
      w2: document.getElementById('s4-w2'),
      w3: document.getElementById('s4-w3'),
      w4: document.getElementById('s4-w4'),
      w5: document.getElementById('s4-w5')
    };

    this.s5Content = document.getElementById('s5-content');

    this.hudNodes = document.querySelectorAll('.hud-node');
    this.hudIndicator = document.getElementById('hud-indicator');
    this.hudCamZ = document.getElementById('hud-cam-z');
  }

  update(scrollProgress, mouse) {
    const p = THREE.MathUtils.clamp(scrollProgress, 0, 1);
    const camera = this.sm.camera;

    // Base position & lookAt vectors
    let camX = 0;
    let camY = -4.5;
    let camZ = 16.0;
    let targetX = 0;
    let targetY = -2.5;
    let targetZ = 0;
    let fov = this.sm.aspect < 1.0 ? 65 : 50;

    // ==========================================
    // SECTION 1: THE STAGE (0.00 -> 0.20)
    // ==========================================
    if (p < 0.20) {
      const s1p = p / 0.20;

      // 0% -> 35%: Camera rises from inside crowd toward performers
      if (s1p < 0.35) {
        const subP = s1p / 0.35;
        camX = Math.sin(subP * Math.PI) * 0.4;
        camY = THREE.MathUtils.lerp(-4.5, -1.8, subP);
        camZ = THREE.MathUtils.lerp(16.0, 11.5, subP);
        targetY = THREE.MathUtils.lerp(-2.5, -2.2, subP);

        // Foreground hands drop and separate
        if (this.lc.layers.foregroundHands) {
          this.lc.layers.foregroundHands.mesh.position.y = -6.5 - subP * 3.2;
          this.lc.layers.foregroundHands.mesh.scale.set(1 + subP * 0.2, 1 + subP * 0.2, 1);
          this.lc.layers.foregroundHands.material.opacity = 1.0 - subP * 0.4;
        }
      } 
      // 35% -> 70%: Ascends through performers, vocalist focal point
      else if (s1p < 0.70) {
        const subP = (s1p - 0.35) / 0.35;
        camX = Math.sin(subP * Math.PI * 1.5) * 0.8;
        camY = THREE.MathUtils.lerp(-1.8, 3.2, subP);
        camZ = THREE.MathUtils.lerp(11.5, 3.5, subP);
        targetY = THREE.MathUtils.lerp(-2.2, -1.0, subP);

        if (this.lc.layers.foregroundHands) {
          this.lc.layers.foregroundHands.material.opacity = Math.max(0, 0.6 - subP * 0.6);
        }
      }
      // 70% -> 100%: Passes above stage, waveform appears
      else {
        const subP = (s1p - 0.70) / 0.30;
        camX = Math.cos(subP * Math.PI) * 0.5;
        camY = THREE.MathUtils.lerp(3.2, 7.2, subP);
        camZ = THREE.MathUtils.lerp(3.5, -4.0, subP);
        targetY = THREE.MathUtils.lerp(-1.0, -3.8, subP);
        targetZ = THREE.MathUtils.lerp(0, -18, subP);

        if (this.lc.layers.foregroundHands) {
          this.lc.layers.foregroundHands.material.opacity = 0;
        }
      }

      // Layer visibilities for Section 1
      this.setArenaVisibility(1.0);
      if (s1p >= 0.35 && this.lc.layers.foregroundHands) {
        this.lc.layers.foregroundHands.material.opacity = Math.max(0, 1.0 - (s1p - 0.35) * 2.8);
      }
      if (this.lc.layers.logo) this.lc.layers.logo.material.opacity = 0;
    }

    // ==========================================
    // SECTION 2: WHERE STORIES BEGIN (0.20 -> 0.40)
    // ==========================================
    else if (p >= 0.20 && p < 0.40) {
      const s2p = (p - 0.20) / 0.20;

      // Starts from Section 1 end (Y = 7.2, Z = -4.0)
      // Pulls backward and down into the intimate rehearsal room
      camX = (1 - s2p) * 0.5 + Math.sin(s2p * Math.PI) * 0.6;
      camY = THREE.MathUtils.lerp(7.2, 0.0, s2p);
      camZ = THREE.MathUtils.lerp(-4.0, 5.5, s2p);
      targetY = THREE.MathUtils.lerp(-3.8, 0.0, s2p);
      targetZ = THREE.MathUtils.lerp(-18, -6.0, s2p);

      // Arena trusses and lighting retract & dissolve into rehearsal space
      const arenaFade = 1.0 - Math.min(s2p * 1.5, 1.0);
      this.setArenaVisibility(arenaFade);

      // Silhouettes remain grounded and intimate
      if (this.lc.layers.drummer) this.lc.layers.drummer.material.opacity = 0.65;
      if (this.lc.layers.guitarist) this.lc.layers.guitarist.material.opacity = 0.8;
      if (this.lc.layers.bassist) this.lc.layers.bassist.material.opacity = 0.8;
      if (this.lc.layers.keyboardist) this.lc.layers.keyboardist.material.opacity = 0.7;
      if (this.lc.layers.bandFull) this.lc.layers.bandFull.material.opacity = 0.85;

      if (this.lc.layers.logo) this.lc.layers.logo.material.opacity = 0;
    }

    // ==========================================
    // SECTION 3: THE JOURNEY (0.40 -> 0.65)
    // ==========================================
    else if (p >= 0.40 && p < 0.65) {
      const s3p = (p - 0.40) / 0.25;

      // Camera progresses through expanding spaces toward the illuminated portal
      camX = Math.sin(s3p * Math.PI * 2.0) * 1.2;
      camY = THREE.MathUtils.lerp(0.0, 0.8, s3p);
      camZ = THREE.MathUtils.lerp(5.5, 0.5, s3p);
      targetY = THREE.MathUtils.lerp(0.0, 0.3, s3p);
      targetZ = THREE.MathUtils.lerp(-6.0, -9.0, s3p);

      // Silhouettes scale and energize
      const bandScale = 1.0 + s3p * 0.25;
      if (this.lc.layers.bandFull) {
        this.lc.layers.bandFull.mesh.scale.set(bandScale, bandScale, 1);
        this.lc.layers.bandFull.material.opacity = 0.85 + s3p * 0.15;
      }

      // Midground crowd begins reappearing toward the end of Section 3
      if (this.lc.layers.crowd) {
        this.lc.layers.crowd.material.opacity = Math.max(0, (s3p - 0.5) * 1.5);
      }

      if (this.lc.layers.logo) this.lc.layers.logo.material.opacity = 0;
    }

    // ==========================================
    // SECTION 4: THE CLIMAX STAGE (0.65 -> 0.85)
    // ==========================================
    else if (p >= 0.65 && p < 0.85) {
      const s4p = (p - 0.65) / 0.20;

      // Breakthrough the doorway portal!
      // Arena re-explodes with massive scale and lighting
      camX = Math.sin(s4p * Math.PI) * 0.7;
      camY = THREE.MathUtils.lerp(0.8, -0.6, s4p);
      camZ = THREE.MathUtils.lerp(0.5, -1.8, s4p);
      targetY = THREE.MathUtils.lerp(0.3, -1.5, s4p);
      targetZ = -10.0;

      // Re-enable arena architecture with full power
      this.setArenaVisibility(1.0);
      if (this.lc.layers.lighting) {
        this.lc.layers.lighting.material.opacity = 0.85 + Math.sin(s4p * Math.PI) * 0.15;
      }
      if (this.lc.layers.crowd) {
        this.lc.layers.crowd.material.opacity = 0.9;
      }
      if (this.lc.layers.foregroundHands) {
        this.lc.layers.foregroundHands.material.opacity = 0.8 * s4p;
      }

      if (this.lc.layers.logo) this.lc.layers.logo.material.opacity = 0;
    }

    // ==========================================
    // SECTION 5: WHERE BANDS RISE (0.85 -> 1.00)
    // ==========================================
    else {
      const s5p = (p - 0.85) / 0.15;

      // Camera transitions smoothly into the grand hero payoff framing
      camX = 0;
      camY = THREE.MathUtils.lerp(-0.6, 1.0, s5p);
      camZ = THREE.MathUtils.lerp(-1.8, 7.5, s5p);
      targetY = THREE.MathUtils.lerp(-1.5, 1.2, s5p);
      targetZ = THREE.MathUtils.lerp(-10.0, -2.0, s5p);

      // RITHMOS authentic logo resolves
      if (this.lc.layers.logo) {
        const logoFade = Math.min(s5p * 1.6, 1.0);
        this.lc.layers.logo.material.opacity = logoFade;
        const logoScale = THREE.MathUtils.lerp(0.9, 1.0, logoFade);
        this.lc.layers.logo.mesh.scale.set(logoScale, logoScale, 1);
      }

      // Stage elements framed harmoniously behind the logo
      if (this.lc.layers.bandFull) {
        this.lc.layers.bandFull.material.opacity = 0.65;
      }
      if (this.lc.layers.truss) {
        this.lc.layers.truss.material.opacity = 0.8;
      }
      if (this.lc.layers.lighting) {
        this.lc.layers.lighting.material.opacity = 0.9;
      }
      if (this.lc.layers.crowd) {
        this.lc.layers.crowd.material.opacity = 0.7;
      }
      if (this.lc.layers.foregroundHands) {
        this.lc.layers.foregroundHands.material.opacity = 0.4;
      }
    }

    // Apply mouse parallax smoothly
    const parallaxStrength = 0.65;
    camera.position.x = camX + (mouse ? mouse.x * parallaxStrength : 0);
    camera.position.y = camY + (mouse ? mouse.y * (parallaxStrength * 0.5) : 0);
    camera.position.z = camZ;

    camera.lookAt(targetX + (mouse ? mouse.x * 0.3 : 0), targetY + (mouse ? mouse.y * 0.2 : 0), targetZ);

    // Update typography overlay and HUD
    this.updateTypography(p);
    this.updateHUD(p, camZ);
  }

  setArenaVisibility(opacity) {
    if (this.lc.layers.venueArch) this.lc.layers.venueArch.material.opacity = opacity * 0.9;
    if (this.lc.layers.truss) this.lc.layers.truss.material.opacity = opacity * 0.9;
    if (this.lc.layers.platform) this.lc.layers.platform.material.opacity = opacity * 0.95;
    if (this.lc.layers.lighting) this.lc.layers.lighting.material.opacity = opacity * 0.85;
    if (this.lc.layers.particlesSheet) this.lc.layers.particlesSheet.material.opacity = opacity * 0.6;
    if (this.lc.layers.crowd) this.lc.layers.crowd.material.opacity = opacity * 0.85;
    if (this.lc.layers.foregroundHands) this.lc.layers.foregroundHands.material.opacity = opacity * 0.7;
  }

  updateTypography(p) {
    // Determine active section
    const currentSection = 
      p < 0.20 ? 's1' :
      p < 0.40 ? 's2' :
      p < 0.65 ? 's3' :
      p < 0.85 ? 's4' : 's5';

    // Toggle active class on scenes
    Object.keys(this.domScenes).forEach(key => {
      const el = this.domScenes[key];
      if (key === currentSection) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // ----------------------------------------
    // Section 1 typography: Progressive reveals & clean solo climax
    // ----------------------------------------
    if (currentSection === 's1') {
      const s1p = p / 0.20;
      
      // Word 1: EVERY BAND (active 0.05 -> 0.55, fades when STORY takes over)
      if (s1p >= 0.05 && s1p < 0.60) {
        this.s1Words[0].style.opacity = '1';
        this.s1Words[0].style.transform = 'translateY(0)';
      } else {
        this.s1Words[0].style.opacity = '0';
        this.s1Words[0].style.transform = s1p >= 0.60 ? 'translateY(-30px)' : 'translateY(30px)';
      }

      // Word 2: HAS A (active 0.22 -> 0.60, fades when STORY takes over)
      if (s1p >= 0.22 && s1p < 0.60) {
        this.s1Words[1].style.opacity = '1';
        this.s1Words[1].style.transform = 'translateY(0)';
      } else {
        this.s1Words[1].style.opacity = '0';
        this.s1Words[1].style.transform = s1p >= 0.60 ? 'translateY(-20px)' : 'translateY(30px)';
      }

      // Word 3: STORY.
      if (s1p >= 0.40) {
        // When STORY becomes large, it commands the full screen alone
        if (s1p >= 0.60) {
          const grow = (s1p - 0.60) / 0.40;
          const scale = 1.0 + grow * 2.8;
          const ty = -grow * 60;
          this.s1Words[2].style.transform = `scale(${scale}) translateY(${ty}px)`;
          if (s1p >= 0.85) {
            // Begins breaking apart / fading into particles
            this.s1Words[2].style.opacity = `${Math.max(0, 1 - (s1p - 0.85) / 0.15)}`;
          } else {
            this.s1Words[2].style.opacity = '1';
          }
        } else {
          this.s1Words[2].style.opacity = '1';
          this.s1Words[2].style.transform = 'scale(1) translateY(0)';
        }
      } else {
        this.s1Words[2].style.opacity = '0';
        this.s1Words[2].style.transform = 'translateY(30px)';
      }
    }

    // ----------------------------------------
    // Section 2 typography: Sequential card focus (no clutter)
    // ----------------------------------------
    if (currentSection === 's2') {
      const s2p = (p - 0.20) / 0.20;

      // Card 1: Question in prologue (0.08 -> 0.48)
      if (s2p >= 0.08 && s2p < 0.48) {
        this.s2Cards[0].style.opacity = '1';
        this.s2Cards[0].style.transform = 'translateX(0)';
      } else {
        this.s2Cards[0].style.opacity = '0';
        this.s2Cards[0].style.transform = s2p >= 0.48 ? 'translateX(-50px)' : 'translateX(-30px)';
      }

      // Card 2: Rehearsal quote (0.50 -> 0.95)
      if (s2p >= 0.50) {
        this.s2Cards[1].style.opacity = '1';
        this.s2Cards[1].style.transform = 'translateX(0)';
      } else {
        this.s2Cards[1].style.opacity = '0';
        this.s2Cards[1].style.transform = 'translateX(40px)';
      }
    }

    // ----------------------------------------
    // Section 3 typography: The Journey evolution
    // ----------------------------------------
    if (currentSection === 's3') {
      const s3p = (p - 0.40) / 0.25;
      
      // Milestone progression: 0 to 4
      const activeIdx = Math.min(Math.floor(s3p * 5), 4);
      this.s3Milestones.forEach((m, idx) => {
        if (idx <= activeIdx) m.classList.add('active');
        else m.classList.remove('active');
      });

      // Kinetic verbs: PLAY, LEARN, PERFORM, GROW (active 0.0 -> 0.72)
      if (s3p < 0.72) {
        const verbIdx = Math.min(Math.floor(s3p * 4 / 0.72), 3);
        this.s3Verbs.forEach((v, idx) => {
          if (idx === verbIdx) {
            v.classList.add('active');
            v.style.opacity = '1';
            v.style.transform = 'scale(1.15)';
          } else {
            v.classList.remove('active');
            v.style.opacity = '0.2';
            v.style.transform = 'scale(0.95)';
          }
        });
        this.s3Statement.style.opacity = '0';
        this.s3Statement.style.transform = 'translateY(25px)';
      } else {
        // When statement arrives, fade out verbs cleanly
        this.s3Verbs.forEach(v => {
          v.style.opacity = '0';
          v.classList.remove('active');
        });
        this.s3Statement.style.opacity = '1';
        this.s3Statement.style.transform = 'translateY(0)';
      }
    }

    // ----------------------------------------
    // Section 4 typography: Interactive 3D depth choreography
    // Words transit sequentially through space without piling up
    // ----------------------------------------
    if (currentSection === 's4') {
      const s4p = (p - 0.65) / 0.20;

      // 1. EVERY: moves backward in depth (active 0.00 -> 0.35)
      if (s4p < 0.35) {
        const localP = s4p / 0.35;
        const everyZ = -localP * 400;
        this.s4Words.w1.style.transform = `translate3d(-18vw, -12vh, ${everyZ}px)`;
        this.s4Words.w1.style.opacity = `${localP > 0.8 ? (1 - localP) / 0.2 : Math.min(localP * 3, 1)}`;
      } else {
        this.s4Words.w1.style.opacity = '0';
      }

      // 2. STORY: surges forward toward camera (active 0.18 -> 0.52)
      if (s4p >= 0.18 && s4p < 0.52) {
        const localP = (s4p - 0.18) / 0.34;
        const storyZ = (localP - 0.5) * 500;
        this.s4Words.w2.style.transform = `translate3d(14vw, -6vh, ${storyZ}px)`;
        this.s4Words.w2.style.opacity = `${localP > 0.75 ? (1 - localP) / 0.25 : Math.min(localP * 4, 1)}`;
      } else {
        this.s4Words.w2.style.opacity = '0';
      }

      // 3. NEEDS: slides horizontally through the stage (active 0.38 -> 0.70)
      if (s4p >= 0.38 && s4p < 0.70) {
        const localP = (s4p - 0.38) / 0.32;
        const needsX = -35 + localP * 70;
        this.s4Words.w3.style.transform = `translate3d(${needsX}vw, 4vh, -30px)`;
        this.s4Words.w3.style.opacity = `${localP > 0.8 ? (1 - localP) / 0.2 : Math.min(localP * 4, 1)}`;
      } else {
        this.s4Words.w3.style.opacity = '0';
      }

      // 4. A: briefly scales oversized in center (active 0.56 -> 0.76)
      if (s4p >= 0.56 && s4p < 0.76) {
        const localP = (s4p - 0.56) / 0.20;
        const aScale = 1.0 + Math.sin(localP * Math.PI) * 2.2;
        this.s4Words.w4.style.transform = `translate3d(0, 0, 40px) scale(${aScale})`;
        this.s4Words.w4.style.opacity = `${Math.sin(localP * Math.PI)}`;
      } else {
        this.s4Words.w4.style.opacity = '0';
      }

      // 5. STAGE.: fills the environment with crimson energy (active 0.77 -> 1.00)
      if (s4p >= 0.77) {
        const localP = (s4p - 0.77) / 0.23;
        const stageScale = 0.95 + localP * 0.75;
        this.s4Words.w5.style.transform = `translate3d(0, 6vh, 0) scale(${stageScale})`;
        this.s4Words.w5.style.opacity = `${Math.min(localP * 3.5, 1)}`;
      } else {
        this.s4Words.w5.style.opacity = '0';
      }
    }

    // ----------------------------------------
    // Section 5 typography: Payoff & CTAs
    // ----------------------------------------
    if (currentSection === 's5') {
      const s5p = (p - 0.85) / 0.15;
      this.s5Content.style.opacity = `${Math.min(s5p * 2, 1)}`;
      this.s5Content.style.transform = `translateY(${(1 - Math.min(s5p * 1.5, 1)) * 30}px)`;
    }
  }

  updateHUD(p, camZ) {
    if (this.hudIndicator) {
      this.hudIndicator.style.top = `${p * 156}px`;
    }

    if (this.hudCamZ) {
      this.hudCamZ.textContent = `${camZ >= 0 ? '+' : ''}${camZ.toFixed(1)}`;
    }

    // Active node state
    const stageIdx = 
      p < 0.20 ? 0 :
      p < 0.40 ? 1 :
      p < 0.65 ? 2 :
      p < 0.85 ? 3 : 4;

    this.hudNodes.forEach((node, idx) => {
      if (idx === stageIdx) node.classList.add('active');
      else node.classList.remove('active');
    });
  }
}

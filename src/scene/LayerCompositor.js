import * as THREE from 'three';

export class LayerCompositor {
  constructor(scene) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.layers = {};
    this.fogPlanes = [];
    this.performers = {};
    this.textBillboards = {};

    this.shadowTexture = this.createContactShadowTexture();
    this.spotlightTexture = this.createSpotlightPoolTexture();

    this.initLayers();
    this.initTextBillboards();
  }

  createPlaneMesh(texturePath, width, height, options = {}) {
    const texture = this.textureLoader.load(texturePath);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    const geometry = new THREE.PlaneGeometry(width, height);
    const materialConfig = {
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      alphaTest: 0.04,
      side: THREE.DoubleSide,
      ...options
    };

    const material = new THREE.MeshBasicMaterial(materialConfig);
    const mesh = new THREE.Mesh(geometry, material);
    return { mesh, material, texture };
  }

  createContactShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.90)');
    grad.addColorStop(0.3, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.22)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  createSpotlightPoolTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 35, 55, 0.85)');
    grad.addColorStop(0.25, 'rgba(255, 20, 45, 0.45)');
    grad.addColorStop(0.65, 'rgba(180, 10, 30, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  addPerformerGrounding(x, floorY, z, shadowW, shadowH, poolW, poolH) {
    // 1. Soft Floor Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(shadowW, shadowH);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.shadowTexture,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      depthTest: true
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(x, floorY + 0.04, z);
    this.scene.add(shadowMesh);

    // 2. Glowing Stage Floor Spotlight Pool
    const poolGeo = new THREE.PlaneGeometry(poolW, poolH);
    const poolMat = new THREE.MeshBasicMaterial({
      map: this.spotlightTexture,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    });
    const poolMesh = new THREE.Mesh(poolGeo, poolMat);
    poolMesh.rotation.x = -Math.PI / 2;
    poolMesh.position.set(x, floorY + 0.05, z);
    this.scene.add(poolMesh);

    return { shadowMesh, shadowMat, poolMesh, poolMat, baseZ: z };
  }

  initLayers() {
    // =========================================================================
    // 1. VENUE ARCHITECTURE & BACKDROP (Single concert stage setting)
    // =========================================================================
    // Far Venue Architecture (stadium / arena roof & high arches)
    this.layers.venueArch = this.createPlaneMesh('/assets/venue-arch.png', 80, 40);
    this.layers.venueArch.mesh.position.set(0, 12.0, -28.0);
    this.scene.add(this.layers.venueArch.mesh);

    // Giant LED Stage Banner Backdrop (Dark glowing screen backing)
    const bannerGeo = new THREE.PlaneGeometry(42, 21);
    const bannerMat = new THREE.MeshBasicMaterial({
      color: 0x060103,
      transparent: true,
      opacity: 0.94,
      depthTest: true,
      depthWrite: false
    });
    this.bannerScreen = new THREE.Mesh(bannerGeo, bannerMat);
    this.bannerScreen.position.set(0, 5.2, -18.8);
    this.scene.add(this.bannerScreen);

    // Authentic RITHMOS Stage Banner
    this.layers.logo = this.createPlaneMesh('/assets/logo.png', 28, 14, {
      opacity: 0.95,
      transparent: true
    });
    this.layers.logo.mesh.position.set(0, 5.2, -18.6);
    this.scene.add(this.layers.logo.mesh);

    // Overhead Arena Truss Structure (Directly over the single stage)
    this.layers.truss = this.createPlaneMesh('/assets/truss-structure.png', 52, 26);
    this.layers.truss.mesh.position.set(0, 7.6, -10.0);
    this.scene.add(this.layers.truss.mesh);

    // Concert Stage Lighting Beams (Additive spotlights washing stage)
    this.layers.lighting = this.createPlaneMesh('/assets/lighting.png', 56, 28, {
      blending: THREE.AdditiveBlending,
      opacity: 0.85
    });
    this.layers.lighting.mesh.position.set(0, 8.4, -9.8);
    this.scene.add(this.layers.lighting.mesh);

    // Backstage wash lighting
    this.layers.lightingBack = this.createPlaneMesh('/assets/lighting.png', 48, 24, {
      blending: THREE.AdditiveBlending,
      opacity: 0.70
    });
    this.layers.lightingBack.mesh.position.set(0, 6.0, -17.5);
    this.scene.add(this.layers.lightingBack.mesh);

    // =========================================================================
    // 2. ONE SINGLE COHESIVE STAGE PLATFORM (No 3x duplicate stages!)
    // =========================================================================
    // Main unified concert stage deck (Z = 0 to Z = -18)
    this.layers.stagePlatform = this.createPlaneMesh('/assets/stage-platform.png', 48, 24);
    this.layers.stagePlatform.mesh.position.set(0, -4.6, -10.0);
    this.scene.add(this.layers.stagePlatform.mesh);

    // Elevated Drum Riser on center rear stage
    this.layers.drumPlatform = this.createPlaneMesh('/assets/stage-platform.png', 15, 7.5);
    this.layers.drumPlatform.mesh.position.set(0, -2.4, -13.8);
    this.scene.add(this.layers.drumPlatform.mesh);

    // =========================================================================
    // 3. THE 5 BAND MEMBERS (Standing together on the SAME stage)
    // Storyboard: "SAME STAGE, DIFFERENT STORIES. ONE RITHMOS."
    // Stage floor level: Y = -4.0 (drum riser top Y = -1.8)
    // =========================================================================

    // Vocalist: Center front lip (Z = -2.5, X = 0.0)
    this.layers.vocalist = this.createPlaneMesh('/assets/vocalist.png', 2.51, 6.8);
    this.layers.vocalist.mesh.position.set(0.0, -0.6, -2.5);
    this.scene.add(this.layers.vocalist.mesh);
    this.layers.vocalist.grounding = this.addPerformerGrounding(0.0, -3.95, -2.5, 3.8, 2.0, 5.8, 3.2);
    this.performers.vocalist = this.layers.vocalist;

    // Guitarist: Stage right mid-stage (Z = -7.5, X = -5.5)
    this.layers.guitarist = this.createPlaneMesh('/assets/guitarist.png', 9.0, 6.0);
    this.layers.guitarist.mesh.position.set(-5.5, -1.0, -7.5);
    this.scene.add(this.layers.guitarist.mesh);
    this.layers.guitarist.grounding = this.addPerformerGrounding(-5.5, -3.95, -7.5, 4.8, 2.6, 7.2, 4.2);
    this.performers.guitarist = this.layers.guitarist;

    // Bassist: Stage left mid-stage (Z = -7.5, X = +5.5)
    this.layers.bassist = this.createPlaneMesh('/assets/bassist.png', 8.7, 5.8);
    this.layers.bassist.mesh.position.set(5.5, -1.1, -7.5);
    this.scene.add(this.layers.bassist.mesh);
    this.layers.bassist.grounding = this.addPerformerGrounding(5.5, -3.95, -7.5, 4.8, 2.6, 7.2, 4.2);
    this.performers.bassist = this.layers.bassist;

    // Drummer: Center stage back on elevated drum riser (Z = -13.5, X = 0.0)
    this.layers.drummer = this.createPlaneMesh('/assets/drummer.png', 7.1, 6.5);
    this.layers.drummer.mesh.position.set(0.0, 1.45, -13.5);
    this.scene.add(this.layers.drummer.mesh);
    this.layers.drummer.grounding = this.addPerformerGrounding(0.0, -1.75, -13.5, 7.5, 3.8, 10.0, 5.2);
    this.performers.drummer = this.layers.drummer;

    // Keyboardist: Stage left rear (Z = -11.5, X = +8.5)
    this.layers.keyboardist = this.createPlaneMesh('/assets/keyboardist.png', 9.0, 6.0);
    this.layers.keyboardist.mesh.position.set(8.5, -1.0, -11.5);
    this.scene.add(this.layers.keyboardist.mesh);
    this.layers.keyboardist.grounding = this.addPerformerGrounding(8.5, -3.95, -11.5, 5.2, 2.8, 7.8, 4.5);
    this.performers.keyboardist = this.layers.keyboardist;

    // =========================================================================
    // 4. AUDIENCE LAYERS (Front of stage Z = +6 down to Z = +34)
    // =========================================================================
    this.crowdLayers = [];
    const audienceConfigs = [
      { type: 'hands', w: 18, h: 10.0, x: 0.0,  y: -5.0, z: 34.0, op: 0.96 },
      { type: 'hands', w: 22, h: 12.0, x: -6.0, y: -6.2, z: 30.0, op: 0.94 },
      { type: 'hands', w: 22, h: 12.0, x: 6.0,  y: -6.2, z: 30.0, op: 0.94 },
      { type: 'crowd', w: 32, h: 16.0, x: 0.0,  y: -7.0, z: 24.0, op: 0.90 },
      { type: 'crowd', w: 40, h: 20.0, x: -3.0, y: -8.5, z: 18.0, op: 0.86 },
      { type: 'crowd', w: 48, h: 24.0, x: 3.0,  y: -9.8, z: 12.0, op: 0.82 },
      { type: 'crowd', w: 56, h: 28.0, x: 0.0,  y: -10.8, z: 6.0,  op: 0.78 }
    ];

    audienceConfigs.forEach(cfg => {
      const file = cfg.type === 'hands' ? '/assets/foreground-hands.png' : '/assets/crowd.png';
      const plane = this.createPlaneMesh(file, cfg.w, cfg.h, { opacity: cfg.op });
      plane.mesh.position.set(cfg.x, cfg.y, cfg.z);
      this.crowdLayers.push({ ...plane, baseOp: cfg.op, baseZ: cfg.z, baseY: cfg.y });
      this.scene.add(plane.mesh);
    });

    // Atmospheric Fog Planes around the concert stage
    const fogConfigs = [
      { z: -18.0, y: 0.0,  w: 52, h: 26, op: 0.28 },
      { z: -11.0, y: -1.5, w: 46, h: 23, op: 0.32 },
      { z: -4.0,  y: -2.8, w: 42, h: 21, op: 0.35 },
      { z: 6.0,   y: -3.8, w: 38, h: 19, op: 0.40 },
      { z: 20.0,  y: -4.8, w: 36, h: 18, op: 0.44 }
    ];

    fogConfigs.forEach((cfg, idx) => {
      const fog = this.createPlaneMesh('/assets/fog.png', cfg.w, cfg.h, {
        opacity: cfg.op,
        blending: THREE.NormalBlending
      });
      fog.mesh.position.set(0, cfg.y, cfg.z);
      this.fogPlanes.push({ ...fog, baseOp: cfg.op, baseX: (idx % 2 === 0 ? -2 : 2), baseY: cfg.y });
      this.scene.add(fog.mesh);
    });
  }

  // =========================================================================
  // 5. 2.5D KINETIC TEXT BILLBOARDS (As Big as the Person in 3D Space)
  // High-Resolution 2048x1536 Canvas with unified Alderwood typography & true 2.5D slant
  // =========================================================================
  createTextBillboard(lines, width = 8.5, height = 6.2, align = 'center') {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1536;
    const ctx = canvas.getContext('2d');

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    const renderText = () => {
      ctx.clearRect(0, 0, 2048, 1536);

      const startX = align === 'center' ? 1024 : 140;
      ctx.textAlign = align;

      // Accurate vertical centering for massive "as Big as the Person" typography
      let totalBlockHeight = 0;
      lines.forEach((item, idx) => {
        const size = item.size || 260;
        totalBlockHeight += size;
        if (idx < lines.length - 1) totalBlockHeight += (item.spacing || 36);
      });

      let currentY = Math.max(120, Math.round((1536 - totalBlockHeight) / 2 + (lines[0].size || 260) * 0.82));

      lines.forEach(item => {
        const text = item.text || item;
        const isRed = item.color === 'red' || item.brush || false;
        const fontSize = item.size || 260;

        ctx.save();
        ctx.translate(startX, currentY);

        // BOTH RED AND WHITE TEXT USE THE EXACT SAME ALDERWOOD FONT
        ctx.font = `700 ${fontSize}px "Alderwood", "Anton", "Bebas Neue", Impact, sans-serif`;

        if (isRed) {
          // Crisp dark drop shadow (ZERO GLOW)
          ctx.shadowColor = 'rgba(0, 0, 0, 0.96)';
          ctx.shadowBlur = 28;
          ctx.shadowOffsetX = 8;
          ctx.shadowOffsetY = 12;

          // Deep dark under-stroke for maximum contrast and punch
          ctx.strokeStyle = 'rgba(8, 1, 3, 0.98)';
          ctx.lineWidth = 20;
          ctx.lineJoin = 'round';
          ctx.strokeText(text.toUpperCase(), 0, 0);

          // Vivid concert crimson fill
          ctx.fillStyle = '#ff1c36';
          ctx.fillText(text.toUpperCase(), 0, 0);
        } else {
          // Clean bold white with dramatic drop shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.96)';
          ctx.shadowBlur = 28;
          ctx.shadowOffsetX = 8;
          ctx.shadowOffsetY = 12;

          // Deep dark under-stroke
          ctx.strokeStyle = 'rgba(8, 1, 3, 0.98)';
          ctx.lineWidth = 20;
          ctx.lineJoin = 'round';
          ctx.strokeText(text.toUpperCase(), 0, 0);

          // Clean white fill
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text.toUpperCase(), 0, 0);
        }

        ctx.restore();
        currentY += fontSize + (item.spacing || 36);
      });
    };

    renderText();
    texture.needsUpdate = true;

    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        renderText();
        texture.needsUpdate = true;
      });
    }

    const geo = new THREE.PlaneGeometry(width, height);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.0,
      depthTest: true,
      depthWrite: false,
      alphaTest: 0.02,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 999; // Render crisply in front of performer/lighting volume
    return { mesh, mat, texture, renderText, baseRot: new THREE.Euler(0, 0, 0) };
  }

  initTextBillboards() {
    // 1. Vocalist Billboard (Shot 03: "EVERY BAND HAS A STORY.")
    // Towering 2.5D typography as big as the vocalist, angled into the stage
    this.textBillboards.vocalist = this.createTextBillboard(
      [
        { text: 'EVERY BAND', color: 'white', size: 230 },
        { text: 'HAS A STORY.', color: 'red', size: 250 }
      ],
      6.8, 5.6, 'center'
    );
    this.textBillboards.vocalist.mesh.position.set(-1.3, 0.3, -2.4);
    this.textBillboards.vocalist.baseRot = new THREE.Euler(-0.04, 0.22, -0.02);
    this.textBillboards.vocalist.mesh.rotation.copy(this.textBillboards.vocalist.baseRot);
    this.textBillboards.vocalist.activeRange = [0.12, 0.16, 0.23, 0.27];
    this.scene.add(this.textBillboards.vocalist.mesh);

    // 2. Guitarist Billboard (Shot 05: "GUITAR DRIVES DREAMS.")
    // Towering 2.5D typography as big as the guitarist, framed right beside guitar
    this.textBillboards.guitarist = this.createTextBillboard(
      [
        { text: 'GUITAR', color: 'white', size: 180 },
        { text: 'DRIVES', color: 'white', size: 180 },
        { text: 'DREAMS.', color: 'red', size: 200 }
      ],
      3.8, 3.8, 'center'
    );
    this.textBillboards.guitarist.mesh.position.set(-3.3, -0.2, -7.4);
    this.textBillboards.guitarist.baseRot = new THREE.Euler(-0.02, -0.22, 0.0);
    this.textBillboards.guitarist.mesh.rotation.copy(this.textBillboards.guitarist.baseRot);
    this.textBillboards.guitarist.activeRange = [0.28, 0.33, 0.39, 0.43];
    this.scene.add(this.textBillboards.guitarist.mesh);

    // 3. Bassist Billboard (Shot 06: "BASS BUILDS DEPTH.")
    // Towering 2.5D typography as big as the bassist, clear above monitor wedge
    this.textBillboards.bassist = this.createTextBillboard(
      [
        { text: 'BASS', color: 'white', size: 180 },
        { text: 'BUILDS', color: 'white', size: 180 },
        { text: 'DEPTH.', color: 'red', size: 200 }
      ],
      3.8, 3.8, 'center'
    );
    this.textBillboards.bassist.mesh.position.set(4.8, -0.55, -6.8);
    this.textBillboards.bassist.baseRot = new THREE.Euler(-0.02, 0.28, 0.0);
    this.textBillboards.bassist.mesh.rotation.copy(this.textBillboards.bassist.baseRot);
    this.textBillboards.bassist.activeRange = [0.40, 0.44, 0.49, 0.53];
    this.scene.add(this.textBillboards.bassist.mesh);

    // 4. Drummer Billboard (Shot 07: "DRUMS POWER PEOPLE.")
    // Towering 2.5D typography as big as the drummer, beside the drum kit
    this.textBillboards.drummer = this.createTextBillboard(
      [
        { text: 'DRUMS', color: 'white', size: 230 },
        { text: 'POWER', color: 'white', size: 230 },
        { text: 'PEOPLE.', color: 'red', size: 250 }
      ],
      7.2, 5.8, 'center'
    );
    this.textBillboards.drummer.mesh.position.set(3.8, 2.0, -12.5);
    this.textBillboards.drummer.baseRot = new THREE.Euler(-0.05, -0.22, 0.02);
    this.textBillboards.drummer.mesh.rotation.copy(this.textBillboards.drummer.baseRot);
    this.textBillboards.drummer.activeRange = [0.50, 0.54, 0.59, 0.63];
    this.scene.add(this.textBillboards.drummer.mesh);

    // 5. Keyboardist Billboard (Shot 09: "KEYS SHAPE ATMOSPHERE.")
    // Towering 2.5D typography as big as keyboardist, in open stage space clear of HUD
    this.textBillboards.keyboardist = this.createTextBillboard(
      [
        { text: 'KEYS', color: 'white', size: 190 },
        { text: 'SHAPE', color: 'white', size: 190 },
        { text: 'ATMOSPHERE.', color: 'red', size: 195 }
      ],
      5.6, 4.4, 'center'
    );
    this.textBillboards.keyboardist.mesh.position.set(7.3, 0.4, -9.6);
    this.textBillboards.keyboardist.baseRot = new THREE.Euler(-0.04, 0.24, -0.02);
    this.textBillboards.keyboardist.mesh.rotation.copy(this.textBillboards.keyboardist.baseRot);
    this.textBillboards.keyboardist.activeRange = [0.66, 0.70, 0.74, 0.76]; // Strictly ended before Shot 10 full band!
    this.scene.add(this.textBillboards.keyboardist.mesh);

    // 6. Full Band Billboard (Shot 10: "TOGETHER THEY CREATE MORE.")
    // Monumental arena headline spanning over the 5-member band
    this.textBillboards.fullBand = this.createTextBillboard(
      [
        { text: 'TOGETHER', color: 'white', size: 260 },
        { text: 'THEY CREATE MORE.', color: 'red', size: 260 }
      ],
      14.0, 7.5, 'center'
    );
    this.textBillboards.fullBand.mesh.position.set(0.0, 4.8, 1.0);
    this.textBillboards.fullBand.baseRot = new THREE.Euler(-0.06, 0.0, 0.0);
    this.textBillboards.fullBand.mesh.rotation.copy(this.textBillboards.fullBand.baseRot);
    this.textBillboards.fullBand.activeRange = [0.78, 0.81, 0.87, 0.90];
    this.scene.add(this.textBillboards.fullBand.mesh);
  }

  update(time, scrollProgress, camera) {
    const cameraPos = camera && camera.isCamera ? camera.position : (camera || null);

    // 1. Living breathing of fog planes
    this.fogPlanes.forEach((fog, i) => {
      const drift = Math.sin(time * 0.35 + i * 1.8) * 1.4;
      const verticalPulse = Math.cos(time * 0.25 + i * 1.3) * 0.25;
      fog.mesh.position.x = fog.baseX + drift;
      fog.mesh.position.y = fog.baseY + verticalPulse;
      fog.material.opacity = fog.baseOp * (0.85 + 0.15 * Math.sin(time * 0.5 + i));
    });

    // 2. Dynamic concert lighting beam sweeps
    const sweep = Math.sin(time * 0.5) * 0.05;
    if (this.layers.lighting) {
      this.layers.lighting.mesh.rotation.z = sweep;
      this.layers.lighting.material.opacity = 0.75 + 0.18 * Math.sin(time * 1.1);
    }
    if (this.layers.lightingBack) {
      this.layers.lightingBack.mesh.rotation.z = -sweep * 0.7;
      this.layers.lightingBack.material.opacity = 0.65 + 0.15 * Math.cos(time * 0.9);
    }

    // 3. Dynamic banner screen red breathing pulse
    if (this.bannerScreen) {
      const pulse = 0.85 + 0.12 * Math.sin(time * 1.4);
      this.bannerScreen.material.opacity = pulse;
    }

    // 4. Smooth fade-out of audience layers as camera passes through them
    if (cameraPos && this.crowdLayers) {
      this.crowdLayers.forEach(layer => {
        if (cameraPos.z < layer.baseZ + 2.0) {
          const fade = THREE.MathUtils.clamp((cameraPos.z - (layer.baseZ - 4.0)) / 6.0, 0.0, 1.0);
          layer.material.opacity = fade * layer.baseOp;
        } else {
          layer.material.opacity = layer.baseOp;
        }
      });
    }

    // 5. Performer Silhouette Processing & Grounding
    if (cameraPos) {
      const camForward = new THREE.Vector3(0, 0, -1);
      if (camera && camera.getWorldDirection) {
        camera.getWorldDirection(camForward);
      }

      Object.keys(this.performers).forEach((key) => {
        const perf = this.performers[key];
        const dx = cameraPos.x - perf.mesh.position.x;
        const dz = cameraPos.z - perf.mesh.position.z;

        // Dynamic cylindrical billboarding: Turn naturally toward camera along Y
        const distHoriz = Math.hypot(dx, dz);
        if (distHoriz > 0.2) {
          const targetAngle = Math.atan2(dx, dz);
          perf.mesh.rotation.y = THREE.MathUtils.clamp(targetAngle, -0.95, 0.95);
        }

        // True 3D view frustum dissolve: Fade out only when behind camera
        const toPerf = new THREE.Vector3().subVectors(perf.mesh.position, cameraPos);
        const forwardDist = toPerf.dot(camForward);
        let behindFade = 1.0;
        if (forwardDist < 0.6) {
          behindFade = THREE.MathUtils.clamp((forwardDist - (-1.5)) / 2.1, 0.0, 1.0);
        }

        // Bassist shot fade: Gracefully fade out bassist during Drum-to-Keys transit (Shot 08)
        // and Keys CU (Shot 09) so bassist's back never blocks the camera line of sight.
        let bassistShotFade = 1.0;
        if (key === 'bassist' && scrollProgress >= 0.56 && scrollProgress <= 0.78) {
          if (scrollProgress < 0.62) {
            bassistShotFade = 1.0 - (scrollProgress - 0.56) / 0.06;
          } else if (scrollProgress > 0.74) {
            bassistShotFade = (scrollProgress - 0.74) / 0.04;
          } else {
            bassistShotFade = 0.0;
          }
        }

        // Proximity illumination from stage spotlights
        const dist = cameraPos.distanceTo(perf.mesh.position);
        const proximity = THREE.MathUtils.clamp(1.0 - (dist - 3.0) / 12.0, 0.0, 1.0);
        const totalOpacity = (0.88 + proximity * 0.12) * behindFade * bassistShotFade;
        perf.material.opacity = totalOpacity;

        // Ground contact shadow and spotlight pool synchronization
        if (perf.grounding) {
          perf.grounding.shadowMat.opacity = 0.85 * behindFade * bassistShotFade;
          perf.grounding.poolMat.opacity = (0.55 + proximity * 0.25) * behindFade * bassistShotFade;
        }
      });

      // 6. 3D Text Billboards: Physically facing camera and dynamically fading per shot
      const p = THREE.MathUtils.clamp(scrollProgress, 0, 1);
      Object.keys(this.textBillboards).forEach(key => {
        const tb = this.textBillboards[key];
        const [start, peak1, peak2, end] = tb.activeRange;

        // Smoothstep window opacity
        let op = 0.0;
        if (p >= start && p <= end) {
          if (p < peak1) {
            op = (p - start) / (peak1 - start);
          } else if (p > peak2) {
            op = 1.0 - (p - peak2) / (end - peak2);
          } else {
            op = 1.0;
          }
        }
        tb.mat.opacity = THREE.MathUtils.clamp(op, 0.0, 1.0);

        // 2.5D Perspective: Preserve fixed 3D spatial rotation (yaw/pitch/roll)
        // rather than flat-facing the camera, creating genuine perspective convergence and parallax
        if (tb.baseRot) {
          tb.mesh.rotation.x = tb.baseRot.x;
          tb.mesh.rotation.y = tb.baseRot.y;
          tb.mesh.rotation.z = tb.baseRot.z;
        }
      });
    }
  }
}

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
    shadowMesh.renderOrder = 11;
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
    poolMesh.renderOrder = 11;
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
    this.layers.venueArch.mesh.renderOrder = 1;
    this.scene.add(this.layers.venueArch.mesh);

    // Large Backstage LED Video Screen Wall (Curved Arena Display)
    const bannerGeo = new THREE.PlaneGeometry(28, 15);
    const bannerMat = new THREE.MeshBasicMaterial({
      color: 0x050408,
      transparent: true,
      opacity: 0.96,
      depthWrite: false
    });
    this.bannerScreen = new THREE.Mesh(bannerGeo, bannerMat);
    this.bannerScreen.position.set(0, 9.4, -18.8);
    this.bannerScreen.renderOrder = 2;
    this.scene.add(this.bannerScreen);

    // Authentic RITHMOS Stage Banner (Mounted on Backstage Screen behind performers)
    // Uses logo-brand.png (soundwave icon + RITHMOS wordmark + guitar pick emblem)
    this.layers.logo = this.createPlaneMesh('/assets/logo-brand.png', 19.6, 8.1, {
      opacity: 0.0,
      transparent: true
    });
    this.layers.logo.mesh.position.set(0, 9.6, -18.6);
    this.layers.logo.mesh.renderOrder = 3;
    this.scene.add(this.layers.logo.mesh);

    // Dynamic Tagline Waveform Mesh: "WHERE BANDS RISE" (Zoom and Unzoom wave traveling Where -> Rise)
    this.initTaglineWaveform();

    // Backstage wash lighting
    this.layers.lightingBack = this.createPlaneMesh('/assets/lighting.png', 38, 19, {
      blending: THREE.AdditiveBlending,
      opacity: 0.70
    });
    this.layers.lightingBack.mesh.position.set(0, 9.2, -17.5);
    this.layers.lightingBack.mesh.renderOrder = 4;
    this.scene.add(this.layers.lightingBack.mesh);

    // Overhead Arena Truss Structure (Directly over the single stage)
    this.layers.truss = this.createPlaneMesh('/assets/truss-structure.png', 52, 26);
    this.layers.truss.mesh.position.set(0, 8.6, -10.0);
    this.layers.truss.mesh.renderOrder = 6;
    this.scene.add(this.layers.truss.mesh);

    // Concert Stage Lighting Beams (Additive spotlights washing stage)
    this.layers.lighting = this.createPlaneMesh('/assets/lighting.png', 56, 28, {
      blending: THREE.AdditiveBlending,
      opacity: 0.85
    });
    this.layers.lighting.mesh.position.set(0, 8.4, -9.8);
    this.layers.lighting.mesh.renderOrder = 7;
    this.scene.add(this.layers.lighting.mesh);

    // =========================================================================
    // 2. ONE SINGLE COHESIVE STAGE PLATFORM (Deck sits UNDER all performers!)
    // =========================================================================
    // Main unified concert stage deck (Z = 0 to Z = -18)
    this.layers.stagePlatform = this.createPlaneMesh('/assets/stage-platform.png', 48, 24);
    this.layers.stagePlatform.mesh.position.set(0, -4.6, -10.0);
    this.layers.stagePlatform.mesh.renderOrder = 10;
    this.scene.add(this.layers.stagePlatform.mesh);

    // Elevated Drum Riser on center rear stage
    this.layers.drumPlatform = this.createPlaneMesh('/assets/stage-platform.png', 15, 7.5);
    this.layers.drumPlatform.mesh.position.set(0, -2.4, -13.8);
    this.layers.drumPlatform.mesh.renderOrder = 12;
    this.scene.add(this.layers.drumPlatform.mesh);

    // =========================================================================
    // 3. THE BAND MEMBERS (Standing together on the SAME stage deck)
    // All performers have renderOrder = 25 so stage deck NEVER renders over them!
    // =========================================================================

    // Male Vocalist: Front lip stage-left (Z = -2.5, X = +2.4)
    this.layers.vocalist = this.createPlaneMesh('/assets/vocalist.png', 2.51, 6.8);
    this.layers.vocalist.mesh.position.set(2.4, -0.6, -2.5);
    this.layers.vocalist.mesh.renderOrder = 25;
    this.scene.add(this.layers.vocalist.mesh);
    this.layers.vocalist.grounding = this.addPerformerGrounding(2.4, -3.95, -2.5, 3.8, 2.0, 5.8, 3.2);
    this.performers.vocalist = this.layers.vocalist;

    // Female Co-Vocalist: Front lip stage-right (Z = -2.5, X = -2.4)
    this.layers.coVocalist = this.createPlaneMesh('/assets/co-vocalist.png', 4.4, 6.6);
    this.layers.coVocalist.mesh.position.set(-2.4, -0.65, -2.5);
    this.layers.coVocalist.mesh.renderOrder = 25;
    this.scene.add(this.layers.coVocalist.mesh);
    this.layers.coVocalist.grounding = this.addPerformerGrounding(-2.4, -3.95, -2.5, 4.4, 2.2, 6.2, 3.4);
    this.performers.coVocalist = this.layers.coVocalist;

    // Guitarist: Stage right mid-stage (Z = -7.5, X = -5.5)
    this.layers.guitarist = this.createPlaneMesh('/assets/guitarist.png', 9.0, 6.0);
    this.layers.guitarist.mesh.position.set(-5.5, -1.0, -7.5);
    this.layers.guitarist.mesh.renderOrder = 25;
    this.scene.add(this.layers.guitarist.mesh);
    this.layers.guitarist.grounding = this.addPerformerGrounding(-5.5, -3.95, -7.5, 4.8, 2.6, 7.2, 4.2);
    this.performers.guitarist = this.layers.guitarist;

    // Bassist: Stage right wing near stairs (Z = -7.5, X = +11.6)
    // Positioned cleanly on stage deck platform to the right of keyboardist
    this.layers.bassist = this.createPlaneMesh('/assets/bassist.png', 8.7, 5.8);
    this.layers.bassist.mesh.position.set(11.6, -1.1, -7.5);
    this.layers.bassist.mesh.renderOrder = 25;
    this.scene.add(this.layers.bassist.mesh);
    this.layers.bassist.grounding = this.addPerformerGrounding(11.6, -3.95, -7.5, 4.8, 2.6, 7.2, 4.2);
    this.performers.bassist = this.layers.bassist;

    // Drummer: Center stage back on elevated drum riser (Z = -13.5, X = 0.0)
    this.layers.drummer = this.createPlaneMesh('/assets/drummer.png', 7.1, 6.5);
    this.layers.drummer.mesh.position.set(0.0, 1.45, -13.5);
    this.layers.drummer.mesh.renderOrder = 25;
    this.scene.add(this.layers.drummer.mesh);
    this.layers.drummer.grounding = this.addPerformerGrounding(0.0, -1.75, -13.5, 7.5, 3.8, 10.0, 5.2);
    this.performers.drummer = this.layers.drummer;

    // Keyboardist: Stage left outer wing (Z = -8.8, X = +8.4)
    // Positioned on stage deck; dedicated riser wing ensures zero overlap with bassist!
    this.layers.keyboardist = this.createPlaneMesh('/assets/keyboardist.png', 9.0, 6.0);
    this.layers.keyboardist.mesh.position.set(8.4, -0.9, -8.8);
    this.layers.keyboardist.mesh.renderOrder = 25;
    this.scene.add(this.layers.keyboardist.mesh);
    this.layers.keyboardist.grounding = this.addPerformerGrounding(8.4, -3.95, -8.8, 5.2, 2.8, 7.8, 4.5);
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
      plane.mesh.renderOrder = 30;
      this.crowdLayers.push({ ...plane, baseOp: cfg.op, baseZ: cfg.z, baseY: cfg.y });
      this.scene.add(plane.mesh);
    });

    // Atmospheric Fog Planes around the concert stage
    // Additive blending so smoke provides atmospheric glow without ever acting as a dark opaque mask!
    const fogConfigs = [
      { z: -18.0, y: 0.0,  w: 52, h: 26, op: 0.20 },
      { z: -11.0, y: -2.5, w: 46, h: 23, op: 0.16 },
      { z: -4.0,  y: -2.8, w: 42, h: 21, op: 0.22 },
      { z: 6.0,   y: -3.8, w: 38, h: 19, op: 0.26 },
      { z: 20.0,  y: -4.8, w: 36, h: 18, op: 0.30 }
    ];

    fogConfigs.forEach((cfg, idx) => {
      const fog = this.createPlaneMesh('/assets/fog.png', cfg.w, cfg.h, {
        opacity: cfg.op,
        blending: THREE.AdditiveBlending
      });
      fog.mesh.position.set(0, cfg.y, cfg.z);
      fog.mesh.renderOrder = 6;
      this.fogPlanes.push({ ...fog, baseOp: cfg.op, baseX: (idx % 2 === 0 ? -2 : 2), baseY: cfg.y });
      this.scene.add(fog.mesh);
    });
  }

  // =========================================================================
  // 5. 2.5D KINETIC TEXT BILLBOARDS (As Big as the Person in 3D Space)
  // High-Resolution 2048x1536 Canvas with unified Alderwood typography & true 2.5D slant
  // =========================================================================
  createTextBillboard(lines, width = 8.5, height = 6.2, align = 'center') {
    // Dynamic canvas resolution precisely matching the 3D plane's aspect ratio!
    const aspect = width / height;
    let canvasW, canvasH;
    if (aspect >= 1.0) {
      canvasW = aspect > 2.2 ? 2800 : 2048;
      canvasH = Math.round(canvasW / aspect);
    } else {
      canvasH = 2048;
      canvasW = Math.round(canvasH * aspect);
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    const renderText = () => {
      ctx.clearRect(0, 0, canvasW, canvasH);

      const startX = align === 'center' ? canvasW / 2 : Math.round(canvasW * 0.08);
      ctx.textAlign = align;

      // Accurate vertical centering for massive "as Big as the Person" typography
      let totalBlockHeight = 0;
      lines.forEach((item, idx) => {
        const size = item.size || 260;
        totalBlockHeight += size;
        if (idx < lines.length - 1) totalBlockHeight += (item.spacing || 36);
      });

      let currentY = Math.max(60, Math.round((canvasH - totalBlockHeight) / 2 + (lines[0].size || 260) * 0.82));

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

  // =========================================================================
  // 5. AUTHENTIC TAGLINE WAVEFORM: "WHERE BANDS RISE" FROM LOGO.PNG
  // Uses authentic cropped letter sprites directly from logo.png
  // One-shot audio wave travels Where -> Bands -> Rise (zoom & unzoom) - NOT in a loop!
  // =========================================================================
  initTaglineWaveform() {
    const canvas = document.createElement('canvas');
    canvas.width = 1800;
    canvas.height = 360;
    this.taglineCanvas = canvas;
    this.taglineCtx = canvas.getContext('2d');

    this.taglineTexture = new THREE.CanvasTexture(canvas);
    this.taglineTexture.colorSpace = THREE.SRGBColorSpace;
    this.taglineTexture.minFilter = THREE.LinearFilter;
    this.taglineTexture.magFilter = THREE.LinearFilter;

    const geo = new THREE.PlaneGeometry(19.2, 3.84);
    const mat = new THREE.MeshBasicMaterial({
      map: this.taglineTexture,
      transparent: true,
      opacity: 0.0,
      depthTest: true,
      depthWrite: false,
      alphaTest: 0.02
    });

    this.taglineMesh = new THREE.Mesh(geo, mat);
    this.taglineMesh.position.set(0, 4.2, -18.5);
    this.taglineMesh.renderOrder = 5;
    this.scene.add(this.taglineMesh);
    this.layers.taglineWave = { mesh: this.taglineMesh, mat };

    this.taglineAnimStartTime = null;

    // Load authentic image sprites extracted directly from logo.png
    this.taglineSprites = {
      barLeft: new Image(),
      where: new Image(),
      bands: new Image(),
      rise: new Image(),
      barRight: new Image(),
      loadedCount: 0
    };

    const markLoaded = () => {
      this.taglineSprites.loadedCount++;
      if (this.taglineSprites.loadedCount === 5) {
        this.renderTaglineWaveform(0, 1.0);
      }
    };

    this.taglineSprites.barLeft.onload = markLoaded;
    this.taglineSprites.where.onload = markLoaded;
    this.taglineSprites.bands.onload = markLoaded;
    this.taglineSprites.rise.onload = markLoaded;
    this.taglineSprites.barRight.onload = markLoaded;

    this.taglineSprites.barLeft.src = '/assets/tagline/bar-left.png';
    this.taglineSprites.where.src = '/assets/tagline/word-where.png';
    this.taglineSprites.bands.src = '/assets/tagline/word-bands.png';
    this.taglineSprites.rise.src = '/assets/tagline/word-rise.png';
    this.taglineSprites.barRight.src = '/assets/tagline/bar-right.png';
  }

  renderTaglineWaveform(time, scrollProgress = 1.0) {
    const ctx = this.taglineCtx;
    const w = this.taglineCanvas.width;
    const h = this.taglineCanvas.height;
    const sprites = this.taglineSprites;

    ctx.clearRect(0, 0, w, h);

    // If sprites haven't finished loading yet, skip until ready
    if (!sprites || sprites.loadedCount < 5) {
      return;
    }

    // Animation Timing: One-shot sequential slap/drop entry plus interactive scroll scrub!
    const elapsed = this.taglineAnimStartTime !== null ? (time - this.taglineAnimStartTime) : 999.0;
    const ANIM_DURATION = 1.8; // seconds for complete one-shot drop sequence
    const isTimeAnimating = elapsed >= 0 && elapsed < ANIM_DURATION;

    // Dynamic scroll scrub progress (0.88 to 1.00 normalized into 0.0 -> 1.0)
    const normScroll = THREE.MathUtils.clamp((scrollProgress - 0.88) / 0.12, 0.0, 1.0);

    // Layout coordinates centered on 1800x360 canvas (authentic widths from logo.png)
    // Left bar (198x68), gap 24, where (344x68), gap 58, bands (339x68), gap 57, rise (243x68), gap 15, right bar (200x68)
    const startX = 161;
    const baseY = 166;
    const centerY = 200;

    // 1. Equalizer audio wave line beneath tagline: ripples forward & backward per scroll
    const isWaveActive = isTimeAnimating || (scrollProgress >= 0.88);
    if (isWaveActive) {
      const waveRemaining = isTimeAnimating ? Math.max(0.0, 1.0 - elapsed / 1.6) : 0.65;
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(255, 30, 60, ${0.45 * waveRemaining})`;
      ctx.beginPath();
      const waveY = centerY + 46;
      for (let x = startX; x <= startX + 1478; x += 12) {
        const normX = (x - startX) / 1478;
        const phase = (normScroll * Math.PI * 3.6) + (time * 1.8) - normX * Math.PI * 4.0;
        const waveAmp = Math.pow((Math.sin(phase) + 1.0) / 2.0, 3.0) * 16.0 * waveRemaining;
        const y = waveY - waveAmp;
        if (x === startX) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 2. Draw Left Needle Accent Bar
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8;
    ctx.drawImage(sprites.barLeft, startX, baseY, 198, 68);
    ctx.restore();

    // 3. Three Words: WHERE, BANDS, RISE with authentic SLAP / DROP impact animation
    const wordSlapConfigs = [
      { img: sprites.where, w: 344, h: 68, cx: 383 + 172, sStart: 0.02, sEnd: 0.30, tStart: 0.00, tEnd: 0.32 },
      { img: sprites.bands, w: 339, h: 68, cx: 785 + 169.5, sStart: 0.34, sEnd: 0.62, tStart: 0.32, tEnd: 0.64 },
      { img: sprites.rise, w: 243, h: 68, cx: 1181 + 121.5, sStart: 0.66, sEnd: 0.94, tStart: 0.64, tEnd: 0.96 }
    ];

    wordSlapConfigs.forEach(cfg => {
      // 1. Scroll-driven progression
      const scrollU = (normScroll - cfg.sStart) / (cfg.sEnd - cfg.sStart);
      // 2. Time-driven progression (plays upon entering Beat 08; once elapsed passes tEnd, locks at 1.0)
      let timeU = -1.0;
      if (this.taglineAnimStartTime !== null) {
        if (elapsed >= cfg.tEnd) {
          timeU = 1.0;
        } else if (elapsed >= cfg.tStart) {
          timeU = (elapsed - cfg.tStart) / (cfg.tEnd - cfg.tStart);
        } else {
          timeU = 0.0;
        }
      }

      // Effective phase: combination of interactive scroll position and entry playback
      const u = THREE.MathUtils.clamp(Math.max(scrollU, timeU), 0.0, 1.0);

      let dropY = 0.0;
      let scaleX = 1.0;
      let scaleY = 1.0;
      let op = 1.0;
      let glow = 0.0;

      if (u <= 0.0) {
        // Suspended above, not yet dropped
        dropY = -120.0;
        scaleX = 2.2;
        scaleY = 2.2;
        op = 0.0;
      } else if (u < 0.68) {
        // Accelerating downward slap / drop
        const fall = u / 0.68;
        const fallEase = Math.pow(fall, 2.8);
        dropY = -120.0 * (1.0 - fallEase);
        scaleX = 2.2 - 1.2 * fallEase;
        scaleY = 2.2 - 1.2 * fallEase;
        op = Math.min(1.0, fall * 2.5);
      } else if (u < 0.76) {
        // THE IMPACT SLAP: word hits baseline with horizontal squash and bright red flash!
        dropY = 0.0;
        scaleX = 1.28;
        scaleY = 0.76;
        op = 1.0;
        glow = 1.0;
      } else if (u < 1.0) {
        // Rebound settle bounce
        const b = (u - 0.76) / 0.24;
        const bounce = Math.sin(b * Math.PI) * Math.exp(-b * 3.2);
        dropY = -14.0 * bounce;
        scaleX = 1.0 + 0.16 * bounce;
        scaleY = 1.0 - 0.12 * bounce;
        op = 1.0;
        glow = (1.0 - b) * 0.8;
      } else {
        // Fully resting and locked
        dropY = 0.0;
        scaleX = 1.0;
        scaleY = 1.0;
        op = 1.0;
        glow = 0.0;
      }

      ctx.save();
      ctx.translate(cfg.cx, centerY + dropY);
      ctx.scale(scaleX, scaleY);
      ctx.globalAlpha = op;

      if (glow > 0.05) {
        ctx.shadowColor = 'rgba(255, 28, 54, 0.98)';
        ctx.shadowBlur = glow * 36;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
      }

      ctx.drawImage(cfg.img, -cfg.w / 2, -cfg.h / 2, cfg.w, cfg.h);
      ctx.restore();
    });

    // 4. Draw Right Needle Accent Bar
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 8;
    ctx.drawImage(sprites.barRight, startX + 1278, baseY, 200, 68);
    ctx.restore();

    this.taglineTexture.needsUpdate = true;
  }

  initTextBillboards() {
    // Beat 2: Vocalists (02 STAGE: "EVERY STORY NEEDS A STAGE.")
    this.textBillboards.vocalist = this.createTextBillboard(
      [
        { text: 'EVERY STORY', color: 'white', size: 195 },
        { text: 'NEEDS A STAGE.', color: 'red', size: 205 }
      ],
      4.8, 3.8, 'center'
    );
    this.textBillboards.vocalist.mesh.position.set(0.0, -0.05, -2.35);
    this.textBillboards.vocalist.activeRange = [0.08, 0.12, 0.17, 0.21];
    this.scene.add(this.textBillboards.vocalist.mesh);

    // Beat 3: Guitarist & Bassist (03 RITHMOS: "RITHMOS IS THE STAGE.")
    this.textBillboards.guitarist = this.createTextBillboard(
      [
        { text: 'RITHMOS', color: 'red', size: 210 },
        { text: 'IS THE STAGE.', color: 'white', size: 175 }
      ],
      4.2, 3.4, 'center'
    );
    this.textBillboards.guitarist.mesh.position.set(-3.3, -0.05, -6.8);
    this.textBillboards.guitarist.activeRange = [0.22, 0.26, 0.31, 0.35];
    this.scene.add(this.textBillboards.guitarist.mesh);

    // Beat 4: Drummer (04 MOMENT: "EVERY DREAM NEEDS A MOMENT.")
    this.textBillboards.drummer = this.createTextBillboard(
      [
        { text: 'EVERY DREAM', color: 'white', size: 185 },
        { text: 'NEEDS A MOMENT.', color: 'red', size: 185 }
      ],
      5.2, 4.0, 'center'
    );
    this.textBillboards.drummer.mesh.position.set(2.4, 1.5, -12.0);
    this.textBillboards.drummer.activeRange = [0.37, 0.41, 0.46, 0.50];
    this.scene.add(this.textBillboards.drummer.mesh);

    // Beat 5: Keyboardist (05 KEYBOARD: "EVERY MOMENT", "NEEDS A STAGE.")
    this.textBillboards.keyboardist = this.createTextBillboard(
      [
        { text: 'EVERY MOMENT', color: 'white', size: 180 },
        { text: 'NEEDS A STAGE.', color: 'red', size: 180 }
      ],
      4.4, 3.2, 'center'
    );
    this.textBillboards.keyboardist.mesh.position.set(9.8, 0.45, -8.5);
    this.textBillboards.keyboardist.activeRange = [0.51, 0.55, 0.60, 0.64];
    this.scene.add(this.textBillboards.keyboardist.mesh);

    // Beat 6: Bassist (06 BASS: "RITHMOS", "IS THE STAGE.")
    this.textBillboards.bassist = this.createTextBillboard(
      [
        { text: 'RITHMOS', color: 'red', size: 210 },
        { text: 'IS THE STAGE.', color: 'white', size: 175 }
      ],
      4.4, 3.4, 'center'
    );
    this.textBillboards.bassist.mesh.position.set(12.7, 0.15, -6.8);
    this.textBillboards.bassist.activeRange = [0.65, 0.69, 0.74, 0.78];
    this.scene.add(this.textBillboards.bassist.mesh);
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

    // 3. Dynamic Backstage Screen, RITHMOS Brand & Animated Waveform Tagline
    // 7TH SCROLL (0.78 <= p < 0.88): Steady illuminated RITHMOS brand (NO BLINKING / STROBE)
    // 8TH SCROLL (p >= 0.88): Brand & dynamic slap/drop tagline with concert lights flickering after animation
    if (scrollProgress >= 0.78 && scrollProgress < 0.88) {
      this.taglineAnimStartTime = null;
      // Steady, solid illumination without any strobe or blinking
      if (this.layers.logo) {
        this.layers.logo.material.opacity = 1.0;
      }
      if (this.layers.lightingBack) {
        this.layers.lightingBack.material.opacity = 0.85;
      }
      if (this.bannerScreen) {
        this.bannerScreen.material.opacity = 0.96;
      }
      if (this.layers.taglineWave) {
        this.layers.taglineWave.mat.opacity = 0.0; // Tagline only activates on 8th scroll!
      }
    } else if (scrollProgress >= 0.88) {
      if (this.layers.taglineWave) {
        if (this.taglineAnimStartTime === null) {
          this.taglineAnimStartTime = time;
        }
        const tagOp = Math.min((scrollProgress - 0.88) / 0.03, 1.0);
        this.layers.taglineWave.mat.opacity = tagOp;

        // Interactive forward and backward movement per scroll
        const normScroll = THREE.MathUtils.clamp((scrollProgress - 0.88) / 0.12, 0.0, 1.0);
        this.taglineMesh.position.z = -18.5 + normScroll * 4.6;
        this.taglineMesh.position.y = 4.2 + normScroll * 0.35;

        this.renderTaglineWaveform(time, scrollProgress);
      }

      // 8TH SCROLL FINALE: Flickering lights ignited on logo AFTER the animation settles
      const elapsed = this.taglineAnimStartTime !== null ? (time - this.taglineAnimStartTime) : 999.0;
      const normScroll = THREE.MathUtils.clamp((scrollProgress - 0.88) / 0.12, 0.0, 1.0);
      const isAnimComplete = (elapsed >= 1.75) || (normScroll >= 0.95);

      if (isAnimComplete) {
        // Multi-frequency rock concert lighting flicker & strobe on logo after animation
        const f1 = Math.sin(time * 26.0);
        const f2 = Math.sin(time * 42.0);
        const f3 = Math.cos(time * 11.0);
        const isStrobe = (f1 * 0.6 + f2 * 0.4 + f3 * 0.2) > 0.12;
        const flashOpacity = isStrobe ? 1.0 : 0.32;

        if (this.layers.logo) {
          this.layers.logo.material.opacity = flashOpacity;
        }
        if (this.layers.lightingBack) {
          this.layers.lightingBack.material.opacity = isStrobe ? 1.0 : 0.25;
        }
        if (this.bannerScreen) {
          this.bannerScreen.material.opacity = isStrobe ? 0.98 : 0.45;
        }
      } else {
        // Steady, solid illumination while words are slapping down
        if (this.layers.logo) {
          this.layers.logo.material.opacity = 1.0;
        }
        if (this.layers.lightingBack) {
          this.layers.lightingBack.material.opacity = 0.85;
        }
        if (this.bannerScreen) {
          this.bannerScreen.material.opacity = 0.96;
        }
      }
    } else {
      this.taglineAnimStartTime = null;
      if (this.layers.logo) {
        this.layers.logo.material.opacity = 0.0;
      }
      if (this.bannerScreen) {
        this.bannerScreen.material.opacity = 0.0;
      }
      if (this.layers.taglineWave) {
        this.layers.taglineWave.mat.opacity = 0.0;
        this.taglineMesh.position.z = -18.5;
        this.taglineMesh.position.y = 4.2;
      }
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

        // Proximity illumination from stage spotlights (Bassist is always 100% visible on right wing)
        const dist = cameraPos.distanceTo(perf.mesh.position);
        const proximity = THREE.MathUtils.clamp(1.0 - (dist - 3.0) / 12.0, 0.0, 1.0);
        const totalOpacity = (0.88 + proximity * 0.12) * behindFade;
        perf.material.opacity = totalOpacity;

        // Ground contact shadow and spotlight pool synchronization
        if (perf.grounding) {
          perf.grounding.shadowMat.opacity = 0.85 * behindFade;
          perf.grounding.poolMat.opacity = (0.55 + proximity * 0.25) * behindFade;
        }
      });

      // 6. 3D Text Billboards: Strictly straight to camera movement and dynamically fading per shot
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

        // Straight to camera movement: Billboard aims directly at camera eye
        // so text is perpendicular to line of sight and NEVER tilts backwards or faces upwards!
        if (camera && camera.position) {
          tb.mesh.lookAt(camera.position);
          const aspect = (typeof window !== 'undefined' && window.innerWidth) ? (window.innerWidth / window.innerHeight) : 1.6;
          if (aspect < 0.9) {
            const mScale = Math.max(0.48, aspect / 0.92);
            tb.mesh.scale.set(mScale, mScale, 1.0);
          } else {
            tb.mesh.scale.set(1.0, 1.0, 1.0);
          }
        }
      });
    }
  }
}

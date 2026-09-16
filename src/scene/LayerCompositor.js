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
  // 5. 3D KINETIC TEXT BILLBOARDS (Physically sticking directly to performers)
  // Transparent Canvas Textures in 3D world space (No box, pure floating rock typography)
  // =========================================================================
  createTextBillboard(lines, width = 4.2, height = 2.4, align = 'left') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    const renderText = () => {
      ctx.clearRect(0, 0, 1024, 512);

      const startX = align === 'center' ? 512 : 50;
      ctx.textAlign = align;

      // Calculate vertical spacing
      const totalLines = lines.length;
      let startY = 120;
      if (totalLines === 2) startY = 180;
      if (totalLines === 3) startY = 120;

      let currentY = startY;
      lines.forEach(item => {
        const text = item.text || item;
        const isBrush = item.brush || false;
        const fontSize = item.size || 88;

        ctx.save();

        if (isBrush) {
          // Expressive red brush script with dynamic rock tilt
          ctx.translate(startX, currentY);
          ctx.rotate(-0.06); // ~3.5 deg upward slant
          ctx.font = `bold ${fontSize}px "Permanent Marker", "Rock Salt", cursive, Impact`;

          // Intense neon red glow
          ctx.shadowColor = 'rgba(255, 20, 50, 0.95)';
          ctx.shadowBlur = 24;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 4;

          // Deep dark under-stroke for maximum contrast against stage lights
          ctx.strokeStyle = 'rgba(10, 1, 3, 0.95)';
          ctx.lineWidth = 10;
          ctx.lineJoin = 'round';
          ctx.strokeText(text.toUpperCase(), 0, 0);

          // Vivid concert red fill
          ctx.fillStyle = '#ff1c36';
          ctx.fillText(text.toUpperCase(), 0, 0);
        } else {
          // Heavy distressed condensed white headline
          ctx.translate(startX, currentY);
          ctx.font = `900 ${fontSize}px "Anton", "Bebas Neue", Impact, sans-serif`;

          // Drop shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetX = 4;
          ctx.shadowOffsetY = 6;

          // Deep dark under-stroke
          ctx.strokeStyle = 'rgba(10, 1, 3, 0.95)';
          ctx.lineWidth = 10;
          ctx.lineJoin = 'round';
          ctx.strokeText(text.toUpperCase(), 0, 0);

          // Clean white fill
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text.toUpperCase(), 0, 0);
        }

        ctx.restore();
        currentY += fontSize + 16;
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
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 999; // Render crisply in front of performer/lighting volume
    return { mesh, mat, texture, renderText };
  }

  initTextBillboards() {
    // 1. Vocalist Billboard (Shot 03: "HAS A STORY.")
    // Floats in 3D air to the left of the vocalist
    this.textBillboards.vocalist = this.createTextBillboard(
      [
        { text: 'HAS A', brush: false, size: 86 },
        { text: 'STORY.', brush: true, size: 102 }
      ],
      3.2, 1.8, 'left'
    );
    this.textBillboards.vocalist.mesh.position.set(-1.8, 0.2, -2.2);
    this.textBillboards.vocalist.activeRange = [0.12, 0.16, 0.23, 0.27];
    this.scene.add(this.textBillboards.vocalist.mesh);

    // 2. Guitarist Billboard (Shot 05: "GUITAR DRIVES DREAMS.")
    // Floats to the right of the guitarist towards stage center
    this.textBillboards.guitarist = this.createTextBillboard(
      [
        { text: 'GUITAR', brush: false, size: 76 },
        { text: 'DRIVES', brush: false, size: 76 },
        { text: 'DREAMS.', brush: true, size: 90 }
      ],
      2.8, 2.0, 'left'
    );
    this.textBillboards.guitarist.mesh.position.set(-2.8, -0.4, -6.8);
    this.textBillboards.guitarist.activeRange = [0.28, 0.34, 0.40, 0.44];
    this.scene.add(this.textBillboards.guitarist.mesh);

    // 3. Bassist Billboard (Shot 06: "BASS BUILDS DEPTH.")
    // Floats to the right of the bassist
    this.textBillboards.bassist = this.createTextBillboard(
      [
        { text: 'BASS', brush: false, size: 76 },
        { text: 'BUILDS', brush: false, size: 76 },
        { text: 'DEPTH.', brush: true, size: 90 }
      ],
      2.8, 2.0, 'left'
    );
    this.textBillboards.bassist.mesh.position.set(7.6, -0.1, -6.8);
    this.textBillboards.bassist.activeRange = [0.40, 0.44, 0.49, 0.53];
    this.scene.add(this.textBillboards.bassist.mesh);

    // 4. Drummer Billboard (Shot 07: "DRUMS POWER PEOPLE.")
    // Floats to the right of the drummer on the riser
    this.textBillboards.drummer = this.createTextBillboard(
      [
        { text: 'DRUMS', brush: false, size: 76 },
        { text: 'POWER', brush: false, size: 76 },
        { text: 'PEOPLE.', brush: true, size: 90 }
      ],
      3.0, 2.0, 'left'
    );
    this.textBillboards.drummer.mesh.position.set(3.8, 1.3, -12.2);
    this.textBillboards.drummer.activeRange = [0.50, 0.54, 0.59, 0.63];
    this.scene.add(this.textBillboards.drummer.mesh);

    // 5. Keyboardist Billboard (Shot 09: "KEYS SHAPE ATMOSPHERE.")
    // Floats to the left of the keyboardist towards stage center
    this.textBillboards.keyboardist = this.createTextBillboard(
      [
        { text: 'KEYS', brush: false, size: 76 },
        { text: 'SHAPE', brush: false, size: 76 },
        { text: 'ATMOSPHERE.', brush: true, size: 84 }
      ],
      3.2, 2.0, 'left'
    );
    this.textBillboards.keyboardist.mesh.position.set(7.5, -0.2, -10.6);
    this.textBillboards.keyboardist.activeRange = [0.65, 0.71, 0.77, 0.80];
    this.scene.add(this.textBillboards.keyboardist.mesh);

    // 6. Full Band Billboard (Shot 10: "TOGETHER THEY CREATE MORE.")
    // Floats boldly in upper arena sky above the full 5-member band
    this.textBillboards.fullBand = this.createTextBillboard(
      [
        { text: 'TOGETHER', brush: false, size: 92 },
        { text: 'THEY CREATE MORE.', brush: true, size: 106 }
      ],
      9.6, 3.2, 'center'
    );
    this.textBillboards.fullBand.mesh.position.set(0.0, 4.2, 4.0);
    this.textBillboards.fullBand.activeRange = [0.79, 0.82, 0.87, 0.90];
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

        // Proximity illumination from stage spotlights
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

        // Turn to face camera lens
        const bdx = cameraPos.x - tb.mesh.position.x;
        const bdz = cameraPos.z - tb.mesh.position.z;
        if (Math.hypot(bdx, bdz) > 0.1) {
          tb.mesh.rotation.y = Math.atan2(bdx, bdz);
        }
      });
    }
  }
}

import * as THREE from 'three';

export class LayerCompositor {
  constructor(scene) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.layers = {};
    this.fogPlanes = [];
    this.performers = {};

    this.initLayers();
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
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
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
    grad.addColorStop(0, 'rgba(255, 35, 55, 0.75)');
    grad.addColorStop(0.25, 'rgba(255, 20, 45, 0.40)');
    grad.addColorStop(0.65, 'rgba(180, 10, 30, 0.12)');
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
      opacity: 0.55,
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
    // 1. Far Venue Architecture (stadium / arena roof & high arches)
    this.layers.venueArch = this.createPlaneMesh('/assets/venue-arch.png', 130, 65);
    this.layers.venueArch.mesh.position.set(0, 18.0, -128.0);
    this.scene.add(this.layers.venueArch.mesh);

    // 2. Giant LED Stage Banner Backdrop (Dark glowing screen backing)
    const bannerGeo = new THREE.PlaneGeometry(56, 28);
    const bannerMat = new THREE.MeshBasicMaterial({
      color: 0x060103,
      transparent: true,
      opacity: 0.94,
      depthTest: true,
      depthWrite: false
    });
    this.bannerScreen = new THREE.Mesh(bannerGeo, bannerMat);
    this.bannerScreen.position.set(0, 8.0, -104.4);
    this.scene.add(this.bannerScreen);

    // 3. Stage Lighting Beams (Additive concert spotlights and wash across depth)
    this.layers.lighting = this.createPlaneMesh('/assets/lighting.png', 96, 48, {
      blending: THREE.AdditiveBlending,
      opacity: 0.85
    });
    this.layers.lighting.mesh.position.set(0, 11.0, -96.0);
    this.scene.add(this.layers.lighting.mesh);

    // Midstage lighting beam wash
    this.layers.lightingMid = this.createPlaneMesh('/assets/lighting.png', 82, 41, {
      blending: THREE.AdditiveBlending,
      opacity: 0.75
    });
    this.layers.lightingMid.mesh.position.set(0, 9.0, -55.0);
    this.scene.add(this.layers.lightingMid.mesh);

    // Front stage lighting beam wash
    this.layers.lightingFront = this.createPlaneMesh('/assets/lighting.png', 76, 38, {
      blending: THREE.AdditiveBlending,
      opacity: 0.70
    });
    this.layers.lightingFront.mesh.position.set(0, 8.0, -15.0);
    this.scene.add(this.layers.lightingFront.mesh);

    // 4. Stage Truss Structures (arena trusses & vertical towers)
    this.layers.truss = this.createPlaneMesh('/assets/truss-structure.png', 96, 48);
    this.layers.truss.mesh.position.set(0, 9.5, -100.0);
    this.scene.add(this.layers.truss.mesh);

    this.layers.trussMid = this.createPlaneMesh('/assets/truss-structure.png', 78, 39);
    this.layers.trussMid.mesh.position.set(0, 8.0, -52.0);
    this.scene.add(this.layers.trussMid.mesh);

    // 5. Authentic RITHMOS Stage Banner
    this.layers.logo = this.createPlaneMesh('/assets/logo.png', 36, 18, {
      opacity: 0.95,
      transparent: true
    });
    this.layers.logo.mesh.position.set(0, 8.0, -104.0);
    this.scene.add(this.layers.logo.mesh);

    // 6. Deep Stage Platforms spanning the full concert length (Z = +4 to Z = -95)
    this.layers.platformFront = this.createPlaneMesh('/assets/stage-platform.png', 64, 34);
    this.layers.platformFront.mesh.position.set(0, -6.0, -10.0);
    this.scene.add(this.layers.platformFront.mesh);

    this.layers.platformMid = this.createPlaneMesh('/assets/stage-platform.png', 74, 40);
    this.layers.platformMid.mesh.position.set(0, -6.0, -44.0);
    this.scene.add(this.layers.platformMid.mesh);

    this.layers.platformBack = this.createPlaneMesh('/assets/stage-platform.png', 84, 46);
    this.layers.platformBack.mesh.position.set(0, -5.5, -74.0);
    this.scene.add(this.layers.platformBack.mesh);

    // Elevated Drum Riser Platform (Z = -62.0)
    this.layers.drumPlatform = this.createPlaneMesh('/assets/stage-platform.png', 18, 9);
    this.layers.drumPlatform.mesh.position.set(0, -1.6, -62.0);
    this.scene.add(this.layers.drumPlatform.mesh);

    // Helper to generate soft contact shadow texture
    this.shadowTexture = this.createContactShadowTexture();
    this.spotlightTexture = this.createSpotlightPoolTexture();

    // ==========================================
    // THE BAND: ALL 5 PERFORMERS DISTRIBUTED IN LENGTH (DEPTH Z)
    // Snaking path: Vocalist (front) -> Guitarist -> Bassist -> Drummer -> Keyboardist -> Banner
    // Grounded with stage floor contact shadows and spotlight pools
    // ==========================================

    // Vocalist: Center stage front (Z = 0.0, X = 0.0)
    this.layers.vocalist = this.createPlaneMesh('/assets/vocalist.png', 3.32, 9.0);
    this.layers.vocalist.mesh.position.set(0.0, -2.4, 0.0);
    this.scene.add(this.layers.vocalist.mesh);
    this.layers.vocalist.grounding = this.addPerformerGrounding(0.0, -2.4, 0.0, 4.5, 2.4, 7.0, 4.0);
    this.performers.vocalist = this.layers.vocalist;

    // Guitarist: Stage right mid-front (Z = -22.0, X = -8.5)
    this.layers.guitarist = this.createPlaneMesh('/assets/guitarist.png', 11.0, 7.33);
    this.layers.guitarist.mesh.position.set(-8.5, -2.4, -22.0);
    this.scene.add(this.layers.guitarist.mesh);
    this.layers.guitarist.grounding = this.addPerformerGrounding(-8.5, -2.4, -22.0, 5.5, 3.0, 8.5, 5.0);
    this.performers.guitarist = this.layers.guitarist;

    // Bassist: Stage right mid-depth (Z = -42.0, X = -11.5)
    this.layers.bassist = this.createPlaneMesh('/assets/bassist.png', 10.5, 7.0);
    this.layers.bassist.mesh.position.set(-11.5, -2.2, -42.0);
    this.scene.add(this.layers.bassist.mesh);
    this.layers.bassist.grounding = this.addPerformerGrounding(-11.5, -2.2, -42.0, 5.5, 3.0, 8.5, 5.0);
    this.performers.bassist = this.layers.bassist;

    // Drummer: Center stage back on elevated drum riser (Z = -62.0, X = 0.0, Y = 0.5)
    this.layers.drummer = this.createPlaneMesh('/assets/drummer.png', 10.0, 9.14);
    this.layers.drummer.mesh.position.set(0.0, 0.5, -62.0);
    this.scene.add(this.layers.drummer.mesh);
    this.layers.drummer.grounding = this.addPerformerGrounding(0.0, 0.48, -62.0, 9.0, 4.5, 12.0, 6.0);
    this.performers.drummer = this.layers.drummer;

    // Keyboardist: Stage left mid-stage (Z = -80.0, X = 12.0)
    this.layers.keyboardist = this.createPlaneMesh('/assets/keyboardist.png', 12.0, 8.0);
    this.layers.keyboardist.mesh.position.set(12.0, -2.4, -80.0);
    this.scene.add(this.layers.keyboardist.mesh);
    this.layers.keyboardist.grounding = this.addPerformerGrounding(12.0, -2.4, -80.0, 6.5, 3.2, 9.5, 5.5);
    this.performers.keyboardist = this.layers.keyboardist;

    // ==========================================
    // MULTI-TIER DUPLICATED AUDIENCE ACROSS DEPTH (Z = +50 down to Z = +5)
    // Creating dense ocean of cheering crowd matching Storyboard Panel 01
    // ==========================================
    this.crowdLayers = [];

    const audienceConfigs = [
      { type: 'hands', w: 20, h: 11.2, x: 0.0,  y: -5.9, z: 46.0, op: 0.96 },
      { type: 'hands', w: 24, h: 13.5, x: -7.0, y: -7.4, z: 42.0, op: 0.94 },
      { type: 'hands', w: 24, h: 13.5, x: 7.0,  y: -7.4, z: 42.0, op: 0.94 },
      { type: 'crowd', w: 38, h: 19.0, x: 0.0,  y: -8.2, z: 35.0, op: 0.90 },
      { type: 'crowd', w: 46, h: 23.0, x: -3.5, y: -10.2, z: 27.0, op: 0.88 },
      { type: 'crowd', w: 56, h: 28.0, x: 3.5,  y: -11.8, z: 19.0, op: 0.84 },
      { type: 'crowd', w: 66, h: 33.0, x: 0.0,  y: -13.3, z: 11.0, op: 0.82 },
      { type: 'crowd', w: 76, h: 38.0, x: 0.0,  y: -14.3, z: 5.0,  op: 0.78 }
    ];

    audienceConfigs.forEach(cfg => {
      const file = cfg.type === 'hands' ? '/assets/foreground-hands.png' : '/assets/crowd.png';
      const plane = this.createPlaneMesh(file, cfg.w, cfg.h, { opacity: cfg.op });
      plane.mesh.position.set(cfg.x, cfg.y, cfg.z);
      this.crowdLayers.push({ ...plane, baseOp: cfg.op, baseZ: cfg.z, baseY: cfg.y });
      this.scene.add(plane.mesh);
    });

    // Atmospheric Fog Planes distributed through venue depth
    const fogConfigs = [
      { z: -90.0, y: 0.0,  w: 68, h: 34, op: 0.30 },
      { z: -60.0, y: -2.0, w: 60, h: 30, op: 0.35 },
      { z: -30.0, y: -3.5, w: 54, h: 27, op: 0.40 },
      { z: -10.0, y: -4.5, w: 48, h: 24, op: 0.45 },
      { z: 15.0,  y: -5.5, w: 44, h: 22, op: 0.48 },
      { z: 35.0,  y: -6.5, w: 40, h: 20, op: 0.50 }
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

  update(time, scrollProgress, cameraPos) {
    // Living breathing of fog planes
    this.fogPlanes.forEach((fog, i) => {
      const drift = Math.sin(time * 0.35 + i * 1.8) * 1.6;
      const verticalPulse = Math.cos(time * 0.25 + i * 1.3) * 0.3;
      fog.mesh.position.x = fog.baseX + drift;
      fog.mesh.position.y = fog.baseY + verticalPulse;
      fog.material.opacity = fog.baseOp * (0.85 + 0.15 * Math.sin(time * 0.5 + i));
    });

    // Dynamic concert lighting beam sweeps
    const sweep = Math.sin(time * 0.5) * 0.06;
    if (this.layers.lighting) {
      this.layers.lighting.mesh.rotation.z = sweep;
      this.layers.lighting.material.opacity = 0.75 + 0.20 * Math.sin(time * 1.1);
    }
    if (this.layers.lightingMid) {
      this.layers.lightingMid.mesh.rotation.z = -sweep * 0.8;
      this.layers.lightingMid.material.opacity = 0.70 + 0.18 * Math.cos(time * 0.9);
    }
    if (this.layers.lightingFront) {
      this.layers.lightingFront.mesh.rotation.z = sweep * 0.5;
      this.layers.lightingFront.material.opacity = 0.65 + 0.15 * Math.sin(time * 1.3);
    }

    // Dynamic banner screen red breathing pulse
    if (this.bannerScreen) {
      const pulse = 0.85 + 0.12 * Math.sin(time * 1.4);
      this.bannerScreen.material.opacity = pulse;
    }

    // Smooth fade-out of audience layers as camera passes through them
    if (cameraPos && this.crowdLayers) {
      this.crowdLayers.forEach(layer => {
        if (cameraPos.z < layer.baseZ + 2.0) {
          const fade = THREE.MathUtils.clamp((cameraPos.z - (layer.baseZ - 6.0)) / 8.0, 0.0, 1.0);
          layer.material.opacity = fade * layer.baseOp;
        } else {
          layer.material.opacity = layer.baseOp;
        }
      });
    }

    // 3D Volumetric Performer Processing: Dynamic cylindrical billboarding, ground shadow sync, and behind-camera fade
    if (cameraPos) {
      Object.keys(this.performers).forEach((key) => {
        const perf = this.performers[key];
        const dx = cameraPos.x - perf.mesh.position.x;
        const dz = cameraPos.z - perf.mesh.position.z;

        // Dynamic cylindrical billboarding: Performer turns naturally toward the camera along Y
        // This completely eliminates the paper-thin / flat 2D cardboard effect from angled perspectives
        if (dz > 0.05) {
          const targetAngle = Math.atan2(dx, dz);
          perf.mesh.rotation.y = THREE.MathUtils.clamp(targetAngle, -0.60, 0.60);
        } else {
          perf.mesh.rotation.y = 0;
        }

        // Dissolve performers cleanly when camera passes behind them to prevent clipping or raw 2D back-edge views
        const distBehind = perf.mesh.position.z - cameraPos.z;
        let behindFade = 1.0;
        if (distBehind > 0.8) {
          behindFade = THREE.MathUtils.clamp(1.0 - (distBehind - 0.8) / 3.5, 0.0, 1.0);
        }

        // Proximity illumination from stage spotlights
        const dist = cameraPos.distanceTo(perf.mesh.position);
        const proximity = THREE.MathUtils.clamp(1.0 - (dist - 2.5) / 12.0, 0.0, 1.0);
        const totalOpacity = (0.80 + proximity * 0.20) * behindFade;
        perf.material.opacity = totalOpacity;

        // Ground contact shadow and spotlight pool synchronization
        if (perf.grounding) {
          perf.grounding.shadowMat.opacity = 0.85 * behindFade;
          perf.grounding.poolMat.opacity = (0.45 + proximity * 0.25) * behindFade;
        }
      });
    }
  }
}

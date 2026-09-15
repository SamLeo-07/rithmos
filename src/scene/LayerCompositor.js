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

  initLayers() {
    // 1. Far Venue Architecture (stadium / arena roof & high arches)
    this.layers.venueArch = this.createPlaneMesh('/assets/venue-arch.png', 86, 43);
    this.layers.venueArch.mesh.position.set(0, 6.5, -36);
    this.scene.add(this.layers.venueArch.mesh);

    // 2. Giant LED Stage Banner Backdrop (Dark glowing screen backing)
    const bannerGeo = new THREE.PlaneGeometry(38, 16.5);
    const bannerMat = new THREE.MeshBasicMaterial({
      color: 0x070103,
      transparent: true,
      opacity: 0.90,
      depthTest: true,
      depthWrite: false
    });
    this.bannerScreen = new THREE.Mesh(bannerGeo, bannerMat);
    this.bannerScreen.position.set(0, 4.0, -18.6);
    this.scene.add(this.bannerScreen);

    // 3. Stage Lighting Beams (Additive concert spotlights and wash)
    this.layers.lighting = this.createPlaneMesh('/assets/lighting.png', 74, 37, {
      blending: THREE.AdditiveBlending,
      opacity: 0.85
    });
    this.layers.lighting.mesh.position.set(0, 7.5, -22);
    this.scene.add(this.layers.lighting.mesh);

    // 4. Stage Truss Structure (arena trusses & vertical towers)
    this.layers.truss = this.createPlaneMesh('/assets/truss-structure.png', 64, 32);
    this.layers.truss.mesh.position.set(0, 3.5, -18);
    this.scene.add(this.layers.truss.mesh);

    // 5. Authentic RITHMOS Logo (on the giant stage LED banner)
    // 1796 x 876 -> Aspect ~2.05
    this.layers.logo = this.createPlaneMesh('/assets/logo.png', 17.5, 8.54, {
      opacity: 0.95,
      transparent: true
    });
    this.layers.logo.mesh.position.set(0, 4.0, -18.2);
    this.scene.add(this.layers.logo.mesh);

    // 6. Stage Platform (massive stage floor beneath all performers)
    // 1774 x 887 -> Aspect ~2.0
    this.layers.platform = this.createPlaneMesh('/assets/stage-platform.png', 58, 29);
    this.layers.platform.mesh.position.set(0, -5.8, -10.5);
    this.scene.add(this.layers.platform.mesh);

    // ==========================================
    // THE BAND: ALL 5 PERFORMERS STANDING SIMULTANEOUSLY ON STAGE
    // ==========================================

    // Drummer: Center stage back on elevated drum riser (Z = -13.0)
    // 1312 x 1199 -> Aspect ~1.094
    this.layers.drummer = this.createPlaneMesh('/assets/drummer.png', 13.0, 11.88);
    this.layers.drummer.mesh.position.set(0.0, -1.2, -13.0);
    this.scene.add(this.layers.drummer.mesh);
    this.performers.drummer = this.layers.drummer;

    // Bassist: Stage right back (camera left) (Z = -11.0)
    // 1536 x 1024 -> Aspect 1.5
    this.layers.bassist = this.createPlaneMesh('/assets/bassist.png', 15.0, 10.0);
    this.layers.bassist.mesh.position.set(-8.2, -3.0, -11.0);
    this.scene.add(this.layers.bassist.mesh);
    this.performers.bassist = this.layers.bassist;

    // Keyboardist: Stage left (camera right) (Z = -8.5)
    // 1536 x 1024 -> Aspect 1.5
    this.layers.keyboardist = this.createPlaneMesh('/assets/keyboardist.png', 15.0, 10.0);
    this.layers.keyboardist.mesh.position.set(7.6, -3.0, -8.5);
    this.scene.add(this.layers.keyboardist.mesh);
    this.performers.keyboardist = this.layers.keyboardist;

    // Guitarist: Stage right front (camera left) (Z = -6.5)
    // 1536 x 1024 -> Aspect 1.5
    this.layers.guitarist = this.createPlaneMesh('/assets/guitarist.png', 15.0, 10.0);
    this.layers.guitarist.mesh.position.set(-7.2, -3.2, -6.5);
    this.scene.add(this.layers.guitarist.mesh);
    this.performers.guitarist = this.layers.guitarist;

    // Vocalist: Center stage front (Z = -3.2)
    // 250 x 677 -> Aspect ~0.369
    this.layers.vocalist = this.createPlaneMesh('/assets/vocalist.png', 4.4, 11.9);
    this.layers.vocalist.mesh.position.set(0.0, -3.2, -3.2);
    this.scene.add(this.layers.vocalist.mesh);
    this.performers.vocalist = this.layers.vocalist;

    // ==========================================
    // ATMOSPHERE & AUDIENCE
    // ==========================================

    // Drifting Fog Planes across stage depth
    const fogConfigs = [
      { z: -14.5, y: -3.5, w: 52, h: 26, op: 0.35 },
      { z: -8.0,  y: -4.0, w: 46, h: 23, op: 0.40 },
      { z: -1.5,  y: -4.8, w: 42, h: 21, op: 0.45 },
      { z: 7.0,   y: -6.0, w: 38, h: 19, op: 0.55 }
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

    // Crowd Midground (Z = +6.0)
    // 1774 x 887 -> Aspect ~2.0
    this.layers.crowd = this.createPlaneMesh('/assets/crowd.png', 44, 22);
    this.layers.crowd.mesh.position.set(0, -7.2, 6.0);
    this.scene.add(this.layers.crowd.mesh);

    // Foreground Audience Hands & Silhouettes (Z = +13.5)
    // 1672 x 941 -> Aspect ~1.77
    this.layers.foregroundHands = this.createPlaneMesh('/assets/foreground-hands.png', 40, 22.6);
    this.layers.foregroundHands.mesh.position.set(0, -6.5, 13.5);
    this.scene.add(this.layers.foregroundHands.mesh);
  }

  update(time, scrollProgress, cameraPos) {
    // Subtle living breathing of fog planes
    this.fogPlanes.forEach((fog, i) => {
      const drift = Math.sin(time * 0.35 + i * 1.8) * 1.6;
      const verticalPulse = Math.cos(time * 0.25 + i * 1.3) * 0.3;
      fog.mesh.position.x = fog.baseX + drift;
      fog.mesh.position.y = fog.baseY + verticalPulse;
      fog.material.opacity = fog.baseOp * (0.85 + 0.15 * Math.sin(time * 0.5 + i));
    });

    // Dynamic concert lighting beam sweeps
    if (this.layers.lighting) {
      const sweep = Math.sin(time * 0.5) * 0.06;
      this.layers.lighting.mesh.rotation.z = sweep;
      this.layers.lighting.material.opacity = 0.72 + 0.22 * Math.sin(time * 1.1);
    }

    // Dynamic banner screen red breathing pulse
    if (this.bannerScreen) {
      const pulse = 0.82 + 0.12 * Math.sin(time * 1.4);
      this.bannerScreen.material.opacity = pulse;
    }

    // Proximity spotlighting on active performers
    if (cameraPos) {
      Object.keys(this.performers).forEach((key) => {
        const perf = this.performers[key];
        const dist = cameraPos.distanceTo(perf.mesh.position);
        const proximity = THREE.MathUtils.clamp(1.0 - (dist - 3.5) / 9.0, 0.0, 1.0);
        perf.material.opacity = 0.88 + proximity * 0.12;
      });
    }

    // Foreground hands subtle reaction
    if (this.layers.foregroundHands) {
      if (cameraPos && cameraPos.z < 13.5) {
        const handFade = THREE.MathUtils.clamp((cameraPos.z - 9.0) / 4.5, 0.0, 1.0);
        this.layers.foregroundHands.material.opacity = handFade * 0.9;
      } else {
        this.layers.foregroundHands.material.opacity = 0.9;
      }
    }
  }
}

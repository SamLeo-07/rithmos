import * as THREE from 'three';

export class LayerCompositor {
  constructor(scene) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.layers = {};
    this.fogPlanes = [];

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
    // 1. Far Venue Architecture (high arches / stadium truss)
    // 1774 x 887 -> Aspect ~2.0
    this.layers.venueArch = this.createPlaneMesh('/assets/venue-arch.png', 72, 36);
    this.layers.venueArch.mesh.position.set(0, 5, -45);
    this.scene.add(this.layers.venueArch.mesh);

    // 2. Stage Lighting Beams (Additive concert spotlights)
    // 1774 x 887 -> Aspect ~2.0
    this.layers.lighting = this.createPlaneMesh('/assets/lighting.png', 68, 34, {
      blending: THREE.AdditiveBlending,
      opacity: 0.85
    });
    this.layers.lighting.mesh.position.set(0, 8.5, -35);
    this.scene.add(this.layers.lighting.mesh);

    // 3. Stage Truss Structure (main arena frame)
    // 1774 x 887 -> Aspect ~2.0
    this.layers.truss = this.createPlaneMesh('/assets/truss-structure.png', 56, 28);
    this.layers.truss.mesh.position.set(0, 2.5, -28);
    this.scene.add(this.layers.truss.mesh);

    // 4. Stage Platform
    // 1774 x 887 -> Aspect ~2.0
    this.layers.platform = this.createPlaneMesh('/assets/stage-platform.png', 52, 26);
    this.layers.platform.mesh.position.set(0, -5.5, -22);
    this.scene.add(this.layers.platform.mesh);

    // 5. Band: Drummer (Z = -18)
    // 1312 x 1199 -> Aspect ~1.09
    this.layers.drummer = this.createPlaneMesh('/assets/drummer.png', 16, 14.6);
    this.layers.drummer.mesh.position.set(0, -2, -18);
    this.scene.add(this.layers.drummer.mesh);

    // 6. Band: Keyboardist (Z = -14, Stage Left)
    // 1536 x 1024 -> Aspect ~1.5
    this.layers.keyboardist = this.createPlaneMesh('/assets/keyboardist.png', 17, 11.3);
    this.layers.keyboardist.mesh.position.set(-9.5, -3.5, -14);
    this.scene.add(this.layers.keyboardist.mesh);

    // 7. Band: Bassist (Z = -14, Stage Right)
    // 1536 x 1024 -> Aspect ~1.5
    this.layers.bassist = this.createPlaneMesh('/assets/bassist.png', 17, 11.3);
    this.layers.bassist.mesh.position.set(9.5, -3.5, -14);
    this.scene.add(this.layers.bassist.mesh);

    // 8. Band: Lead Guitarist (Z = -8, mid-front)
    // 1536 x 1024 -> Aspect ~1.5
    this.layers.guitarist = this.createPlaneMesh('/assets/guitarist.png', 18, 12);
    this.layers.guitarist.mesh.position.set(-5.5, -4, -8);
    this.scene.add(this.layers.guitarist.mesh);

    // 9. Band: Full Ensemble & Vocalist Focal Point (Z = -4)
    // 1671 x 941 -> Aspect ~1.77
    this.layers.bandFull = this.createPlaneMesh('/assets/band-full.png', 28, 15.8);
    this.layers.bandFull.mesh.position.set(0, -4.2, -4);
    this.scene.add(this.layers.bandFull.mesh);

    // 10. Fog Layers (Multiple drifting depth layers)
    // 1774 x 887
    const fogConfigs = [
      { z: -10, y: -4, w: 48, h: 24, op: 0.45, blend: THREE.NormalBlending },
      { z: 0,   y: -5, w: 42, h: 21, op: 0.55, blend: THREE.NormalBlending },
      { z: 8,   y: -6, w: 36, h: 18, op: 0.65, blend: THREE.NormalBlending }
    ];

    fogConfigs.forEach((cfg, idx) => {
      const fog = this.createPlaneMesh('/assets/fog.png', cfg.w, cfg.h, {
        opacity: cfg.op,
        blending: cfg.blend
      });
      fog.mesh.position.set(0, cfg.y, cfg.z);
      this.fogPlanes.push({ ...fog, baseOp: cfg.op, baseX: (idx - 1) * 3, baseY: cfg.y });
      this.scene.add(fog.mesh);
    });

    // 11. Crowd Midground (Z = +6)
    // 1774 x 887 -> Aspect ~2.0
    this.layers.crowd = this.createPlaneMesh('/assets/crowd.png', 40, 20);
    this.layers.crowd.mesh.position.set(0, -7.5, 6);
    this.scene.add(this.layers.crowd.mesh);

    // 12. Foreground Audience Hands & Silhouettes (Z = +13.5, right in front of camera at Z = 16)
    // 1672 x 941 -> Aspect ~1.77
    this.layers.foregroundHands = this.createPlaneMesh('/assets/foreground-hands.png', 38, 21.4);
    this.layers.foregroundHands.mesh.position.set(0, -6.5, 13.5);
    this.scene.add(this.layers.foregroundHands.mesh);

    // 13. Dynamic 3D embers handled by ParticleSystem
    this.layers.particlesSheet = null;

    // 14. Authentic RITHMOS Logo (Section 5 Climax Payoff)
    // 1796 x 876 -> Aspect ~2.05
    this.layers.logo = this.createPlaneMesh('/assets/logo.png', 8.8, 4.29, {
      opacity: 0,
      transparent: true
    });
    this.layers.logo.mesh.position.set(0, 2.4, -2);
    this.scene.add(this.layers.logo.mesh);
  }

  update(time, scrollProgress, cameraPos) {
    // Subtle living breathing of fog planes
    this.fogPlanes.forEach((fog, i) => {
      const drift = Math.sin(time * 0.4 + i * 2.0) * 1.5;
      const verticalPulse = Math.cos(time * 0.3 + i * 1.5) * 0.3;
      fog.mesh.position.x = fog.baseX + drift;
      fog.mesh.position.y = fog.baseY + verticalPulse;
      // Modulate opacity slightly with breath
      fog.material.opacity = fog.baseOp * (0.85 + 0.15 * Math.sin(time * 0.5 + i));
    });

    // Particle texture sheet gentle drift
    if (this.layers.particlesSheet) {
      this.layers.particlesSheet.mesh.position.y = Math.sin(time * 0.3) * 0.8;
      this.layers.particlesSheet.mesh.position.x = Math.cos(time * 0.25) * 0.8;
    }

    // Dynamic light sweeps in background
    if (this.layers.lighting) {
      const sweep = Math.sin(time * 0.6) * 0.08;
      this.layers.lighting.mesh.rotation.z = sweep;
      // Flare pulse
      this.layers.lighting.material.opacity = 0.7 + 0.25 * Math.sin(time * 1.2);
    }
  }
}

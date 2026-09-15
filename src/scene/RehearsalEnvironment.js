import * as THREE from 'three';

export class RehearsalEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.scene.add(this.group);

    this.initWalls();
    this.initCables();
    this.initIsolatedLight();
    this.initDoorwayPortal();
  }

  initWalls() {
    // Abstract architectural rehearsal walls with grid perspective lines
    const wallGeo = new THREE.PlaneGeometry(16, 12, 8, 6);
    
    // Create grid texture procedurally
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a080c';
    ctx.fillRect(0, 0, 512, 512);

    // Rough acoustic studio grid texture
    ctx.strokeStyle = 'rgba(255, 30, 45, 0.25)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 512; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    const wallTex = new THREE.CanvasTexture(canvas);
    wallTex.wrapS = THREE.RepeatWrapping;
    wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(2, 2);

    this.wallMat = new THREE.MeshBasicMaterial({
      map: wallTex,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // Left wall
    this.leftWall = new THREE.Mesh(wallGeo, this.wallMat);
    this.leftWall.position.set(-8, 0, 0);
    this.leftWall.rotation.y = Math.PI / 3;
    this.group.add(this.leftWall);

    // Right wall
    this.rightWall = new THREE.Mesh(wallGeo, this.wallMat);
    this.rightWall.position.set(8, 0, 0);
    this.rightWall.rotation.y = -Math.PI / 3;
    this.group.add(this.rightWall);

    // Back wall
    this.backWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), this.wallMat);
    this.backWall.position.set(0, 0, -8);
    this.group.add(this.backWall);
  }

  initCables() {
    // 3D hanging stage/jam-pad cables curving down
    this.cableGroup = new THREE.Group();
    const cableMat = new THREE.LineBasicMaterial({
      color: 0x442228,
      linewidth: 2,
      transparent: true,
      opacity: 0
    });
    this.cableMat = cableMat;

    const cableCurves = [
      [new THREE.Vector3(-6, 6, -2), new THREE.Vector3(-4, 0.5, -1), new THREE.Vector3(-2, 5, 0)],
      [new THREE.Vector3(6, 6, -3), new THREE.Vector3(4, 1.2, -1.5), new THREE.Vector3(1, 5.5, -2)],
      [new THREE.Vector3(-3, 5.8, -4), new THREE.Vector3(0, -1, -5), new THREE.Vector3(3, 5.8, -4)]
    ];

    this.cables = [];
    cableCurves.forEach(pts => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const points = curve.getPoints(30);
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, cableMat);
      this.cableGroup.add(line);
      this.cables.push({ line, curve, basePoints: pts });
    });

    this.group.add(this.cableGroup);
  }

  initIsolatedLight() {
    // Isolated hanging lightbulb placed overhead on rehearsal ceiling
    this.lightBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff6633, transparent: true, opacity: 0 })
    );
    this.lightBulb.position.set(0, 7.0, -8);
    this.group.add(this.lightBulb);

    // Create a smooth radial-linear gradient texture for the light beam
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Vertical falloff (bright at bulb, fading to zero at floor)
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(255, 80, 40, 0.4)');
    grad.addColorStop(0.3, 'rgba(230, 50, 25, 0.2)');
    grad.addColorStop(0.7, 'rgba(180, 20, 10, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);

    // Horizontal soft mask
    const hGrad = ctx.createRadialGradient(64, 128, 0, 64, 128, 64);
    hGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    hGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.4)');
    hGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 0, 128, 256);

    const beamTex = new THREE.CanvasTexture(canvas);

    this.coneMat = new THREE.MeshBasicMaterial({
      map: beamTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // 2 crossed planes for volumetric beam appearance
    this.lightBeamGroup = new THREE.Group();
    const beamGeo = new THREE.PlaneGeometry(6, 11);
    beamGeo.translate(0, -5.5, 0);

    const plane1 = new THREE.Mesh(beamGeo, this.coneMat);
    const plane2 = new THREE.Mesh(beamGeo, this.coneMat);
    plane2.rotation.y = Math.PI / 2;
    this.lightBeamGroup.add(plane1);
    this.lightBeamGroup.add(plane2);

    this.lightBeamGroup.position.copy(this.lightBulb.position);
    this.group.add(this.lightBeamGroup);
  }

  initDoorwayPortal() {
    // Illuminated doorway portal at the end of Section 3 (connecting into Section 4)
    const doorFrameGeo = new THREE.PlaneGeometry(8, 14);
    this.doorMat = new THREE.MeshBasicMaterial({
      color: 0xff1133,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.doorPortal = new THREE.Mesh(doorFrameGeo, this.doorMat);
    this.doorPortal.position.set(0, 0, -10);
    this.group.add(this.doorPortal);

    // Glowing doorway outline
    const edges = new THREE.EdgesGeometry(doorFrameGeo);
    this.doorOutlineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      linewidth: 3,
      blending: THREE.AdditiveBlending
    });
    this.doorOutline = new THREE.LineSegments(edges, this.doorOutlineMat);
    this.doorOutline.position.copy(this.doorPortal.position);
    this.group.add(this.doorOutline);
  }

  update(time, scrollProgress) {
    // Continuous live concert stage remains active; rehearsal room hidden
    this.group.visible = false;
  }
}

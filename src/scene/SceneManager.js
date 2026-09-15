import * as THREE from 'three';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.aspect = this.width / this.height;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050406, 0.018);

    // 2. Camera with dynamic FOV based on aspect ratio
    const fov = this.aspect < 1.0 ? 65 : 50;
    this.camera = new THREE.PerspectiveCamera(fov, this.aspect, 0.1, 200);
    // Initial camera position inside crowd (Section 1 opening)
    this.camera.position.set(0, -4.5, 16);
    this.cameraTarget = new THREE.Vector3(0, -2.5, 0);
    this.camera.lookAt(this.cameraTarget);

    // 3. Renderer with high performance and clamped pixel ratio
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x050406, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // 4. Lighting setup
    this.initLights();

    // Mouse parallax tracking
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Resize handling
    window.addEventListener('resize', () => this.onResize());
  }

  initLights() {
    // Ambient dark red atmosphere
    this.ambientLight = new THREE.AmbientLight(0x2a080c, 1.8);
    this.scene.add(this.ambientLight);

    // Directional rim light from top
    this.topRimLight = new THREE.DirectionalLight(0xff2233, 2.5);
    this.topRimLight.position.set(0, 20, -10);
    this.scene.add(this.topRimLight);

    // Dynamic Concert Spotlights
    this.spotLeft = new THREE.SpotLight(0xff112d, 4, 60, Math.PI / 4, 0.4, 1);
    this.spotLeft.position.set(-15, 15, -20);
    this.spotLeft.target.position.set(0, -3, -4);
    this.scene.add(this.spotLeft);
    this.scene.add(this.spotLeft.target);

    this.spotRight = new THREE.SpotLight(0xff2244, 4, 60, Math.PI / 4, 0.4, 1);
    this.spotRight.position.set(15, 15, -20);
    this.spotRight.target.position.set(0, -3, -4);
    this.scene.add(this.spotRight);
    this.scene.add(this.spotRight.target);

    // Center stage fill
    this.centerFill = new THREE.PointLight(0xff1122, 2, 40, 1.5);
    this.centerFill.position.set(0, 0, -5);
    this.scene.add(this.centerFill);
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.aspect = this.width / this.height;

    this.camera.aspect = this.aspect;
    this.camera.fov = this.aspect < 1.0 ? 65 : 50;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  updateMouseParallax(delta = 0.05) {
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * delta;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * delta;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

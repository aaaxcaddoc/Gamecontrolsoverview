import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ─── Module-level scene state ────────────────────────────────────────────────
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let composer: EffectComposer;

// ─── Player ship ─────────────────────────────────────────────────────────────
let playerGroup: THREE.Group;
let engineGlowMain: THREE.Mesh;
let engineGlowL: THREE.Mesh;
let engineGlowR: THREE.Mesh;
let shieldRing: THREE.Mesh;

// ─── Environment ─────────────────────────────────────────────────────────────
let gridFar: THREE.Mesh;
let gridNear: THREE.Mesh;
let starPoints: THREE.Points;
let nebulaPoints: THREE.Points;
let warpLinesMesh: THREE.LineSegments | null = null;

// ─── Lights ──────────────────────────────────────────────────────────────────
let ambientLight: THREE.AmbientLight;
let playerPointLight: THREE.PointLight;
let bloomPointLight: THREE.PointLight;
let bossLight: THREE.PointLight;

// ─── Object pools ────────────────────────────────────────────────────────────
const enemyPool = new Map<string, THREE.Mesh>();
const bulletPool = new Map<string, THREE.Mesh>();
const particlePool = new Map<string, THREE.Mesh>();
const powerupPool = new Map<string, THREE.Mesh>();

// ─── State ───────────────────────────────────────────────────────────────────
let prevPx = 0;
let prevPy = 0;
let camVelX = 0;
let camVelZ = 0;
let envColorCurrent = new THREE.Color(0x0a0a1a);
let envColorTarget = new THREE.Color(0x0a0a1a);
let initialized = false;
let warpTimer = 0;

// ─── Per-type geometry (created on first use) ────────────────────────────────
const ENEMY_GEO_CACHE = new Map<string, THREE.BufferGeometry>();

function getEnemyGeo(type: string): THREE.BufferGeometry {
  if (ENEMY_GEO_CACHE.has(type)) return ENEMY_GEO_CACHE.get(type)!;
  let geo: THREE.BufferGeometry;
  switch (type) {
    case 'bad':        geo = new THREE.IcosahedronGeometry(12, 0); break;
    case 'tank':       geo = new THREE.BoxGeometry(22, 22, 22); break;
    case 'sniper':     geo = new THREE.ConeGeometry(8, 30, 5); break;
    case 'dasher':     geo = new THREE.TetrahedronGeometry(13, 0); break;
    case 'pulsar':     geo = new THREE.TorusGeometry(10, 4, 8, 16); break;
    case 'teleporter': geo = new THREE.OctahedronGeometry(13, 1); break;
    case 'shielded':   geo = new THREE.DodecahedronGeometry(12, 0); break;
    case 'swarmer':    geo = new THREE.TetrahedronGeometry(8, 0); break;
    case 'phaser':     geo = new THREE.CylinderGeometry(8, 8, 20, 6); break;
    case 'splitter':   geo = new THREE.IcosahedronGeometry(16, 0); break;
    case 'charger':    geo = new THREE.ConeGeometry(12, 30, 4); break;
    case 'ghost':      geo = new THREE.SphereGeometry(12, 8, 6); break;
    case 'bomber':     geo = new THREE.DodecahedronGeometry(14, 0); break;
    case 'gem':        geo = new THREE.OctahedronGeometry(8, 0); break;
    case 'boss':       geo = new THREE.TorusKnotGeometry(22, 7, 80, 12); break;
    default:           geo = new THREE.IcosahedronGeometry(12, 0); break;
  }
  ENEMY_GEO_CACHE.set(type, geo);
  return geo;
}

const ENEMY_COLOR: Record<string, number> = {
  bad: 0xff2d55, tank: 0xaa0000, sniper: 0xff00ff, dasher: 0xff8800,
  pulsar: 0x0088ff, teleporter: 0x8a2be2, shielded: 0x4ade80, swarmer: 0xff4466,
  phaser: 0xaaaaff, splitter: 0xffaa00, charger: 0xffcc00, ghost: 0x88bbee,
  bomber: 0xff6600, gem: 0x00f2ff, boss: 0xff00ff,
};

function hexStrToNum(hex: string): number {
  // Handle "r, g, b" format
  if (hex.includes(',')) {
    const parts = hex.split(',').map(s => parseInt(s.trim(), 10));
    return (parts[0] << 16) | (parts[1] << 8) | parts[2];
  }
  return parseInt(hex.replace(/^#/, ''), 16) || 0xffffff;
}

// ─── INIT ────────────────────────────────────────────────────────────────────
export function initThreeJS(canvas: HTMLCanvasElement, w: number, h: number): void {
  if (initialized) return;
  initialized = true;

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a1a, 0.00065);

  camera = new THREE.PerspectiveCamera(55, w / h, 0.5, 6000);
  camera.position.set(0, 310, 600);
  camera.lookAt(0, 0, 0);

  // Post-processing
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.8, 0.65, 0.12);
  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  // ── Lights ──
  ambientLight = new THREE.AmbientLight(0x112233, 0.55);
  scene.add(ambientLight);

  playerPointLight = new THREE.PointLight(0x00f2ff, 4.5, 380);
  playerPointLight.position.set(0, 80, 0);
  scene.add(playerPointLight);

  bloomPointLight = new THREE.PointLight(0x0044ff, 1.2, 900);
  bloomPointLight.position.set(0, 200, -400);
  scene.add(bloomPointLight);

  bossLight = new THREE.PointLight(0xff00ff, 0, 600);
  bossLight.position.set(0, 150, -200);
  scene.add(bossLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
  rimLight.position.set(300, 500, 200);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0x002244, 0.7);
  fillLight.position.set(-300, 100, -300);
  scene.add(fillLight);

  _buildPlayerShip();
  _buildEnvironment();
  _buildStarfield();
  _buildWarpLines();
}

// ─── Player Ship ─────────────────────────────────────────────────────────────
function _buildPlayerShip(): void {
  playerGroup = new THREE.Group();

  // Main fuselage
  const fuselageGeo = new THREE.CylinderGeometry(5.5, 3, 36, 6);
  const fuselageMat = new THREE.MeshStandardMaterial({
    color: 0x00ccdd, emissive: 0x005577, emissiveIntensity: 1.3,
    metalness: 0.85, roughness: 0.15,
  });
  const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
  fuselage.rotation.x = Math.PI / 2;
  playerGroup.add(fuselage);

  // Nose cone
  const noseGeo = new THREE.ConeGeometry(5.5, 20, 6);
  const noseMat = new THREE.MeshStandardMaterial({
    color: 0x00f2ff, emissive: 0x00f2ff, emissiveIntensity: 1.6,
    metalness: 0.9, roughness: 0.1,
  });
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -27;
  playerGroup.add(nose);

  // Wings (left & right)
  for (const side of [-1, 1]) {
    const wingGeo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      0, 0, 0,
      side * 32, 0, 10,
      side * 22, 0, -8,
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    wingGeo.computeVertexNormals();
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x007799, emissive: 0x003344, emissiveIntensity: 0.9,
      metalness: 0.75, roughness: 0.25,
      side: THREE.DoubleSide,
    });
    const wing = new THREE.Mesh(wingGeo, wingMat);
    playerGroup.add(wing);

    // Wing tip accent
    const tipGeo = new THREE.BoxGeometry(4, 2, 6);
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0x00f2ff, emissive: 0x00f2ff, emissiveIntensity: 2.5,
    });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.set(side * 27, 0, 6);
    playerGroup.add(tip);
  }

  // Main engine housing
  const eHouseGeo = new THREE.CylinderGeometry(5.5, 7, 10, 8);
  const eHouseMat = new THREE.MeshStandardMaterial({ color: 0x002233, metalness: 0.95, roughness: 0.05 });
  const eHouse = new THREE.Mesh(eHouseGeo, eHouseMat);
  eHouse.rotation.x = Math.PI / 2;
  eHouse.position.z = 17;
  playerGroup.add(eHouse);

  // Main engine glow
  const eGlowGeo = new THREE.CylinderGeometry(4, 4, 7, 8);
  const eGlowMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 5,
    transparent: true, opacity: 0.9,
  });
  engineGlowMain = new THREE.Mesh(eGlowGeo, eGlowMat);
  engineGlowMain.rotation.x = Math.PI / 2;
  engineGlowMain.position.z = 22;
  playerGroup.add(engineGlowMain);

  // Side engines
  for (const [sx, ref] of [[-17, 'L'], [17, 'R']] as [number, string][]) {
    const sgGeo = new THREE.CylinderGeometry(3, 4, 7, 6);
    const sgBase = new THREE.Mesh(sgGeo, eHouseMat);
    sgBase.rotation.x = Math.PI / 2;
    sgBase.position.set(sx, -2, 14);
    playerGroup.add(sgBase);

    const sgGlowGeo = new THREE.CylinderGeometry(2.5, 2.5, 5, 6);
    const sgGlowMat = new THREE.MeshStandardMaterial({
      color: 0x00ddff, emissive: 0x00ddff, emissiveIntensity: 4,
    });
    const sgGlow = new THREE.Mesh(sgGlowGeo, sgGlowMat);
    sgGlow.rotation.x = Math.PI / 2;
    sgGlow.position.set(sx, -2, 18);
    playerGroup.add(sgGlow);
    if (ref === 'L') engineGlowL = sgGlow;
    else engineGlowR = sgGlow;
  }

  // Shield ring (shown when invincible/dashing)
  const shieldGeo = new THREE.TorusGeometry(26, 2, 8, 32);
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x00f2ff, emissive: 0x00f2ff, emissiveIntensity: 3,
    transparent: true, opacity: 0,
  });
  shieldRing = new THREE.Mesh(shieldGeo, shieldMat);
  shieldRing.rotation.x = Math.PI / 2;
  playerGroup.add(shieldRing);

  scene.add(playerGroup);
}

// ─── Environment ─────────────────────────────────────────────────────────────
function _buildEnvironment(): void {
  // Far grid
  const farGeo = new THREE.PlaneGeometry(12000, 12000, 240, 240);
  const farMat = new THREE.MeshBasicMaterial({
    color: 0x00f2ff, wireframe: true, transparent: true, opacity: 0.035,
  });
  gridFar = new THREE.Mesh(farGeo, farMat);
  gridFar.rotation.x = -Math.PI / 2;
  gridFar.position.y = -38;
  scene.add(gridFar);

  // Near dense grid
  const nearGeo = new THREE.PlaneGeometry(1800, 1800, 70, 70);
  const nearMat = new THREE.MeshBasicMaterial({
    color: 0x00f2ff, wireframe: true, transparent: true, opacity: 0.11,
  });
  gridNear = new THREE.Mesh(nearGeo, nearMat);
  gridNear.rotation.x = -Math.PI / 2;
  gridNear.position.y = -35;
  scene.add(gridNear);
}

// ─── Starfield + Nebula ───────────────────────────────────────────────────────
function _buildStarfield(): void {
  // White/blue stars
  const starPos: number[] = [];
  for (let i = 0; i < 5500; i++) {
    starPos.push(
      (Math.random() - 0.5) * 11000,
      (Math.random() - 0.5) * 4500,
      (Math.random() - 0.5) * 11000,
    );
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  starPoints = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xbbddff, size: 1.7, transparent: true, opacity: 0.85,
  }));
  scene.add(starPoints);

  // Colored nebula clouds
  const nebPos: number[] = [];
  const nebColorsArr: number[] = [];
  const col = new THREE.Color();
  for (let i = 0; i < 3000; i++) {
    nebPos.push(
      (Math.random() - 0.5) * 9000,
      (Math.random() - 0.5) * 2200 - 350,
      (Math.random() - 0.5) * 9000,
    );
    // Cyan–purple–blue palette
    col.setHSL(Math.random() * 0.28 + 0.52, 0.9, 0.32 + Math.random() * 0.28);
    nebColorsArr.push(col.r, col.g, col.b);
  }
  const nebGeo = new THREE.BufferGeometry();
  nebGeo.setAttribute('position', new THREE.Float32BufferAttribute(nebPos, 3));
  nebGeo.setAttribute('color', new THREE.Float32BufferAttribute(nebColorsArr, 3));
  nebulaPoints = new THREE.Points(nebGeo, new THREE.PointsMaterial({
    vertexColors: true, size: 5.5, transparent: true, opacity: 0.22,
    sizeAttenuation: true,
  }));
  scene.add(nebulaPoints);
}

// ─── Warp Speed Lines ─────────────────────────────────────────────────────────
function _buildWarpLines(): void {
  const lineCount = 120;
  const positions: number[] = [];
  for (let i = 0; i < lineCount; i++) {
    const x = (Math.random() - 0.5) * 1200;
    const y = (Math.random() - 0.5) * 400 - 50;
    const z = (Math.random() - 0.5) * 1200;
    positions.push(x, y, z, x, y, z + 60 + Math.random() * 120);
  }
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const lMat = new THREE.LineBasicMaterial({
    color: 0x00f2ff, transparent: true, opacity: 0,
  });
  warpLinesMesh = new THREE.LineSegments(lGeo, lMat);
  scene.add(warpLinesMesh);
}

// ─── RENDER ──────────────────────────────────────────────────────────────────
export function renderThreeJS(eng: any, dt: number, now: number): void {
  if (!renderer || !scene || !camera) return;

  // Resize
  if (eng.w && eng.h) {
    const aspect = eng.w / eng.h;
    if (Math.abs(camera.aspect - aspect) > 0.01) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(eng.w, eng.h, false);
      composer.setSize(eng.w, eng.h);
    }
  }

  const px = eng.player?.x || 0;
  const py = eng.player?.y || 0;
  const dpx = (px - prevPx) * dt;
  const dpy = (py - prevPy) * dt;
  prevPx = px;
  prevPy = py;
  const speed = Math.hypot(dpx, dpy);

  // ── Environment color ──
  const sHex = parseInt((eng.sectorColor || '#0a0a1a').replace('#', ''), 16) || 0x0a0a1a;
  envColorTarget.setHex(sHex);
  envColorCurrent.lerp(envColorTarget, 0.012 * dt);
  scene.background = envColorCurrent;
  (scene.fog as THREE.FogExp2).color.copy(envColorCurrent);

  // ── Ambient light (blood moon) ──
  if (eng.bloodMoonActive) {
    ambientLight.color.lerp(new THREE.Color(0x660000), 0.04 * dt);
    (gridFar.material as THREE.MeshBasicMaterial).color.lerp(new THREE.Color(0xff2200), 0.04 * dt);
    (gridNear.material as THREE.MeshBasicMaterial).color.lerp(new THREE.Color(0xff4400), 0.04 * dt);
    bossLight.intensity = 2 + Math.sin(now * 0.003) * 0.8;
  } else {
    ambientLight.color.lerp(new THREE.Color(0x112233), 0.025 * dt);
    (gridFar.material as THREE.MeshBasicMaterial).color.lerp(new THREE.Color(0x00f2ff), 0.025 * dt);
    (gridNear.material as THREE.MeshBasicMaterial).color.lerp(new THREE.Color(0x00f2ff), 0.025 * dt);
    bossLight.intensity += (0 - bossLight.intensity) * 0.05 * dt;
  }
  ambientLight.intensity = 0.52 + Math.sin(now * 0.0008) * 0.04;

  // ── Player Ship ──
  const mouseAng = Math.atan2(
    (eng.mouse?.y || 0) - (eng.h || 600) / 2,
    (eng.mouse?.x || 0) - (eng.w || 800) / 2
  );
  playerGroup.rotation.y = -mouseAng + Math.PI / 2;
  playerGroup.rotation.z += (-dpx * 0.015 - playerGroup.rotation.z) * 0.12 * dt;
  playerGroup.rotation.x += (dpy * 0.008 - playerGroup.rotation.x) * 0.08 * dt;
  playerGroup.position.y = Math.sin(now * 0.0009) * 4.5;

  // Engine glow pulse
  const moving = eng.keys?.KeyW || eng.keys?.KeyS || eng.keys?.KeyA || eng.keys?.KeyD ||
                 eng.keys?.ArrowUp || eng.keys?.ArrowDown || eng.keys?.ArrowLeft || eng.keys?.ArrowRight;
  const eGlowInt = 4 + Math.sin(now * 0.006) * 1.2 + (moving ? 3.5 : 0) + (eng.dashFrames > 0 ? 5 : 0);
  if (engineGlowMain) (engineGlowMain.material as THREE.MeshStandardMaterial).emissiveIntensity = eGlowInt;
  if (engineGlowL) (engineGlowL.material as THREE.MeshStandardMaterial).emissiveIntensity = eGlowInt * 0.75;
  if (engineGlowR) (engineGlowR.material as THREE.MeshStandardMaterial).emissiveIntensity = eGlowInt * 0.75;

  // Shield ring visibility
  if (shieldRing) {
    const shieldVisible = eng.dashFrames > 0 || eng.invincibilityFrames > 60;
    const targetOpacity = shieldVisible ? (0.5 + Math.sin(now * 0.015) * 0.3) : 0;
    const mat = shieldRing.material as THREE.MeshStandardMaterial;
    mat.opacity += (targetOpacity - mat.opacity) * 0.15 * dt;
    shieldRing.rotation.z += 0.03 * dt;
    if (eng.dashFrames > 0) mat.color.setHex(0xffffff);
    else mat.color.setHex(0x00f2ff);
  }

  // ── Player light ──
  playerPointLight.color.lerp(
    new THREE.Color(eng.dashFrames > 0 ? 0xffffff : eng.overloadActiveFrames > 0 ? 0xff00ff : 0x00f2ff),
    0.12 * dt
  );
  playerPointLight.intensity = eng.dashFrames > 0 ? 9 : eng.overloadActiveFrames > 0 ? 7 : (3.5 + Math.sin(now * 0.003) * 0.7);

  // ── Grid parallax ──
  gridFar.position.x = -px * 0.012;
  gridFar.position.z = -py * 0.012;
  gridNear.position.x = -(px % 60) * 0.28;
  gridNear.position.z = -(py % 60) * 0.28;

  // ── Star / Nebula parallax ──
  starPoints.position.x = -px * 0.022;
  starPoints.position.z = -py * 0.022;
  nebulaPoints.position.x = -px * 0.009;
  nebulaPoints.position.z = -py * 0.009;

  // ── Warp lines (appear when moving fast) ──
  if (warpLinesMesh) {
    warpTimer += speed * 0.15;
    const warpOpacity = Math.min(0.7, speed * 0.12);
    (warpLinesMesh.material as THREE.LineBasicMaterial).opacity += (warpOpacity - (warpLinesMesh.material as THREE.LineBasicMaterial).opacity) * 0.1 * dt;
    warpLinesMesh.position.z = warpTimer % 800;
  }

  // ── Camera smooth follow with lean ──
  camVelX += (-dpx * 0.5 - camVelX) * 0.09 * dt;
  camVelZ += (-dpy * 0.5 - camVelZ) * 0.09 * dt;

  const shakeX = eng.shake > 0 ? (Math.random() - 0.5) * eng.shake * 1.6 : 0;
  const shakeY = eng.shake > 0 ? (Math.random() - 0.5) * eng.shake * 0.6 : 0;

  const targetCamX = camVelX * 3 + shakeX;
  const targetCamY = 310 + shakeY + Math.sin(now * 0.0006) * 5;
  const targetCamZ = 600 + shakeX * 0.4;

  camera.position.x += (targetCamX - camera.position.x) * 0.07 * dt;
  camera.position.y += (targetCamY - camera.position.y) * 0.04 * dt;
  camera.position.z += (targetCamZ - camera.position.z) * 0.07 * dt;
  camera.lookAt(camVelX * 0.7, camVelZ * 0.25, camVelZ * 0.45);

  // ── Hide all pooled objects ──
  enemyPool.forEach(m => { m.visible = false; });
  bulletPool.forEach(m => { m.visible = false; });
  particlePool.forEach(m => { m.visible = false; });
  powerupPool.forEach(m => { m.visible = false; });

  // ── Enemies ──
  (eng.enemies || []).forEach((en: any, i: number) => {
    const key = `en_${i}`;
    const type = en.type || 'bad';
    const colorNum = en.isElite ? 0xffcc00 : (ENEMY_COLOR[type] || 0xff2d55);
    const isBoss = type === 'boss';

    let mesh = enemyPool.get(key);
    if (!mesh || (mesh as any).__etype !== type) {
      if (mesh) scene.remove(mesh);
      const geo = getEnemyGeo(type);
      const mat = new THREE.MeshStandardMaterial({
        color: colorNum,
        emissive: colorNum,
        emissiveIntensity: isBoss ? 2.5 : 1.6,
        wireframe: type === 'ghost',
        transparent: type === 'phaser' || type === 'ghost',
        opacity: type === 'ghost' ? 0.65 : 1.0,
      });
      mesh = new THREE.Mesh(geo, mat);
      (mesh as any).__etype = type;
      scene.add(mesh);
      enemyPool.set(key, mesh);
    }

    const isPhaseHidden = en.isPhased && (Math.floor(now / 80) % 2 === 1);
    mesh.visible = en.isVisible !== false && !isPhaseHidden;

    // 2D (x, y) → 3D (x, height, z)
    const ex = en.x - px;
    const ey = en.y - py;
    const yHeight = isBoss ? 30 : type === 'gem' ? 8 + Math.sin(now * 0.004 + i) * 8 : 2;
    mesh.position.set(ex, yHeight, ey);

    const s = (en.r || 12) / 12;
    mesh.scale.setScalar(s * (en.spawnFlash > 0 ? (0.7 + en.spawnFlash / 12 * 0.5) : 1));

    // Rotation animation per type
    if (isBoss || type === 'pulsar') {
      mesh.rotation.y += 0.05 * dt;
      mesh.rotation.z += 0.03 * dt;
    } else if (type === 'teleporter' || type === 'gem') {
      mesh.rotation.y += 0.06 * dt;
      mesh.rotation.z += 0.04 * dt;
    } else {
      mesh.rotation.x += 0.025 * dt;
      mesh.rotation.y += 0.03 * dt;
    }

    // Status FX via emissive
    const eMat = mesh.material as THREE.MeshStandardMaterial;
    if (en.flashTimer > 0) {
      eMat.emissive.setHex(0xffffff);
      eMat.emissiveIntensity = 6;
    } else if (en.frozenTimer > 0) {
      eMat.emissive.setHex(0x88eeff);
      eMat.emissiveIntensity = 2.5;
    } else if (en.stunnedTimer > 0) {
      eMat.emissive.setHex(0xffff44);
      eMat.emissiveIntensity = 2.5;
    } else {
      eMat.emissive.setHex(colorNum);
      eMat.emissiveIntensity = isBoss ? 2.5 + Math.sin(now * 0.004) * 0.5 : 1.6;
    }

    // Elite pulsing ring - scale the emissive
    if (en.isElite) {
      eMat.emissiveIntensity = 2 + Math.sin(now * 0.008) * 1;
    }
  });

  // ── Bullets ──
  (eng.bullets || []).forEach((b: any, i: number) => {
    const key = `b_${i}`;
    let mesh = bulletPool.get(key);
    if (!mesh) {
      let geo: THREE.BufferGeometry;
      if (b.type === 'mine') geo = new THREE.SphereGeometry(5, 8, 8);
      else if (b.type === 'blade') geo = new THREE.TorusGeometry(6, 2, 6, 12);
      else if (b.type === 'wave') geo = new THREE.TorusGeometry(20, 3, 8, 32);
      else if (b.type === 'arcpulse') geo = new THREE.TorusGeometry(15, 3, 8, 32);
      else if (b.type === 'gravity') geo = new THREE.SphereGeometry(10, 14, 14);
      else if (b.type === 'beam') geo = new THREE.CapsuleGeometry(1.5, 16, 4, 6);
      else if (b.type === 'homing') geo = new THREE.ConeGeometry(3, 12, 5);
      else geo = new THREE.CapsuleGeometry(2, 10, 4, 6);

      const bColor = hexStrToNum(b.color || '#00ffff');
      const bMat = new THREE.MeshStandardMaterial({
        color: bColor, emissive: bColor,
        emissiveIntensity: b.isEnemy ? 2 : 3.5,
        transparent: true, opacity: 0.92,
      });
      mesh = new THREE.Mesh(geo, bMat);
      scene.add(mesh);
      bulletPool.set(key, mesh);
    }

    mesh.visible = true;
    const bMat = mesh.material as THREE.MeshStandardMaterial;

    if (b.type === 'wave') {
      mesh.position.set(0, 3, 0);
      const ws = Math.max(0.05, (b.radius || 1) / 20);
      mesh.scale.set(ws, 0.12, ws);
      mesh.rotation.x = Math.PI / 2;
      bMat.opacity = Math.max(0, b.life / 40);
    } else if (b.type === 'arcpulse') {
      mesh.position.set(0, 3, 0);
      const as = Math.max(0.05, (b.radius || 1) / 15);
      mesh.scale.set(as, 0.12, as);
      mesh.rotation.x = Math.PI / 2;
      bMat.opacity = Math.max(0, b.life / 50);
    } else if (b.type === 'gravity') {
      mesh.position.set(b.x - px, 6, b.y - py);
      mesh.scale.setScalar(1 + Math.sin(now * 0.008) * 0.35);
      mesh.rotation.y += 0.09 * dt;
      bMat.emissiveIntensity = 3 + Math.sin(now * 0.01) * 1.8;
    } else if (b.type === 'blade') {
      mesh.position.set(b.x - px, 5, b.y - py);
      mesh.rotation.x = Math.PI / 2;
      mesh.rotation.z += 0.18 * dt;
    } else if (b.type === 'mine') {
      mesh.position.set(b.x - px, 4, b.y - py);
      bMat.emissiveIntensity = 2 + Math.sin(now * 0.01 + i) * 1.2;
    } else if (b.type === 'homing') {
      mesh.position.set(b.x - px, 4, b.y - py);
      const ang = Math.atan2(b.vy || 0, b.vx || 0);
      mesh.rotation.set(Math.PI / 2, 0, -ang);
    } else {
      mesh.position.set(b.x - px, 3, b.y - py);
      const ang = Math.atan2(b.vy || 0, b.vx || 0);
      mesh.rotation.set(Math.PI / 2, 0, -ang);
      const typeScale = b.type === 'beam' ? 1.4 : b.isEnemy ? 0.75 : 1;
      mesh.scale.setScalar(typeScale);
    }
  });

  // ── Particles ──
  (eng.particles || []).forEach((p: any, i: number) => {
    const key = `p_${i}`;
    let mesh = particlePool.get(key);
    if (!mesh) {
      const geo = new THREE.TetrahedronGeometry(2.5, 0);
      const pColor = hexStrToNum(p.color || '#ffffff');
      const pMat = new THREE.MeshStandardMaterial({
        color: pColor, emissive: pColor, emissiveIntensity: 2.8,
        transparent: true, opacity: 1,
      });
      mesh = new THREE.Mesh(geo, pMat);
      scene.add(mesh);
      particlePool.set(key, mesh);
    }
    mesh.visible = true;
    mesh.position.set(p.x - px, 5 + p.life * 22, p.y - py);
    mesh.rotation.x += 0.12 * dt;
    mesh.rotation.y += 0.18 * dt;
    const pScale = Math.max(0.01, p.life * 2.2);
    mesh.scale.setScalar(pScale);
    (mesh.material as THREE.MeshStandardMaterial).opacity = Math.min(1, p.life * 2.5);
  });

  // ── Powerups ──
  (eng.powerups || []).forEach((p: any, i: number) => {
    const key = `pw_${i}`;
    let mesh = powerupPool.get(key);
    if (!mesh) {
      const geo = new THREE.OctahedronGeometry(10, 0);
      const pColor = {
        nuke: 0xff0000, shield: 0x4444ff, freeze: 0x00ffff, heal: 0x00ff88,
        doubledmg: 0xff4400, speedboost: 0x00ffcc, expburst: 0x00ff88,
        overchargesurge: 0xffff00, datacascade: 0xff44ff,
      }[p.type as string] || 0xffffff;
      const pwMat = new THREE.MeshStandardMaterial({
        color: pColor, emissive: pColor, emissiveIntensity: 2.5,
        transparent: true, opacity: 0.9,
      });
      mesh = new THREE.Mesh(geo, pwMat);
      scene.add(mesh);
      powerupPool.set(key, mesh);
    }
    mesh.visible = true;
    mesh.position.set(p.x - px, 8 + Math.sin(now * 0.003 + i * 1.3) * 5, p.y - py);
    mesh.rotation.y += 0.05 * dt;
    mesh.rotation.x += 0.03 * dt;
    const pwOpacity = p.life < 120 ? (Math.floor(p.life / 8) % 2 === 0 ? 0.9 : 0.3) : 0.9;
    (mesh.material as THREE.MeshStandardMaterial).opacity = pwOpacity;
  });

  composer.render();
}

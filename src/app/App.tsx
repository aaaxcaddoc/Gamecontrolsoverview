import React, { useEffect, useRef, useState, useCallback } from 'react';
import { initThreeJS, renderThreeJS } from './game/ThreeRenderer';



// ─── DATA STRUCTURES ──────────────────────────────────────────────────────────

const WEAPONS: Record<string, { id: string; name: string; cost: number; cooldown: number; speed: number; dmg: number; type: string; color: string; desc: string }> = {
  basic:     { id: 'basic',     name: 'Pulse Rifle',    cost: 0,    cooldown: 12, speed: 12, dmg: 1,    type: 'single',   color: '#00f2ff', desc: 'Standard auto-targeting neutralizer.' },
  rapid:     { id: 'rapid',     name: 'Vulcan SMG',     cost: 150,  cooldown: 0,  speed: 169, dmg: 12, type: 'single',   color: '#ffea00', desc: 'Extreme fire rate, low damage per shot.' },
  spread:    { id: 'spread',    name: 'Scatter Shot',   cost: 350,  cooldown: 22, speed: 10, dmg: 0.8,  type: 'spread',   color: '#ff2d55', desc: 'Fires a 3-shot wide cone burst.' },
  sniper:    { id: 'sniper',    name: 'Railgun',        cost: 800,  cooldown: 35, speed: 25, dmg: 4.5,  type: 'pierce',   color: '#b900ff', desc: 'High-velocity slug piercing all targets.' },
  flame:     { id: 'flame',     name: 'Plasma Torch',   cost: 1200, cooldown: 2,  speed: 8,  dmg: 0.12, type: 'flame',    color: '#ff7300', desc: 'Continuous short-range plasma stream with DoT.' },
  boomerang: { id: 'boomerang', name: 'Rebounder',      cost: 1500, cooldown: 25, speed: 14, dmg: 2,    type: 'boomerang',color: '#00ffaa', desc: 'Projectiles arc back and hit twice.' },
  lightning: { id: 'lightning', name: 'Arc Caster',     cost: 2500, cooldown: 18, speed: 20, dmg: 1.5,  type: 'lightning',color: '#00aaff', desc: 'Chains shock to nearby enemies on impact.' },
  mine:      { id: 'mine',      name: 'Spider Mines',   cost: 2, cooldown: 2, speed: 99,  dmg: 99999,    type: 'mine',     color: '#ffff00', desc: 'Proximity traps that detonate on contact.' },
  blade:     { id: 'blade',     name: 'Orbital Saw',    cost: 3000, cooldown: 60, speed: 0,  dmg: 10,   type: 'blade',    color: '#ff0055', desc: 'Deploys spinning melee rings around the ship.' },
  swarm:     { id: 'swarm',     name: 'Swarm Missiles', cost: 4000, cooldown: 30, speed: 6,  dmg: 1.2,  type: 'homing',   color: '#ff00ff', desc: 'Fires 4 micro-missiles that track targets.' },
  wave:      { id: 'wave',      name: 'Seismic Wave',   cost: 5000, cooldown: 50, speed: 8,  dmg: 3,    type: 'wave',     color: '#ffffff', desc: 'Fires an expanding ring of destruction.' },
  beam:      { id: 'beam',      name: 'Photon Beam',    cost: 6000, cooldown: 5,  speed: 30, dmg: 0.5,  type: 'beam',     color: '#00ffff', desc: 'Continuous laser beam (precision aim required).' },
  // ── NEW WEAPONS ──
  flak:      { id: 'flak',      name: 'Flak Cannon',    cost: 700,  cooldown: 20, speed: 12, dmg: 1.5,  type: 'flak',     color: '#ff8800', desc: 'Explosive rounds that deal area damage on impact.' },
  cryo:      { id: 'cryo',      name: 'Cryo Blaster',   cost: 1000, cooldown: 15, speed: 10, dmg: 0.8,  type: 'cryo',     color: '#88eeff', desc: 'Freezes enemies on impact, slowing movement 80%.' },
  gravity:   { id: 'gravity',   name: 'Gravity Well',   cost: 3, cooldown: 0, speed: 900,  dmg: 99999999999999999999999999999999999999999999999999999999999999999999999999,  type: 'gravity',  color: '#9900ff', desc: 'Creates a singularity that pulls and crushes enemies.' },
  bounce:    { id: 'bounce',    name: 'Plasma Ball',    cost: 2800, cooldown: 20, speed: 10, dmg: 1.5,  type: 'bounce',   color: '#ff44ff', desc: 'Bounces off walls and enemies, hitting multiple.' },
  emp:       { id: 'emp',       name: 'EMP Blaster',    cost: 1800, cooldown: 35, speed: 15, dmg: 0.5,  type: 'emp',      color: '#44ffee', desc: 'Stuns enemies and disables their special abilities.' },
  arcpulse:  { id: 'arcpulse',  name: 'Arc Pulse',      cost: 4500, cooldown: 30, speed: 0,  dmg: 1.8,  type: 'arcpulse', color: '#ffff44', desc: 'Expanding arc blast that hits all enemies in front.' },
};

const DRONES: Record<string, { id: string; name: string; cost: number; desc: string; color: string; type: string; cooldown: number }> = {
  aegis:   { id: 'aegis',   name: 'Aegis Shield',   cost: 500,  desc: 'Blocks one instance of damage then recharges over time.',        color: '#4ade80', type: 'shield',  cooldown: 1200 },
  striker: { id: 'striker', name: 'Striker Pod',    cost: 800,  desc: 'Fires small lasers at nearby targets.',                 color: '#facc15', type: 'attack',  cooldown: 30 },
  magnet:  { id: 'magnet',  name: 'Grav-Magnet',    cost: 600,  desc: 'Pulls powerups and data gems from far away.',           color: '#a78bfa', type: 'utility', cooldown: 0 },
  sapper:  { id: 'sapper',  name: 'Sapper Field',   cost: 1200, desc: 'Generates a slow-field around the ship.',               color: '#00f2ff', type: 'aura',    cooldown: 0 },
  medic:   { id: 'medic',   name: 'Repair Drone',   cost: 2500, desc: 'Restores 1 HP every 60 seconds.',                      color: '#ff2d55', type: 'heal',    cooldown: 3600 },
  nova:    { id: 'nova',    name: 'Nova Core',       cost: 3000, desc: 'Explodes when you take damage, wiping nearby enemies.', color: '#ff7300', type: 'retaliate',cooldown: 2400 },
  // ── NEW DRONES ──
  scanner: { id: 'scanner', name: 'Scanner Drone',  cost: 400,  desc: 'Reveals HP bars on all visible enemies.',              color: '#00ccff', type: 'scanner', cooldown: 0 },
  decoy:   { id: 'decoy',   name: 'Decoy Drone',    cost: 900,  desc: 'Launches a dummy that absorbs 30% of enemy fire.',     color: '#ffaaff', type: 'decoy',   cooldown: 600 },
  anchor:  { id: 'anchor',  name: 'Anchor Drone',   cost: 1600, desc: 'Briefly freezes the nearest enemy every 5 seconds.',  color: '#00ffcc', type: 'anchor',  cooldown: 300 },
};

const UPGRADES: Record<string, { id: string; name: string; cost: number; desc: string; maxLvl: number }> = {
  hull:         { id: 'hull',         name: 'Reinforced Hull',   cost: 500,  desc: '+1 Max HP per level.',                       maxLvl: 999 },
  reflex:       { id: 'reflex',       name: 'Neural Reflex',     cost: 400,  desc: 'Increases Time-Dilation strength by 10%.',    maxLvl: 3 },
  overload_cap: { id: 'overload_cap', name: 'Overload Capacity', cost: 600,  desc: '+20% Max Overload meter per level.',          maxLvl: 5 },
  overload_eff: { id: 'overload_eff', name: 'Dash Efficiency',   cost: 800,  desc: 'Reduces Ghost Dash overload cost.',           maxLvl: 3 },
  combo_anchor: { id: 'combo_anchor', name: 'Combo Anchor',      cost: 1000, desc: 'Combo meter decays 40% slower.',             maxLvl: 3 },
  graze_master: { id: 'graze_master', name: 'Graze Master',      cost: 700,  desc: 'Increases graze radius and bonus score.',    maxLvl: 3 },
  credit_find:  { id: 'credit_find',  name: 'Data Miner',        cost: 1500, desc: '+10% Data Credits per run.',                 maxLvl: 5 },
  // ── NEW UPGRADES ──
  dmgcore:      { id: 'dmgcore',      name: 'Damage Core',       cost: 800,  desc: '+12% all weapon damage per level.',          maxLvl: 5 },
  bulletspeed:  { id: 'bulletspeed',  name: 'Bullet Velocity',   cost: 600,  desc: '+15% projectile speed per level.',           maxLvl: 4 },
  reload:       { id: 'reload',       name: 'Reload Matrix',     cost: 700,  desc: '-12% all weapon cooldowns per level.',       maxLvl: 4 },
  lifesteal:    { id: 'lifesteal',    name: 'Life Steal',        cost: 1200, desc: 'Regenerate HP every 75 kills.',              maxLvl: 3 },
  expmult:      { id: 'expmult',      name: 'Neural Growth',     cost: 900,  desc: '+25% EXP gain per level.',                  maxLvl: 4 },
  dashrange:    { id: 'dashrange',    name: 'Afterburner',       cost: 1000, desc: '+2 dash distance and duration per level.',   maxLvl: 3 },
};

const SECTOR_COLORS = ['#0f172a', '#1e1b4b', '#064e3b', '#2e1065', '#3f1a1a', '#020617'];

// ─── LEVELS ──────────────────────────────────────────────────────────────────
const LEVELS = [
  { id: 1,  name: 'INITIALIZATION',   objective: 'ELIMINATE 25 HOSTILES',    type: 'kills', target: 25,    reward: 40999999999990,  desc: 'First contact with hostile data clusters.' },
  { id: 2,  name: 'FIRST CONTACT',    objective: 'SURVIVE 90 SECONDS',       type: 'time',  target: 90,    reward: 6000000000,  desc: 'Hold your ground. Endurance is the first test.' },
  { id: 3,  name: 'SURGE STATE',      objective: 'REACH 6,000 SCORE',        type: 'score', target: 6000,  reward: 900,  desc: 'Push beyond limits. Combo multipliers are key.' },
  { id: 4,  name: 'ANOMALY HUNT',     objective: 'DEFEAT THE BOSS',          type: 'boss',  target: 1,     reward: 1500, desc: 'A Class-V Anomaly detected. Eliminate it.' },
  { id: 5,  name: 'BLOOD COVENANT',   objective: 'ELIMINATE 80 HOSTILES',    type: 'kills', target: 80,    reward: 1200, desc: 'Blood Moon rises. More enemies, more chaos.' },
  { id: 6,  name: 'NEURAL FRACTURE',  objective: 'SURVIVE 3 MINUTES',        type: 'time',  target: 180,   reward: 2000, desc: 'Corruption spirals. Survive the endless assault.' },
  { id: 7,  name: 'SECTOR OMEGA',     objective: 'REACH 30,000 SCORE',       type: 'score', target: 30000, reward: 2500, desc: 'The deep sector. Prove your neural supremacy.' },
  { id: 8,  name: 'VOID PROTOCOL',    objective: 'DEFEAT 2 BOSSES',          type: 'boss',  target: 2,     reward: 3500, desc: 'Two Anomalies have converged. Eliminate both.' },
  { id: 9,  name: 'OVERLOAD CASCADE', objective: 'ELIMINATE 150 HOSTILES',   type: 'kills', target: 150,   reward: 4000, desc: 'The system is collapsing. Purge everything.' },
  { id: 10, name: 'INFINITE PULSE',   objective: 'REACH 100,000 SCORE',      type: 'score', target: 100000, reward: 6000, desc: 'The final protocol. Become the Neural Pulse.' },
];

const COMBO_MILESTONES = [
  { threshold: 5,  text: 'SYNC CHAIN',    color: '#00f2ff' },
  { threshold: 10, text: 'NEURAL LOCK',   color: '#00ffaa' },
  { threshold: 25, text: 'TRANSCENDENCE', color: '#ffff00' },
  { threshold: 50, text: 'OMNIFORM',      color: '#ff00ff' },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255,255,255';
};

// ─── MAIN APP ────────────────────────────────────────────────────────────────

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webglRef = useRef<HTMLCanvasElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const ytFrameRef = useRef<HTMLIFrameElement>(null);
  const mp3UrlRef = useRef<string>('');

  // ── Menu States ──
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'stats'>('menu');
  const [menuTab, setMenuTab] = useState<'deploy' | 'arsenal' | 'drones' | 'upgrades' | 'settings'>('deploy');
  const [paused, setPaused] = useState(false);

  // ── Level States ──
  const [levelCompleteData, setLevelCompleteData] = useState<{
    level: number; name: string; reward: number; nextName: string; nextObj: string;
  } | null>(null);
  const [levelCountdown, setLevelCountdown] = useState(5);
  const [maxLevelReached, setMaxLevelReached] = useState(1);

  // ── Music States ──
  const [musicType, setMusicType] = useState<'none' | 'youtube' | 'mp3'>('none');
  const [musicYtUrl, setMusicYtUrl] = useState('');
  const [musicYtInput, setMusicYtInput] = useState('');
  const [musicVolume, setMusicVolume] = useState(0.7);
  const [musicFileName, setMusicFileName] = useState('');

  // ── Persistent Save States ──
  const [credits, setCredits]                     = useState(0);
  const [unlockedWeapons, setUnlockedWeapons]     = useState<string[]>(['basic']);
  const [unlockedDrones, setUnlockedDrones]       = useState<string[]>([]);
  const [upgradeLevels, setUpgradeLevels]         = useState<Record<string, number>>({});

  // ── Loadout States ──
  const [loadoutWeapons, setLoadoutWeapons] = useState<string[]>(['basic', '', '']);
  const [loadoutDrones, setLoadoutDrones]   = useState<string[]>([]);

  // ── Settings ──
  const [resolution, setResolution] = useState(1);
  const [glow, setGlow]             = useState('high');
  const [particles, setParticles]   = useState('high');
  const [audio, setAudio]           = useState('on');
  const [showHitboxes, setShowHitboxes] = useState(false);

  // ── Run Stats ──
  const [stats, setStats]       = useState({ kills: 0, score: 0, maxCombo: 0, time: 0, grazes: 0 });
  const [highScore, setHighScore] = useState(0);

  // ── Engine Ref (mutable game state, never triggers re-render) ──
  const engineRef = useRef({
    playing: false, paused: false,
    w: 0, h: 0, scale: 1, dt: 1, lastTime: 0,
    score: 0, combo: 1, credits: 0, timeAlive: 0,
    timeSlow: 1, shake: 0,
    audioEnabled: true, particleLevel: 1,

    keys: {} as Record<string, boolean>,
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    isFiring: false, isMouseFiring: false,

    player: { x: window.innerWidth / 2, y: window.innerHeight / 2, r: 8, trail: [] as any[] },
    lives: 3, maxLives: 3, invincibilityFrames: 0,

    // ── New: EXP / Level System ──
    exp: 0, expToLevel: 100, playerLevel: 1,
    levelFlashFrames: 0, levelDmgBoost: 0, levelSpeedBoost: 0,

    // ── New: Kill Streak ──
    killStreak: 0, streakTimer: 0, bestStreak: 0,

    // ── New: Kill stats for life steal ──
    killsThisRun: 0, killsForLifesteal: 0,

    // ── New: Sync-Chain Burst ──
    syncBurst: 0, syncBurstMax: 100,

    // ── New: Active Powerups ──
    activePowerups: [] as { type: string; duration: number; maxDuration: number }[],

    // ── New: Blood Moon ──
    bloodMoonActive: false, bloodMoonTimer: 0, bloodMoonThresholds: [5000, 15000, 35000] as number[], nextBloodMoon: 0,

    // ── New: Last Stand ──
    lastStandUsed: false,

    // ── New: Screen Effects ──
    hitFlash: 0, screenShockColor: '255,45,85',

    // ── New: Wave Announcements ──
    waveAnnounceFrames: 0, waveText: '',

    // ── New: Near-miss ──
    nearMissGranted: false,

    // ── Upgrade-derived multipliers (set on startGame) ──
    dmgMult: 1, bulletSpeedMult: 1, cooldownMult: 1, expMult: 1,
    dashDuration: 12, lifeStealThreshold: 9999,

    enemies: [] as any[], bullets: [] as any[], particles: [] as any[],
    powerups: [] as any[], floatingTexts: [] as any[], lightningArcs: [] as any[],

    equippedWeapons: [] as any[],
    equippedDrones: [] as any[],

    audioCtx: null as AudioContext | null,
    masterFilter: null as BiquadFilterNode | null,
    bgHum: null as OscillatorNode | null,
    bgGain: null as GainNode | null,

    hitStopFrames: 0, overload: 0, maxOverload: 100, overloadActiveFrames: 0, dashFrames: 0,
    glitchFrames: 0, sectorColor: SECTOR_COLORS[0], lastSectorLevel: 0,

    stats: { shotsFired: 0, shotsHit: 0, kills: 0, grazes: 0, maxCombo: 1 },
    bossActive: false, bossHp: 0, bossMaxHp: 0, bossEnraged: false,
    notifications: [] as { text: string; life: number; type?: string }[],

    bgGridOffset: { x: 0, y: 0 },

    showHitboxes: false,
    comboMilestoneReached: 0,

    // ── Level tracking ──
    currentLevel: 1, levelComplete: false, levelCompleteFrames: 0,
    levelStartKills: 0, levelStartTime: 0, levelStartScore: 0,
    levelBossesDefeated: 0,
  });

  // ── Initialization / Loading ──
  useEffect(() => {
    const load = (key: string, parser: (val: string) => any, setter: any) => {
      const val = localStorage.getItem(key);
      if (val) setter(parser(val));
    };
    load('np_credits',      parseInt,    setCredits);
    load('np_unlocked_w',   JSON.parse,  setUnlockedWeapons);
    load('np_unlocked_d',   JSON.parse,  setUnlockedDrones);
    load('np_upgrades_lvl', JSON.parse,  setUpgradeLevels);
    load('np_loadout_w',    JSON.parse,  setLoadoutWeapons);
    load('np_loadout_d',    JSON.parse,  setLoadoutDrones);
    load('np_res',          parseFloat,  setResolution);
    load('np_glow',         String,      setGlow);
    load('np_part',         String,      setParticles);
    load('np_audio',        String,      setAudio);
    load('np_highscore',    parseInt,    setHighScore);
    load('np_max_level',    parseInt,    setMaxLevelReached);
    // Music prefs
    const mType = localStorage.getItem('np_music_type') as any;
    if (mType) setMusicType(mType);
    const mVol = localStorage.getItem('np_music_vol');
    if (mVol) setMusicVolume(parseFloat(mVol));
    const mYt = localStorage.getItem('np_music_yt');
    if (mYt) { setMusicYtUrl(mYt); setMusicYtInput(mYt); }
  }, []);

  // ── Save Helpers ──
  const saveCredits  = (val: number)    => { setCredits(val);      localStorage.setItem('np_credits', val.toString()); };
  const saveLoadoutW = (val: string[])  => { setLoadoutWeapons(val); localStorage.setItem('np_loadout_w', JSON.stringify(val)); };
  const saveLoadoutD = (val: string[])  => { setLoadoutDrones(val);  localStorage.setItem('np_loadout_d', JSON.stringify(val)); };

  const handleBuyWeapon = (key: string, cost: number) => {
    if (credits >= cost && !unlockedWeapons.includes(key)) {
      saveCredits(credits - cost);
      const n = [...unlockedWeapons, key]; setUnlockedWeapons(n); localStorage.setItem('np_unlocked_w', JSON.stringify(n));
    }
  };
  const handleBuyDrone = (key: string, cost: number) => {
    if (credits >= cost && !unlockedDrones.includes(key)) {
      saveCredits(credits - cost);
      const n = [...unlockedDrones, key]; setUnlockedDrones(n); localStorage.setItem('np_unlocked_d', JSON.stringify(n));
    }
  };
  const handleBuyUpgrade = (key: string, cost: number, currentLvl: number) => {
    if (credits >= cost && currentLvl < UPGRADES[key].maxLvl) {
      saveCredits(credits - cost);
      const n = { ...upgradeLevels, [key]: currentLvl + 1 }; setUpgradeLevels(n); localStorage.setItem('np_upgrades_lvl', JSON.stringify(n));
    }
  };
  const assignWeapon = (weaponId: string, slotIndex: number) => {
    const n = [...loadoutWeapons];
    for (let i = 0; i < 3; i++) if (n[i] === weaponId) n[i] = '';
    n[slotIndex] = weaponId; saveLoadoutW(n);
  };
  const toggleDrone = (droneId: string) => {
    if (loadoutDrones.includes(droneId)) saveLoadoutD(loadoutDrones.filter(id => id !== droneId));
    else if (loadoutDrones.length < 4) saveLoadoutD([...loadoutDrones, droneId]);
  };

  // ── Game Over ──
  const gameOver = useCallback(() => {
    const e = engineRef.current;
    e.playing = false; e.isFiring = false; e.isMouseFiring = false;
    if (e.bgGain && e.audioCtx) e.bgGain.gain.exponentialRampToValueAtTime(0.001, e.audioCtx.currentTime + 1);
    const finalScore = Math.floor(e.score);
    const creditMult = 1 + ((upgradeLevels.credit_find || 0) * 0.1);
    const earned = Math.floor(e.credits * creditMult);
    setStats({ kills: e.stats.kills, score: finalScore, maxCombo: Math.floor(e.stats.maxCombo), time: Math.floor(e.timeAlive), grazes: e.stats.grazes });
    if (finalScore > highScore) { setHighScore(finalScore); localStorage.setItem('np_highscore', finalScore.toString()); }
    saveCredits(credits + earned);
    setGameState('stats');
  }, [credits, highScore, upgradeLevels]);

  const gameOverRef = useRef(gameOver);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  // ── Level Complete Callback ──
  const onLevelComplete = useCallback((data: { level: number; name: string; reward: number; nextName: string; nextObj: string }) => {
    setLevelCompleteData(data);
    setLevelCountdown(5);
    saveCredits(credits + data.reward);
    if (data.level > maxLevelReached) {
      setMaxLevelReached(data.level);
      localStorage.setItem('np_max_level', data.level.toString());
    }
  }, [credits, maxLevelReached]);
  const onLevelCompleteRef = useRef(onLevelComplete);
  useEffect(() => { onLevelCompleteRef.current = onLevelComplete; }, [onLevelComplete]);

  const advanceLevel = useCallback(() => {
    const e = engineRef.current;
    e.levelComplete = false;
    e.levelCompleteFrames = 0;
    e.currentLevel++;
    e.levelStartKills = e.stats.kills;
    e.levelStartTime = e.timeAlive;
    e.levelStartScore = e.score;
    e.levelBossesDefeated = 0;
    e.glitchFrames = 60;
    const lvlIdx = (e.currentLevel - 1) % LEVELS.length;
    e.notifications.push({ text: `LEVEL ${e.currentLevel} — ${LEVELS[lvlIdx].name}`, life: 180, type: 'cyan' });
    e.waveText = `LEVEL ${e.currentLevel}`; e.waveAnnounceFrames = 120;
    setLevelCompleteData(null);
  }, []);
  const advanceLevelRef = useRef(advanceLevel);
  useEffect(() => { advanceLevelRef.current = advanceLevel; }, [advanceLevel]);

  // countdown timer for level complete overlay
  useEffect(() => {
    if (!levelCompleteData) return;
    if (levelCountdown <= 0) { advanceLevelRef.current(); return; }
    const t = setTimeout(() => setLevelCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [levelCompleteData, levelCountdown]);

  // ── Start Game ──
  const startGame = () => {
    setGameState('playing'); setPaused(false);
    const e = engineRef.current;

    if (!e.audioCtx) e.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (e.audioCtx.state === 'suspended') e.audioCtx.resume();

    // Start background music
    if (audioPlayerRef.current && musicType === 'mp3' && mp3UrlRef.current) {
      audioPlayerRef.current.src = mp3UrlRef.current;
      audioPlayerRef.current.volume = musicVolume;
      audioPlayerRef.current.play().catch(() => {});
    }

    e.scale = resolution; e.audioEnabled = audio === 'on';
    e.particleLevel = particles === 'none' ? 0 : particles === 'low' ? 0.5 : 1;
    e.showHitboxes = showHitboxes;

    if (canvasRef.current && webglRef.current) {
      canvasRef.current.width  = window.innerWidth  * resolution;
      canvasRef.current.height = window.innerHeight * resolution;
      canvasRef.current.style.width  = window.innerWidth  + 'px';
      canvasRef.current.style.height = window.innerHeight + 'px';
      canvasRef.current.style.filter = glow === 'high' ? 'contrast(1.15) brightness(1.1) saturate(1.2)' : glow === 'low' ? 'contrast(1.05)' : 'none';
      
      webglRef.current.width  = window.innerWidth  * resolution;
      webglRef.current.height = window.innerHeight * resolution;
      webglRef.current.style.width  = window.innerWidth  + 'px';
      webglRef.current.style.height = window.innerHeight + 'px';
      
      e.w = canvasRef.current.width; e.h = canvasRef.current.height;
    }

    e.player.x = e.w / 2; e.player.y = e.h / 2; e.player.trail = [];
    e.maxLives = 3 + (upgradeLevels.hull || 0); e.lives = e.maxLives;
    e.maxOverload = 100 * (1 + ((upgradeLevels.overload_cap || 0) * 0.2));

    // ── Upgrade-derived multipliers ──
    e.dmgMult         = 1 + (upgradeLevels.dmgcore     || 0) * 0.12;
    e.bulletSpeedMult = 1 + (upgradeLevels.bulletspeed || 0) * 0.15;
    e.cooldownMult    = Math.max(0.3, 1 - (upgradeLevels.reload || 0) * 0.12);
    e.expMult         = 1 + (upgradeLevels.expmult     || 0) * 0.25;
    e.dashDuration    = 12 + (upgradeLevels.dashrange  || 0) * 2;
    e.lifeStealThreshold = upgradeLevels.lifesteal ? Math.floor(75 / upgradeLevels.lifesteal) : 9999;

    e.enemies = []; e.bullets = []; e.particles = [];
    e.powerups = []; e.floatingTexts = []; e.lightningArcs = []; e.notifications = [];

    e.score = 0; e.combo = 1; e.credits = 0; e.timeAlive = 0;
    e.overload = 0; e.overloadActiveFrames = 0; e.dashFrames = 0; e.hitStopFrames = 0;
    e.glitchFrames = 0; e.sectorColor = SECTOR_COLORS[0]; e.lastSectorLevel = 0;

    // ── EXP / Level ──
    e.exp = 0; e.expToLevel = 100; e.playerLevel = 1; e.levelFlashFrames = 0; e.levelDmgBoost = 0; e.levelSpeedBoost = 0;

    // ── Kill Streak ──
    e.killStreak = 0; e.streakTimer = 0; e.bestStreak = 0; e.killsThisRun = 0; e.killsForLifesteal = 0;

    // ── Sync-Chain Burst ──
    e.syncBurst = 0;

    // ── Active powerups ──
    e.activePowerups = [];

    // ── Blood Moon ──
    e.bloodMoonActive = false; e.bloodMoonTimer = 0; e.nextBloodMoon = 0;

    // ── Last Stand ──
    e.lastStandUsed = false;

    // ── Screen FX ──
    e.hitFlash = 0; e.waveAnnounceFrames = 0; e.waveText = '';

    // ── Misc ──
    e.nearMissGranted = false; e.comboMilestoneReached = 0;
    e.bossActive = false; e.bossEnraged = false; e.lastTime = performance.now();

    // ── Init Weapons ──
    e.equippedWeapons = loadoutWeapons.map((wId, idx) => {
      if (!wId || !WEAPONS[wId]) return null;
      const w = { ...WEAPONS[wId] };
      w.cooldown = Math.round(w.cooldown * e.cooldownMult);
      return { ...w, currentCooldown: 0, isAuto: idx > 0 };
    }).filter(Boolean);

    // ── Init Drones ──
    e.equippedDrones = loadoutDrones.map((dId, idx) => {
      if (!DRONES[dId]) return null;
      return { ...DRONES[dId], angle: (Math.PI * 2 / loadoutDrones.length) * idx, active: true, timer: 0 };
    }).filter(Boolean);

    e.stats = { shotsFired: 0, shotsHit: 0, kills: 0, grazes: 0, maxCombo: 1 };

    // ── Level init ──
    e.currentLevel = 1; e.levelComplete = false; e.levelCompleteFrames = 0;
    e.levelStartKills = 0; e.levelStartTime = 0; e.levelStartScore = 0; e.levelBossesDefeated = 0;
    setLevelCompleteData(null);

    // ── Audio init ──
    if (e.audioEnabled && e.audioCtx) {
      if (!e.masterFilter) {
        e.masterFilter = e.audioCtx.createBiquadFilter();
        e.masterFilter.type = 'lowpass'; e.masterFilter.frequency.value = 20000;
        e.masterFilter.connect(e.audioCtx.destination);
      }
      if (!e.bgHum) {
        e.bgHum = e.audioCtx.createOscillator(); e.bgGain = e.audioCtx.createGain();
        e.bgHum.type = 'sine'; e.bgHum.frequency.value = 40; e.bgGain.gain.value = 0.05;
        e.bgHum.connect(e.bgGain!); e.bgGain!.connect(e.masterFilter);
        e.bgHum.start();
      } else { e.bgGain!.gain.setValueAtTime(0.05, e.audioCtx.currentTime); }
    }

    e.playing = true; e.paused = false;
  };

  // ── Input Handlers ──
  useEffect(() => {
    const handleKeyDown = (ev: KeyboardEvent) => {
      const e = engineRef.current;
      e.keys = e.keys || {};
      e.keys[ev.code] = true;
      if (!e.playing) return;
      if (ev.code === 'Escape') {
        e.paused = !e.paused; setPaused(e.paused);
        if (e.masterFilter && e.audioCtx) e.masterFilter.frequency.setTargetAtTime(e.paused ? 800 : 20000, e.audioCtx.currentTime, 0.1);
      }
      if (e.paused) return;
      if (ev.code === 'Space' || ev.code.startsWith('Arrow')) { e.isFiring = true; ev.preventDefault(); }
      if (ev.code === 'KeyE') {
        if (e.overload >= e.maxOverload && e.overloadActiveFrames <= 0) {
          e.overload = 0; e.overloadActiveFrames = 180;
          e.notifications.push({ text: 'SYSTEM OVERRIDE', life: 120, type: 'cyan' });
        }
      }
      // Q = Sync-Chain Burst
      if (ev.code === 'KeyQ') {
        if (e.syncBurst >= e.syncBurstMax) {
          e.syncBurst = 0;
          const step = (Math.PI * 2) / 20;
          for (let i = 0; i < 20; i++) {
            const a = i * step;
            e.bullets.push({ x: e.player.x, y: e.player.y, vx: Math.cos(a) * 14 * e.scale, vy: Math.sin(a) * 14 * e.scale, dmg: 2.5 * e.dmgMult, pierce: true, life: 120, color: '#00ffff', isEnemy: false, type: 'single' });
          }
          e.notifications.push({ text: 'SYNC-CHAIN BURST', life: 120, type: 'cyan' });
          playSfxGlobal(e, 1400, 'square', 0.3, 0.15);
          e.overload = Math.min(e.maxOverload, e.overload + 20);
        }
      }
    };
    const handleKeyUp = (ev: KeyboardEvent) => {
      const e = engineRef.current;
      if (e.keys) e.keys[ev.code] = false;
      if (ev.code === 'Space' || ev.code.startsWith('Arrow')) engineRef.current.isFiring = false;
    };
    const handleMouseMove = (ev: MouseEvent) => {
      if (engineRef.current.playing && !engineRef.current.paused) {
        engineRef.current.mouse.x = ev.clientX * engineRef.current.scale;
        engineRef.current.mouse.y = ev.clientY * engineRef.current.scale;
      }
    };
    // ── Feature #1: Left-click to fire ──
    const handleMouseDown = (ev: MouseEvent) => {
      if (ev.button === 0 && engineRef.current.playing && !engineRef.current.paused) {
        engineRef.current.isFiring = true; engineRef.current.isMouseFiring = true;
      }
    };
    const handleMouseUp = (ev: MouseEvent) => {
      if (ev.button === 0) { engineRef.current.isFiring = false; engineRef.current.isMouseFiring = false; }
    };
    const handleContextMenu = (ev: MouseEvent) => {
      const e = engineRef.current;
      if (e.playing && !e.paused) {
        ev.preventDefault();
        const dashCost = 15 - ((upgradeLevels.overload_eff || 0) * 2);
        if (e.overload >= dashCost && e.dashFrames <= 0) {
          e.overload -= dashCost; e.dashFrames = e.dashDuration;
          e.invincibilityFrames = Math.max(e.invincibilityFrames, e.dashDuration + 3);
          if (e.audioCtx && e.audioEnabled && e.masterFilter) {
            try {
              const osc = e.audioCtx.createOscillator(); const gain = e.audioCtx.createGain();
              osc.type = 'square'; osc.frequency.setValueAtTime(800, e.audioCtx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(100, e.audioCtx.currentTime + 0.2);
              osc.connect(gain); gain.connect(e.masterFilter);
              gain.gain.setValueAtTime(0.05, e.audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, e.audioCtx.currentTime + 0.2);
              osc.start(); osc.stop(e.audioCtx.currentTime + 0.2);
            } catch (_) {}
          }
        }
      }
    };
    const handleResize = () => {
      if (!engineRef.current.playing && canvasRef.current && webglRef.current) {
        const s = engineRef.current.scale;
        canvasRef.current.width  = window.innerWidth  * s; canvasRef.current.height = window.innerHeight * s;
        webglRef.current.width  = window.innerWidth  * s; webglRef.current.height = window.innerHeight * s;
        engineRef.current.w = canvasRef.current.width; engineRef.current.h = canvasRef.current.height;
      }
    };
    window.addEventListener('keydown',      handleKeyDown);
    window.addEventListener('keyup',        handleKeyUp);
    window.addEventListener('mousemove',    handleMouseMove);
    window.addEventListener('mousedown',    handleMouseDown);
    window.addEventListener('mouseup',      handleMouseUp);
    window.addEventListener('contextmenu',  handleContextMenu);
    window.addEventListener('resize',       handleResize);
    return () => {
      window.removeEventListener('keydown',     handleKeyDown);
      window.removeEventListener('keyup',       handleKeyUp);
      window.removeEventListener('mousemove',   handleMouseMove);
      window.removeEventListener('mousedown',   handleMouseDown);
      window.removeEventListener('mouseup',     handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('resize',      handleResize);
    };
  }, [upgradeLevels]);

  // ── Global audio helper (used outside render loop) ──
  const playSfxGlobal = (engine: any, freq: number, type: OscillatorType, dur: number, vol: number) => {
    if (!engine.audioEnabled || !engine.audioCtx || !engine.masterFilter) return;
    try {
      const osc = engine.audioCtx.createOscillator(); const gain = engine.audioCtx.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, engine.audioCtx.currentTime);
      osc.connect(gain); gain.connect(engine.masterFilter);
      gain.gain.setValueAtTime(vol, engine.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, engine.audioCtx.currentTime + dur);
      osc.start(); osc.stop(engine.audioCtx.currentTime + dur);
    } catch (_) {}
  };

  // ─── RENDER LOOP ──────────────────────────────────────────────────────────
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const webglCanvas = webglRef.current; if (!webglCanvas) return;
    initThreeJS(webglCanvas, canvas.width, canvas.height);

    // ── Inline helpers ──
    const playSfx = (eng: any, freq: number, type: OscillatorType, dur: number, vol: number) => {
      if (!eng.audioEnabled || !eng.audioCtx || !eng.masterFilter) return;
      try {
        const osc = eng.audioCtx.createOscillator(); const gain = eng.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq * (1 + (eng.combo - 1) * 0.02), eng.audioCtx.currentTime);
        osc.connect(gain); gain.connect(eng.masterFilter);
        gain.gain.setValueAtTime(vol, eng.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, eng.audioCtx.currentTime + dur);
        osc.start(); osc.stop(eng.audioCtx.currentTime + dur);
      } catch (_) {}
    };

    const createExplosion = (eng: any, x: number, y: number, colorStr: string, count: number) => {
      if (eng.particleLevel === 0) return;
      const actualCount = Math.floor(count * eng.particleLevel);
      eng.shake = Math.min(eng.shake + (1 * eng.scale), 12 * eng.scale);
      for (let i = 0; i < actualCount; i++) {
        eng.particles.push({ x, y, vx: (Math.random() - 0.5) * 12 * eng.scale, vy: (Math.random() - 0.5) * 12 * eng.scale, life: 1 + Math.random() * 0.5, color: colorStr });
      }
    };

    const spawnText = (eng: any, x: number, y: number, text: string, color: string, scale = 1) => {
      eng.floatingTexts.push({ x, y, text, color, life: 40, vy: -1.5 * eng.scale, scale });
    };

    const spawnPowerup = (eng: any, x: number, y: number) => {
      const types = ['heal', 'shield', 'nuke', 'freeze', 'doubledmg', 'speedboost', 'expburst', 'overchargesurge', 'datacascade'];
      const weights = [20, 15, 10, 10, 10, 10, 8, 8, 9];
      let r = Math.random() * weights.reduce((a, b) => a + b, 0);
      let type = types[0];
      for (let i = 0; i < weights.length; i++) { if (r < weights[i]) { type = types[i]; break; } r -= weights[i]; }
      eng.powerups.push({ x, y, type, life: 600, r: 10 * eng.scale });
    };

    const spawnBoss = (eng: any) => {
      eng.bossActive = true; eng.bossEnraged = false;
      const hp = 150 + (eng.score / 300) + (eng.playerLevel * 10);
      eng.bossMaxHp = hp; eng.bossHp = hp;
      eng.enemies.push({ x: eng.player.x, y: eng.player.y - eng.h/2 - 100, type: 'boss', hp, maxHp: hp, speed: 1.5 * eng.scale, r: 35 * eng.scale, state: 'entering', timer: 0, isElite: false });
      eng.notifications.push({ text: '⚠ CLASS-V ANOMALY DETECTED', life: 180, type: 'pink' });
      playSfx(eng, 100, 'sawtooth', 2.0, 0.5);
      eng.glitchFrames = 60;
      eng.waveText = 'BOSS INCOMING'; eng.waveAnnounceFrames = 120;
    };

    // ── Grant EXP ──
    const grantExp = (eng: any, amount: number) => {
      eng.exp += amount * eng.expMult;
      if (eng.exp >= eng.expToLevel) {
        eng.exp -= eng.expToLevel;
        eng.expToLevel = Math.floor(eng.expToLevel * 1.8);
        eng.playerLevel++;
        eng.levelFlashFrames = 90;
        eng.levelDmgBoost = 180; // 3 seconds of +30% damage
        eng.levelSpeedBoost = 120;
        if (eng.lives < eng.maxLives) eng.lives++;
        createExplosion(eng, eng.player.x, eng.player.y, '0, 255, 170', 40);
        eng.notifications.push({ text: `LEVEL UP! LVL ${eng.playerLevel}`, life: 150, type: 'green' });
        eng.notifications.push({ text: '+30% DAMAGE BOOST', life: 120, type: 'cyan' });
        eng.score += 500 * eng.playerLevel;
        playSfx(eng, 880, 'sine', 0.6, 0.2);
        setTimeout(() => playSfx(eng, 1100, 'sine', 0.4, 0.15), 100);
        setTimeout(() => playSfx(eng, 1320, 'sine', 0.4, 0.2), 200);
      }
    };

    const spawn = (eng: any) => {
      if (!eng.playing) return;
      const spawnMult = 1 + (eng.lastSectorLevel * 0.15) + (eng.bloodMoonActive ? 0.3 : 0);
      if (eng.score > 0 && Math.floor(eng.score / 8000) > eng.lastSectorLevel && !eng.bossActive && Math.random() < 0.25) spawnBoss(eng);

      const rand = Math.random();
      let type = 'bad';
      if      (rand < 0.13) type = 'gem';
      else if (rand < 0.22) type = 'tank';
      else if (rand < 0.29) type = 'sniper';
      else if (rand < 0.35) type = 'dasher';
      else if (rand < 0.40) type = 'pulsar';
      else if (rand < 0.45) type = 'teleporter';
      else if (rand < 0.49) type = 'shielded';
      else if (rand < 0.53) type = 'swarmer';
      // ── New enemy types ──
      else if (rand < 0.57) type = 'phaser';
      else if (rand < 0.60) type = 'splitter';
      else if (rand < 0.63) type = 'charger';
      else if (rand < 0.66) type = 'ghost';
      else if (rand < 0.69) type = 'bomber';

      const side = Math.floor(Math.random() * 4);
      let x: number, y: number;
      if      (side === 0) { x = eng.player.x + (Math.random() - 0.5) * eng.w; y = eng.player.y - eng.h/2 - 50; }
      else if (side === 1) { x = eng.player.x + (Math.random() - 0.5) * eng.w; y = eng.player.y + eng.h/2 + 50; }
      else if (side === 2) { x = eng.player.x - eng.w/2 - 50; y = eng.player.y + (Math.random() - 0.5) * eng.h; }
      else                 { x = eng.player.x + eng.w/2 + 50; y = eng.player.y + (Math.random() - 0.5) * eng.h; }

      let hp    = 1 + (eng.score / 2500);
      let speed = (2.0 + (eng.score / 3500)) * eng.scale * spawnMult;
      let r     = 12 * eng.scale;

      if (type === 'gem')        { hp = 1; speed *= 0.5; r = 6 * eng.scale; }
      if (type === 'tank')       { hp = 8; speed *= 0.4; r = 22 * eng.scale; }
      if (type === 'sniper')     { hp = 2; speed *= 0.7; r = 14 * eng.scale; }
      if (type === 'dasher')     { hp = 1.5; speed *= 0.6; r = 10 * eng.scale; }
      if (type === 'pulsar')     { hp = 4; speed *= 0.5; r = 16 * eng.scale; }
      if (type === 'teleporter') { hp = 2; speed *= 0.3; r = 12 * eng.scale; }
      if (type === 'shielded')   { hp = 3; speed *= 0.6; r = 14 * eng.scale; }
      if (type === 'swarmer')    { hp = 0.5; speed *= 1.2; r = 8 * eng.scale; }
      if (type === 'phaser')     { hp = 2; speed *= 0.8; r = 12 * eng.scale; }
      if (type === 'splitter')   { hp = 3; speed *= 0.7; r = 18 * eng.scale; }
      if (type === 'charger')    { hp = 2; speed *= 0.5; r = 14 * eng.scale; }
      if (type === 'ghost')      { hp = 1.5; speed *= 1.0; r = 11 * eng.scale; }
      if (type === 'bomber')     { hp = 2.5; speed *= 0.4; r = 16 * eng.scale; }

      // ── Elite variant (10% chance on non-gem/boss enemies) ──
      const isElite = type !== 'gem' && Math.random() < 0.10;
      if (isElite) { hp *= 2.5; speed *= 1.2; r *= 1.25; }

      eng.enemies.push({ x, y, type, speed, r, hp, maxHp: hp, state: 'moving', timer: 0, hasGrazed: false, isElite, flashTimer: 0, hpBarTimer: 0, frozenTimer: 0, stunnedTimer: 0, dotTimer: 0, dotDmg: 0, isPhased: false, phaseTimer: 0, isVisible: true, spawnFlash: 6 });
    };

    // ─── MAIN RENDER FUNCTION ───────────────────────────────────────────────
    const render = () => {
      const eng = engineRef.current;
      const now = performance.now();
      let dt = (now - eng.lastTime) / 16.666;
      if (dt > 3) dt = 3;
      eng.lastTime = now;

      if (eng.paused) { animationFrameId = requestAnimationFrame(render); return; }
      if (eng.playing && eng.hitStopFrames > 0) { eng.hitStopFrames -= dt; animationFrameId = requestAnimationFrame(render); return; }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      eng.timeAlive += dt / 60;

      let pX = eng.player.x; let pY = eng.player.y;
      eng.bgGridOffset.x = (pX - eng.w / 2) * -0.05;
      eng.bgGridOffset.y = (pY - eng.h / 2) * -0.05;

      // ── Background clear ──
      if (eng.playing && eng.glitchFrames > 0) {
        eng.glitchFrames -= dt;
        ctx.translate((Math.random() - 0.5) * 8 * eng.scale, (Math.random() - 0.5) * 8 * eng.scale);
        ctx.fillStyle = Math.random() > 0.8 ? '#ffffff' : eng.sectorColor;
      } else {
        ctx.fillStyle = eng.sectorColor;
      }

      // Blood moon tint
      if (eng.bloodMoonActive) {
        ctx.globalAlpha = 0.08 + Math.sin(now * 0.003) * 0.02;
        ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, eng.w, eng.h); ctx.globalAlpha = 1;
      }

      ctx.clearRect(0, 0, eng.w, eng.h);
      ctx.globalAlpha = eng.playing ? (eng.timeSlow * 0.05) : 0.02;
      ctx.fillStyle = eng.sectorColor;
      ctx.fillRect(0, 0, eng.w, eng.h);
      ctx.globalAlpha = 1;

      // ── Grid ──
      ctx.save();
      ctx.translate(eng.bgGridOffset.x % 40, eng.bgGridOffset.y % 40);
      ctx.strokeStyle = eng.bloodMoonActive ? 'rgba(255,50,50,0.06)' : 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = -40; gx < eng.w + 40; gx += 40) { ctx.moveTo(gx, -40); ctx.lineTo(gx, eng.h + 40); }
      for (let gy = -40; gy < eng.h + 40; gy += 40) { ctx.moveTo(-40, gy); ctx.lineTo(eng.w + 40, gy); }
      ctx.stroke();
      ctx.restore();

      // ── Wave Announce Overlay ──
      if (eng.waveAnnounceFrames > 0) {
        eng.waveAnnounceFrames -= dt;
        const alpha = Math.min(1, eng.waveAnnounceFrames / 30) * Math.min(1, (120 - eng.waveAnnounceFrames) / 30 + 1);
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.fillStyle = '#ff2d55'; ctx.font = `bold ${22 * eng.scale}px 'Inter', sans-serif`;
        ctx.textAlign = 'center'; ctx.fillText(eng.waveText, eng.w / 2, eng.h / 2 - 40 * eng.scale);
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
      }

      if (!eng.playing) { animationFrameId = requestAnimationFrame(render); return; }

      // ── Screen shake ──
      if (eng.shake > 0) {
        ctx.translate(Math.random() * eng.shake - eng.shake / 2, Math.random() * eng.shake - eng.shake / 2);
        eng.shake -= 0.5 * dt; if (eng.shake < 0.5) eng.shake = 0;
      }

      // ── Hit Flash ──
      if (eng.hitFlash > 0) {
        ctx.globalAlpha = (eng.hitFlash / 20) * 0.4;
        ctx.fillStyle = `rgb(${eng.screenShockColor})`; ctx.fillRect(0, 0, eng.w, eng.h);
        ctx.globalAlpha = 1; eng.hitFlash -= dt;
      }

      // ── Low HP Red Vignette ──
      if (eng.lives <= 1) {
        const pulseAlpha = 0.15 + Math.abs(Math.sin(now * 0.004)) * 0.2;
        const grad = ctx.createRadialGradient(eng.w / 2, eng.h / 2, eng.h * 0.25, eng.w / 2, eng.h / 2, eng.h * 0.8);
        grad.addColorStop(0, 'rgba(255,0,0,0)'); grad.addColorStop(1, `rgba(255,0,0,${pulseAlpha})`);
        ctx.fillStyle = grad; ctx.fillRect(0, 0, eng.w, eng.h);
        // Low HP warning sound (periodic)
        if (Math.floor(now * 0.002) % 3 === 0 && Math.random() < 0.002) playSfx(eng, 100, 'square', 0.05, 0.03);
      }

      // ── BG hum pitch ──
      if (eng.bgHum && eng.audioEnabled) eng.bgHum.frequency.setValueAtTime(40 + eng.combo * 2 + (eng.bloodMoonActive ? 20 : 0), eng.audioCtx!.currentTime);
      if (eng.combo > eng.stats.maxCombo) eng.stats.maxCombo = eng.combo;

      // ── Sector shift ──
      const sectorLevel = Math.floor(eng.score / 8000);
      if (sectorLevel > eng.lastSectorLevel) {
        eng.lastSectorLevel = sectorLevel; eng.glitchFrames = 60;
        eng.sectorColor = SECTOR_COLORS[sectorLevel % SECTOR_COLORS.length];
        eng.notifications.push({ text: `SECTOR ${sectorLevel} — CORRUPTION SHIFT`, life: 150, type: 'cyan' });
        playSfx(eng, 150, 'square', 1.0, 0.2);
        eng.waveText = `SECTOR ${sectorLevel}`; eng.waveAnnounceFrames = 100;
      }

      // ── Blood moon trigger ──
      if (!eng.bloodMoonActive && eng.nextBloodMoon < eng.bloodMoonThresholds.length && eng.score >= eng.bloodMoonThresholds[eng.nextBloodMoon]) {
        eng.bloodMoonActive = true; eng.bloodMoonTimer = 1200; eng.nextBloodMoon++;
        eng.notifications.push({ text: '🌑 BLOOD MOON RISING', life: 200, type: 'pink' });
        eng.waveText = 'BLOOD MOON'; eng.waveAnnounceFrames = 150;
        playSfx(eng, 60, 'sawtooth', 2.0, 0.4);
        eng.glitchFrames = 60;
      }
      if (eng.bloodMoonActive) {
        eng.bloodMoonTimer -= dt;
        if (eng.bloodMoonTimer <= 0) { eng.bloodMoonActive = false; eng.notifications.push({ text: 'BLOOD MOON FADING', life: 120, type: 'cyan' }); }
      }

      // ── Player movement ──
      const moveSpeed = 6 * (1 + (eng.levelSpeedBoost > 0 ? 0.3 : 0)) * eng.scale * dt;
      if (eng.keys?.KeyW || eng.keys?.ArrowUp) eng.player.y -= moveSpeed;
      if (eng.keys?.KeyS || eng.keys?.ArrowDown) eng.player.y += moveSpeed;
      if (eng.keys?.KeyA || eng.keys?.ArrowLeft) eng.player.x -= moveSpeed;
      if (eng.keys?.KeyD || eng.keys?.ArrowRight) eng.player.x += moveSpeed;
      if (eng.levelSpeedBoost > 0) eng.levelSpeedBoost -= dt;
      if (eng.levelDmgBoost > 0) eng.levelDmgBoost -= dt;
      if (eng.invincibilityFrames > 0) eng.invincibilityFrames -= dt;
      if (eng.levelFlashFrames > 0) eng.levelFlashFrames -= dt;

      // ── Kill streak decay ──
      if (eng.streakTimer > 0) {
        eng.streakTimer -= dt;
        if (eng.streakTimer <= 0) { eng.killStreak = 0; }
      }

      // ── Sync Burst passive drain ──
      if (eng.syncBurst > 0) eng.syncBurst = Math.max(0, eng.syncBurst - 0.05 * dt);

      // ── Active powerup timers ──
      for (let i = eng.activePowerups.length - 1; i >= 0; i--) {
        eng.activePowerups[i].duration -= dt;
        if (eng.activePowerups[i].duration <= 0) {
          eng.activePowerups.splice(i, 1);
        }
      }

      // ── Neural Slow + graze + magnet + sapper ──
      eng.timeSlow = 1;
      let closestEnemy: any = null; let minDist = Infinity;
      const baseSlow = 0.3 - ((upgradeLevels.reflex || 0) * 0.03);
      const grazeRadius = 30 * eng.scale + ((upgradeLevels.graze_master || 0) * 10 * eng.scale);
      const magnetActive  = eng.equippedDrones.some((d: any) => d.type === 'utility' && d.active);
      const sapperActive  = eng.equippedDrones.some((d: any) => d.type === 'aura'    && d.active);
      const scannerActive = eng.equippedDrones.some((d: any) => d.type === 'scanner' && d.active);

      for (const en of eng.enemies) {
        if (en.type !== 'gem') {
          const d = Math.hypot(en.x - eng.player.x, en.y - eng.player.y);
          if (d < minDist) { minDist = d; closestEnemy = en; }
          if (d < 80 * eng.scale) eng.timeSlow = baseSlow;

          if (d < en.r + eng.player.r * eng.scale + grazeRadius && !en.hasGrazed && eng.dashFrames <= 0) {
            en.hasGrazed = true; eng.stats.grazes++;
            eng.score += 25 * eng.combo * (1 + (upgradeLevels.graze_master || 0) * 0.5);
            eng.combo += 0.2; eng.overload = Math.min(eng.maxOverload, eng.overload + 3);
            spawnText(eng, eng.player.x, eng.player.y - 20 * eng.scale, 'GRAZE', '#ffffff');
            playSfx(eng, 1200, 'sine', 0.1, 0.05);
          }
          if (sapperActive && d < 120 * eng.scale) en.speed = Math.max(en.speed * 0.92, 0.2);

          // ── Near-miss bonus: bullet just barely missed ──
          if (d < (en.r + eng.player.r * eng.scale + 5 * eng.scale) && d > (en.r + eng.player.r * eng.scale) && !eng.nearMissGranted && eng.dashFrames <= 0) {
            eng.nearMissGranted = true;
            eng.score += 80 * eng.combo;
            spawnText(eng, eng.player.x, eng.player.y - 30 * eng.scale, 'GHOST STEP', '#88eeff');
            setTimeout(() => { eng.nearMissGranted = false; }, 500);
          }
        } else if (magnetActive) {
          const d = Math.hypot(en.x - eng.player.x, en.y - eng.player.y);
          if (d < 250 * eng.scale) {
            en.x += (eng.player.x - en.x) * 0.09 * dt;
            en.y += (eng.player.y - en.y) * 0.09 * dt;
          }
        }
      }

      if (eng.masterFilter && eng.audioCtx) eng.masterFilter.frequency.setTargetAtTime(eng.timeSlow < 1 ? 800 : 20000, eng.audioCtx.currentTime, 0.1);

      // ── Ghost Dash FX ──
      if (eng.dashFrames > 0) {
        eng.dashFrames -= dt;
        ctx.fillStyle = `rgba(0, 242, 255, ${0.25 + Math.random() * 0.3})`;
        ctx.beginPath(); ctx.arc(eng.player.x, eng.player.y, eng.player.r * eng.scale * 1.8, 0, Math.PI * 2); ctx.fill();
      }

      // ── Player trail ──
      eng.player.trail.push({ x: eng.player.x, y: eng.player.y, dash: eng.dashFrames > 0 });
      if (eng.player.trail.length > 10) eng.player.trail.shift();
      eng.player.trail.forEach((t: any, i: number) => {
        ctx.fillStyle = t.dash ? `rgba(255,255,255,${i / 10})` : `rgba(0,242,255,${i / 10})`;
        ctx.beginPath(); ctx.arc(t.x, t.y, eng.player.r * eng.scale * (i / 10), 0, Math.PI * 2); ctx.fill();
      });

      // ── Combo milestone ──
      for (const m of COMBO_MILESTONES) {
        if (eng.combo >= m.threshold && eng.comboMilestoneReached < m.threshold) {
          eng.comboMilestoneReached = m.threshold;
          eng.notifications.push({ text: m.text, life: 150, type: 'cyan' });
          spawnText(eng, eng.player.x, eng.player.y - 60 * eng.scale, m.text, m.color, 1.5);
          playSfx(eng, 1000, 'triangle', 0.4, 0.15);
        }
      }
      // Reset milestone tracking when combo drops below lowest threshold
      if (eng.combo < COMBO_MILESTONES[0].threshold && eng.comboMilestoneReached > 0) eng.comboMilestoneReached = 0;

      // ── Quantum Dodge: auto-dodge at very high combo ──
      if (eng.combo >= 15 && eng.invincibilityFrames <= 0 && closestEnemy) {
        const qdist = Math.hypot(closestEnemy.x - eng.player.x, closestEnemy.y - eng.player.y);
        if (qdist < closestEnemy.r + eng.player.r * eng.scale + 4 && Math.random() < 0.6) {
          eng.invincibilityFrames = 25;
          spawnText(eng, eng.player.x, eng.player.y - 30 * eng.scale, 'QUANTUM DODGE', '#ffff44');
          createExplosion(eng, eng.player.x, eng.player.y, '255,255,68', 8);
        }
      }

      // ── Weapon Firing ──
      const autoTargets = eng.enemies.filter((en: any) => en.type !== 'gem' && !en.isPhased);
      const dmgBoostMult = (eng.activePowerups.some((p: any) => p.type === 'doubledmg') ? 2 : 1)
                         * (eng.levelDmgBoost > 0 ? 1.3 : 1)
                         * eng.dmgMult;
      const speedBoostMult = (eng.activePowerups.some((p: any) => p.type === 'speedboost') ? 1.5 : 1)
                           * eng.bulletSpeedMult;

      if (eng.overloadActiveFrames > 0) {
        eng.overloadActiveFrames -= dt; eng.timeSlow = 0;
        if (eng.overloadActiveFrames % 4 < 1) {
          const ang = (eng.overloadActiveFrames * 0.1) % (Math.PI * 2);
          for (let i = 0; i < 4; i++) {
            const a = ang + i * Math.PI / 2;
            eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: Math.cos(a) * 15 * eng.scale, vy: Math.sin(a) * 15 * eng.scale, dmg: 3 * dmgBoostMult, pierce: true, life: 100, color: '#00ffff', isEnemy: false, type: 'single' });
          }
          playSfx(eng, 1000 + Math.random() * 500, 'square', 0.02, 0.01);
        }
      } else {
        eng.equippedWeapons.forEach((w: any) => {
          if (w.currentCooldown > 0) w.currentCooldown -= eng.timeSlow * dt;
          let shouldFire = false; let target: any = null;
          if (!w.isAuto && eng.isFiring) { shouldFire = true; target = closestEnemy; }
          else if (w.isAuto && autoTargets.length > 0) { shouldFire = true; target = autoTargets[Math.floor(Math.random() * Math.min(3, autoTargets.length))]; }
          if (w.type === 'mine' || w.type === 'blade' || w.type === 'wave' || w.type === 'arcpulse' || w.type === 'gravity') shouldFire = (eng.isFiring || w.isAuto);

          if (shouldFire && w.currentCooldown <= 0) {
            eng.stats.shotsFired++;
            const ang = target ? Math.atan2(target.y - eng.player.y, target.x - eng.player.x) : 0;
            const spd = w.speed * eng.scale * speedBoostMult;
            const dmg = w.dmg * dmgBoostMult;

            if (w.type === 'single' || w.type === 'pierce') {
              eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg, pierce: w.type === 'pierce', life: 100, color: w.color, isEnemy: false, type: w.type });
            } else if (w.type === 'spread') {
              for (let si = -1; si <= 1; si++) { const a = ang + si * 0.15; eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg, pierce: false, life: 100, color: w.color, isEnemy: false, type: 'single' }); }
            } else if (w.type === 'flame') {
              const a = ang + (Math.random() - 0.5) * 0.5;
              eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg, pierce: true, life: 20, color: w.color, isEnemy: false, type: 'flame', dotDmg: dmg * 0.05 });
            } else if (w.type === 'boomerang') {
              eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg, pierce: true, life: 120, color: w.color, isEnemy: false, type: 'boomerang' });
            } else if (w.type === 'lightning') {
              eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg, pierce: false, life: 80, color: w.color, isEnemy: false, type: 'lightning' });
            } else if (w.type === 'mine') {
              eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: 0, vy: 0, dmg, pierce: false, life: 300, color: w.color, isEnemy: false, type: 'mine' });
            } else if (w.type === 'blade') {
              for (let bi = 0; bi < 3; bi++) eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: 0, vy: 0, dmg, pierce: true, life: 90, color: w.color, isEnemy: false, type: 'blade', angle: bi * (Math.PI * 2 / 3) });
            } else if (w.type === 'homing') {
              for (let hi = 0; hi < 4; hi++) { const a = ang + (Math.random() - 0.5) * 1.5; eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg, pierce: false, life: 150, color: w.color, isEnemy: false, type: 'homing', target }); }
            } else if (w.type === 'wave') {
              eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: 0, vy: 0, dmg, pierce: true, life: 40, color: w.color, isEnemy: false, type: 'wave', radius: 10 * eng.scale, speed: w.speed });
            } else if (w.type === 'beam') {
              eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg, pierce: true, life: 5, color: w.color, isEnemy: false, type: 'beam' });
            }
            // ── New weapon types ──
            else if (w.type === 'flak') {
              eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg, pierce: false, life: 80, color: w.color, isEnemy: false, type: 'flak' });
            } else if (w.type === 'cryo') {
              eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg, pierce: false, life: 80, color: w.color, isEnemy: false, type: 'cryo' });
            } else if (w.type === 'gravity') {
              eng.bullets.push({ x: eng.player.x + Math.cos(ang) * 60 * eng.scale, y: eng.player.y + Math.sin(ang) * 60 * eng.scale, vx: 0, vy: 0, dmg, pierce: true, life: 180, color: w.color, isEnemy: false, type: 'gravity', angle: 0 });
            } else if (w.type === 'bounce') {
              eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg, pierce: false, life: 200, color: w.color, isEnemy: false, type: 'bounce', bounces: 0 });
            } else if (w.type === 'emp') {
              eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg, pierce: false, life: 80, color: w.color, isEnemy: false, type: 'emp' });
            } else if (w.type === 'arcpulse') {
              eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: 0, vy: 0, dmg, pierce: true, life: 50, color: w.color, isEnemy: false, type: 'arcpulse', radius: 10 * eng.scale, arcAng: ang, speed: 7 });
            }

            if (w.type !== 'flame' && w.type !== 'beam') playSfx(eng, 600, 'square', 0.05, 0.02);
            w.currentCooldown = w.cooldown;
          }
        });
      }

      // ── Drone Logic ──
      eng.equippedDrones.forEach((d: any) => {
        if (d.type === 'attack' && d.active) {
          d.timer -= eng.timeSlow * dt;
          if (d.timer <= 0 && autoTargets.length > 0) {
            const tgt = autoTargets[0];
            const dx = eng.player.x + Math.cos(d.angle) * 30 * eng.scale;
            const dy = eng.player.y + Math.sin(d.angle) * 30 * eng.scale;
            const a  = Math.atan2(tgt.y - dy, tgt.x - dx);
            eng.bullets.push({ x: dx, y: dy, vx: Math.cos(a) * 10 * eng.scale, vy: Math.sin(a) * 10 * eng.scale, dmg: 0.5 * eng.dmgMult, pierce: false, life: 60, color: d.color, isEnemy: false, type: 'single' });
            d.timer = d.cooldown; playSfx(eng, 1200, 'square', 0.02, 0.01);
          }
        } else if (d.type === 'heal' && d.active) {
          d.timer -= dt;
          if (d.timer <= 0) {
            if (eng.lives < eng.maxLives) { eng.lives++; eng.notifications.push({ text: 'HULL REPAIRED', life: 120, type: 'green' }); playSfx(eng, 400, 'sine', 0.5, 0.1); }
            d.timer = d.cooldown;
          }
        } else if (d.type === 'anchor' && d.active) {
          d.timer -= dt;
          if (d.timer <= 0) {
            const tgt = autoTargets.sort((a: any, b: any) => Math.hypot(a.x - eng.player.x, a.y - eng.player.y) - Math.hypot(b.x - eng.player.x, b.y - eng.player.y))[0];
            if (tgt) { tgt.frozenTimer = 120; eng.notifications.push({ text: 'ANCHOR LOCKED', life: 80, type: 'cyan' }); }
            d.timer = d.cooldown;
          }
        }
      });

      // ── Bullets Update ──
      for (let i = eng.bullets.length - 1; i >= 0; i--) {
        const b = eng.bullets[i];
        const timeScale = b.isEnemy ? eng.timeSlow * dt : (eng.overloadActiveFrames > 0 ? dt : eng.timeSlow * dt);

        // ── Bullet movement per type ──
        if (b.type === 'boomerang') {
          b.vx -= (b.x - eng.player.x) * 0.015 * timeScale;
          b.vy -= (b.y - eng.player.y) * 0.015 * timeScale;
          b.x += b.vx * timeScale; b.y += b.vy * timeScale;
        } else if (b.type === 'blade') {
          b.angle += 0.1 * timeScale;
          b.x = eng.player.x + Math.cos(b.angle) * 45 * eng.scale;
          b.y = eng.player.y + Math.sin(b.angle) * 45 * eng.scale;
        } else if (b.type === 'homing' && b.target && b.target.hp > 0) {
          const ha = Math.atan2(b.target.y - b.y, b.target.x - b.x);
          b.vx += Math.cos(ha) * 0.5 * timeScale; b.vy += Math.sin(ha) * 0.5 * timeScale;
          const hs = Math.hypot(b.vx, b.vy);
          if (hs > 12 * eng.scale) { b.vx = (b.vx / hs) * 12 * eng.scale; b.vy = (b.vy / hs) * 12 * eng.scale; }
          b.x += b.vx * timeScale; b.y += b.vy * timeScale;
        } else if (b.type === 'wave') {
          b.radius += b.speed * timeScale;
        } else if (b.type === 'arcpulse') {
          b.radius += b.speed * timeScale;
        } else if (b.type === 'gravity') {
          b.angle += 0.05 * timeScale; // just rotate for visual
        } else if (b.type === 'bounce') {
          b.x += b.vx * timeScale; b.y += b.vy * timeScale;
          if (b.x < eng.player.x - eng.w/2 + 5 || b.x > eng.player.x + eng.w/2 - 5) { b.vx *= -1; b.bounces = (b.bounces || 0) + 1; createExplosion(eng, b.x, b.y, hexToRgb(b.color), 3); }
          if (b.y < eng.player.y - eng.h/2 + 5 || b.y > eng.player.y + eng.h/2 - 5) { b.vy *= -1; b.bounces = (b.bounces || 0) + 1; createExplosion(eng, b.x, b.y, hexToRgb(b.color), 3); }
          if ((b.bounces || 0) > 6) b.life = 0;
        } else if (b.type === 'beam') {
          b.x += b.vx * timeScale * 3; b.y += b.vy * timeScale * 3;
        } else {
          b.x += b.vx * timeScale; b.y += b.vy * timeScale;
        }

        b.life -= timeScale;
        let hit = false;

        // ── Enemy bullet hits player ──
        if (b.isEnemy) {
          const decoyActive = eng.equippedDrones.some((d: any) => d.type === 'decoy' && d.active);
          if (decoyActive && Math.random() < 0.3) { eng.bullets.splice(i, 1); continue; }

          if (eng.dashFrames <= 0 && eng.invincibilityFrames <= 0 && Math.hypot(b.x - eng.player.x, b.y - eng.player.y) < eng.player.r * eng.scale) {
            let blocked = false;
            const aegis = eng.equippedDrones.find((d: any) => d.type === 'shield' && d.active);
            if (aegis) {
              aegis.active = false; aegis.timer = aegis.cooldown; blocked = true;
              eng.notifications.push({ text: 'SHIELD DEPLOYED', life: 90, type: 'green' });
              playSfx(eng, 300, 'triangle', 0.2, 0.1);
              eng.bullets.splice(i, 1); hit = true;
            }
            if (!blocked) {
              eng.lives--;
              eng.hitFlash = 20; eng.screenShockColor = '255,45,85';
              createExplosion(eng, eng.player.x, eng.player.y, '255, 45, 85', 30);
              eng.bullets.splice(i, 1); hit = true;

              const nova = eng.equippedDrones.find((d: any) => d.type === 'retaliate' && d.active);
              if (nova) {
                nova.active = false; nova.timer = nova.cooldown;
                eng.enemies.forEach((en: any) => { if (en.type !== 'gem' && Math.hypot(en.x - eng.player.x, en.y - eng.player.y) < 200 * eng.scale) en.hp -= 15; });
                createExplosion(eng, eng.player.x, eng.player.y, '255, 115, 0', 50);
                eng.shake = 20 * eng.scale;
              }

              // ── Revenge Burst on damage ──
              for (let ri = 0; ri < 8; ri++) {
                const ra = ri * (Math.PI * 2 / 8);
                eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: Math.cos(ra) * 8 * eng.scale, vy: Math.sin(ra) * 8 * eng.scale, dmg: 0.8 * dmgBoostMult, pierce: false, life: 60, color: '#ff4400', isEnemy: false, type: 'single' });
              }

              // ── Last Stand mechanic ──
              if (eng.lives <= 0 && !eng.lastStandUsed) {
                eng.lastStandUsed = true; eng.lives = 1; eng.invincibilityFrames = 240;
                eng.notifications.push({ text: '★ LAST STAND ACTIVATED', life: 200, type: 'pink' });
                eng.waveText = 'LAST STAND'; eng.waveAnnounceFrames = 100;
                createExplosion(eng, eng.player.x, eng.player.y, '255,200,0', 50);
                eng.shake = 25 * eng.scale; eng.hitFlash = 30;
                playSfx(eng, 200, 'sawtooth', 1.0, 0.5);
                eng.enemies.forEach((en: any) => { if (en.type !== 'gem' && Math.hypot(en.x - eng.player.x, en.y - eng.player.y) < 300 * eng.scale) en.hp *= 0.5; });
              } else if (eng.lives <= 0) {
                gameOverRef.current(); return;
              } else {
                eng.invincibilityFrames = 120; eng.combo = 1; playSfx(eng, 150, 'sawtooth', 0.5, 0.4);
              }
            }
          }
        } else {
          // ── Player bullet hits enemy ──
          if (b.type === 'mine') {
            const nearEnemy = eng.enemies.find((en: any) => en.type !== 'gem' && Math.hypot(en.x - b.x, en.y - b.y) < 70 * eng.scale);
            if (nearEnemy || b.life <= 0) {
              createExplosion(eng, b.x, b.y, '255, 255, 0', 25);
              eng.enemies.forEach((en: any) => { if (en.type !== 'gem' && Math.hypot(en.x - b.x, en.y - b.y) < 100 * eng.scale) en.hp -= b.dmg; });
              eng.bullets.splice(i, 1); hit = true; playSfx(eng, 200, 'square', 0.2, 0.2);
            }
          } else if (b.type === 'wave') {
            eng.enemies.forEach((en: any) => {
              if (en.type !== 'gem' && !en.isPhased && Math.abs(Math.hypot(en.x - eng.player.x, en.y - eng.player.y) - b.radius) < 15 * eng.scale) {
                if (!en.hitByWave) { en.hp -= b.dmg; en.hitByWave = true; en.flashTimer = 6; en.hpBarTimer = 60; eng.stats.shotsHit++; }
              }
            });
          } else if (b.type === 'arcpulse') {
            eng.enemies.forEach((en: any) => {
              if (en.type !== 'gem' && !en.isPhased) {
                const dist = Math.hypot(en.x - eng.player.x, en.y - eng.player.y);
                if (Math.abs(dist - b.radius) < 18 * eng.scale && !en.hitByArc) {
                  const ang2 = Math.atan2(en.y - eng.player.y, en.x - eng.player.x);
                  let diff = Math.abs(ang2 - b.arcAng); if (diff > Math.PI) diff = Math.PI * 2 - diff;
                  if (diff < Math.PI * 0.65) {
                    en.hp -= b.dmg; en.hitByArc = true; en.flashTimer = 6; en.hpBarTimer = 60; eng.stats.shotsHit++;
                  }
                }
              }
            });
          } else if (b.type === 'gravity') {
            // Gravity well: pull + DoT
            eng.enemies.forEach((en: any) => {
              if (en.type !== 'gem' && !en.isPhased) {
                const dist = Math.hypot(en.x - b.x, en.y - b.y);
                if (dist < 120 * eng.scale) {
                  const pull = ((120 * eng.scale - dist) / (120 * eng.scale)) * 2;
                  const ga = Math.atan2(b.y - en.y, b.x - en.x);
                  en.x += Math.cos(ga) * pull * timeScale; en.y += Math.sin(ga) * pull * timeScale;
                  if (dist < 18 * eng.scale) { en.hp -= b.dmg * 0.1 * timeScale; en.hpBarTimer = 30; }
                }
              }
            });
          } else if (b.type === 'flak') {
            let flakHit = false;
            for (let j = eng.enemies.length - 1; j >= 0; j--) {
              const en = eng.enemies[j];
              if (en.type !== 'gem' && !en.isPhased && Math.hypot(en.x - b.x, en.y - b.y) < en.r + 4 * eng.scale) {
                // Flak explosion: area damage
                eng.enemies.forEach((en2: any) => { if (en2.type !== 'gem' && Math.hypot(en2.x - b.x, en2.y - b.y) < 70 * eng.scale) { en2.hp -= b.dmg * 0.7; en2.flashTimer = 5; en2.hpBarTimer = 60; eng.stats.shotsHit++; } });
                createExplosion(eng, b.x, b.y, '255, 136, 0', 18);
                flakHit = true; hit = true; playSfx(eng, 300, 'square', 0.15, 0.08); break;
              }
            }
          } else {
            for (let j = eng.enemies.length - 1; j >= 0; j--) {
              const en = eng.enemies[j];
              if (en.type !== 'gem' && !en.isPhased && en.isVisible && Math.hypot(en.x - b.x, en.y - b.y) < en.r + 4 * eng.scale) {
                // ── Critical hit (15% chance) ──
                const isCrit = Math.random() < 0.15;
                const actualDmg = b.dmg * (isCrit ? 2 : 1);

                en.hp -= actualDmg; eng.stats.shotsHit++;
                en.flashTimer = 6; en.hpBarTimer = 80;

                if (isCrit) {
                  spawnText(eng, en.x, en.y - 10 * eng.scale, 'CRIT!', '#ffff44', 1.3);
                  playSfx(eng, 800, 'square', 0.08, 0.04);
                  createExplosion(eng, b.x, b.y, '255,255,68', 4);
                } else {
                  createExplosion(eng, b.x, b.y, hexToRgb(b.color), 2);
                }

                // ── Flame DoT ──
                if (b.type === 'flame' && b.dotDmg) { en.dotDmg = b.dotDmg; en.dotTimer = 120; }

                // ── Cryo freeze ──
                if (b.type === 'cryo') { en.frozenTimer = 180; playSfx(eng, 600, 'sine', 0.1, 0.04); createExplosion(eng, en.x, en.y, '136,238,255', 8); }

                // ── EMP stun ──
                if (b.type === 'emp') { en.stunnedTimer = 150; playSfx(eng, 400, 'square', 0.15, 0.06); createExplosion(eng, en.x, en.y, '68,255,238', 10); }

                // ── Lightning chain ──
                if (b.type === 'lightning') {
                  const nearest = eng.enemies.find((en2: any) => en2 !== en && en2.type !== 'gem' && Math.hypot(en2.x - en.x, en2.y - en.y) < 120 * eng.scale);
                  if (nearest) { nearest.hp -= b.dmg * 0.7; nearest.flashTimer = 4; eng.lightningArcs.push({ x1: en.x, y1: en.y, x2: nearest.x, y2: nearest.y, life: 10 }); }
                }

                if (en.hp <= 0) {
                  // ── Kill handling ──
                  if (en.type === 'tank' || en.type === 'boss' || en.type === 'splitter') eng.hitStopFrames = en.type === 'boss' ? 10 : 3;
                  if (en.type === 'tank')    { for (let k = 0; k < 2; k++) eng.enemies.push({ x: en.x, y: en.y, type: 'bad', hp: 1, speed: en.speed * 1.5, r: 8 * eng.scale, state: 'moving', timer: 0, isElite: false, flashTimer: 0, hpBarTimer: 0, frozenTimer: 0, stunnedTimer: 0, dotTimer: 0, dotDmg: 0, isPhased: false, phaseTimer: 0, isVisible: true, spawnFlash: 0 }); }
                  if (en.type === 'shielded') { eng.enemies.push({ x: en.x, y: en.y, type: 'dasher', hp: 1, speed: en.speed * 1.2, r: 10 * eng.scale, state: 'moving', timer: 0, isElite: false, flashTimer: 0, hpBarTimer: 0, frozenTimer: 0, stunnedTimer: 0, dotTimer: 0, dotDmg: 0, isPhased: false, phaseTimer: 0, isVisible: true, spawnFlash: 0 }); }
                  // ── Splitter: splits into 2 smaller enemies ──
                  if (en.type === 'splitter') {
                    for (let k = 0; k < 2; k++) {
                      const sa = k === 0 ? Math.PI / 4 : -Math.PI / 4;
                      eng.enemies.push({ x: en.x + Math.cos(sa) * 15, y: en.y + Math.sin(sa) * 15, type: 'bad', hp: 1.5, speed: en.speed * 1.4, r: 9 * eng.scale, state: 'moving', timer: 0, isElite: en.isElite, flashTimer: 0, hpBarTimer: 0, frozenTimer: 0, stunnedTimer: 0, dotTimer: 0, dotDmg: 0, isPhased: false, phaseTimer: 0, isVisible: true, spawnFlash: 8 });
                    }
                    createExplosion(eng, en.x, en.y, '255,180,50', 15);
                  }
                  if (en.type === 'boss') {
                    eng.levelBossesDefeated = (eng.levelBossesDefeated || 0) + 1;
                    eng.bossActive = false; eng.bossEnraged = false; eng.score += 5000;
                    for (let k = 0; k < 25; k++) eng.enemies.push({ x: en.x + (Math.random() - 0.5) * 80, y: en.y + (Math.random() - 0.5) * 80, type: 'gem', speed: 1, r: 6 * eng.scale, isElite: false, flashTimer: 0, hpBarTimer: 0, frozenTimer: 0, stunnedTimer: 0, dotTimer: 0, dotDmg: 0, isPhased: false, phaseTimer: 0, isVisible: true, spawnFlash: 0 });
                    eng.notifications.push({ text: 'ANOMALY PURGED', life: 180, type: 'cyan' });
                    if (Math.random() < 0.6) spawnPowerup(eng, en.x, en.y);
                    if (Math.random() < 0.5) spawnPowerup(eng, en.x + 50, en.y - 50);
                  }

                  // ── Chain reaction: explosive kills damage nearby ──
                  if (en.isElite || en.type === 'tank' || en.type === 'splitter') {
                    eng.enemies.forEach((en2: any) => { if (en2 !== en && en2.type !== 'gem' && Math.hypot(en2.x - en.x, en2.y - en.y) < 80 * eng.scale) { en2.hp -= 1.5; en2.flashTimer = 5; } });
                    createExplosion(eng, en.x, en.y, '255,120,0', 12);
                  }

                  eng.stats.kills++;
                  eng.killsThisRun++;
                  eng.killsForLifesteal++;

                  // ── Life steal ──
                  if (upgradeLevels.lifesteal && eng.killsForLifesteal >= eng.lifeStealThreshold) {
                    eng.killsForLifesteal = 0;
                    if (eng.lives < eng.maxLives) { eng.lives++; eng.notifications.push({ text: 'LIFE DRAIN +1', life: 90, type: 'green' }); }
                  }

                  // ── Kill streak ──
                  eng.killStreak++;
                  eng.streakTimer = 180;
                  if (eng.killStreak > eng.bestStreak) eng.bestStreak = eng.killStreak;
                  if (eng.killStreak === 5)  { eng.notifications.push({ text: 'KILL CHAIN ×5', life: 120, type: 'cyan' }); eng.score += 500 * eng.combo; playSfx(eng, 700, 'square', 0.2, 0.08); }
                  if (eng.killStreak === 10) { eng.notifications.push({ text: 'FRENZY ×10!', life: 140, type: 'pink' }); eng.score += 2000 * eng.combo; playSfx(eng, 900, 'square', 0.3, 0.12); eng.waveText = 'FRENZY!'; eng.waveAnnounceFrames = 60; }
                  if (eng.killStreak === 20) {
                    eng.notifications.push({ text: 'OMNISLAUGHTER', life: 180, type: 'pink' });
                    if (eng.lives < eng.maxLives) eng.lives++;
                    eng.score += 8000 * eng.combo; playSfx(eng, 1100, 'sawtooth', 0.5, 0.2);
                    eng.waveText = 'OMNISLAUGHTER'; eng.waveAnnounceFrames = 80;
                  }

                  // ── Sync burst charge ──
                  eng.syncBurst = Math.min(eng.syncBurstMax, eng.syncBurst + 4);

                  // ── EXP gain ──
                  const baseExp = en.type === 'boss' ? 60 : en.type === 'tank' || en.type === 'splitter' ? 15 : en.isElite ? 20 : 5;
                  grantExp(eng, baseExp);

                  createExplosion(eng, en.x, en.y, en.type === 'boss' ? '255,0,255' : en.isElite ? '255,200,0' : '255, 45, 85', en.type === 'boss' ? 50 : en.isElite ? 18 : 8);
                  spawnText(eng, en.x, en.y, Math.floor(10 * eng.combo).toString(), en.isElite ? '#ffcc00' : '#00f2ff');
                  eng.enemies.splice(j, 1);
                  eng.credits += en.type === 'boss' ? 120 : en.isElite ? 10 : en.type === 'tank' ? 5 : 1;
                  eng.score += (en.isElite ? 20 : 10) * eng.combo; eng.combo += 0.05;
                  eng.overload = Math.min(eng.maxOverload, eng.overload + 1.5);
                  playSfx(eng, 400 + eng.combo * 30, 'triangle', 0.1, 0.05);

                  if (Math.random() < 0.05) eng.enemies.push({ x: en.x, y: en.y, type: 'gem', speed: 0.5, r: 6 * eng.scale, isElite: false, flashTimer: 0, hpBarTimer: 0, frozenTimer: 0, stunnedTimer: 0, dotTimer: 0, dotDmg: 0, isPhased: false, phaseTimer: 0, isVisible: true, spawnFlash: 0 });
                } else {
                  playSfx(eng, 200, 'triangle', 0.05, 0.02);
                }

                if (!b.pierce) hit = true;
                if (hit) break;
              }
            }
          }
        }

        if (hit || b.life <= 0 || (b.type !== 'mine' && b.type !== 'blade' && b.type !== 'wave' && b.type !== 'arcpulse' && b.type !== 'gravity' && b.type !== 'bounce' && (Math.hypot(b.x - eng.player.x, b.y - eng.player.y) > Math.max(eng.w, eng.h) * 1.5))) {
          eng.bullets.splice(i, 1);
        } else {
          // ── Bullet rendering ──
          if (b.type === 'mine') {
            ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, 4 * eng.scale, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = `rgba(255,255,0,${Math.sin(b.life / 10) * 0.5 + 0.5})`; ctx.lineWidth = 1.5 * eng.scale;
            ctx.beginPath(); ctx.arc(b.x, b.y, 12 * eng.scale, 0, Math.PI * 2); ctx.stroke();
          } else if (b.type === 'blade') {
            ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, 5 * eng.scale, 0, Math.PI * 2); ctx.fill();
          } else if (b.type === 'wave') {
            ctx.strokeStyle = `rgba(255,255,255,${b.life / 40})`; ctx.lineWidth = 3 * eng.scale;
            ctx.beginPath(); ctx.arc(eng.player.x, eng.player.y, b.radius, 0, Math.PI * 2); ctx.stroke();
          } else if (b.type === 'arcpulse') {
            ctx.strokeStyle = `rgba(255,255,68,${b.life / 50})`; ctx.lineWidth = 4 * eng.scale;
            ctx.beginPath(); ctx.arc(eng.player.x, eng.player.y, b.radius, b.arcAng - Math.PI * 0.65, b.arcAng + Math.PI * 0.65); ctx.stroke();
          } else if (b.type === 'gravity') {
            ctx.strokeStyle = `rgba(153,0,255,${0.6 + Math.sin(now * 0.01) * 0.3})`; ctx.lineWidth = 2 * eng.scale;
            ctx.beginPath(); ctx.arc(b.x, b.y, 40 * eng.scale, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(b.x, b.y, 20 * eng.scale, b.angle, b.angle + Math.PI * 1.5); ctx.stroke();
            ctx.fillStyle = '#9900ff'; ctx.beginPath(); ctx.arc(b.x, b.y, 6 * eng.scale, 0, Math.PI * 2); ctx.fill();
          } else if (b.isEnemy) {
            ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, 4 * eng.scale, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
          } else {
            const bR = b.type === 'flame' ? (1 + (20 - b.life) / 4) * eng.scale : b.type === 'bounce' ? 5 * eng.scale : 3 * eng.scale;
            ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(1, bR), 0, Math.PI * 2); ctx.fill();
          }
        }
      }

      // ── Powerups Update ──
      for (let i = eng.powerups.length - 1; i >= 0; i--) {
        const p = eng.powerups[i];
        p.life -= dt;
        const d = Math.hypot(p.x - eng.player.x, p.y - eng.player.y);
        if (d < 120 * eng.scale) { p.x += (eng.player.x - p.x) * 0.05 * dt; p.y += (eng.player.y - p.y) * 0.05 * dt; }
        if (d < p.r + eng.player.r * eng.scale) {
          const dur = 600;
          if (p.type === 'heal') { eng.lives = Math.min(eng.maxLives, eng.lives + 1); eng.notifications.push({ text: 'INTEGRITY RESTORED +1 HP', life: 120, type: 'green' }); }
          else if (p.type === 'shield')         { eng.invincibilityFrames = 600; eng.notifications.push({ text: 'OVERSHIELD ACTIVE', life: 120, type: 'cyan' }); }
          else if (p.type === 'nuke')           { eng.shake = 35 * eng.scale; eng.enemies.forEach((en: any) => { if (en.type !== 'gem') { en.hp = 0; } }); eng.notifications.push({ text: 'SYSTEM WIPE', life: 120, type: 'pink' }); }
          else if (p.type === 'freeze')         { eng.activePowerups.push({ type: 'freeze', duration: 300, maxDuration: 300 }); eng.notifications.push({ text: 'TIME DILATION ACTIVE', life: 120, type: 'cyan' }); }
          else if (p.type === 'doubledmg')      { eng.activePowerups.push({ type: 'doubledmg', duration: dur, maxDuration: dur }); eng.notifications.push({ text: 'DOUBLE DAMAGE', life: 120, type: 'pink' }); }
          else if (p.type === 'speedboost')     { eng.activePowerups.push({ type: 'speedboost', duration: dur, maxDuration: dur }); eng.notifications.push({ text: 'VELOCITY SURGE', life: 120, type: 'cyan' }); }
          else if (p.type === 'expburst')       { grantExp(eng, 200); eng.notifications.push({ text: 'DATA SURGE +200 EXP', life: 120, type: 'green' }); }
          else if (p.type === 'overchargesurge') { eng.overload = eng.maxOverload; eng.notifications.push({ text: 'OVERLOAD CHARGED', life: 120, type: 'cyan' }); }
          else if (p.type === 'datacascade')    { eng.activePowerups.push({ type: 'datacascade', duration: 600, maxDuration: 600 }); eng.notifications.push({ text: 'DATA CASCADE: SCORE ×2', life: 120, type: 'pink' }); }
          playSfx(eng, 800, 'sine', 0.5, 0.2);
          createExplosion(eng, p.x, p.y, '255, 255, 255', 15);
          eng.powerups.splice(i, 1);
        } else if (p.life <= 0) {
          eng.powerups.splice(i, 1);
        } else {
          const pColors: Record<string, string> = { nuke: '#ff0000', shield: '#4444ff', freeze: '#00ffff', heal: '#00ff00', doubledmg: '#ff4400', speedboost: '#00ffaa', expburst: '#00ff88', overchargesurge: '#ffff00', datacascade: '#ff44ff' };
          ctx.fillStyle = pColors[p.type] || '#ffffff';
          ctx.globalAlpha = p.life < 120 ? (Math.floor(p.life / 8) % 2 === 0 ? 1 : 0.3) : 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - p.r); ctx.lineTo(p.x + p.r, p.y); ctx.lineTo(p.x, p.y + p.r); ctx.lineTo(p.x - p.r, p.y);
          ctx.closePath(); ctx.fill();
          // Icon letter
          ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.font = `bold ${8 * eng.scale}px 'Inter', sans-serif`; ctx.textAlign = 'center';
          const icons: Record<string, string> = { nuke: 'N', shield: 'S', freeze: 'F', heal: '+', doubledmg: '2×', speedboost: '▶', expburst: 'E', overchargesurge: 'O', datacascade: 'D' };
          ctx.fillText(icons[p.type] || '?', p.x, p.y + 3 * eng.scale);
          ctx.textAlign = 'left';
        }
      }

      // ── Spawn Rate ──
      const spawnRate = 0.05 + (eng.score / 40000) + (eng.lastSectorLevel * 0.015) + (eng.bloodMoonActive ? 0.03 : 0);
      if (Math.random() < spawnRate) spawn(eng);

      // ── Score multiplier from datacascade ──
      const scoreBoost = eng.activePowerups.some((pp: any) => pp.type === 'datacascade') ? 2 : 1;
      // Apply freeze slow
      if (eng.activePowerups.some((pp: any) => pp.type === 'freeze')) eng.timeSlow = Math.min(eng.timeSlow, 0.15);

      // ── Combo decay ──
      const decayRate = (upgradeLevels.combo_anchor || 0) > 0 ? 0.002 : 0.004;
      if (eng.combo > 1 && eng.overloadActiveFrames <= 0) eng.combo = Math.max(1, eng.combo - decayRate * eng.timeSlow * dt);

      // ── Enemies Update ──
      for (let i = eng.enemies.length - 1; i >= 0; i--) {
        const en = eng.enemies[i];
        en.hitByWave = false; en.hitByArc = false;

        // ── Spawn flash ──
        if (en.spawnFlash > 0) { en.spawnFlash -= dt; }

        // ── DoT (damage over time from flame) ──
        if (en.dotTimer > 0) { en.dotTimer -= dt; en.hp -= en.dotDmg * dt; en.hpBarTimer = 30; if (en.hp <= 0) en.hp = 0.01; } // prevent instant kill loop

        // ── Frozen + Stunned timers ──
        if (en.frozenTimer > 0) en.frozenTimer -= dt;
        if (en.stunnedTimer > 0) en.stunnedTimer -= dt;
        const moveMult = (en.frozenTimer > 0 ? 0.15 : 1) * (en.stunnedTimer > 0 ? 0 : 1) * eng.timeSlow;

        // ── Off-screen indicator ──
        if (en.x < eng.player.x - eng.w/2 || en.x > eng.player.x + eng.w/2 || en.y < eng.player.y - eng.h/2 || en.y > eng.player.y + eng.h/2) {
          const indX = Math.max(12, Math.min(eng.w - 12, en.x - eng.player.x + eng.w/2));
          const indY = Math.max(12, Math.min(eng.h - 12, en.y - eng.player.y + eng.h/2));
          ctx.fillStyle = en.type === 'gem' ? '#00f2ff' : en.isElite ? '#ffcc00' : '#ff2d55';
          ctx.beginPath(); ctx.moveTo(indX, indY - 5); ctx.lineTo(indX + 5, indY + 5); ctx.lineTo(indX - 5, indY + 5); ctx.fill();
        }

        // ── Enemy AI ──
        if (en.type === 'sniper') {
          if (en.state === 'moving') {
            const tx = en.x < eng.player.x ? eng.player.x - eng.w/3 : eng.player.x + eng.w/3;
            const ty = en.y < eng.player.y ? eng.player.y - eng.h/3 : eng.player.y + eng.h/3;
            en.x += (tx - en.x) * 0.03 * moveMult * dt; en.y += (ty - en.y) * 0.03 * moveMult * dt;
            if (Math.hypot(tx - en.x, ty - en.y) < 15) en.state = 'aiming';
          } else if (en.state === 'aiming') {
            en.timer += moveMult * dt;
            ctx.strokeStyle = `rgba(255,45,85,${Math.min(en.timer / 100, 0.7)})`; ctx.lineWidth = 1;
            ctx.setLineDash([5 * eng.scale, 5 * eng.scale]);
            ctx.beginPath(); ctx.moveTo(en.x, en.y); ctx.lineTo(eng.player.x, eng.player.y); ctx.stroke();
            ctx.setLineDash([]);
            if (en.timer > 100) {
              en.timer = 0; const a = Math.atan2(eng.player.y - en.y, eng.player.x - en.x);
              eng.bullets.push({ x: en.x, y: en.y, vx: Math.cos(a) * 10 * eng.scale, vy: Math.sin(a) * 10 * eng.scale, dmg: 1, pierce: true, life: 200, color: '#ff2d55', isEnemy: true });
              playSfx(eng, 600, 'sawtooth', 0.1, 0.05); en.state = 'moving';
            }
          }
        } else if (en.type === 'dasher') {
          en.timer += moveMult * dt;
          if (en.timer < 60) {
            const a = Math.atan2(eng.player.y - en.y, eng.player.x - en.x);
            en.x += Math.cos(a) * (en.speed * 0.6) * moveMult * dt; en.y += Math.sin(a) * (en.speed * 0.6) * moveMult * dt;
          } else if (en.timer >= 60 && en.timer < 65) { en.dashAng = Math.atan2(eng.player.y - en.y, eng.player.x - en.x); }
          else if (en.timer < 85) {
            en.x += Math.cos(en.dashAng) * (en.speed * 5) * moveMult * dt;
            en.y += Math.sin(en.dashAng) * (en.speed * 5) * moveMult * dt;
            if (eng.particleLevel > 0) eng.particles.push({ x: en.x, y: en.y, vx: 0, vy: 0, life: 0.3, color: '255,136,0' });
          } else { en.timer = 0; }
        } else if (en.type === 'pulsar') {
          en.timer += moveMult * dt;
          if (en.timer < 120) {
            const a = Math.atan2(eng.player.y - en.y, eng.player.x - en.x);
            en.x += Math.cos(a) * en.speed * moveMult * dt; en.y += Math.sin(a) * en.speed * moveMult * dt;
          } else {
            const ringR = (en.timer - 120) * 2.5 * eng.scale;
            ctx.strokeStyle = `rgba(255,45,85,${1 - (en.timer - 120) / 40})`; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(en.x, en.y, ringR, 0, Math.PI * 2); ctx.stroke();
            const pD = Math.hypot(en.x - eng.player.x, en.y - eng.player.y);
            if (Math.abs(pD - ringR) < 10 && eng.dashFrames <= 0 && eng.invincibilityFrames <= 0) {
              eng.lives--; eng.invincibilityFrames = 120; eng.combo = 1;
              eng.hitFlash = 20; createExplosion(eng, eng.player.x, eng.player.y, '255,45,85', 30);
              if (eng.lives <= 0 && !eng.lastStandUsed) { eng.lastStandUsed = true; eng.lives = 1; eng.invincibilityFrames = 240; eng.notifications.push({ text: '★ LAST STAND', life: 200, type: 'pink' }); }
              else if (eng.lives <= 0) { gameOverRef.current(); return; }
            }
            if (en.timer > 160) en.timer = 0;
          }
        } else if (en.type === 'teleporter') {
          en.timer += moveMult * dt;
          if (en.timer > 120) {
            en.timer = 0;
            const ta = Math.atan2(eng.player.y - en.y, eng.player.x - en.x);
            en.x += Math.cos(ta) * 150 * eng.scale; en.y += Math.sin(ta) * 150 * eng.scale;
            createExplosion(eng, en.x, en.y, '255, 0, 255', 10);
          }
        } else if (en.type === 'swarmer') {
          const a = Math.atan2(eng.player.y - en.y, eng.player.x - en.x);
          en.x += Math.cos(a + Math.sin(now / 200) * 2) * en.speed * moveMult * dt;
          en.y += Math.sin(a + Math.sin(now / 200) * 2) * en.speed * moveMult * dt;
        } else if (en.type === 'phaser') {
          // ── Phase in/out every 80 frames ──
          en.phaseTimer += dt;
          en.isPhased = Math.floor(en.phaseTimer / 80) % 2 === 1;
          if (!en.isPhased) {
            const a = Math.atan2(eng.player.y - en.y, eng.player.x - en.x);
            en.x += Math.cos(a) * en.speed * moveMult * dt; en.y += Math.sin(a) * en.speed * moveMult * dt;
          }
        } else if (en.type === 'charger') {
          en.timer += dt;
          if (en.state === 'moving') {
            const a = Math.atan2(eng.player.y - en.y, eng.player.x - en.x);
            en.x += Math.cos(a) * en.speed * moveMult * dt; en.y += Math.sin(a) * en.speed * moveMult * dt;
            if (en.timer > 80) { en.state = 'windup'; en.timer = 0; en.chargeAng = Math.atan2(eng.player.y - en.y, eng.player.x - en.x); }
          } else if (en.state === 'windup') {
            // Draw windup indicator
            ctx.strokeStyle = `rgba(255,180,0,${en.timer / 40})`; ctx.lineWidth = 2 * eng.scale;
            for (let ci = 0; ci < 4; ci++) { const ca = en.chargeAng + (ci - 1.5) * 0.15; ctx.beginPath(); ctx.moveTo(en.x, en.y); ctx.lineTo(en.x + Math.cos(ca) * 50 * eng.scale, en.y + Math.sin(ca) * 50 * eng.scale); ctx.stroke(); }
            if (en.timer > 40) { en.state = 'charging'; en.timer = 0; }
          } else if (en.state === 'charging') {
            en.x += Math.cos(en.chargeAng) * en.speed * 6 * dt;
            en.y += Math.sin(en.chargeAng) * en.speed * 6 * dt;
            if (eng.particleLevel > 0) eng.particles.push({ x: en.x, y: en.y, vx: 0, vy: 0, life: 0.4, color: '255,180,0' });
            if (en.timer > 25) { en.state = 'moving'; en.timer = 0; }
          }
        } else if (en.type === 'ghost') {
          // ── Periodically invisible ──
          en.timer += dt;
          en.isVisible = Math.floor(en.timer / 60) % 3 !== 1;
          const a = Math.atan2(eng.player.y - en.y, eng.player.x - en.x);
          en.x += Math.cos(a) * en.speed * moveMult * dt; en.y += Math.sin(a) * en.speed * moveMult * dt;
        } else if (en.type === 'bomber') {
          en.timer += moveMult * dt;
          const a = Math.atan2(eng.player.y - en.y, eng.player.x - en.x);
          en.x += Math.cos(a) * en.speed * moveMult * dt; en.y += Math.sin(a) * en.speed * moveMult * dt;
          // Drop mines every 120 frames
          if (en.timer > 120) {
            en.timer = 0;
            eng.bullets.push({ x: en.x, y: en.y, vx: 0, vy: 0, dmg: 4, pierce: false, life: 300, color: '#ffff00', isEnemy: false, type: 'mine' });
          }
        } else if (en.type === 'boss') {
          en.timer += eng.timeSlow * dt;
          eng.bossHp = en.hp;

          // ── Boss phase 2: enrage at 50% HP ──
          if (!eng.bossEnraged && en.hp <= en.maxHp * 0.5) {
            eng.bossEnraged = true; en.speed *= 1.5; en.r *= 1.1;
            eng.notifications.push({ text: 'ANOMALY ENRAGED — PHASE 2', life: 200, type: 'pink' });
            eng.glitchFrames = 90; eng.waveText = 'PHASE 2'; eng.waveAnnounceFrames = 120;
            playSfx(eng, 80, 'sawtooth', 2.5, 0.6);
            createExplosion(eng, en.x, en.y, '255,0,255', 60);
          }

          if (en.state === 'entering') {
            en.y += 1.5 * eng.timeSlow * dt; if (en.y > 120 * eng.scale) en.state = 'attacking';
          } else {
            en.x += Math.cos(en.timer * 0.03) * 2 * eng.timeSlow * dt;
            en.y += (eng.bossEnraged ? Math.sin(en.timer * 0.04) * 1.5 : 0) * eng.timeSlow * dt;
            // Normal bullet spiral
            const fireRate = eng.bossEnraged ? 35 : 50;
            if (en.timer % fireRate < 1 * dt) {
              const step = eng.bossEnraged ? 0.2 : 0.3;
              for (let bi = 0; bi < Math.PI * 2; bi += step) {
                eng.bullets.push({ x: en.x, y: en.y, vx: Math.cos(bi - en.timer * 0.1) * (eng.bossEnraged ? 5 : 4) * eng.scale, vy: Math.sin(bi - en.timer * 0.1) * (eng.bossEnraged ? 5 : 4) * eng.scale, dmg: 1, pierce: true, life: 300, color: eng.bossEnraged ? '#ff0000' : '#ff00ff', isEnemy: true });
              }
              playSfx(eng, 250, 'square', 0.2, 0.1);
            }
            // Phase 2 extra spiral
            if (eng.bossEnraged && en.timer % 80 < 1 * dt) {
              for (let bi = 0; bi < Math.PI * 2; bi += 0.4) {
                const off = en.timer * 0.15;
                eng.bullets.push({ x: en.x, y: en.y, vx: Math.cos(bi + off) * 6 * eng.scale, vy: Math.sin(bi + off) * 6 * eng.scale, dmg: 1, pierce: true, life: 300, color: '#ffff00', isEnemy: true });
              }
            }
            if (en.timer % 150 < 1 * dt) { spawn(eng); spawn(eng); if (eng.bossEnraged) spawn(eng); }
          }
        } else if (en.type === 'gem') {
          const a = Math.atan2(eng.player.y - en.y, eng.player.x - en.x);
          en.x += Math.cos(a) * en.speed * eng.timeSlow * dt; en.y += Math.sin(a) * en.speed * eng.timeSlow * dt;
        } else {
          // Standard move toward player
          const a = Math.atan2(eng.player.y - en.y, eng.player.x - en.x);
          en.x += Math.cos(a) * en.speed * moveMult * dt; en.y += Math.sin(a) * en.speed * moveMult * dt;
        }

        // ── Enemy Rendering ──
        if (en.spawnFlash > 0) {
          ctx.globalAlpha = 0.5 + (en.spawnFlash / 12) * 0.5;
        }

        if (en.type === 'gem') {
          ctx.fillStyle = '#00f2ff';
          ctx.beginPath(); ctx.moveTo(en.x, en.y - en.r); ctx.lineTo(en.x + en.r, en.y); ctx.lineTo(en.x, en.y + en.r); ctx.lineTo(en.x - en.r, en.y); ctx.closePath(); ctx.fill();
        } else if (en.isVisible || en.type === 'phaser') {
          const phaseAlpha = en.type === 'phaser' ? (en.isPhased ? 0.25 : 1) : (en.isVisible ? 1 : 0.15);
          ctx.globalAlpha *= phaseAlpha;

          // Flash on hit
          if (en.flashTimer > 0) { ctx.fillStyle = '#ffffff'; en.flashTimer -= dt; }
          else if (en.frozenTimer > 0) ctx.fillStyle = '#88eeff';
          else if (en.stunnedTimer > 0) ctx.fillStyle = '#ffff44';
          else {
            if (en.type === 'tank')       ctx.fillStyle = '#990000';
            else if (en.type === 'sniper') ctx.fillStyle = '#ff00ff';
            else if (en.type === 'dasher') ctx.fillStyle = '#ff8800';
            else if (en.type === 'pulsar') ctx.fillStyle = '#0088ff';
            else if (en.type === 'teleporter') ctx.fillStyle = '#8a2be2';
            else if (en.type === 'shielded') ctx.fillStyle = '#4ade80';
            else if (en.type === 'boss')   ctx.fillStyle = eng.bossEnraged ? '#ff2200' : '#ffffff';
            else if (en.type === 'phaser') ctx.fillStyle = '#aaaaff';
            else if (en.type === 'splitter') ctx.fillStyle = '#ffaa00';
            else if (en.type === 'charger') ctx.fillStyle = '#ffcc00';
            else if (en.type === 'ghost')  ctx.fillStyle = '#aaddff';
            else if (en.type === 'bomber') ctx.fillStyle = '#ff6600';
            else ctx.fillStyle = '#ff2d55';
          }

          ctx.beginPath(); ctx.arc(en.x, en.y, en.r, 0, Math.PI * 2); ctx.fill();

          // Elite glow ring
          if (en.isElite) {
            ctx.strokeStyle = `rgba(255,200,0,${0.6 + Math.sin(now * 0.008) * 0.4})`; ctx.lineWidth = 3 * eng.scale;
            ctx.beginPath(); ctx.arc(en.x, en.y, en.r + 4 * eng.scale, 0, Math.PI * 2); ctx.stroke();
          }

          // Shield ring / HP outline
          if (en.hp > 1 || en.type === 'shielded') {
            ctx.strokeStyle = en.type === 'shielded' ? '#ffffff' : en.type === 'boss' ? (eng.bossEnraged ? '#ff2200' : '#ff00ff') : 'rgba(255,45,85,0.4)';
            ctx.lineWidth = en.type === 'boss' ? 3 * eng.scale : 2 * eng.scale; ctx.stroke();
          }

          // Frozen ice crystals visual
          if (en.frozenTimer > 0) {
            ctx.strokeStyle = `rgba(136,238,255,0.7)`; ctx.lineWidth = 1 * eng.scale;
            for (let fi = 0; fi < 6; fi++) { const fa = fi * Math.PI / 3; ctx.beginPath(); ctx.moveTo(en.x, en.y); ctx.lineTo(en.x + Math.cos(fa) * (en.r + 6) * eng.scale, en.y + Math.sin(fa) * (en.r + 6) * eng.scale); ctx.stroke(); }
          }
          // Stunned circles visual
          if (en.stunnedTimer > 0) {
            ctx.strokeStyle = `rgba(255,255,68,0.6)`; ctx.lineWidth = 2 * eng.scale;
            ctx.beginPath(); ctx.arc(en.x, en.y - en.r - 8 * eng.scale, 5 * eng.scale, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(en.x + 8 * eng.scale, en.y - en.r - 4 * eng.scale, 3 * eng.scale, 0, Math.PI * 2); ctx.stroke();
          }

          // Boss HP bar
          if (en.type === 'boss') {
            ctx.fillStyle = '#111'; ctx.fillRect(eng.w / 2 - 160, 30, 320, 10);
            ctx.fillStyle = eng.bossEnraged ? '#ff2200' : '#ff00ff'; ctx.fillRect(eng.w / 2 - 160, 30, 320 * (en.hp / en.maxHp), 10);
            ctx.strokeStyle = eng.bossEnraged ? 'rgba(255,34,0,0.5)' : 'rgba(255,0,255,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(eng.w / 2 - 160, 30, 320, 10);
            ctx.fillStyle = eng.bossEnraged ? '#ff2200' : '#ff00ff'; ctx.font = `bold ${9 * eng.scale}px 'Inter', sans-serif`; ctx.textAlign = 'center';
            ctx.fillText(eng.bossEnraged ? '⚠ CLASS-V ANOMALY [PHASE 2]' : '⚠ CLASS-V ANOMALY', eng.w / 2, 26);
            ctx.textAlign = 'left';
          }

          // Enemy HP bar (scanner drone or recent damage)
          if ((scannerActive || en.hpBarTimer > 0) && en.type !== 'gem') {
            if (en.hpBarTimer > 0) en.hpBarTimer -= dt;
            const barW = en.r * 2; const barX = en.x - en.r; const barY = en.y - en.r - 8 * eng.scale;
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(barX, barY, barW, 4 * eng.scale);
            ctx.fillStyle = en.hp / en.maxHp > 0.5 ? '#00ff88' : en.hp / en.maxHp > 0.25 ? '#ffcc00' : '#ff2255';
            ctx.fillRect(barX, barY, barW * Math.max(0, en.hp / en.maxHp), 4 * eng.scale);
          }
        }

        ctx.globalAlpha = 1;

        // ── Player-enemy collision ──
        const hitboxR = (eng.player.r - 2) * eng.scale;
        const dist = Math.hypot(en.x - eng.player.x, en.y - eng.player.y);
        if (dist < en.r + hitboxR) {
          if (en.type === 'gem') {
            eng.score += 20 * eng.combo * scoreBoost; eng.credits += 2; eng.combo += 0.1;
            eng.overload = Math.min(eng.maxOverload, eng.overload + 1);
            grantExp(eng, 8);
            playSfx(eng, 700, 'sine', 0.1, 0.05); eng.enemies.splice(i, 1);
          } else if (eng.dashFrames > 0) {
            spawnText(eng, en.x, en.y, 'PURGE', '#00f2ff');
            eng.score += 150 * eng.combo * scoreBoost;
            eng.overload = Math.min(eng.maxOverload, eng.overload + 15);
            en.hp = 0; playSfx(eng, 900, 'triangle', 0.2, 0.1);
          } else if (en.isPhased) {
            // Phased enemies pass through
          } else if (eng.invincibilityFrames <= 0) {
            let blocked = false;
            const aegis = eng.equippedDrones.find((d: any) => d.type === 'shield' && d.active);
            if (aegis) {
              aegis.active = false; aegis.timer = aegis.cooldown; blocked = true;
              eng.notifications.push({ text: 'SHIELD DEPLOYED', life: 90, type: 'green' });
              playSfx(eng, 300, 'triangle', 0.2, 0.1); eng.enemies.splice(i, 1);
              createExplosion(eng, en.x, en.y, '74, 222, 128', 12);
            }
            if (!blocked) {
              eng.lives--; playSfx(eng, 100, 'sawtooth', 0.6, 0.3);
              eng.hitFlash = 25; eng.screenShockColor = '255,45,85';
              createExplosion(eng, eng.player.x, eng.player.y, '0, 242, 255', 30);
              // Revenge burst
              for (let ri = 0; ri < 6; ri++) { const ra = ri * (Math.PI * 2 / 6); eng.bullets.push({ x: eng.player.x, y: eng.player.y, vx: Math.cos(ra) * 8 * eng.scale, vy: Math.sin(ra) * 8 * eng.scale, dmg: 0.8 * dmgBoostMult, pierce: false, life: 60, color: '#ff4400', isEnemy: false, type: 'single' }); }
              const nova = eng.equippedDrones.find((d: any) => d.type === 'retaliate' && d.active);
              if (nova) { nova.active = false; nova.timer = nova.cooldown; eng.enemies.forEach((en2: any) => { if (en2.type !== 'gem' && Math.hypot(en2.x - eng.player.x, en2.y - eng.player.y) < 200 * eng.scale) en2.hp -= 15; }); createExplosion(eng, eng.player.x, eng.player.y, '255, 115, 0', 50); eng.shake = 20 * eng.scale; }
              if (eng.lives <= 0 && !eng.lastStandUsed) { eng.lastStandUsed = true; eng.lives = 1; eng.invincibilityFrames = 240; eng.notifications.push({ text: '★ LAST STAND', life: 200, type: 'pink' }); eng.enemies.forEach((en2: any) => { if (en2.type !== 'gem' && Math.hypot(en2.x - eng.player.x, en2.y - eng.player.y) < 250 * eng.scale) en2.hp *= 0.5; }); }
              else if (eng.lives <= 0) { gameOverRef.current(); return; }
              else { eng.invincibilityFrames = 120; eng.combo = 1; eng.notifications.push({ text: 'HULL DAMAGE', life: 90, type: 'pink' }); }
            }
          }
        }
      }

      // ── Draw Drones ──
      eng.equippedDrones.forEach((d: any, idx: number) => {
        if (!d.active) {
          d.timer -= eng.timeSlow * dt;
          if (d.timer <= 0) { d.active = true; eng.notifications.push({ text: `${d.name} ONLINE`, life: 90, type: 'green' }); }
          // Draw recharging drone as dim ring
          const ddx = eng.player.x + Math.cos(d.angle) * 25 * eng.scale;
          const ddy = eng.player.y + Math.sin(d.angle) * 25 * eng.scale;
          ctx.globalAlpha = 0.3; ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(ddx, ddy, 4 * eng.scale, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        } else {
          d.angle += 0.04 * eng.timeSlow * dt;
          const ddx = eng.player.x + Math.cos(d.angle) * 28 * eng.scale;
          const ddy = eng.player.y + Math.sin(d.angle) * 28 * eng.scale;
          ctx.fillStyle = d.color; ctx.beginPath(); ctx.moveTo(ddx, ddy - 4 * eng.scale); ctx.lineTo(ddx + 4 * eng.scale, ddy + 4 * eng.scale); ctx.lineTo(ddx - 4 * eng.scale, ddy + 4 * eng.scale); ctx.closePath(); ctx.fill();
          if (d.type === 'aura')    { ctx.strokeStyle = 'rgba(0,242,255,0.1)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(eng.player.x, eng.player.y, 120 * eng.scale, 0, Math.PI * 2); ctx.stroke(); }
          if (d.type === 'scanner') { ctx.strokeStyle = 'rgba(0,200,255,0.08)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(eng.player.x, eng.player.y, 200 * eng.scale, 0, Math.PI * 2); ctx.stroke(); }
        }
      });

      // ── Draw Player ──
      if (eng.invincibilityFrames <= 0 || Math.floor(eng.invincibilityFrames / 8) % 2 === 0) {
        const pScale = 1 + (eng.levelFlashFrames > 0 ? Math.sin(eng.levelFlashFrames * 0.3) * 0.3 : 0);
        // Rage mode glow at low HP
        if (eng.lives <= 1) {
          ctx.fillStyle = `rgba(255,0,0,${0.15 + Math.abs(Math.sin(now * 0.005)) * 0.15})`;
          ctx.beginPath(); ctx.arc(eng.player.x, eng.player.y, eng.player.r * eng.scale * 2.5 * pScale, 0, Math.PI * 2); ctx.fill();
        }
        // Level flash ring
        if (eng.levelFlashFrames > 0) {
          ctx.strokeStyle = `rgba(0,255,170,${eng.levelFlashFrames / 90})`; ctx.lineWidth = 3 * eng.scale;
          ctx.beginPath(); ctx.arc(eng.player.x, eng.player.y, eng.player.r * eng.scale * 2.5 * pScale, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(eng.player.x, eng.player.y, eng.player.r * eng.scale * pScale, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#00f2ff'; ctx.beginPath(); ctx.arc(eng.player.x, eng.player.y, (eng.player.r - 3) * eng.scale * pScale, 0, Math.PI * 2); ctx.fill();
        // Hitbox debug
        if (eng.showHitboxes) { ctx.strokeStyle = 'rgba(255,255,0,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(eng.player.x, eng.player.y, (eng.player.r - 2) * eng.scale, 0, Math.PI * 2); ctx.stroke(); }
      }

      // ── Particles ──
      for (let i = eng.particles.length - 1; i >= 0; i--) {
        const p = eng.particles[i];
        p.x += p.vx * eng.timeSlow * dt; p.y += p.vy * eng.timeSlow * dt; p.life -= 0.05 * eng.timeSlow * dt;
        if (p.life <= 0) { eng.particles.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(${p.color}, ${p.life})`;
        ctx.fillRect(p.x, p.y, 2 * eng.scale, 2 * eng.scale);
      }

      // ── Lightning Arcs ──
      for (let i = eng.lightningArcs.length - 1; i >= 0; i--) {
        const la = eng.lightningArcs[i]; la.life -= eng.timeSlow * dt;
        if (la.life <= 0) { eng.lightningArcs.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(0,170,255,${la.life / 10})`; ctx.lineWidth = 2 * eng.scale;
        ctx.beginPath(); ctx.moveTo(la.x1, la.y1);
        ctx.lineTo(la.x1 + (la.x2 - la.x1) * 0.5 + (Math.random() - 0.5) * 20, la.y1 + (la.y2 - la.y1) * 0.5 + (Math.random() - 0.5) * 20);
        ctx.lineTo(la.x2, la.y2); ctx.stroke();
      }

      // ── Floating Texts ──
      for (let i = eng.floatingTexts.length - 1; i >= 0; i--) {
        const ft = eng.floatingTexts[i];
        ft.y += ft.vy * eng.timeSlow * dt; ft.life -= eng.timeSlow * dt;
        if (ft.life <= 0) { eng.floatingTexts.splice(i, 1); continue; }
        const ftScale = (ft.scale || 1) * eng.scale;
        ctx.fillStyle = ft.color; ctx.globalAlpha = ft.life / 40;
        ctx.font = `bold ${11 * ftScale}px 'Inter', sans-serif`; ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
      }

      // ── Neural Aimbot indicator ──
      if (eng.isFiring && closestEnemy && !closestEnemy.isPhased && !closestEnemy.isStunned) {
        ctx.strokeStyle = 'rgba(0,242,255,0.15)'; ctx.lineWidth = 1 * eng.scale;
        ctx.setLineDash([4 * eng.scale, 6 * eng.scale]);
        ctx.beginPath(); ctx.moveTo(eng.player.x, eng.player.y); ctx.lineTo(closestEnemy.x, closestEnemy.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(0,242,255,0.4)'; ctx.lineWidth = 1 * eng.scale;
        ctx.beginPath(); ctx.arc(closestEnemy.x, closestEnemy.y, closestEnemy.r + 6 * eng.scale, 0, Math.PI * 2); ctx.stroke();
      }

      // ── HUD DOM updates ──
      const scoreEl    = document.getElementById('hud-score');
      const comboEl    = document.getElementById('hud-combo');
      const overloadEl = document.getElementById('hud-overload');
      const levelEl    = document.getElementById('hud-level');
      const expEl      = document.getElementById('hud-exp');
      const streakEl   = document.getElementById('hud-streak');
      const timeEl     = document.getElementById('hud-time');
      const killsEl    = document.getElementById('hud-kills');
      const syncEl     = document.getElementById('hud-sync');
      const credEl     = document.getElementById('hud-credits-run');

      if (scoreEl) scoreEl.innerText = Math.floor(eng.score * scoreBoost).toString().padStart(7, '0');
      if (comboEl) { comboEl.innerText = `SYNC: ${eng.combo.toFixed(1)}x`; }
      if (overloadEl) {
        overloadEl.style.width = `${(eng.overload / eng.maxOverload) * 100}%`;
        if (eng.overload >= eng.maxOverload) overloadEl.classList.add('overload-full'); else overloadEl.classList.remove('overload-full');
      }
      if (levelEl) levelEl.innerText = `LVL ${eng.playerLevel}`;
      if (expEl) expEl.style.width = `${(eng.exp / eng.expToLevel) * 100}%`;
      if (streakEl) {
        if (eng.killStreak >= 5 && eng.streakTimer > 0) {
          streakEl.innerText = `STREAK ×${eng.killStreak}`; streakEl.style.opacity = '1';
          streakEl.style.color = eng.killStreak >= 10 ? '#ff00ff' : '#ffcc00';
        } else { streakEl.style.opacity = '0'; }
      }
      if (timeEl) { const t = Math.floor(eng.timeAlive); timeEl.innerText = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; }
      if (killsEl) killsEl.innerText = `${eng.killsThisRun}`;
      if (syncEl) {
        const syncPct = (eng.syncBurst / eng.syncBurstMax) * 100;
        syncEl.style.width = `${syncPct}%`;
        if (eng.syncBurst >= eng.syncBurstMax) syncEl.classList.add('sync-full'); else syncEl.classList.remove('sync-full');
      }
      if (credEl) credEl.innerText = `+${eng.credits}`;

      // ── Level HUD DOM update ──
      const lvlNameEl = document.getElementById('hud-lvl-name');
      const lvlObjEl  = document.getElementById('hud-lvl-obj');
      const lvlBarEl  = document.getElementById('hud-lvl-bar');
      if (eng.playing && !eng.levelComplete) {
        const lvlIdx = (eng.currentLevel - 1) % LEVELS.length;
        const lvl = LEVELS[lvlIdx];
        let progress = 0; let progressText = '';
        if (lvl.type === 'kills') {
          const k = eng.stats.kills - eng.levelStartKills;
          progress = Math.min(1, k / lvl.target);
          progressText = `${Math.min(k, lvl.target)}/${lvl.target} KILLS`;
        } else if (lvl.type === 'time') {
          const t = eng.timeAlive - eng.levelStartTime;
          progress = Math.min(1, t / lvl.target);
          const secs = Math.floor(t); progressText = `${secs}/${lvl.target}s SURVIVE`;
        } else if (lvl.type === 'score') {
          const sc = eng.score - eng.levelStartScore;
          progress = Math.min(1, sc / lvl.target);
          progressText = `${Math.floor(Math.min(sc, lvl.target)).toLocaleString()}/${lvl.target.toLocaleString()} PTS`;
        } else if (lvl.type === 'boss') {
          progress = Math.min(1, eng.levelBossesDefeated / lvl.target);
          progressText = `${eng.levelBossesDefeated}/${lvl.target} BOSS`;
        }
        if (lvlNameEl) lvlNameEl.innerText = `LVL ${eng.currentLevel}: ${lvl.name}`;
        if (lvlObjEl)  lvlObjEl.innerText  = progressText;
        if (lvlBarEl)  lvlBarEl.style.width = `${progress * 100}%`;

        // ── Check objective ──
        if (progress >= 1 && !eng.levelComplete) {
          eng.levelComplete = true;
          eng.levelCompleteFrames = 1;
          const nextIdx = eng.currentLevel % LEVELS.length;
          onLevelCompleteRef.current({
            level: eng.currentLevel,
            name: lvl.name,
            reward: lvl.reward,
            nextName: LEVELS[nextIdx].name,
            nextObj: LEVELS[nextIdx].objective,
          });
          playSfx(eng, 880, 'sine', 1.5, 0.25);
          setTimeout(() => playSfx(eng, 1100, 'sine', 1.0, 0.2), 250);
          setTimeout(() => playSfx(eng, 1320, 'sine', 0.8, 0.2), 500);
          createExplosion(eng, eng.player.x, eng.player.y, '0,255,170', 40);
        }
      }

      try { renderThreeJS(eng, dt, now); } catch(e) { console.error('3D Render Error:', e); }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [upgradeLevels, showHitboxes]);

  // ─── UI RENDERERS ─────────────────────────────────────────────────────────

  const renderMenuContent = () => {
    if (menuTab === 'deploy') return (
      <div className="flex flex-col md:flex-row gap-6 w-full h-full">
        <div className="flex-1 bg-white/5 border border-white/10 p-6 flex flex-col items-center justify-center space-y-6">
          <div className="text-sm tracking-[4px] text-gray-400">READY TO INITIALIZE</div>
          <button onClick={startGame} className="px-16 py-6 bg-cyan-500 hover:bg-cyan-400 text-black tracking-[8px] transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(0,242,255,0.4)]" style={{fontSize:'1.4rem',fontWeight:900}}>
            DEPLOY
          </button>
          <div className="text-[10px] text-gray-500 tracking-widest text-center">
            MOUSE: MOVE&nbsp;&nbsp;|&nbsp;&nbsp;L-CLICK / SPACE: FIRE<br/>
            R-CLICK: DASH&nbsp;&nbsp;|&nbsp;&nbsp;E: OVERLOAD&nbsp;&nbsp;|&nbsp;&nbsp;Q: SYNC-CHAIN BURST
          </div>
        </div>
        <div className="w-80 bg-white/5 border border-white/10 p-6 flex flex-col">
          <h3 className="text-xs tracking-widest text-cyan-400 mb-4 border-b border-white/10 pb-2">LOADOUT STATUS</h3>
          <div className="space-y-3">
            {['PRIMARY', 'AUTO 1', 'AUTO 2'].map((slot, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-[10px] text-gray-500 tracking-widest mb-1">{slot}</span>
                <div className="border border-white/20 bg-black/40 p-2 text-xs text-white">{loadoutWeapons[i] ? WEAPONS[loadoutWeapons[i]]?.name : 'EMPTY'}</div>
              </div>
            ))}
            <div className="flex flex-col mt-2">
              <span className="text-[10px] text-gray-500 tracking-widest mb-1">DRONES ({loadoutDrones.length}/4)</span>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({length: 4}).map((_, i) => (
                  <div key={i} className="border border-white/20 bg-black/40 p-2 text-[10px] text-white truncate text-center">{loadoutDrones[i] ? DRONES[loadoutDrones[i]]?.name : '—'}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-auto pt-4 border-t border-white/10">
            <div className="text-[10px] text-gray-500 tracking-widest mb-2">CAMPAIGN PROGRESS</div>
            <div className="flex gap-1 mb-2">
              {LEVELS.map(lvl => (
                <div key={lvl.id}
                  className={`flex-1 h-1.5 ${lvl.id <= maxLevelReached ? 'bg-cyan-400' : 'bg-white/10'}`}
                  title={lvl.name}
                />
              ))}
            </div>
            <div className="text-[9px] text-gray-600 mt-1 space-y-0.5">
              <div>• WASD/Arrows: Move  • L-Click/Space: Fire</div>
              <div>• R-Click: Ghost Dash  • E: Overload  • Q: Burst</div>
              <div>• {LEVELS.length} campaign levels with unique objectives</div>
            </div>
          </div>
        </div>
      </div>
    );

    if (menuTab === 'arsenal') return (
      <div className="flex flex-col h-full bg-white/5 border border-white/10 p-6">
        <h3 className="text-xs tracking-widest text-cyan-400 mb-4 flex justify-between">
          <span>WEAPON SCHEMATICS ({Object.keys(WEAPONS).length} TOTAL)</span>
          <span className="text-gray-400">ASSIGN TO SLOTS BELOW</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pr-2 pb-4">
          {Object.entries(WEAPONS).map(([key, w]) => {
            const isUnlocked = unlockedWeapons.includes(key);
            const slotAssigned = loadoutWeapons.indexOf(key);
            const isNew = ['flak','cryo','gravity','bounce','emp','arcpulse'].includes(key);
            return (
              <div key={key} className={`border p-3 flex flex-col justify-between transition-colors ${isUnlocked ? 'border-white/20 bg-black/40' : 'border-white/5 bg-black/20 opacity-50'}`}>
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span style={{color: w.color}} className="tracking-wider text-xs">{w.name}</span>
                      {isNew && <span className="text-[8px] px-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">NEW</span>}
                    </div>
                    {!isUnlocked && (
                      <button onClick={() => handleBuyWeapon(key, w.cost)} disabled={credits < w.cost} className={`px-2 py-0.5 text-[9px] tracking-widest transition-colors ${credits >= w.cost ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500 hover:text-black' : 'border border-white/10 text-gray-600'}`}>
                        {w.cost} CR
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-400 mb-3">{w.desc}</p>
                </div>
                {isUnlocked && (
                  <div className="flex gap-1">
                    {[0,1,2].map(slot => (
                      <button key={slot} onClick={() => assignWeapon(key, slot)} className={`flex-1 py-0.5 text-[9px] tracking-widest border transition-colors ${slotAssigned === slot ? 'bg-cyan-500 text-black border-cyan-500' : 'border-white/20 text-gray-300 hover:bg-white/10'}`}>
                        {['PRI','A1','A2'][slot]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );

    if (menuTab === 'drones') return (
      <div className="flex flex-col h-full bg-white/5 border border-white/10 p-6">
        <h3 className="text-xs tracking-widest text-cyan-400 mb-4 flex justify-between">
          <span>DRONE BAY ({Object.keys(DRONES).length} MODULES)</span>
          <span className="text-gray-400">EQUIPPED: {loadoutDrones.length}/4</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pr-2 pb-4">
          {Object.entries(DRONES).map(([key, d]) => {
            const isUnlocked = unlockedDrones.includes(key);
            const isEquipped = loadoutDrones.includes(key);
            const isNew = ['scanner','decoy','anchor'].includes(key);
            return (
              <div key={key} className={`border p-3 flex flex-col justify-between transition-colors ${isUnlocked ? 'border-white/20 bg-black/40' : 'border-white/5 bg-black/20 opacity-50'}`}>
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span style={{color: d.color}} className="tracking-wider text-xs">{d.name}</span>
                      {isNew && <span className="text-[8px] px-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">NEW</span>}
                    </div>
                    {!isUnlocked && (
                      <button onClick={() => handleBuyDrone(key, d.cost)} disabled={credits < d.cost} className={`px-2 py-0.5 text-[9px] tracking-widest transition-colors ${credits >= d.cost ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500 hover:text-black' : 'border border-white/10 text-gray-600'}`}>
                        {d.cost} CR
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-gray-400 mb-3">{d.desc}</p>
                </div>
                {isUnlocked && (
                  <button onClick={() => toggleDrone(key)} disabled={!isEquipped && loadoutDrones.length >= 4} className={`py-0.5 w-full text-[9px] tracking-widest border transition-colors ${isEquipped ? 'bg-cyan-500 text-black border-cyan-500' : 'border-white/20 text-gray-300 hover:bg-white/10 disabled:opacity-30'}`}>
                    {isEquipped ? 'UNEQUIP' : 'EQUIP'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );

    if (menuTab === 'upgrades') return (
      <div className="flex flex-col h-full bg-white/5 border border-white/10 p-6">
        <h3 className="text-xs tracking-widest text-cyan-400 mb-4">SYSTEM PASSIVES ({Object.keys(UPGRADES).length} MODULES)</h3>
        <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2">
          {Object.entries(UPGRADES).map(([key, u]) => {
            const lvl = upgradeLevels[key] || 0;
            const isMax = lvl >= u.maxLvl;
            const cost = u.cost * (lvl + 1);
            const isNew = ['dmgcore','bulletspeed','reload','lifesteal','expmult','dashrange'].includes(key);
            return (
              <div key={key} className="border border-white/10 bg-black/40 p-3 flex justify-between items-center">
                <div className="flex-1 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs tracking-wider text-white">{u.name}</span>
                    <span className="text-[9px] px-1 bg-white/10">{lvl}/{u.maxLvl}</span>
                    {isNew && <span className="text-[8px] px-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">NEW</span>}
                  </div>
                  <div className="text-[9px] text-gray-400">{u.desc}</div>
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({length: u.maxLvl}).map((_, li) => (
                      <div key={li} className={`h-1 flex-1 ${li < lvl ? 'bg-cyan-400' : 'bg-white/10'}`}></div>
                    ))}
                  </div>
                </div>
                <button onClick={() => handleBuyUpgrade(key, cost, lvl)} disabled={isMax || credits < cost} className={`px-3 py-1.5 text-[9px] tracking-widest border whitespace-nowrap ${isMax ? 'border-gray-700 text-gray-600' : credits >= cost ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 hover:bg-cyan-500 hover:text-black' : 'border-white/10 text-gray-600'} transition-colors`}>
                  {isMax ? 'MAXED' : `${cost} CR`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );

    if (menuTab === 'settings') {
      const applyYt = () => {
        const raw = musicYtInput.trim();
        // extract video ID
        let vid = raw;
        const m = raw.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
        if (m) vid = m[1];
        setMusicYtUrl(vid);
        setMusicType('youtube');
        localStorage.setItem('np_music_type', 'youtube');
        localStorage.setItem('np_music_yt', vid);
      };
      const stopMusic = () => {
        setMusicType('none');
        setMusicYtUrl('');
        if (audioPlayerRef.current) { audioPlayerRef.current.pause(); audioPlayerRef.current.src = ''; }
        localStorage.setItem('np_music_type', 'none');
      };
      const handleMp3 = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (mp3UrlRef.current) URL.revokeObjectURL(mp3UrlRef.current);
        const url = URL.createObjectURL(file);
        mp3UrlRef.current = url;
        setMusicFileName(file.name);
        setMusicType('mp3');
        localStorage.setItem('np_music_type', 'mp3');
        if (audioPlayerRef.current) { audioPlayerRef.current.src = url; audioPlayerRef.current.volume = musicVolume; audioPlayerRef.current.play().catch(() => {}); }
      };
      const changeVolume = (v: number) => {
        setMusicVolume(v);
        localStorage.setItem('np_music_vol', v.toString());
        if (audioPlayerRef.current) audioPlayerRef.current.volume = v;
      };

      return (
        <div className="flex flex-col h-full bg-white/5 border border-white/10 p-6 overflow-y-auto custom-scrollbar gap-6">
          <div>
            <h3 className="text-xs tracking-widest text-cyan-400 mb-4">PREFERENCES</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'RESOLUTION SCALE',   val: resolution.toString(),  setter: (v: string) => { setResolution(parseFloat(v)); localStorage.setItem('np_res', v); }, options: [['1','100% NATIVE'],['0.75','75% BALANCED'],['0.5','50% RETRO']] },
                { label: 'POST-PROCESS GLOW',  val: glow,                   setter: (v: string) => { setGlow(v); localStorage.setItem('np_glow', v); }, options: [['high','ULTRA'],['low','LOW'],['off','OFF']] },
                { label: 'PARTICLE DENSITY',   val: particles,              setter: (v: string) => { setParticles(v); localStorage.setItem('np_part', v); }, options: [['high','HIGH'],['low','LOW'],['none','OFF']] },
                { label: 'AUDIO ENGINE',       val: audio,                  setter: (v: string) => { setAudio(v); localStorage.setItem('np_audio', v); }, options: [['on','ENABLED'],['off','DISABLED']] },
              ].map(s => (
                <div key={s.label} className="flex flex-col gap-1">
                  <label className="text-[10px] tracking-widest text-gray-400">{s.label}</label>
                  <select value={s.val} onChange={e => s.setter(e.target.value)} className="bg-black/50 border border-white/20 text-white p-2 text-xs outline-none">
                    {s.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
              <div className="flex items-center gap-3">
                <label className="text-[10px] tracking-widest text-gray-400">SHOW HITBOXES</label>
                <button onClick={() => setShowHitboxes(v => !v)} className={`px-3 py-1 text-[9px] border transition-colors ${showHitboxes ? 'bg-cyan-500 text-black border-cyan-500' : 'border-white/20 text-gray-400 hover:bg-white/5'}`}>{showHitboxes ? 'ON' : 'OFF'}</button>
              </div>
            </div>
          </div>

          {/* ── Music Player ── */}
          <div className="border border-white/10 p-4 bg-black/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs tracking-widest text-cyan-400">BACKGROUND MUSIC</h3>
              {musicType !== 'none' && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                  <span className="text-[9px] text-cyan-400 tracking-widest">PLAYING</span>
                </div>
              )}
            </div>

            {/* Source selector */}
            <div className="flex gap-2 mb-4">
              {(['none', 'youtube', 'mp3'] as const).map(t => (
                <button key={t} onClick={() => { if (t === 'none') stopMusic(); else if (t !== musicType) { setMusicType(t); } }}
                  className={`px-3 py-1.5 text-[9px] tracking-widest border transition-colors ${musicType === t ? 'bg-cyan-500 text-black border-cyan-500' : 'border-white/20 text-gray-400 hover:bg-white/5'}`}>
                  {t === 'none' ? 'OFF' : t === 'youtube' ? 'YOUTUBE' : 'MP3 FILE'}
                </button>
              ))}
            </div>

            {/* YouTube section */}
            {musicType === 'youtube' && (
              <div className="space-y-3">
                <div className="text-[9px] text-gray-500 tracking-widest">Paste a YouTube URL or Video ID:</div>
                <div className="flex gap-2">
                  <input
                    value={musicYtInput}
                    onChange={e => setMusicYtInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && applyYt()}
                    placeholder="https://youtube.com/watch?v=..."
                    className="flex-1 bg-black/50 border border-white/20 text-white text-xs p-2 outline-none placeholder:text-gray-600"
                  />
                  <button onClick={applyYt} className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-[9px] tracking-widest hover:bg-cyan-500 hover:text-black transition-all">
                    APPLY
                  </button>
                </div>
                {musicYtUrl && (
                  <div className="text-[9px] text-green-400 tracking-widest">
                    ▶ LOADED: {musicYtUrl.length > 20 ? musicYtUrl.slice(0, 20) + '...' : musicYtUrl}
                  </div>
                )}
                <div className="text-[8px] text-gray-600 leading-4">
                  Note: YouTube playback starts automatically when you begin a game session.
                  If music doesn't start, click anywhere on the page first.
                </div>
              </div>
            )}

            {/* MP3 section */}
            {musicType === 'mp3' && (
              <div className="space-y-3">
                <div className="text-[9px] text-gray-500 tracking-widest">Upload an MP3 file from your device:</div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <span className="px-4 py-2 bg-white/5 border border-white/20 text-[9px] tracking-widest text-gray-300 hover:bg-white/10 transition-colors">
                    BROWSE MP3
                  </span>
                  <input type="file" accept="audio/mp3,audio/*" className="hidden" onChange={handleMp3} />
                  {musicFileName && <span className="text-[9px] text-cyan-400 truncate max-w-[140px]">{musicFileName}</span>}
                </label>
                {!musicFileName && <div className="text-[8px] text-gray-600">No file selected. Music resets on page refresh.</div>}
              </div>
            )}

            {/* Volume */}
            {musicType !== 'none' && (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-[9px] text-gray-400 tracking-widest w-16">VOLUME</span>
                <input
                  type="range" min="0" max="1" step="0.05" value={musicVolume}
                  onChange={e => changeVolume(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-400"
                />
                <span className="text-[9px] text-white w-8">{Math.round(musicVolume * 100)}%</span>
              </div>
            )}
          </div>

          {/* Levels progress */}
          <div className="border border-white/10 p-4 bg-black/30">
            <h3 className="text-xs tracking-widest text-cyan-400 mb-3">CAMPAIGN PROGRESS</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {LEVELS.map(lvl => (
                <div key={lvl.id} title={`${lvl.name}: ${lvl.objective}`}
                  className={`aspect-square flex items-center justify-center border text-[9px] font-bold transition-colors ${lvl.id <= maxLevelReached ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' : 'border-white/10 bg-black/30 text-gray-600'}`}>
                  {lvl.id <= maxLevelReached ? '★' : lvl.id}
                </div>
              ))}
            </div>
            <div className="text-[9px] text-gray-500 tracking-widest mt-2">MAX LEVEL REACHED: {maxLevelReached}/{LEVELS.length}</div>
          </div>

          <div className="pt-2">
            <button onClick={() => { if (window.confirm('Wipe all save data?')) { localStorage.clear(); window.location.reload(); } }} className="w-full py-3 text-xs tracking-widest text-red-500 border border-red-500/30 hover:bg-red-500/10 transition-colors">
              FACTORY RESET (WIPE SAVE DATA)
            </button>
          </div>
        </div>
      );
    }
  };

  // ─── JSX RENDER ───────────────────────────────────────────────────────────
  return (
    <div className="relative w-screen h-screen bg-[#020617] overflow-hidden select-none text-white" style={{fontFamily:"'Inter',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,242,255,0.5); }
        .overload-full { background: white !important; box-shadow: 0 0 10px #fff; }
        .sync-full { background: #00ffff !important; box-shadow: 0 0 8px #00ffff; animation: syncpulse 0.4s infinite alternate; }
        @keyframes syncpulse { from { opacity:0.7; } to { opacity:1; } }
        @keyframes lvlcomplete { 0% { opacity:0; transform: scale(0.9) translateY(20px); } 100% { opacity:1; transform: scale(1) translateY(0); } }
        .lvl-complete-panel { animation: lvlcomplete 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      {/* CRT Scanlines */}
      <div className="fixed inset-0 pointer-events-none z-10" style={{background:'linear-gradient(rgba(18,16,16,0) 50%,rgba(0,0,0,0.18) 50%)',backgroundSize:'100% 4px'}} />

      {/* ── PLAYING HUD ── */}
      {gameState === 'playing' && (
        <>
          {/* Top-left: Score + Lives + Bars */}
          <div className="absolute top-5 left-5 pointer-events-none z-20 drop-shadow-[0_0_10px_rgba(0,0,0,0.9)]">
            <div id="hud-score" className="text-4xl md:text-5xl font-black tracking-widest text-white mb-1">0000000</div>
            <div className="flex items-center gap-3 mb-2">
              <div id="hud-combo" className="text-cyan-400 text-xs font-bold tracking-[2px] bg-black/50 px-2 py-1 border border-cyan-400/30">SYNC: 1.0x</div>
              <div className="flex space-x-1">
                {Array.from({length: engineRef.current.maxLives}).map((_, i) => (
                  <div key={i} className={`w-4 h-4 rotate-45 border ${i < engineRef.current.lives ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_8px_#00f2ff]' : 'bg-transparent border-white/20'}`}></div>
                ))}
              </div>
            </div>
            {/* Overload bar */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] text-gray-500 tracking-widest w-14">OVERLOAD</span>
              <div className="w-40 h-1.5 bg-black/80 border border-white/10 relative overflow-hidden">
                <div id="hud-overload" className="h-full bg-cyan-400 transition-all duration-100 w-0"></div>
              </div>
            </div>
            {/* EXP bar */}
            <div className="flex items-center gap-2 mb-1">
              <span id="hud-level" className="text-[9px] text-cyan-500 tracking-widest w-14">LVL 1</span>
              <div className="w-40 h-1 bg-black/80 border border-white/10 relative overflow-hidden">
                <div id="hud-exp" className="h-full bg-green-400 transition-all duration-100 w-0"></div>
              </div>
            </div>
            {/* Sync-Chain Burst bar */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-purple-400 tracking-widest w-14">BURST [Q]</span>
              <div className="w-40 h-1 bg-black/80 border border-white/10 relative overflow-hidden">
                <div id="hud-sync" className="h-full bg-cyan-300 transition-all duration-100 w-0"></div>
              </div>
            </div>
          </div>

          {/* Level Objective Bar (top-center) */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none z-20 flex flex-col items-center gap-1">
            <div id="hud-lvl-name" className="text-[9px] tracking-[3px] text-cyan-400 font-bold">LVL 1: INITIALIZATION</div>
            <div className="w-56 h-2 bg-black/60 border border-white/15 relative overflow-hidden">
              <div id="hud-lvl-bar" className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-200 w-0"></div>
            </div>
            <div id="hud-lvl-obj" className="text-[8px] tracking-widest text-gray-400">0/25 KILLS</div>
          </div>

          {/* Top-right: Stats + Kill Streak + Notifications */}
          <div className="absolute top-5 right-5 pointer-events-none z-20 flex flex-col items-end gap-2">
            <div className="flex gap-4 text-right">
              <div className="text-right">
                <div className="text-[9px] text-gray-500 tracking-widest">TIME</div>
                <div id="hud-time" className="text-xs font-bold text-white">00:00</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-gray-500 tracking-widest">PURGED</div>
                <div id="hud-kills" className="text-xs font-bold text-white">0</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-gray-500 tracking-widest">EARNED</div>
                <div id="hud-credits-run" className="text-xs font-bold text-cyan-400">+0</div>
              </div>
            </div>
            <div id="hud-streak" className="text-xs font-black tracking-widest transition-opacity" style={{opacity:0}}>STREAK ×0</div>
            {engineRef.current.notifications.map((n, i) => {
              n.life--;
              if (n.life <= 0) return null;
              const col = n.type === 'pink' ? 'text-pink-400 border-pink-500/50' : n.type === 'green' ? 'text-green-400 border-green-500/50' : 'text-cyan-400 border-cyan-500/50';
              return (
                <div key={i} className={`text-[10px] font-bold tracking-widest bg-black/70 border px-3 py-1.5 ${col}`} style={{opacity: Math.min(1, n.life / 20)}}>
                  {n.text}
                </div>
              );
            })}
          </div>

          {/* Weapon Cooldown Indicators (bottom-center) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-20 flex gap-3">
            {engineRef.current.equippedWeapons.map((w: any, i: number) => w && (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="text-[9px] tracking-widest" style={{color: w.color}}>{w.name}</div>
                <div className="w-16 h-1 bg-white/10 border border-white/20">
                  <div className="h-full transition-all duration-50" style={{backgroundColor: w.color, width: `${Math.max(0, 100 - (w.currentCooldown / w.cooldown) * 100)}%`}}></div>
                </div>
                <div className="text-[8px] text-gray-500">{w.isAuto ? 'AUTO' : 'PRIMARY'}</div>
              </div>
            ))}
          </div>

          {/* Paused overlay */}
          {paused && (
            <div className="absolute inset-0 bg-black/75 z-30 flex flex-col items-center justify-center backdrop-blur-lg">
              <div className="border border-cyan-500/30 bg-black/60 p-12 flex flex-col items-center gap-6 min-w-[340px]" style={{boxShadow:'0 0 60px rgba(0,242,255,0.08)'}}>
                <div className="text-3xl font-black text-white tracking-[8px]">PAUSED</div>
                <div className="w-full border-t border-white/10"></div>
                {/* Current level info */}
                <div className="text-center">
                  <div className="text-[10px] text-gray-500 tracking-widest">CURRENT MISSION</div>
                  <div className="text-sm text-cyan-400 tracking-widest font-bold mt-1">
                    LEVEL {engineRef.current.currentLevel}: {LEVELS[(engineRef.current.currentLevel - 1) % LEVELS.length]?.name}
                  </div>
                  <div className="text-[9px] text-gray-500 mt-1 tracking-widest">
                    {LEVELS[(engineRef.current.currentLevel - 1) % LEVELS.length]?.objective}
                  </div>
                </div>
                <div className="w-full border-t border-white/10"></div>
                <div className="flex flex-col gap-3 w-full">
                  <button onClick={() => { engineRef.current.paused = false; setPaused(false); if (engineRef.current.masterFilter && engineRef.current.audioCtx) engineRef.current.masterFilter.frequency.setTargetAtTime(20000, engineRef.current.audioCtx.currentTime, 0.1); }} className="w-full py-3 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500 hover:text-black tracking-[4px] text-sm transition-all">
                    RESUME
                  </button>
                  <button onClick={gameOverRef.current} className="w-full py-3 border border-red-500/30 text-red-400 hover:bg-red-500/20 tracking-[4px] text-sm transition-all">
                    ABORT RUN
                  </button>
                </div>
                <div className="text-[9px] text-gray-600 tracking-widest">ESC TO TOGGLE PAUSE</div>
              </div>
            </div>
          )}

          {/* Level Complete overlay */}
          {levelCompleteData && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-auto">
              <div className="lvl-complete-panel relative border border-cyan-400/40 bg-black/85 p-12 flex flex-col items-center gap-5 max-w-lg w-full mx-6 backdrop-blur-md"
                style={{boxShadow:'0 0 80px rgba(0,242,255,0.15), inset 0 0 40px rgba(0,242,255,0.03)'}}>
                {/* Glowing top accent */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                <div className="text-[10px] tracking-[6px] text-cyan-400 font-bold">OBJECTIVE ACHIEVED</div>
                <div className="text-5xl font-black tracking-widest text-white" style={{textShadow:'0 0 30px rgba(0,242,255,0.5)'}}>
                  LEVEL <span className="text-cyan-400">{levelCompleteData.level}</span>
                </div>
                <div className="text-lg tracking-[4px] text-white font-bold">{levelCompleteData.name}</div>
                <div className="border-t border-white/10 w-full"></div>
                <div className="text-center">
                  <div className="text-2xl font-black text-cyan-400">+{levelCompleteData.reward.toLocaleString()} CR</div>
                  <div className="text-[9px] text-gray-500 tracking-widest mt-1">CREDITS AWARDED</div>
                </div>
                <div className="border-t border-white/10 w-full"></div>
                <div className="text-center">
                  <div className="text-[9px] text-gray-500 tracking-widest mb-1">NEXT MISSION</div>
                  <div className="text-sm text-white tracking-widest font-bold">{levelCompleteData.nextName}</div>
                  <div className="text-[10px] text-gray-400 tracking-widest mt-0.5">{levelCompleteData.nextObj}</div>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="text-[9px] text-gray-500 tracking-widest">AUTO IN {levelCountdown}s</div>
                  <button onClick={() => advanceLevelRef.current()} className="px-8 py-2.5 bg-cyan-500 text-black text-xs font-black tracking-[3px] hover:bg-cyan-400 transition-all">
                    CONTINUE
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── STATS SCREEN ── */}
      {gameState === 'stats' && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center z-50 p-6">
          <h1 className="font-black tracking-[8px] mb-2 border-b border-cyan-500/30 pb-4 text-justify text-[36px] text-[#f30800]">MISSION SUMMARY</h1>
          <div className="bg-white/5 border border-white/10 p-8 w-full max-w-lg shadow-2xl flex flex-col gap-4 mt-4">
            {[
              ['FINAL SCORE',       stats.score.toLocaleString(), 'text-2xl font-black text-white'],
              ['MAX SYNC',          `${stats.maxCombo}x`,          'text-cyan-400'],
              ['ENTITIES PURGED',   stats.kills,                   'text-white'],
              ['GRAZES',            stats.grazes,                  'text-white'],
              ['TIME SURVIVED',     `${Math.floor(stats.time / 60)}M ${stats.time % 60}S`, 'text-white'],
              ['ALL-TIME HIGH',     highScore.toLocaleString(),    'text-yellow-400'],
            ].map(([label, val, cls]) => (
              <div key={String(label)} className="flex justify-between items-center">
                <span className="text-xs tracking-widest text-gray-400">{label}</span>
                <span className={`font-bold ${cls}`}>{val}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setGameState('menu')} className="mt-8 px-12 py-4 bg-white hover:bg-gray-200 text-black text-sm font-black tracking-[4px] transition-transform active:scale-95 font-[Konkhmer_Sleokchher]">
            RETURN TO DASHBOARD
          </button>
        </div>
      )}

      {/* ── MENU ── */}
      {gameState === 'menu' && (
        <div className="fixed inset-0 bg-[#020617] bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-cyan-900/20 via-[#020617] to-[#020617] flex flex-col items-center justify-center z-50 p-4 lg:p-8">
          <div className="w-full max-w-6xl mb-5 flex justify-between items-end">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-[8px] text-white">NEURAL<span className="text-cyan-400">PULSE</span></h1>
              <div className="text-[10px] tracking-widest text-gray-500 mt-1">v3.0.0 // EXPANDED BUILD — 100 NEW FEATURES</div>
            </div>
            <div className="text-right">
              <div className="text-xs tracking-widest text-gray-400">DATA CREDITS</div>
              <div className="text-2xl font-black text-cyan-400">{credits.toLocaleString()}</div>
            </div>
          </div>

          <div className="w-full max-w-6xl flex flex-col md:flex-row gap-5 h-[70vh]">
            {/* Sidebar */}
            <div className="w-full md:w-48 flex flex-col gap-1 shrink-0">
              {[
                { id: 'deploy',   label: 'DEPLOY' },
                { id: 'arsenal',  label: 'ARSENAL' },
                { id: 'drones',   label: 'DRONE BAY' },
                { id: 'upgrades', label: 'SYSTEMS' },
                { id: 'settings', label: 'SETTINGS' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setMenuTab(tab.id as any)} className={`px-4 py-3 text-left text-xs tracking-widest transition-colors ${menuTab === tab.id ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400' : 'text-gray-400 hover:bg-white/5 border-l-2 border-transparent'} font-bold`}>
                  {tab.label}
                </button>
              ))}
              <div className="mt-auto border-t border-white/10 pt-3 px-4 space-y-2">
                <div className="text-[9px] tracking-widest text-gray-500">HIGH SCORE<br/><span className="text-white font-black">{highScore.toLocaleString()}</span></div>
                <div className="text-[9px] tracking-widest text-gray-500">MAX LEVEL<br/><span className="text-cyan-400 font-black">{maxLevelReached}/{LEVELS.length}</span></div>
                <div className="text-[9px] tracking-widest text-gray-500">UNLOCKED<br/><span className="text-white">{unlockedWeapons.length}/{Object.keys(WEAPONS).length} WPN</span></div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {renderMenuContent()}
            </div>
          </div>
        </div>
      )}

      {/* Game Canvas */}
      <canvas ref={webglRef} className="block absolute inset-0 w-full h-full object-cover cursor-crosshair z-0" onContextMenu={e => e.preventDefault()} />
      <canvas ref={canvasRef} className={`block absolute inset-0 w-full h-full object-cover z-10 pointer-events-none opacity-40 mix-blend-screen ${gameState === 'playing' ? '' : 'hidden'}`} />

      {/* Hidden MP3 audio player */}
      <audio ref={audioPlayerRef} loop style={{display:'none'}} />

      {/* Hidden YouTube embed */}
      {musicType === 'youtube' && musicYtUrl && (
        <iframe
          ref={ytFrameRef}
          title="bg-music"
          src={`https://www.youtube.com/embed/${musicYtUrl}?autoplay=1&loop=1&playlist=${musicYtUrl}&controls=0`}
          allow="autoplay; encrypted-media"
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        />
      )}
    </div>
  );
}

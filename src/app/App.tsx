import React, { useEffect, useRef, useState, useCallback } from 'react';

const WEAPONS: Record<string, { id: string, name: string, cost: number, cooldown: number, speed: number, dmg: number, type: string, color: string, desc: string }> = {
  basic: { id: 'basic', name: 'PULSE RIFLE', cost: 0, cooldown: 12, speed: 12, dmg: 1, type: 'single', color: '#00f2ff', desc: 'Standard issue neutralizer.' },
  rapid: { id: 'rapid', name: 'VULCAN SMG', cost: 150, cooldown: 4, speed: 15, dmg: 0.4, type: 'single', color: '#ffea00', desc: 'High rate of fire, low damage.' },
  spread: { id: 'spread', name: 'SCATTER SHOT', cost: 350, cooldown: 20, speed: 10, dmg: 1, type: 'spread', color: '#ff2d55', desc: 'Fires a 3-shot cone.' },
  sniper: { id: 'sniper', name: 'RAILGUN', cost: 800, cooldown: 35, speed: 25, dmg: 5, type: 'pierce', color: '#b900ff', desc: 'Pierces all targets.' },
  flame: { id: 'flame', name: 'PLASMA TORCH', cost: 1200, cooldown: 2, speed: 8, dmg: 0.15, type: 'flame', color: '#ff7300', desc: 'Continuous short-range stream.' },
  boomerang: { id: 'boomerang', name: 'REBOUNDER', cost: 1500, cooldown: 25, speed: 14, dmg: 2, type: 'boomerang', color: '#00ffaa', desc: 'Projectiles return to sender.' },
  lightning: { id: 'lightning', name: 'ARC CASTER', cost: 2500, cooldown: 15, speed: 18, dmg: 1.5, type: 'lightning', color: '#00aaff', desc: 'Shocks chain to nearby enemies.' },
  mine: { id: 'mine', name: 'SPIDER MINES', cost: 2000, cooldown: 40, speed: 0, dmg: 8, type: 'mine', color: '#ffff00', desc: 'Stationary traps. Huge AoE.' },
  blade: { id: 'blade', name: 'ORBITAL SAW', cost: 3000, cooldown: 60, speed: 0, dmg: 10, type: 'blade', color: '#ff0055', desc: 'Deploys spinning melee rings.' },
};

const UPGRADES: Record<string, { id: string, name: string, cost: number, desc: string, color: string }> = {
  drones: { id: 'drones', name: 'DEFENSIVE DRONES', cost: 500, desc: '2 ORBITING SHIELDS. 20S REBOOT.', color: '#4ade80' },
  magnetism: { id: 'magnetism', name: 'MAGNETISM', cost: 300, desc: 'PULLS WHITE NODES WITHIN 120PX.', color: '#facc15' },
  reflex: { id: 'reflex', name: 'REFLEX BUFFER', cost: 400, desc: '+25% TIME-DILATION STRENGTH.', color: '#a78bfa' },
  lives: { id: 'lives', name: 'SYNTHETIC HEART', cost: 1000, desc: 'INCREASES MAX LIVES TO 4.', color: '#ff2d55' },
  graze: { id: 'graze', name: 'GRAZE MASTER', cost: 800, desc: 'DODGING CLOSE GRANTS MORE POINTS.', color: '#ffffff' },
  combo: { id: 'combo', name: 'COMBO ANCHOR', cost: 1200, desc: 'COMBO METER DECAYS 50% SLOWER.', color: '#ffea00' },
  overload: { id: 'overload', name: 'EFFICIENT OVERLOAD', cost: 1500, desc: 'DASH COSTS 10% INSTEAD OF 15%.', color: '#00f2ff' },
};

const SECTOR_COLORS = ['#05070a', '#1a0505', '#051a1a', '#1a1a05', '#0f051a', '#1a0515'];

const HUMAN_THOUGHTS_NEUTRAL = ["I can't breathe...", "They're everywhere", "Why is it so cold?", "Is anyone watching?", "Don't let them touch me"];
const HUMAN_THOUGHTS_HIGH_COMBO = ["I SEE THEIR CODE", "MORE!", "UNSTOPPABLE", "I AM THE SYSTEM NOW", "NO FEAR"];
const HUMAN_THOUGHTS_LOW_HP = ["Please no...", "I don't want to die", "Wake up...", "It hurts", "System failing..."];

const hexToRgb = (hex: string) => {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "255, 255, 255";
}

export default function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const uiRef = useRef<HTMLDivElement>(null);

    const [gameState, setGameState] = useState<'menu' | 'playing' | 'stats'>('menu');
    const [credits, setCredits] = useState(0);
    const [unlockedWeapons, setUnlockedWeapons] = useState<string[]>(['basic']);
    const [unlockedUpgrades, setUnlockedUpgrades] = useState<string[]>([]);
    const [equippedWeapon, setEquippedWeapon] = useState<string>('basic');
    
    const [resolution, setResolution] = useState(1);
    const [glow, setGlow] = useState('high');
    const [shakeSetting, setShakeSetting] = useState('medium');
    const [cursorSetting, setCursorSetting] = useState('crosshair');
    const [audio, setAudio] = useState('on');
    
    const [stats, setStats] = useState({ kills: 0, grazes: 0, acc: 0, score: 0, maxCombo: 0 });
    const [highScore, setHighScore] = useState(0);
    const [highCombo, setHighCombo] = useState(0);
    const [paused, setPaused] = useState(false);

    const engineRef = useRef({
        playing: false, paused: false,
        w: 0, h: 0, scale: 1,
        score: 0, combo: 1, credits: 0,
        timeSlow: 1, shake: 0,
        audioEnabled: true, shakeIntensity: 1,
        mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        isFiring: false, fireCooldown: 0,
        
        player: { x: window.innerWidth / 2, y: window.innerHeight / 2, r: 8, trail: [] as any[] },
        lives: 3, maxLives: 3, invincibilityFrames: 0,
        
        enemies: [] as any[], bullets: [] as any[], particles: [] as any[],
        splatters: [] as any[], floatingTexts: [] as any[], lightningArcs: [] as any[],
        grazeSparks: [] as any[],
        
        equippedWeapon: 'basic', audioCtx: null as AudioContext | null,
        hitStopFrames: 0, overload: 0, overloadActiveFrames: 0, dashFrames: 0,
        goodCollects: [] as number[], burstRadius: 0,
        drones: [{angle: 0, active: true, timer: 0}, {angle: Math.PI, active: true, timer: 0}],
        notifications: [] as {text: string, life: number, type?: string}[],
        
        lastSectorLevel: 0, glitchFrames: 0, sectorColor: '#05070a',
        upgrades: [] as string[],
        
        bgHum: null as OscillatorNode | null, heartbeat: null as OscillatorNode | null,
        bgGain: null as GainNode | null, masterFilter: null as BiquadFilterNode | null,
        
        stats: { shotsFired: 0, shotsHit: 0, kills: 0, grazes: 0, maxCombo: 1 },
        bossActive: false, bossHp: 0, bossMaxHp: 0,
        humanThought: { text: "", life: 0, x: 0, y: 0 }
    });

    useEffect(() => {
        const load = (key: string, parser: (val: string) => any, setter: any) => {
            const val = localStorage.getItem(key);
            if (val) setter(parser(val));
        };
        load('np_credits', parseInt, setCredits);
        load('np_unlocked', JSON.parse, setUnlockedWeapons);
        load('np_upgrades', JSON.parse, setUnlockedUpgrades);
        load('np_equipped', String, setEquippedWeapon);
        load('np_res', parseFloat, setResolution);
        load('np_glow', String, setGlow);
        load('np_audio', String, setAudio);
        load('np_shake', String, setShakeSetting);
        load('np_cursor', String, setCursorSetting);
        load('np_highscore', parseInt, setHighScore);
        load('np_highcombo', parseFloat, setHighCombo);
    }, []);

    const wipeSave = () => {
        if(window.confirm("CRITICAL WARNING: This will format your entire Neural Kernel. Erase all progress?")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    const handleBuy = (key: string, type: 'weapon' | 'upgrade', cost: number) => {
        if (credits >= cost) {
            const newCredits = credits - cost;
            setCredits(newCredits);
            localStorage.setItem('np_credits', newCredits.toString());
            
            if (type === 'weapon' && !unlockedWeapons.includes(key)) {
                const newUnlocked = [...unlockedWeapons, key];
                setUnlockedWeapons(newUnlocked);
                setEquippedWeapon(key);
                localStorage.setItem('np_unlocked', JSON.stringify(newUnlocked));
                localStorage.setItem('np_equipped', key);
            } else if (type === 'upgrade' && !unlockedUpgrades.includes(key)) {
                const newUnlocked = [...unlockedUpgrades, key];
                setUnlockedUpgrades(newUnlocked);
                localStorage.setItem('np_upgrades', JSON.stringify(newUnlocked));
            }
        }
    };

    const gameOver = useCallback(() => {
        const engine = engineRef.current;
        engine.playing = false;
        engine.isFiring = false;
        if (engine.bgGain && engine.audioCtx) {
            engine.bgGain.gain.exponentialRampToValueAtTime(0.001, engine.audioCtx.currentTime + 1);
        }
        if (engine.heartbeat && engine.audioCtx) {
            engine.heartbeat.stop();
            engine.heartbeat = null;
        }
        
        let acc = engine.stats.shotsFired > 0 ? Math.round((engine.stats.shotsHit / engine.stats.shotsFired) * 100) : 0;
        setStats({
            kills: engine.stats.kills,
            grazes: engine.stats.grazes,
            acc: acc,
            score: Math.floor(engine.score),
            maxCombo: Math.floor(engine.stats.maxCombo)
        });
        
        if (engine.score > highScore) {
            setHighScore(Math.floor(engine.score));
            localStorage.setItem('np_highscore', Math.floor(engine.score).toString());
        }
        if (engine.stats.maxCombo > highCombo) {
            setHighCombo(Math.floor(engine.stats.maxCombo));
            localStorage.setItem('np_highcombo', Math.floor(engine.stats.maxCombo).toString());
        }
        
        setGameState('stats');
        setCredits(engine.credits);
        localStorage.setItem('np_credits', engine.credits.toString());
    }, [highScore, highCombo]);

    const gameOverRef = useRef(gameOver);
    useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

    const startGame = () => {
        setGameState('playing');
        setPaused(false);
        const engine = engineRef.current;
        
        if (!engine.audioCtx) {
            engine.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (engine.audioCtx && engine.audioCtx.state === 'suspended') {
            engine.audioCtx.resume();
        }
        
        engine.scale = resolution;
        engine.audioEnabled = audio === 'on';
        engine.equippedWeapon = equippedWeapon;
        engine.upgrades = unlockedUpgrades;
        engine.shakeIntensity = shakeSetting === 'none' ? 0 : shakeSetting === 'high' ? 2 : 1;
        
        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth * resolution;
            canvasRef.current.height = window.innerHeight * resolution;
            canvasRef.current.style.width = window.innerWidth + 'px';
            canvasRef.current.style.height = window.innerHeight + 'px';
            canvasRef.current.style.filter = glow === 'high' ? 'contrast(1.2) brightness(1.1) saturate(1.2)' : 'none';
            engine.w = canvasRef.current.width;
            engine.h = canvasRef.current.height;
        }
        
        engine.player.x = engine.w / 2; engine.player.y = engine.h / 2; engine.player.trail = [];
        engine.maxLives = engine.upgrades.includes('lives') ? 4 : 3;
        engine.lives = engine.maxLives;
        engine.invincibilityFrames = 0;
        
        engine.enemies = []; engine.bullets = []; engine.particles = [];
        engine.splatters = []; engine.floatingTexts = []; engine.lightningArcs = [];
        engine.grazeSparks = []; engine.notifications = [];
        
        engine.score = 0; engine.combo = 1; engine.credits = credits; 
        engine.overload = 0; engine.overloadActiveFrames = 0; engine.dashFrames = 0;
        engine.hitStopFrames = 0; engine.lastSectorLevel = 0; engine.glitchFrames = 0;
        engine.sectorColor = SECTOR_COLORS[0]; engine.burstRadius = 0;
        engine.goodCollects = [];
        engine.drones = [{angle: 0, active: true, timer: 0}, {angle: Math.PI, active: true, timer: 0}];
        
        engine.stats = { shotsFired: 0, shotsHit: 0, kills: 0, grazes: 0, maxCombo: 1 };
        engine.bossActive = false;
        
        if (engine.audioEnabled && engine.audioCtx) {
            engine.masterFilter = engine.audioCtx.createBiquadFilter();
            engine.masterFilter.type = 'lowpass';
            engine.masterFilter.frequency.value = 20000;
            engine.masterFilter.connect(engine.audioCtx.destination);
            
            if (!engine.bgHum) {
                engine.bgHum = engine.audioCtx.createOscillator();
                engine.bgGain = engine.audioCtx.createGain();
                engine.bgHum.type = 'sine';
                engine.bgHum.frequency.value = 50;
                engine.bgGain.gain.value = 0.05;
                engine.bgHum.connect(engine.bgGain);
                engine.bgGain.connect(engine.masterFilter);
                engine.bgHum.start();
            } else {
                engine.bgGain!.gain.setValueAtTime(0.05, engine.audioCtx.currentTime);
            }
        }
        
        engine.playing = true;
        engine.paused = false;
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const engine = engineRef.current;
            if (engine.playing) {
                if (e.code === 'Escape') {
                    engine.paused = !engine.paused;
                    setPaused(engine.paused);
                    if(engine.masterFilter && engine.audioCtx) {
                        engine.masterFilter.frequency.setTargetAtTime(engine.paused ? 500 : 20000, engine.audioCtx.currentTime, 0.1);
                    }
                }
                if (engine.paused) return;

                if (e.code === 'Space' || e.code.startsWith('Arrow')) {
                    engine.isFiring = true; e.preventDefault();
                }
                if (e.code === 'KeyE') {
                    if (engine.overload >= 100 && engine.overloadActiveFrames <= 0) {
                        engine.overload = 0; engine.overloadActiveFrames = 300; 
                        engine.notifications.push({text: "CRITICAL_OVERLOAD", life: 180, type: 'cyan'});
                    }
                }
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.code.startsWith('Arrow')) {
                engineRef.current.isFiring = false;
            }
        };
        const handleMouseMove = (e: MouseEvent) => {
            if (engineRef.current.playing && !engineRef.current.paused) {
                engineRef.current.mouse.x = e.clientX * engineRef.current.scale;
                engineRef.current.mouse.y = e.clientY * engineRef.current.scale;
            }
        };
        const handleContextMenu = (e: MouseEvent) => {
            const engine = engineRef.current;
            if (engine.playing && !engine.paused) {
                e.preventDefault();
                let cost = engine.upgrades.includes('overload') ? 10 : 15;
                if (engine.overload >= cost && engine.dashFrames <= 0) {
                    engine.overload -= cost;
                    engine.dashFrames = 15; 
                    engine.notifications.push({text: "GHOST_DASH", life: 90, type: 'cyan'});
                    if (engine.audioCtx && engine.audioEnabled && engine.masterFilter) {
                        try {
                            const osc = engine.audioCtx.createOscillator();
                            const gain = engine.audioCtx.createGain();
                            osc.type = 'square';
                            osc.frequency.setValueAtTime(800, engine.audioCtx.currentTime);
                            osc.frequency.exponentialRampToValueAtTime(100, engine.audioCtx.currentTime + 0.2);
                            osc.connect(gain); gain.connect(engine.masterFilter);
                            gain.gain.setValueAtTime(0.1, engine.audioCtx.currentTime);
                            gain.gain.exponentialRampToValueAtTime(0.01, engine.audioCtx.currentTime + 0.2);
                            osc.start(); osc.stop(engine.audioCtx.currentTime + 0.2);
                        } catch(err) {}
                    }
                }
            }
        };
        const handleResize = () => {
            if (!engineRef.current.playing && canvasRef.current) {
                const scale = engineRef.current.scale;
                canvasRef.current.width = window.innerWidth * scale;
                canvasRef.current.height = window.innerHeight * scale;
                engineRef.current.w = canvasRef.current.width;
                engineRef.current.h = canvasRef.current.height;
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        let animationFrameId: number;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const playSfx = (engine: any, freq: number, type: OscillatorType, dur: number, vol: number) => {
            if (!engine.audioEnabled || !engine.audioCtx || !engine.masterFilter) return;
            try {
                const osc = engine.audioCtx.createOscillator();
                const gain = engine.audioCtx.createGain();
                osc.type = type;
                let adjustedFreq = freq * (1 + (engine.combo - 1) * 0.05); 
                osc.frequency.setValueAtTime(adjustedFreq, engine.audioCtx.currentTime);
                osc.connect(gain); gain.connect(engine.masterFilter);
                gain.gain.setValueAtTime(vol, engine.audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, engine.audioCtx.currentTime + dur);
                osc.start(); osc.stop(engine.audioCtx.currentTime + dur);
            } catch(e) {}
        };

        const createExplosion = (engine: any, x: number, y: number, colorStr: string, count: number) => {
            engine.shake = Math.min(engine.shake + (2 * engine.shakeIntensity * engine.scale), 20 * engine.scale);
            for(let i=0; i<count; i++) {
                engine.particles.push({
                    x, y, vx: (Math.random()-0.5)*15 * engine.scale, 
                    vy: (Math.random()-0.5)*15 * engine.scale, 
                    life: 1 + Math.random(), color: colorStr
                });
            }
            if (Math.random() > 0.5) {
                engine.splatters.push({
                    x, y, r: (10 + Math.random()*20)*engine.scale, color: `rgba(${colorStr}, 0.15)`
                });
                if (engine.splatters.length > 300) engine.splatters.shift();
            }
        };

        const spawnText = (engine: any, x: number, y: number, text: string, color: string, isHuman = false) => {
            engine.floatingTexts.push({ x, y, text, color, life: 60, vy: -1 * engine.scale, isHuman });
        };

        const spawnBoss = (engine: any) => {
            engine.bossActive = true;
            let hp = 100 + (engine.score / 500);
            engine.bossMaxHp = hp;
            engine.bossHp = hp;
            engine.enemies.push({
                x: engine.w/2, y: -100, type: 'boss', hp: hp, maxHp: hp, speed: 1 * engine.scale,
                r: 40 * engine.scale, state: 'entering', timer: 0
            });
            engine.notifications.push({text: "WARNING: KERNEL ANOMALY DETECTED", life: 240, type: 'pink'});
            playSfx(engine, 50, 'sawtooth', 2.0, 0.5);
            engine.glitchFrames = 60;
        };

        const spawn = (engine: any) => {
            if (!engine.playing) return;
            
            let spawnMultiplier = 1 + (engine.lastSectorLevel * 0.2);
            if (engine.score > 0 && Math.floor(engine.score / 10000) > engine.lastSectorLevel && !engine.bossActive) {
                if (Math.random() < 0.1) spawnBoss(engine);
            }

            const rand = Math.random();
            let type = 'bad';
            let isPowerup = false;
            let powerupType = 'none';
            
            if (rand < 0.15) {
                type = 'good';
                if (Math.random() < 0.1) {
                    isPowerup = true;
                    let r = Math.random();
                    if (r < 0.3) powerupType = 'nuke';
                    else if (r < 0.6) powerupType = 'shield';
                    else powerupType = 'rapid';
                }
            }
            else if (rand < 0.25) type = 'phasing';
            else if (rand < 0.30) type = 'tank';
            else if (rand < 0.35) type = 'sniper';
            else if (rand < 0.40) type = 'dasher';
            else if (rand < 0.43) type = 'splitter';
            else if (rand < 0.45) type = 'pulsar';
            
            const side = Math.floor(Math.random() * 4);
            let x, y;
            if(side === 0) { x = Math.random()*engine.w; y = -50; }
            else if(side === 1) { x = Math.random()*engine.w; y = engine.h+50; }
            else if(side === 2) { x = -50; y = Math.random()*engine.h; }
            else { x = engine.w+50; y = Math.random()*engine.h; }
            
            let hp = 1 + (engine.score / 2000); 
            let speed = (2.0 + (engine.score/3000)) * engine.scale * spawnMultiplier;
            let r = 13 * engine.scale;
            
            if (type === 'good') { hp = 1; speed *= 0.7; r = 8 * engine.scale; }
            if (type === 'tank') { hp = 6; speed *= 0.4; r = 25 * engine.scale; }
            if (type === 'sniper') { hp = 2; speed *= 0.8; r = 15 * engine.scale; }
            if (type === 'dasher') { hp = 1; speed *= 0.5; r = 10 * engine.scale; }
            if (type === 'splitter') { hp = 3; speed *= 0.7; r = 18 * engine.scale; }
            if (type === 'pulsar') { hp = 4; speed *= 0.6; r = 16 * engine.scale; }
            if (type === 'phasing') { hp = 1; speed *= 0.9; }
            
            engine.enemies.push({
                x, y, type, speed, r, hp, maxHp: hp,
                phaseTimer: 0, isPhased: false,
                state: 'moving', timer: 0, hasGrazed: false,
                isPowerup, powerupType
            });
        };

        const render = () => {
            const engine = engineRef.current;
            
            if (engine.paused) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            if (engine.playing && engine.hitStopFrames > 0) {
                engine.hitStopFrames--;
                animationFrameId = requestAnimationFrame(render);
                return; 
            }

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            let pX = engine.player.x; let pY = engine.player.y;
            let bgOffsetX = (pX - engine.w/2) * -0.02;
            let bgOffsetY = (pY - engine.h/2) * -0.02;
            
            if (engine.playing && engine.glitchFrames > 0) {
                engine.glitchFrames--;
                ctx.translate((Math.random()-0.5)*10 * engine.scale, (Math.random()-0.5)*10 * engine.scale);
                ctx.fillStyle = Math.random() > 0.8 ? '#ffffff' : engine.sectorColor;
                if (Math.random() > 0.5) {
                    ctx.globalAlpha = 0.1;
                    ctx.fillStyle = Math.random() > 0.5 ? '#ff2d55' : '#00f2ff';
                    ctx.fillRect(0, 0, engine.w, engine.h);
                    ctx.globalAlpha = 1;
                }
            } else {
                ctx.fillStyle = engine.sectorColor;
            }
            
            ctx.globalAlpha = engine.playing ? (engine.timeSlow * 0.25) : 0.1;
            ctx.fillRect(0, 0, engine.w, engine.h);
            ctx.globalAlpha = 1;

            ctx.save();
            ctx.translate(bgOffsetX, bgOffsetY);
            engine.splatters.forEach((s:any) => {
                ctx.fillStyle = s.color;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
            });
            ctx.restore();

            if (engine.playing) {
                if (engine.shake > 0) {
                    ctx.translate(Math.random()*engine.shake - engine.shake/2, Math.random()*engine.shake - engine.shake/2);
                    engine.shake *= 0.9;
                    if (engine.shake < 0.5) engine.shake = 0;
                }

                if (engine.bgHum && engine.audioEnabled) {
                    engine.bgHum.frequency.setValueAtTime(50 + (engine.combo * 5), engine.audioCtx!.currentTime);
                }

                if (engine.combo > engine.stats.maxCombo) engine.stats.maxCombo = engine.combo;

                let sectorLevel = Math.floor(engine.score / 5000);
                if (sectorLevel > engine.lastSectorLevel) {
                    engine.lastSectorLevel = sectorLevel;
                    engine.glitchFrames = 60;
                    engine.sectorColor = SECTOR_COLORS[sectorLevel % SECTOR_COLORS.length];
                    engine.notifications.push({text: `SECTOR_CLEARED // LEVEL ${sectorLevel}`, life: 180, type: 'cyan'});
                    playSfx(engine, 150, 'square', 1.0, 0.2);
                }

                engine.player.x += (engine.mouse.x - engine.player.x) * 0.4;
                engine.player.y += (engine.mouse.y - engine.player.y) * 0.4;

                if (engine.invincibilityFrames > 0) engine.invincibilityFrames--;

                engine.timeSlow = 1;
                let closestEnemy = null;
                let minDist = Infinity;
                let baseSlow = engine.upgrades.includes('reflex') ? 0.225 : 0.3;
                let grazeRadius = engine.upgrades.includes('graze') ? 45 * engine.scale : 30 * engine.scale;
                
                for(let e of engine.enemies) {
                    if (e.type !== 'good') {
                        const d = Math.hypot(e.x - engine.player.x, e.y - engine.player.y);
                        if (!e.isPhased && d < minDist) { minDist = d; closestEnemy = e; }
                        if (d < 70 * engine.scale) engine.timeSlow = baseSlow;
                        
                        if (d < e.r + engine.player.r * engine.scale + grazeRadius && !e.hasGrazed && !e.isPhased && engine.dashFrames <= 0) {
                            e.hasGrazed = true;
                            engine.stats.grazes++;
                            engine.score += 25 * engine.combo;
                            engine.combo += 0.2;
                            engine.overload = Math.min(100, engine.overload + 3);
                            spawnText(engine, engine.player.x, engine.player.y - 20, "GRAZE", "#ffffff");
                            playSfx(engine, 1200, 'sine', 0.1, 0.05);
                            for(let i=0; i<5; i++) {
                                engine.grazeSparks.push({
                                    x: engine.player.x + (Math.random()-0.5)*20, 
                                    y: engine.player.y + (Math.random()-0.5)*20, 
                                    vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, life: 1
                                });
                            }
                        }
                    }
                }

                if (engine.masterFilter && engine.audioCtx) {
                    engine.masterFilter.frequency.setTargetAtTime(engine.timeSlow < 1 ? 800 : 20000, engine.audioCtx.currentTime, 0.1);
                }

                if (engine.lives === 1 && engine.audioEnabled && engine.audioCtx) {
                    if (!engine.heartbeat) {
                        engine.heartbeat = engine.audioCtx.createOscillator();
                        let hbGain = engine.audioCtx.createGain();
                        engine.heartbeat.type = 'sine';
                        engine.heartbeat.frequency.value = 60;
                        engine.heartbeat.connect(hbGain); hbGain.connect(engine.masterFilter!);
                        hbGain.gain.setValueAtTime(0, engine.audioCtx.currentTime);
                        
                        setInterval(() => {
                            if(engine.lives === 1 && engine.playing && !engine.paused && engine.audioCtx) {
                                hbGain.gain.setValueAtTime(0.3, engine.audioCtx.currentTime);
                                hbGain.gain.exponentialRampToValueAtTime(0.01, engine.audioCtx.currentTime + 0.3);
                            }
                        }, 1000);
                        engine.heartbeat.start();
                    }
                } else if (engine.lives > 1 && engine.heartbeat) {
                    engine.heartbeat.stop(); engine.heartbeat = null;
                }

                if (Math.random() < 0.01) {
                    if (engine.lives === 1) engine.humanThought = { text: HUMAN_THOUGHTS_LOW_HP[Math.floor(Math.random()*HUMAN_THOUGHTS_LOW_HP.length)], life: 120, x: Math.random()*engine.w, y: Math.random()*engine.h };
                    else if (engine.combo > 15) engine.humanThought = { text: HUMAN_THOUGHTS_HIGH_COMBO[Math.floor(Math.random()*HUMAN_THOUGHTS_HIGH_COMBO.length)], life: 120, x: Math.random()*engine.w, y: Math.random()*engine.h };
                    else if (Math.random() < 0.2) engine.humanThought = { text: HUMAN_THOUGHTS_NEUTRAL[Math.floor(Math.random()*HUMAN_THOUGHTS_NEUTRAL.length)], life: 120, x: Math.random()*engine.w, y: Math.random()*engine.h };
                }

                if (engine.dashFrames > 0) {
                    engine.dashFrames--;
                    ctx.fillStyle = `rgba(0, 242, 255, ${0.3 + Math.random()*0.4})`;
                    ctx.beginPath(); ctx.arc(engine.player.x, engine.player.y, engine.player.r * engine.scale * 1.5, 0, Math.PI*2); ctx.fill();
                    
                    if (engine.dashFrames % 3 === 0) {
                        engine.player.trail.push({x: engine.player.x, y: engine.player.y, isDash: true});
                    }
                } else {
                    engine.player.trail.push({x: engine.player.x, y: engine.player.y});
                }
                
                if(engine.player.trail.length > 10) engine.player.trail.shift();

                engine.player.trail.forEach((t: any, i: number) => {
                    ctx.fillStyle = t.isDash ? `rgba(255, 255, 255, ${i/10})` : `rgba(0, 242, 255, ${i/10})`;
                    ctx.beginPath(); ctx.arc(t.x, t.y, engine.player.r * engine.scale * (i/10), 0, Math.PI*2); ctx.fill();
                });

                if (engine.overloadActiveFrames > 0) {
                    engine.overloadActiveFrames--;
                    engine.timeSlow = 0; 
                    
                    if (engine.overloadActiveFrames % 3 === 0) {
                        let ang = (engine.overloadActiveFrames * 0.1) % (Math.PI * 2);
                        for(let i=0; i<4; i++) {
                            let a = ang + (i * Math.PI/2);
                            engine.bullets.push({x: engine.player.x, y: engine.player.y, vx: Math.cos(a)*15*engine.scale, vy: Math.sin(a)*15*engine.scale, dmg: 2, pierce: true, life: 100, color: '#00f2ff', isEnemy: false});
                        }
                        playSfx(engine, 1000 + Math.random()*500, 'square', 0.02, 0.01);
                    }
                } else {
                    let w = WEAPONS[engine.equippedWeapon];
                    if (engine.isFiring && engine.fireCooldown <= 0 && (closestEnemy || w.type === 'mine' || w.type === 'blade')) {
                        engine.stats.shotsFired++;
                        let ang = closestEnemy ? Math.atan2(closestEnemy.y - engine.player.y, closestEnemy.x - engine.player.x) : 0;
                        
                        if (w.type === 'single' || w.type === 'pierce') {
                            engine.bullets.push({x: engine.player.x, y: engine.player.y, vx: Math.cos(ang)*w.speed*engine.scale, vy: Math.sin(ang)*w.speed*engine.scale, dmg: w.dmg, pierce: w.type === 'pierce', life: 100, color: w.color, isEnemy: false, type: w.type});
                        } else if (w.type === 'spread') {
                            for(let i=-1; i<=1; i++) {
                                let a = ang + (i * 0.15);
                                engine.bullets.push({x: engine.player.x, y: engine.player.y, vx: Math.cos(a)*w.speed*engine.scale, vy: Math.sin(a)*w.speed*engine.scale, dmg: w.dmg, pierce: false, life: 100, color: w.color, isEnemy: false, type: w.type});
                            }
                        } else if (w.type === 'flame') {
                            let a = ang + (Math.random()-0.5)*0.4;
                            engine.bullets.push({x: engine.player.x, y: engine.player.y, vx: Math.cos(a)*w.speed*engine.scale, vy: Math.sin(a)*w.speed*engine.scale, dmg: w.dmg, pierce: true, life: 25, color: w.color, isEnemy: false, type: w.type});
                        } else if (w.type === 'boomerang') {
                            engine.bullets.push({x: engine.player.x, y: engine.player.y, vx: Math.cos(ang)*w.speed*engine.scale, vy: Math.sin(ang)*w.speed*engine.scale, dmg: w.dmg, pierce: true, life: 120, color: w.color, isEnemy: false, type: w.type});
                        } else if (w.type === 'lightning') {
                            engine.bullets.push({x: engine.player.x, y: engine.player.y, vx: Math.cos(ang)*w.speed*engine.scale, vy: Math.sin(ang)*w.speed*engine.scale, dmg: w.dmg, pierce: false, life: 100, color: w.color, isEnemy: false, type: w.type});
                        } else if (w.type === 'mine') {
                            engine.bullets.push({x: engine.player.x, y: engine.player.y, vx: 0, vy: 0, dmg: w.dmg, pierce: false, life: 300, color: w.color, isEnemy: false, type: w.type});
                        } else if (w.type === 'blade') {
                            for(let i=0; i<3; i++) {
                                engine.bullets.push({x: engine.player.x, y: engine.player.y, vx: 0, vy: 0, dmg: w.dmg, pierce: true, life: 60, color: w.color, isEnemy: false, type: w.type, angle: i*(Math.PI*2/3)});
                            }
                        }
                        
                        if (w.type !== 'flame') playSfx(engine, 800, 'square', 0.05, 0.02);
                        engine.fireCooldown = w.cooldown;
                    }
                }
                
                if (engine.fireCooldown > 0) engine.fireCooldown -= (engine.overloadActiveFrames > 0 ? 1 : engine.timeSlow);

                for(let i=engine.bullets.length-1; i>=0; i--) {
                    let b = engine.bullets[i];
                    let timeScale = b.isEnemy ? engine.timeSlow : (engine.overloadActiveFrames > 0 ? 1 : engine.timeSlow);
                    
                    if (b.type === 'boomerang') {
                        b.vx -= (b.x - engine.player.x) * 0.01 * timeScale;
                        b.vy -= (b.y - engine.player.y) * 0.01 * timeScale;
                    } else if (b.type === 'blade') {
                        b.angle += 0.1 * timeScale;
                        b.x = engine.player.x + Math.cos(b.angle) * 40 * engine.scale;
                        b.y = engine.player.y + Math.sin(b.angle) * 40 * engine.scale;
                    }

                    b.x += b.vx * timeScale;
                    b.y += b.vy * timeScale;
                    b.life -= timeScale;
                    
                    let hit = false;
                    
                    if (b.isEnemy) {
                        if (engine.dashFrames <= 0 && engine.invincibilityFrames <= 0 && Math.hypot(b.x - engine.player.x, b.y - engine.player.y) < engine.player.r * engine.scale) {
                            let blocked = false;
                            if (engine.upgrades.includes('drones')) {
                                let availableDrone = engine.drones.find((d: any) => d.active);
                                if (availableDrone) {
                                    availableDrone.active = false; availableDrone.timer = 1200; blocked = true;
                                    engine.notifications.push({text: "DATA_STOLEN // BLOCKED", life: 120, type: 'green'});
                                    playSfx(engine, 300, 'noise', 0.2, 0.1);
                                    engine.bullets.splice(i, 1); hit = true;
                                }
                            }
                            if (!blocked) {
                                engine.lives--;
                                createExplosion(engine, engine.player.x, engine.player.y, "255, 45, 85", 30);
                                engine.bullets.splice(i, 1); hit = true;
                                if (engine.lives <= 0) {
                                    engine.notifications.push({text: "CRITICAL_FAILURE", life: 120, type: 'pink'});
                                    gameOverRef.current();
                                } else {
                                    engine.invincibilityFrames = 120;
                                    engine.combo = 1;
                                    engine.notifications.push({text: "INTEGRITY_COMPROMISED", life: 120, type: 'pink'});
                                    playSfx(engine, 150, 'sawtooth', 0.5, 0.4);
                                }
                            }
                        }
                    } else {
                        if (b.type === 'mine') {
                            let nearEnemy = engine.enemies.find((e:any) => e.type !== 'good' && Math.hypot(e.x - b.x, e.y - b.y) < 60 * engine.scale);
                            if (nearEnemy || b.life <= 0) {
                                createExplosion(engine, b.x, b.y, "255, 255, 0", 20);
                                engine.burstRadius = 80 * engine.scale; 
                                engine.enemies.forEach((e:any) => {
                                    if (e.type !== 'good' && Math.hypot(e.x - b.x, e.y - b.y) < 80 * engine.scale) e.hp -= b.dmg;
                                });
                                engine.bullets.splice(i, 1); hit = true;
                                playSfx(engine, 200, 'square', 0.2, 0.1);
                            }
                        } else {
                            for(let j=engine.enemies.length-1; j>=0; j--) {
                                let e = engine.enemies[j];
                                if (e.type !== 'good' && !e.isPhased && Math.hypot(e.x - b.x, e.y - b.y) < e.r + (3 * engine.scale)) {
                                    e.hp -= b.dmg;
                                    engine.stats.shotsHit++;
                                    createExplosion(engine, b.x, b.y, hexToRgb(b.color), 3);
                                    
                                    if (b.type === 'lightning') {
                                        let nearest = engine.enemies.find((e2:any) => e2 !== e && e2.type !== 'good' && Math.hypot(e2.x - e.x, e2.y - e.y) < 150 * engine.scale);
                                        if (nearest) {
                                            nearest.hp -= b.dmg * 0.8;
                                            engine.lightningArcs.push({x1: e.x, y1: e.y, x2: nearest.x, y2: nearest.y, life: 10});
                                        }
                                    }

                                    if (e.hp <= 0) {
                                        if (e.type === 'tank' || e.type === 'sniper' || e.type === 'boss') engine.hitStopFrames = e.type === 'boss' ? 10 : 3;
                                        if (e.type === 'tank') {
                                            for(let k=0; k<3; k++) engine.enemies.push({x: e.x, y: e.y, type: 'bad', hp: 1, speed: e.speed * 1.5, r: 8 * engine.scale, phaseTimer: 0, isPhased: false, state: 'moving', timer: 0});
                                        } else if (e.type === 'splitter') {
                                            for(let k=0; k<2; k++) engine.enemies.push({x: e.x, y: e.y, type: 'dasher', hp: 1, speed: e.speed * 1.2, r: 10 * engine.scale, phaseTimer: 0, isPhased: false, state: 'moving', timer: 0});
                                        } else if (e.type === 'boss') {
                                            engine.bossActive = false;
                                            engine.score += 5000;
                                            for(let k=0; k<15; k++) engine.enemies.push({x: e.x + (Math.random()-0.5)*50, y: e.y + (Math.random()-0.5)*50, type: 'good', speed: 1, r: 8*engine.scale});
                                            engine.notifications.push({text: "ANOMALY_PURGED", life: 240, type: 'cyan'});
                                        }
                                        
                                        engine.stats.kills++;
                                        createExplosion(engine, e.x, e.y, "255, 45, 85", e.type === 'boss' ? 50 : 10);
                                        spawnText(engine, e.x, e.y, Math.floor(10 * engine.combo).toString(), "#00f2ff");
                                        engine.enemies.splice(j, 1);
                                        engine.credits += e.type === 'boss' ? 50 : 2; 
                                        engine.score += 10 * engine.combo;
                                        engine.combo += 0.05;
                                        engine.overload = Math.min(100, engine.overload + 2);
                                        playSfx(engine, 400 + (engine.combo * 50), 'triangle', 0.1, 0.05);
                                    } else {
                                        playSfx(engine, 200, 'noise', 0.05, 0.02);
                                    }
                                    if (!b.pierce) hit = true;
                                    if (hit) break;
                                }
                            }
                        }
                    }
                    
                    if (hit || b.life <= 0 || b.x < 0 || b.x > engine.w || b.y < 0 || b.y > engine.h) {
                        engine.bullets.splice(i, 1);
                    } else if (b.type !== 'mine' && b.type !== 'blade') {
                        ctx.fillStyle = b.color;
                        ctx.beginPath(); ctx.arc(b.x, b.y, b.type==='flame' ? (1+(25-b.life)/5)*engine.scale : 3 * engine.scale, 0, Math.PI*2); ctx.fill();
                        if (b.type==='flame') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 1*engine.scale, 0, Math.PI*2); ctx.fill(); }
                        if (b.isEnemy) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); }
                    } else if (b.type === 'mine') {
                        ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, 5*engine.scale, 0, Math.PI*2); ctx.fill();
                        ctx.strokeStyle = `rgba(255,255,0,${Math.sin(b.life/10)*0.5+0.5})`; ctx.beginPath(); ctx.arc(b.x, b.y, 15*engine.scale, 0, Math.PI*2); ctx.stroke();
                    } else if (b.type === 'blade') {
                        ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, 4*engine.scale, 0, Math.PI*2); ctx.fill();
                        engine.bullets.push({x: b.x, y: b.y, vx:0, vy:0, life: 5, color: 'rgba(255,0,85,0.5)', dmg:0, pierce:true, isEnemy:false, type: 'trail'}); // fake trail
                    }
                }

                let spawnRate = 0.05 + (engine.score/50000) + (engine.lastSectorLevel * 0.01);
                if(Math.random() < spawnRate) spawn(engine);

                let decayRate = engine.upgrades.includes('combo') ? 0.002 : 0.005;
                if (engine.combo > 1) engine.combo = Math.max(1, engine.combo - decayRate * engine.timeSlow);

                for(let i=engine.enemies.length-1; i>=0; i--) {
                    let e = engine.enemies[i];
                    
                    if (e.x < 0 || e.x > engine.w || e.y < 0 || e.y > engine.h) {
                        let indX = Math.max(10, Math.min(engine.w-10, e.x));
                        let indY = Math.max(10, Math.min(engine.h-10, e.y));
                        ctx.fillStyle = e.type==='good' ? '#fff' : '#ff2d55';
                        ctx.beginPath(); ctx.arc(indX, indY, 3*engine.scale, 0, Math.PI*2); ctx.fill();
                    }
                    
                    if (e.type === 'sniper') {
                        if (e.state === 'moving') {
                            let targetX = e.x < engine.w/2 ? 50 * engine.scale : engine.w - 50 * engine.scale;
                            let targetY = e.y < engine.h/2 ? 50 * engine.scale : engine.h - 50 * engine.scale;
                            e.x += (targetX - e.x) * 0.02 * engine.timeSlow;
                            e.y += (targetY - e.y) * 0.02 * engine.timeSlow;
                            if (Math.hypot(targetX - e.x, targetY - e.y) < 10) e.state = 'aiming';
                        } else if (e.state === 'aiming') {
                            e.timer += engine.timeSlow;
                            ctx.strokeStyle = `rgba(255, 45, 85, ${Math.min(e.timer/100, 0.5)})`; ctx.lineWidth = 1;
                            ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(engine.player.x, engine.player.y); ctx.stroke();
                            if (e.timer > 120) { 
                                e.timer = 0; let ang = Math.atan2(engine.player.y - e.y, engine.player.x - e.x);
                                engine.bullets.push({x: e.x, y: e.y, vx: Math.cos(ang)*8*engine.scale, vy: Math.sin(ang)*8*engine.scale, dmg: 1, pierce: true, life: 200, color: '#ff2d55', isEnemy: true});
                                playSfx(engine, 600, 'sawtooth', 0.1, 0.05);
                            }
                        }
                    } else if (e.type === 'dasher') {
                        e.timer += engine.timeSlow;
                        if (e.timer < 60) {
                            let ang = Math.atan2(engine.player.y - e.y, engine.player.x - e.x);
                            e.x += Math.cos(ang) * (e.speed*0.5) * engine.timeSlow;
                            e.y += Math.sin(ang) * (e.speed*0.5) * engine.timeSlow;
                        } else if (e.timer === 60) {
                            e.dashAng = Math.atan2(engine.player.y - e.y, engine.player.x - e.x);
                        } else if (e.timer < 80) {
                            e.x += Math.cos(e.dashAng) * (e.speed*4) * engine.timeSlow;
                            e.y += Math.sin(e.dashAng) * (e.speed*4) * engine.timeSlow;
                            engine.particles.push({x:e.x,y:e.y,vx:0,vy:0,life:0.5,color:'255,45,85'});
                        } else { e.timer = 0; }
                    } else if (e.type === 'pulsar') {
                        e.timer += engine.timeSlow;
                        if (e.timer < 100) {
                            let ang = Math.atan2(engine.player.y - e.y, engine.player.x - e.x);
                            e.x += Math.cos(ang) * e.speed * engine.timeSlow;
                            e.y += Math.sin(ang) * e.speed * engine.timeSlow;
                        } else {
                            ctx.strokeStyle = `rgba(255,45,85,${1 - (e.timer-100)/50})`; ctx.lineWidth = 2;
                            ctx.beginPath(); ctx.arc(e.x, e.y, (e.timer-100)*2*engine.scale, 0, Math.PI*2); ctx.stroke();
                            if (Math.hypot(e.x - engine.player.x, e.y - engine.player.y) < (e.timer-100)*2*engine.scale && Math.hypot(e.x - engine.player.x, e.y - engine.player.y) > (e.timer-105)*2*engine.scale) {
                                if(engine.dashFrames <= 0 && engine.invincibilityFrames <= 0) {
                                    engine.lives--; engine.invincibilityFrames = 120; engine.combo = 1;
                                    createExplosion(engine, engine.player.x, engine.player.y, "255, 45, 85", 30);
                                    if(engine.lives<=0) gameOverRef.current();
                                }
                            }
                            if (e.timer > 150) e.timer = 0;
                        }
                    } else if (e.type === 'boss') {
                        e.timer += engine.timeSlow;
                        if (e.state === 'entering') {
                            e.y += 1 * engine.timeSlow;
                            if (e.y > 100 * engine.scale) e.state = 'attacking';
                        } else {
                            e.x += Math.cos(e.timer*0.02) * 2 * engine.timeSlow;
                            if (e.timer % 60 < 1) {
                                for(let i=0; i<Math.PI*2; i+=0.4) {
                                    engine.bullets.push({x: e.x, y: e.y, vx: Math.cos(i+e.timer*0.1)*5*engine.scale, vy: Math.sin(i+e.timer*0.1)*5*engine.scale, dmg: 1, pierce: true, life: 300, color: '#ff00ff', isEnemy: true});
                                }
                                playSfx(engine, 200, 'square', 0.2, 0.1);
                            }
                            if (e.timer % 200 < 1) {
                                spawn(engine); spawn(engine);
                            }
                        }
                    } else {
                        let ang = Math.atan2(engine.player.y - e.y, engine.player.x - e.x);
                        e.x += Math.cos(ang) * e.speed * engine.timeSlow;
                        e.y += Math.sin(ang) * e.speed * engine.timeSlow;
                    }

                    if (e.type === 'good' && engine.upgrades.includes('magnetism')) {
                        if (Math.hypot(e.x - engine.player.x, e.y - engine.player.y) < 120 * engine.scale) {
                            e.x += (engine.player.x - e.x) * 0.05 * engine.timeSlow;
                            e.y += (engine.player.y - e.y) * 0.05 * engine.timeSlow;
                        }
                    }

                    let isHittable = true;
                    if (e.type === 'good') {
                        if (e.isPowerup) {
                            ctx.fillStyle = e.powerupType === 'nuke' ? '#ff0000' : e.powerupType === 'shield' ? '#0000ff' : '#00ff00';
                        } else ctx.fillStyle = '#fff';
                    }
                    else if (e.type === 'tank') ctx.fillStyle = '#990000';
                    else if (e.type === 'sniper') ctx.fillStyle = '#ff00ff';
                    else if (e.type === 'dasher') ctx.fillStyle = '#ff8800';
                    else if (e.type === 'splitter') ctx.fillStyle = '#aa00aa';
                    else if (e.type === 'pulsar') ctx.fillStyle = '#00aaff';
                    else if (e.type === 'boss') ctx.fillStyle = '#ffffff';
                    else ctx.fillStyle = '#ff2d55';
                    
                    if (e.type === 'phasing') {
                        e.phaseTimer += engine.timeSlow * 0.016 * 60; 
                        let inRadius = Math.hypot(e.x - engine.player.x, e.y - engine.player.y) < 70 * engine.scale;
                        e.isPhased = (Math.floor(e.phaseTimer / 180) % 2 === 1) && !inRadius;
                        if (e.isPhased) { ctx.globalAlpha = 0.3; isHittable = false; }
                    }

                    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); ctx.fill();
                    ctx.globalAlpha = 1;
                    
                    if(e.type !== 'good' && e.hp > 1) {
                        ctx.strokeStyle = e.type === 'boss' ? '#ff00ff' : 'rgba(255, 45, 85, 0.5)';
                        ctx.lineWidth = 2 * engine.scale; ctx.stroke();
                        if (e.type === 'boss') {
                            ctx.fillStyle = '#333'; ctx.fillRect(engine.w/2 - 150, 20, 300, 10);
                            ctx.fillStyle = '#ff00ff'; ctx.fillRect(engine.w/2 - 150, 20, 300 * (e.hp/e.maxHp), 10);
                        }
                    }

                    const hitboxR = (engine.player.r - 2) * engine.scale;
                    const d = Math.hypot(e.x - engine.player.x, e.y - engine.player.y);
                    
                    if (d < e.r + hitboxR) {
                        if (e.type === 'good') {
                            engine.score += 50 * engine.combo;
                            engine.credits += 15;
                            engine.combo += 0.5;
                            engine.overload = Math.min(100, engine.overload + 5);
                            playSfx(engine, 600, 'sine', 0.2, 0.1);
                            createExplosion(engine, e.x, e.y, "255, 255, 255", 15);
                            
                            if (e.isPowerup) {
                                if (e.powerupType === 'nuke') {
                                    engine.notifications.push({text: "TACTICAL_NUKE", life: 120, type: 'pink'});
                                    playSfx(engine, 100, 'noise', 1.0, 0.5);
                                    engine.shake = 30 * engine.scale;
                                    engine.enemies.forEach((e2:any) => { if(e2.type!=='good') e2.hp = 0; });
                                } else if (e.powerupType === 'shield') {
                                    engine.notifications.push({text: "OVERSHIELD_ACTIVE", life: 120, type: 'cyan'});
                                    engine.invincibilityFrames = 600;
                                } else if (e.powerupType === 'rapid') {
                                    engine.notifications.push({text: "RAPID_FIRE_LINK", life: 120, type: 'cyan'});
                                    engine.overloadActiveFrames = 300;
                                }
                            }
                            
                            engine.enemies.splice(i, 1);
                            
                            engine.goodCollects.push(Date.now());
                            engine.goodCollects = engine.goodCollects.filter((t: number) => Date.now() - t < 2000);
                            if (engine.goodCollects.length >= 3) {
                                engine.goodCollects = []; engine.burstRadius = 150 * engine.scale;
                                engine.notifications.push({text: "SYNC_CHAIN_BURST", life: 120, type: 'cyan'});
                                playSfx(engine, 1200, 'square', 0.3, 0.1);
                                for(let j=engine.enemies.length-1; j>=0; j--) {
                                    let e2 = engine.enemies[j];
                                    if (e2.type !== 'good' && Math.hypot(e2.x - engine.player.x, e2.y - engine.player.y) < 150 * engine.scale) {
                                        e2.hp = 0; createExplosion(engine, e2.x, e2.y, "255, 45, 85", 5);
                                    }
                                }
                            }
                        } else if (isHittable && engine.dashFrames > 0) {
                            spawnText(engine, e.x, e.y, "PERFECT", "#00f2ff");
                            engine.score += 100 * engine.combo;
                            engine.overload = Math.min(100, engine.overload + 20);
                            e.hp = 0;
                            playSfx(engine, 800, 'triangle', 0.2, 0.1);
                        } else if (isHittable && engine.invincibilityFrames <= 0) {
                            let blocked = false;
                            if (engine.upgrades.includes('drones')) {
                                let availableDrone = engine.drones.find((d: any) => d.active);
                                if (availableDrone) {
                                    availableDrone.active = false; availableDrone.timer = 1200; blocked = true;
                                    engine.notifications.push({text: "DATA_STOLEN // BLOCKED", life: 120, type: 'green'});
                                    playSfx(engine, 300, 'noise', 0.2, 0.1);
                                    createExplosion(engine, e.x, e.y, "74, 222, 128", 15);
                                    engine.enemies.splice(i, 1);
                                }
                            }
                            if (!blocked) {
                                engine.lives--;
                                playSfx(engine, 100, 'sawtooth', 0.6, 0.3);
                                createExplosion(engine, engine.player.x, engine.player.y, "0, 242, 255", 30);
                                if (engine.lives <= 0) {
                                    engine.notifications.push({text: "CRITICAL_FAILURE", life: 120, type: 'pink'});
                                    gameOverRef.current();
                                } else {
                                    engine.invincibilityFrames = 120; engine.combo = 1;
                                    engine.notifications.push({text: "INTEGRITY_COMPROMISED", life: 120, type: 'pink'});
                                }
                            }
                        }
                    }
                }
                
                if (engine.burstRadius > 0) {
                    ctx.strokeStyle = `rgba(0, 242, 255, ${engine.burstRadius / (150 * engine.scale)})`;
                    ctx.lineWidth = 4 * engine.scale; ctx.beginPath();
                    ctx.arc(engine.player.x, engine.player.y, (150 * engine.scale) - engine.burstRadius, 0, Math.PI*2); ctx.stroke();
                    engine.burstRadius -= 5 * engine.scale;
                }

                if (engine.upgrades.includes('drones')) {
                    engine.drones.forEach((d: any) => {
                        if (!d.active) {
                            d.timer -= engine.timeSlow;
                            if (d.timer <= 0) { d.active = true; engine.notifications.push({text: "DRONE_RECOMPILED", life: 120, type: 'green'}); }
                        } else {
                            d.angle += 0.05 * engine.timeSlow;
                            let dx = engine.player.x + Math.cos(d.angle) * 20 * engine.scale;
                            let dy = engine.player.y + Math.sin(d.angle) * 20 * engine.scale;
                            ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(dx, dy, 3 * engine.scale, 0, Math.PI*2); ctx.fill();
                        }
                    });
                }

                if (engine.invincibilityFrames <= 0 || Math.floor(engine.invincibilityFrames / 10) % 2 === 0) {
                    ctx.fillStyle = WEAPONS[engine.equippedWeapon].color;
                    ctx.beginPath(); ctx.arc(engine.player.x, engine.player.y, engine.player.r * engine.scale, 0, Math.PI*2); ctx.fill();
                }
            }

            for(let i=engine.particles.length-1; i>=0; i--) {
                let p = engine.particles[i];
                p.x += p.vx * engine.timeSlow; p.y += p.vy * engine.timeSlow; p.life -= 0.03 * engine.timeSlow;
                if (p.life <= 0) engine.particles.splice(i, 1);
                else { ctx.fillStyle = `rgba(${p.color}, ${p.life})`; ctx.fillRect(p.x, p.y, 2 * engine.scale, 2 * engine.scale); }
            }

            for(let i=engine.grazeSparks.length-1; i>=0; i--) {
                let p = engine.grazeSparks[i];
                p.x += p.vx * engine.timeSlow; p.y += p.vy * engine.timeSlow; p.life -= 0.1 * engine.timeSlow;
                if (p.life <= 0) engine.grazeSparks.splice(i, 1);
                else { ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`; ctx.fillRect(p.x, p.y, 1 * engine.scale, 1 * engine.scale); }
            }

            for(let i=engine.lightningArcs.length-1; i>=0; i--) {
                let a = engine.lightningArcs[i];
                a.life -= engine.timeSlow;
                if (a.life <= 0) engine.lightningArcs.splice(i, 1);
                else {
                    ctx.strokeStyle = `rgba(0, 170, 255, ${a.life/10})`; ctx.lineWidth = 2 * engine.scale;
                    ctx.beginPath(); ctx.moveTo(a.x1, a.y1);
                    ctx.lineTo(a.x1 + (a.x2-a.x1)*0.5 + (Math.random()-0.5)*20, a.y1 + (a.y2-a.y1)*0.5 + (Math.random()-0.5)*20);
                    ctx.lineTo(a.x2, a.y2); ctx.stroke();
                }
            }

            for(let i=engine.floatingTexts.length-1; i>=0; i--) {
                let ft = engine.floatingTexts[i];
                ft.y += ft.vy * engine.timeSlow; ft.life -= engine.timeSlow;
                if (ft.life <= 0) engine.floatingTexts.splice(i, 1);
                else {
                    ctx.fillStyle = ft.color; 
                    ctx.globalAlpha = ft.life / 60;
                    ctx.font = ft.isHuman ? `bold ${16*engine.scale}px Caveat, cursive` : `bold ${12*engine.scale}px 'Share Tech Mono', monospace`;
                    ctx.fillText(ft.text, ft.x, ft.y);
                    ctx.globalAlpha = 1;
                }
            }

            if (engine.humanThought.life > 0) {
                engine.humanThought.life -= engine.timeSlow * 0.5;
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = Math.min(1, engine.humanThought.life / 60);
                ctx.font = `${24*engine.scale}px Caveat, cursive`;
                ctx.fillText(engine.humanThought.text, engine.humanThought.x, engine.humanThought.y);
                ctx.globalAlpha = 1;
            }

            if (engine.playing) {
                // UI updates via React state would be too slow here, so we manipulate DOM
                const e = document.getElementById('hud-score'); if(e) e.innerText = Math.floor(engine.score).toString().padStart(6, '0');
                const c = document.getElementById('hud-combo'); if(c) c.innerText = `SYNC: ${engine.combo.toFixed(1)}x`;
                const d = document.getElementById('hud-data'); if(d) d.innerText = `DATA: ${engine.credits}`;
                const o = document.getElementById('hud-overload'); 
                if(o) {
                    o.style.width = `${engine.overload}%`;
                    if (engine.overload >= 100) o.classList.add('bg-white', 'shadow-[0_0_10px_#fff]');
                    else o.classList.remove('bg-white', 'shadow-[0_0_10px_#fff]');
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <div className="relative w-screen h-screen bg-[#05070a] overflow-hidden select-none text-white" style={{fontFamily: "'Share Tech Mono', monospace"}}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Share+Tech+Mono&display=swap');
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.5); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #00f2ff; }
                .human-text { font-family: 'Caveat', cursive; }
            `}</style>

            <div className="fixed inset-0 pointer-events-none z-10" 
                style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%)', backgroundSize: '100% 4px' }} 
            />

            {gameState === 'playing' && (
                <>
                    <div className="absolute top-8 left-8 pointer-events-none drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] z-20">
                        <div id="hud-score" className="text-5xl md:text-7xl font-black leading-none bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent mb-2">000000</div>
                        <div id="hud-combo" className="text-cyan-400 text-sm md:text-base tracking-[4px] border-l-2 border-cyan-400 pl-3 mb-1">SYNC: 1.0x</div>
                        <div id="hud-data" className="text-pink-500 text-sm md:text-base tracking-[4px] border-l-2 border-pink-500 pl-3 mb-3">DATA: 0</div>
                        
                        <div className="flex space-x-1 mb-3">
                            {Array.from({length: engineRef.current.maxLives}).map((_, i) => (
                                <div key={i} className={`w-6 h-6 border ${i < engineRef.current.lives ? 'bg-pink-500 border-pink-400 shadow-[0_0_8px_#ff2d55]' : 'bg-transparent border-gray-700'}`}></div>
                            ))}
                        </div>

                        <div className="w-48 h-2 bg-gray-900 border border-gray-700 relative overflow-hidden">
                            <div id="hud-overload" className="h-full bg-cyan-400 transition-all duration-300 w-0"></div>
                        </div>
                        <div className="text-[10px] tracking-widest text-gray-400 mt-1">OVERLOAD [E] | DASH [R-CLICK] | PAUSE [ESC]</div>
                    </div>

                    <div className="absolute top-1/2 right-8 -translate-y-1/2 pointer-events-none z-20 flex flex-col items-end space-y-2 opacity-90">
                        {engineRef.current.notifications.map((n, i) => {
                            n.life--;
                            if (n.life <= 0) return null;
                            const col = n.type === 'pink' ? 'text-pink-400 border-pink-500/50' : n.type === 'green' ? 'text-green-400 border-green-500/50' : 'text-cyan-400 border-cyan-500/50';
                            return (
                                <div key={i} className={`text-xs md:text-sm tracking-widest bg-black/50 border px-3 py-1 ${col}`} style={{ opacity: Math.min(1, n.life / 30) }}>
                                    {n.text}
                                </div>
                            );
                        })}
                    </div>

                    {paused && (
                        <div className="absolute inset-0 bg-black/80 z-30 flex flex-col items-center justify-center backdrop-blur-sm">
                            <div className="text-6xl font-black text-cyan-400 tracking-[15px] mb-8">PAUSED</div>
                            <div className="human-text text-3xl text-white opacity-70 mb-8 transform -rotate-2">I need a minute...</div>
                            <button onClick={() => {engineRef.current.paused=false; setPaused(false); if(engineRef.current.masterFilter && engineRef.current.audioCtx) engineRef.current.masterFilter.frequency.setTargetAtTime(20000, engineRef.current.audioCtx.currentTime, 0.1); }} className="px-8 py-3 border border-cyan-400 text-cyan-400 hover:bg-cyan-900/30 tracking-widest">RESUME LINK</button>
                            <button onClick={gameOverRef.current} className="mt-4 px-8 py-3 border border-pink-500 text-pink-500 hover:bg-pink-900/30 tracking-widest">SEVER CONNECTION</button>
                        </div>
                    )}
                </>
            )}
            
            <div className="absolute bottom-5 right-5 text-pink-500 text-[10px] tracking-widest opacity-60 z-10 pointer-events-none flex flex-col items-end">
                <div>SYSTEM_ACTIVE // NEURAL_LINK_ESTABLISHED</div>
                <div className="human-text text-white text-lg mt-1 opacity-50">Is anyone reading this?</div>
            </div>

            {gameState === 'stats' && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center z-50 p-4">
                    <h1 className="text-4xl text-pink-500 tracking-[10px] mb-2 drop-shadow-[0_0_20px_rgba(255,45,85,0.4)]">LINK SEVERED</h1>
                    <div className="human-text text-2xl text-white opacity-70 mb-12 transform rotate-1">They found me...</div>
                    
                    <div className="bg-black/60 border border-gray-700 p-8 w-full max-w-2xl shadow-[0_0_30px_rgba(0,0,0,1)] flex flex-col gap-4">
                        <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400">FINAL SCORE</span><span className="text-2xl text-cyan-400">{stats.score}</span></div>
                        <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400">MAX SYNC</span><span className="text-white">{stats.maxCombo}x</span></div>
                        <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400">ENTITIES PURGED</span><span className="text-white">{stats.kills}</span></div>
                        <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400">NEAR MISSES (GRAZES)</span><span className="text-white">{stats.grazes}</span></div>
                        <div className="flex justify-between border-b border-gray-800 pb-2"><span className="text-gray-400">TARGETING ACCURACY</span><span className="text-white">{stats.acc}%</span></div>
                    </div>
                    
                    <button onClick={() => setGameState('menu')} className="mt-12 px-16 py-4 bg-cyan-400 text-black text-lg font-bold tracking-[8px] hover:bg-white transition-all hover:scale-105 active:scale-95">
                        RETURN TO KERNEL
                    </button>
                </div>
            )}

            {gameState === 'menu' && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-lg flex flex-col items-center justify-center z-50 p-4 overflow-y-auto">
                    
                    <div className="relative mb-8 text-center mt-10">
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-[10px] text-cyan-400 drop-shadow-[0_0_20px_rgba(0,242,255,0.4)]">NEURAL PULSE</h1>
                        <div className="human-text absolute -bottom-4 -right-12 text-2xl text-white transform -rotate-6 opacity-80">My Pulse</div>
                    </div>
                    
                    <div className="flex space-x-12 mb-6 text-sm tracking-widest text-gray-400">
                        <div>HIGH_SCORE: <span className="text-cyan-400">{highScore}</span></div>
                        <div>MAX_SYNC: <span className="text-cyan-400">{highCombo}x</span></div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl h-[65vh]">
                        <div className="flex-1 border border-cyan-500/30 bg-black/60 p-6 shadow-[0_0_40px_rgba(0,242,255,0.1)] flex flex-col">
                            <h2 className="text-lg md:text-xl mb-4 text-cyan-400 border-b border-cyan-500/30 pb-2 tracking-widest">SYSTEM CONFIG</h2>
                            
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="flex flex-col space-y-1">
                                    <label className="text-[10px] tracking-widest text-gray-400">RESOLUTION</label>
                                    <select value={resolution} onChange={e => { setResolution(parseFloat(e.target.value)); localStorage.setItem('np_res', e.target.value); }} className="bg-transparent border border-gray-700 text-white p-1 outline-none text-xs">
                                        <option className="bg-black" value="1">100% NATIVE</option>
                                        <option className="bg-black" value="0.75">75% SMOOTH</option>
                                        <option className="bg-black" value="0.5">50% RETRO</option>
                                    </select>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <label className="text-[10px] tracking-widest text-gray-400">VISUAL FX</label>
                                    <select value={glow} onChange={e => { setGlow(e.target.value); localStorage.setItem('np_glow', e.target.value); }} className="bg-transparent border border-gray-700 text-white p-1 outline-none text-xs">
                                        <option className="bg-black" value="high">ULTRA GLOW</option>
                                        <option className="bg-black" value="off">PERFORMANCE</option>
                                    </select>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <label className="text-[10px] tracking-widest text-gray-400">KINETIC SHAKE</label>
                                    <select value={shakeSetting} onChange={e => { setShakeSetting(e.target.value); localStorage.setItem('np_shake', e.target.value); }} className="bg-transparent border border-gray-700 text-white p-1 outline-none text-xs">
                                        <option className="bg-black" value="high">HIGH (IMMERSIVE)</option>
                                        <option className="bg-black" value="medium">MEDIUM</option>
                                        <option className="bg-black" value="none">OFF</option>
                                    </select>
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <label className="text-[10px] tracking-widest text-gray-400">CURSOR</label>
                                    <select value={cursorSetting} onChange={e => { setCursorSetting(e.target.value); localStorage.setItem('np_cursor', e.target.value); }} className="bg-transparent border border-gray-700 text-white p-1 outline-none text-xs">
                                        <option className="bg-black" value="crosshair">SYSTEM CROSSHAIR</option>
                                        <option className="bg-black" value="none">NEURAL BLIND</option>
                                    </select>
                                </div>
                            </div>

                            <button onClick={wipeSave} className="text-[10px] text-red-500 border border-red-900/50 hover:bg-red-900/30 p-2 mb-4 w-full text-center">FORMAT KERNEL (WIPE SAVE)</button>
                            
                            <div className="border-t border-cyan-500/30 pt-4 flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                                <h3 className="text-sm text-cyan-400 tracking-widest mb-3 flex justify-between"><span>PASSIVE MODULES</span><span className="human-text text-white opacity-50 normal-case">Help me survive...</span></h3>
                                {Object.entries(UPGRADES).map(([key, u]) => {
                                    const isUnlocked = unlockedUpgrades.includes(key);
                                    return (
                                        <div key={key} className={`flex flex-col p-2 border transition-colors ${isUnlocked ? 'border-cyan-400 bg-cyan-900/20' : 'border-gray-800 bg-black/40'}`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="font-bold text-[11px] tracking-wider" style={{color: u.color}}>{u.name}</div>
                                                {isUnlocked ? (
                                                    <span className="text-cyan-400 text-[9px] tracking-widest px-1">INSTALLED</span>
                                                ) : (
                                                    <button onClick={() => handleBuy(key, 'upgrade', u.cost)} disabled={credits < u.cost} className={`px-2 py-1 text-[9px] font-bold transition-all border ${credits >= u.cost ? 'border-pink-500 bg-pink-900/30 text-pink-400 hover:bg-pink-500 hover:text-white' : 'border-gray-800 text-gray-600 cursor-not-allowed'}`}>BUY: {u.cost}</button>
                                                )}
                                            </div>
                                            <div className="text-[9px] text-gray-400">{u.desc}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        
                        <div className="flex-1 border border-pink-500/30 bg-black/60 p-6 shadow-[0_0_40px_rgba(255,45,85,0.1)] flex flex-col">
                            <div className="flex justify-between items-end border-b border-pink-500/30 pb-2 mb-4 shrink-0">
                                <h2 className="text-lg md:text-xl text-pink-500 tracking-widest">ARSENAL</h2>
                                <div className="text-xs tracking-widest text-gray-400">DATA: <span className="text-white font-bold text-lg">{credits}</span></div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                {Object.entries(WEAPONS).map(([key, w]) => {
                                    const isUnlocked = unlockedWeapons.includes(key);
                                    const isEquipped = equippedWeapon === key;
                                    
                                    return (
                                        <div key={key} className={`flex justify-between items-center p-3 border transition-colors ${isEquipped ? 'border-cyan-400 bg-cyan-900/20' : 'border-gray-800 hover:border-gray-500 bg-black/40'}`}>
                                            <div>
                                                <div className="font-bold text-xs tracking-wider" style={{color: w.color}}>{w.name}</div>
                                                <div className="text-[9px] text-gray-400 mt-1">{w.desc}</div>
                                            </div>
                                            <div>
                                                {isEquipped ? (
                                                    <span className="text-cyan-400 text-[10px] tracking-widest px-2">EQUIPPED</span>
                                                ) : isUnlocked ? (
                                                    <button onClick={() => {setEquippedWeapon(key); localStorage.setItem('np_equipped', key)}} className="px-3 py-1 border border-gray-500 text-gray-300 text-[10px] hover:bg-gray-800 hover:text-white transition-colors">EQUIP</button>
                                                ) : (
                                                    <button onClick={() => handleBuy(key, 'weapon', w.cost)} disabled={credits < w.cost} className={`px-3 py-1 text-[10px] font-bold transition-all border ${credits >= w.cost ? 'border-pink-500 bg-pink-900/30 text-pink-400 hover:bg-pink-500 hover:text-white' : 'border-gray-800 bg-gray-900 text-gray-600 cursor-not-allowed'}`}>BUY: {w.cost}</button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={startGame} 
                        className="mt-6 px-16 md:px-24 py-4 bg-cyan-400 text-black text-lg md:text-xl font-bold tracking-[8px] hover:bg-white transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] active:scale-95 shrink-0"
                    >
                        INITIALIZE LINK
                    </button>
                    <div className="human-text text-white mt-4 text-xl opacity-60 transform rotate-2">Ready to wake up?</div>
                </div>
            )}

            <canvas 
                ref={canvasRef} 
                className={`block w-full h-full object-cover ${gameState === 'playing' ? cursorSetting === 'none' ? 'cursor-none' : 'cursor-crosshair' : ''}`}
                onContextMenu={(e) => e.preventDefault()}
            />
        </div>
    );
}
/**
 * Zombie Cat — 3 Worlds × (3 Stages + Boss)
 * Active chase runner with gear, combat, and world bosses.
 */
(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const HUD = {
    root: document.getElementById("hud"),
    hp: document.getElementById("hp-fill"),
    hpNum: document.getElementById("hud-hp-num"),
    score: document.getElementById("hud-score"),
    level: document.getElementById("hud-level"),
    slotClaws: document.getElementById("slot-claws"),
    slotFire: document.getElementById("slot-fire"),
    slotShield: document.getElementById("slot-shield"),
    ammo: document.getElementById("ammo-label"),
    shield: document.getElementById("shield-label"),
    objective: document.getElementById("hud-objective"),
  };

  const screens = {
    title: document.getElementById("screen-title"),
    select: document.getElementById("screen-select"),
    pause: document.getElementById("screen-pause"),
    level: document.getElementById("screen-level"),
    lose: document.getElementById("screen-lose"),
    win: document.getElementById("screen-win"),
  };

  const CATS = [
    { id: "white", name: "White Cat", role: "The Swift", style: "swift", speed: 4.8, jump: -12.6, meleeBonus: 0, blurb: "Fast silver runner." },
    { id: "red", name: "Red Cat", role: "The Brawler", style: "brawler", speed: 3.7, jump: -11.5, meleeBonus: 2, blurb: "Hard-hitting fighter." },
    { id: "black", name: "Black Cat", role: "The Shadow", style: "shadow", speed: 3.4, jump: -11.2, meleeBonus: 0, blurb: "Sneaky survivor." },
  ];

  const WORLDS = [
    { name: "Deserted Rooftops", difficulty: "Normal", scrollMul: 1.0 },
    { name: "Toxic Sewers", difficulty: "Hard", scrollMul: 1.2 },
    { name: "Ancient Egyptian Tombs", difficulty: "Extreme", scrollMul: 1.4 },
  ];

  const TOTAL_STAGES = 12; // 3 worlds × 4 (3 stages + boss)
  const PLAYER_MAX_HP = 100;
  const INVULN_FRAMES = 90;
  const CONTACT_DMG = 15;
  const SAFE_START_FRAMES = 120; // 2s — short; chase still forces action after
  const CHASE_BASE = 2.5;

  const keys = Object.create(null);
  let mouseLeft = false;
  let mouseRight = false;

  const state = {
    mode: "title",
    cat: null,
    progress: 0, // 0..11
    clearedCount: 0, // levels cleared this run (for scaling)
    score: 0,
    gear: { claws: false, fire: false, ammo: 0, shield: 0, shieldOwned: false },
    cameraX: 0,
    cameraY: 0,
    player: null,
    platforms: [],
    ladders: [],
    entities: [],
    projectiles: [],
    enemyShots: [],
    particles: [],
    floats: [],
    hazards: [],
    chase: null,
    boss: null,
    goal: null,
    attackT: 0,
    slashT: 0,
    invuln: 0,
    t: 0,
    autoScroll: false,
    scrollSpeed: 2.2,
    levelW: 3600,
    levelH: 540,
    stars: [],
    winParts: [],
    stats: { time: 0, damage: 0 },
    cleared: false,
    goalHintT: 0,
    objective: "",
    runStart: 0,
    safeStart: 0,
    tempHits: 0,
    isBoss: false,
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const aabb = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function worldOf(p) { return Math.floor(p / 4); }
  function stageOf(p) { return p % 4; } // 0..2 stage, 3 boss
  function isBossProgress(p) { return stageOf(p) === 3; }

  function progressLabel(p) {
    const w = worldOf(p) + 1;
    if (isBossProgress(p)) return `WORLD ${w} BOSS`;
    return `World ${w} - Stage ${stageOf(p) + 1}`;
  }

  function enemySpeedMul() {
    return Math.pow(1.1, state.clearedCount);
  }
  function hazardFreqMul() {
    return Math.pow(1.15, state.clearedCount);
  }
  function scrollMul() {
    return WORLDS[worldOf(state.progress)].scrollMul;
  }

  function showScreen(name) {
    Object.values(screens).forEach((el) => el.classList.add("hidden"));
    if (name && screens[name]) screens[name].classList.remove("hidden");
    const playing = state.mode === "play" || state.mode === "pause";
    HUD.root.classList.toggle("hidden", !playing);
  }

  function floatText(x, y, text, color) {
    state.floats.push({ x, y, text, color, life: 55, vy: -1.35 });
  }

  function burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      state.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 5 - 0.5,
        life: 20 + Math.random() * 30,
        color,
        size: 2 + Math.random() * 3.5,
      });
    }
  }

  function clearInput() {
    Object.keys(keys).forEach((k) => { keys[k] = false; });
    mouseLeft = false;
    mouseRight = false;
  }

  function refreshObjective() {
    const w = worldOf(state.progress);
    const s = stageOf(state.progress);
    if (s === 3) {
      const names = ["Defeat Zombie Cat!", "Defeat Armored Zombie Cat!", "Defeat the Pharaoh King!"];
      state.objective = names[w];
    } else if (w === 0 && !state.gear.claws) {
      state.objective = "Jump gaps · fight mice · grab Iron Claws → EXIT";
    } else if (w === 0) {
      state.objective = "Iron Claws ready! Reach glowing EXIT →";
    } else if (w === 1 && !state.gear.fire) {
      state.objective = "Climb / jump · bats need F or X · grab Fire Tail → EXIT";
    } else if (w === 1) {
      state.objective = "Fire Tail ready! Reach EXIT →";
    } else if (w === 2 && !state.gear.shieldOwned) {
      state.objective = "Dodge spikes & boulders · grab Ankh Shield → EXIT";
    } else if (w === 2) {
      state.objective = "Ankh ready! Reach EXIT →";
    } else {
      state.objective = "Keep moving — chase never stops!";
    }
    updateHud();
  }

  function updateHud() {
    const p = state.player;
    if (!p) return;
    HUD.hp.style.transform = `scaleX(${clamp(p.hp / p.maxHp, 0, 1)})`;
    if (HUD.hpNum) HUD.hpNum.textContent = String(Math.max(0, Math.ceil(p.hp)));
    HUD.score.textContent = String(state.score);
    HUD.level.textContent = progressLabel(state.progress);
    HUD.slotClaws.dataset.off = state.gear.claws ? "0" : "1";
    HUD.slotFire.dataset.off = state.gear.fire ? "0" : "1";
    HUD.slotShield.dataset.off = (state.gear.shieldOwned || state.gear.shield > 0 || state.tempHits > 0) ? "0" : "1";
    HUD.ammo.textContent = state.gear.fire ? String(state.gear.ammo) : "0";
    HUD.shield.textContent = state.gear.shieldOwned
      ? String(state.gear.shield)
      : (state.tempHits > 0 ? String(state.tempHits) : "0");
    if (HUD.objective) HUD.objective.textContent = state.objective;
  }

  // ---------- DRAW HELPERS ----------
  function roundPath(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawHeroCat(c, x, y, facing, style, t, opts = {}) {
    const s = opts.scale || 1;
    c.save();
    c.translate(x, y);
    c.scale(facing * s, s);

    if (style === "swift" && opts.moving) {
      c.globalAlpha = 0.35;
      for (let i = 1; i <= 3; i++) {
        c.fillStyle = "#7ec8ff";
        c.beginPath();
        c.ellipse(-18 - i * 10, 4, 10, 6, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    }
    if (style === "shadow") {
      const g = c.createRadialGradient(0, 4, 4, 0, 4, 38);
      g.addColorStop(0, "rgba(20,40,20,0.45)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, 4, 38, 0, Math.PI * 2);
      c.fill();
    }

    if (opts.shield > 0) {
      c.strokeStyle = "rgba(80,180,255,0.85)";
      c.fillStyle = "rgba(60,160,255,0.18)";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 2, 38 + Math.sin(t * 4) * 2, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    const body = style === "swift" ? "#f2f5fa" : style === "brawler" ? "#d44a22" : "#0d0d10";
    const belly = style === "swift" ? "#c8d4e4" : style === "brawler" ? "#f0a060" : "#1a1a22";

    c.strokeStyle = body;
    c.lineWidth = 7;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(-18, 6);
    c.quadraticCurveTo(-34, -4 + Math.sin(t * 6) * 5, -30, -20);
    c.stroke();
    if (opts.fireTail) {
      const fg = c.createLinearGradient(-30, -20, -18, 6);
      fg.addColorStop(0, "#ffcc44");
      fg.addColorStop(1, "#ff4400");
      c.strokeStyle = fg;
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(-18, 6);
      c.quadraticCurveTo(-36, -6 + Math.sin(t * 8) * 6, -32, -22);
      c.stroke();
    }

    c.fillStyle = body;
    roundPath(c, -20, -8, 42, 28, 12);
    c.fill();
    c.fillStyle = belly;
    roundPath(c, -8, 0, 20, 16, 8);
    c.fill();

    c.fillStyle = body;
    c.beginPath();
    c.arc(16, -14, 14, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(8, -22); c.lineTo(11, -36); c.lineTo(18, -22);
    c.moveTo(20, -22); c.lineTo(27, -36); c.lineTo(30, -20);
    c.fill();

    const eye = style === "swift" ? "#4dc4ff" : style === "brawler" ? "#ff6622" : "#39ff14";
    c.fillStyle = "#fff";
    c.beginPath();
    c.ellipse(12, -15, 3.6, 4.2, 0, 0, Math.PI * 2);
    c.ellipse(21, -15, 3.6, 4.2, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = eye;
    c.shadowColor = eye;
    c.shadowBlur = 8;
    c.beginPath();
    c.arc(13, -15, 2, 0, Math.PI * 2);
    c.arc(22, -15, 2, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;

    if (style === "brawler") {
      c.strokeStyle = "#5a1810";
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(18, -20);
      c.lineTo(24, -10);
      c.stroke();
    }

    c.fillStyle = "#e07a7a";
    c.beginPath();
    c.moveTo(16, -11); c.lineTo(14.5, -8); c.lineTo(17.5, -8);
    c.fill();

    c.fillStyle = body;
    const step = opts.grounded ? Math.sin(t * 10) * 3 : 2;
    roundPath(c, -16, 16, 8, 10 + step * 0.2, 3); c.fill();
    roundPath(c, -4, 16, 8, 10 - step * 0.2, 3); c.fill();
    roundPath(c, 8, 16, 8, 10 + step * 0.1, 3); c.fill();
    roundPath(c, 16, 16, 8, 10 - step * 0.1, 3); c.fill();
    c.restore();
  }

  function drawBossCat(c, x, y, facing, t, opts = {}) {
    c.save();
    c.translate(x, y);
    const sc = opts.scale || 1.9;
    c.scale(facing * sc, sc);

    if (opts.rage) {
      const g = c.createRadialGradient(0, 0, 10, 0, 0, 55);
      g.addColorStop(0, "rgba(255,40,40,0.45)");
      g.addColorStop(1, "rgba(255,0,0,0)");
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, 0, 55, 0, Math.PI * 2);
      c.fill();
    }

    let skin = opts.hurt ? "#8fbf7a" : "#6a8a62";
    if (opts.variant === "armored") skin = opts.hurt ? "#7a9a88" : "#4a6a58";
    if (opts.variant === "pharaoh") skin = opts.hurt ? "#9ab070" : "#5a7a48";

    c.fillStyle = skin;
    roundPath(c, -22, -10, 48, 32, 14);
    c.fill();
    c.fillStyle = "#4a5a48";
    roundPath(c, -8, 2, 22, 16, 8);
    c.fill();

    if (opts.variant === "armored") {
      c.strokeStyle = "#8a9aaa";
      c.lineWidth = 3;
      c.strokeRect(-18, -6, 40, 20);
      c.fillStyle = "#c0c8d0";
      c.fillRect(-6, -18, 20, 8);
    }

    if (opts.variant === "pharaoh" || opts.variant === "basic") {
      c.fillStyle = "#d4a017";
      c.beginPath();
      c.moveTo(4, -28); c.lineTo(18, -42); c.lineTo(34, -28); c.lineTo(36, -12); c.lineTo(2, -12);
      c.closePath();
      c.fill();
      c.fillStyle = "#1a3a6a";
      for (let i = 0; i < 4; i++) c.fillRect(6 + i * 7, -28, 4, 14);
    }

    c.fillStyle = skin;
    c.beginPath();
    c.arc(18, -16, 15, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = "#ff1020";
    c.shadowColor = "#ff0022";
    c.shadowBlur = 12;
    c.beginPath();
    c.ellipse(14, -16, 3.5, 4.5, 0, 0, Math.PI * 2);
    c.ellipse(24, -16, 3.5, 4.5, 0, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;

    c.fillStyle = skin;
    roundPath(c, -16, 18, 9, 12, 3); c.fill();
    roundPath(c, -2, 18, 9, 12, 3); c.fill();
    roundPath(c, 12, 18, 9, 12, 3); c.fill();
    roundPath(c, 22, 18, 9, 12, 3); c.fill();

    c.strokeStyle = skin;
    c.lineWidth = 8;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(-20, 8);
    c.quadraticCurveTo(-40, Math.sin(t * 4) * 6, -36, -18);
    c.stroke();

    if (opts.stun > 0) {
      c.fillStyle = "#ffe066";
      for (let i = 0; i < 3; i++) {
        const ang = t * 3 + i * ((Math.PI * 2) / 3);
        drawStar(c, Math.cos(ang) * 22, -42 + Math.sin(ang) * 6, 5, 2.5, 5);
      }
    }
    c.restore();
  }

  function drawStar(c, x, y, r, ri, points) {
    c.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rad = i % 2 === 0 ? r : ri;
      const a = (i * Math.PI) / points - Math.PI / 2;
      const px = x + Math.cos(a) * rad;
      const py = y + Math.sin(a) * rad;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
  }

  function drawZombieCatMinion(c, x, y, facing, t) {
    c.save();
    c.translate(x, y);
    c.scale(facing, 1);
    c.fillStyle = "#5a7a52";
    roundPath(c, -14, -8, 30, 22, 8);
    c.fill();
    c.beginPath();
    c.arc(10, -12, 9, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#ff2030";
    c.beginPath();
    c.arc(8, -13, 2, 0, Math.PI * 2);
    c.arc(13, -13, 2, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#5a7a52";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(-12, 4);
    c.quadraticCurveTo(-22, -6 + Math.sin(t * 5) * 3, -18, -14);
    c.stroke();
    c.restore();
  }

  function paintHudIcons() {
    const claws = document.getElementById("icon-claws").getContext("2d");
    claws.clearRect(0, 0, 28, 28);
    claws.strokeStyle = "#f0c14a";
    claws.lineWidth = 2.5;
    claws.lineCap = "round";
    claws.beginPath();
    claws.moveTo(6, 20); claws.lineTo(12, 6);
    claws.moveTo(12, 22); claws.lineTo(16, 6);
    claws.moveTo(18, 22); claws.lineTo(22, 8);
    claws.stroke();

    const fire = document.getElementById("icon-fire").getContext("2d");
    fire.clearRect(0, 0, 28, 28);
    fire.fillStyle = "#ff6622";
    fire.beginPath();
    fire.moveTo(14, 4);
    fire.quadraticCurveTo(22, 14, 14, 26);
    fire.quadraticCurveTo(6, 14, 14, 4);
    fire.fill();
    fire.fillStyle = "#ffcc44";
    fire.beginPath();
    fire.arc(14, 16, 4, 0, Math.PI * 2);
    fire.fill();

    const sh = document.getElementById("icon-shield").getContext("2d");
    sh.clearRect(0, 0, 28, 28);
    sh.fillStyle = "#4aa8ff";
    sh.beginPath();
    sh.moveTo(14, 4); sh.lineTo(24, 10); sh.lineTo(20, 24); sh.lineTo(14, 26); sh.lineTo(8, 24); sh.lineTo(4, 10);
    sh.closePath();
    sh.fill();
  }

  // ---------- RUN / LEVEL ----------
  function resetRun() {
    state.score = 0;
    state.gear = { claws: false, fire: false, ammo: 0, shield: 0, shieldOwned: false };
    state.stats = { time: 0, damage: 0 };
    state.progress = 0;
    state.clearedCount = 0;
    state.cleared = false;
    state.autoScroll = false;
    state.boss = null;
    state.chase = null;
    state.winParts = [];
    state.tempHits = 0;
    state.runStart = performance.now();
  }

  function makePlayer() {
    return {
      x: 120, y: 300, w: 40, h: 40,
      vx: 0, vy: 0, facing: 1,
      onGround: false, jumps: 0, maxJumps: 2,
      hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP,
      climbing: false,
    };
  }

  function clearWorld() {
    state.platforms = [];
    state.ladders = [];
    state.entities = [];
    state.projectiles = [];
    state.enemyShots = [];
    state.particles = [];
    state.floats = [];
    state.hazards = [];
    state.boss = null;
    state.goal = null;
    state.chase = null;
    state.attackT = 0;
    state.slashT = 0;
    state.invuln = 0;
    state.cameraX = 0;
    state.cameraY = 0;
    state.winParts = [];
    state.cleared = false;
    state.goalHintT = 0;
    state.autoScroll = false;
    state.scrollSpeed = 2.25;
    state.safeStart = 0;
    state.isBoss = false;
  }

  function inSafeStart() {
    return state.safeStart > 0;
  }

  function buildLevel(progress, opts = {}) {
    clearInput();
    clearWorld();
    state.progress = progress;
    state.mode = "play";
    state.isBoss = isBossProgress(progress);

    const prevHp = state.player ? state.player.hp : PLAYER_MAX_HP;
    state.player = makePlayer();
    if (opts.fullHeal || opts.freshPlayer) state.player.hp = PLAYER_MAX_HP;
    else state.player.hp = clamp(Math.max(prevHp, 1) + (opts.healBonus || 0), 1, PLAYER_MAX_HP);

    const p = state.player;
    p.vx = 0; p.vy = 0; p.jumps = 0; p.facing = 1;

    const w = worldOf(progress);
    const s = stageOf(progress);
    if (s === 3) {
      if (w === 0) buildBossZombieCat();
      else if (w === 1) buildBossArmored();
      else buildBossPharaoh();
    } else if (w === 0) buildRooftopStage(s);
    else if (w === 1) buildSewerStage(s);
    else buildTombStage(s);

    state.safeStart = state.isBoss ? 90 : SAFE_START_FRAMES;
    state.invuln = Math.max(state.invuln, 30);
    refreshObjective();
    updateHud();
  }

  function addFood(x, y) {
    state.entities.push({ type: "fish", x, y, w: 22, h: 18, alive: true, bob: Math.random() * 6 });
  }
  function addAmmo(x, y, n = 3) {
    state.entities.push({ type: "ammo", x, y, w: 20, h: 20, alive: true, bob: 0, amount: n });
  }
  function addMiniShield(x, y) {
    state.entities.push({ type: "miniShield", x, y, w: 26, h: 26, alive: true, bob: Math.random() * 6 });
  }

  /** Rooftop run — gaps REQUIRE jumps; standing still = fall or chase. */
  function buildRooftopStage(stage) {
    state.autoScroll = true;
    state.scrollSpeed = 2.0 * scrollMul();
    state.levelH = 540;
    state.stars = Array.from({ length: 45 }, () => ({
      x: Math.random() * 5000, y: 20 + Math.random() * 200, r: 0.5 + Math.random() * 1.4,
    }));

    const gapBase = 95 + stage * 12; // must jump
    const roofs = [];
    let x = 0;
    // Long start platform so player can orient — then forced gaps
    roofs.push({ x: 0, y: 420, w: 280 });
    x = 280 + gapBase;
    const counts = [10, 11, 12][stage];
    for (let i = 0; i < counts; i++) {
      const w = 140 + (i % 3) * 30 + (stage === 0 && i < 2 ? 40 : 0);
      const y = 300 + (i % 4) * 35 + (i % 2) * 20;
      roofs.push({ x, y: clamp(y, 260, 440), w });
      x += w + gapBase + (i % 2) * 15;
    }
    // EXIT roof
    roofs.push({ x, y: 380, w: 260 });
    state.levelW = x + 280;

    const hazEvery = Math.max(2, Math.floor(3 / hazardFreqMul()));
    roofs.forEach((r, i) => {
      state.platforms.push({ x: r.x, y: r.y, w: r.w, h: 18, roof: true });
      // Toxic puddles on some roofs (not start, not under gear/exit)
      if (i > 1 && i < roofs.length - 1 && i % hazEvery === 0) {
        state.hazards.push({
          type: "toxic",
          x: r.x + r.w * 0.3,
          y: r.y - 6,
          w: Math.min(50, r.w * 0.35),
          h: 10,
        });
      }
      // Roaming mice (+ occasional ammo)
      if (i > 1 && i < roofs.length - 1 && i % 2 === 1) {
        const spd = 0.55 * enemySpeedMul() * (Math.random() > 0.5 ? 1 : -1);
        state.entities.push({
          type: "mouse", x: r.x + 40, y: r.y - 22, w: 28, h: 20,
          vx: spd, hp: 15, maxHp: 15, alive: true, facing: Math.sign(spd) || 1,
          minX: r.x + 8, maxX: r.x + r.w - 36,
        });
      }
      if (i === 4 || i === 8) addAmmo(r.x + r.w * 0.5, r.y - 28, 2);
      if (i === 5) addFood(r.x + 50, r.y - 28);
      if (i === 7) addMiniShield(r.x + 60, r.y - 30);
    });

    // Iron Claws early in World 1 (Stage 1), clear platform — not on toxic
    if (stage === 0 && !state.gear.claws) {
      const clawRoof = roofs[Math.max(3, Math.floor(roofs.length * 0.45))];
      state.entities.push({
        type: "gear_claws", x: clawRoof.x + clawRoof.w * 0.4, y: clawRoof.y - 38, w: 32, h: 32, alive: true, bob: 0,
      });
    } else if (stage > 0 && !state.gear.claws) {
      const mid = roofs[Math.floor(roofs.length / 2)];
      state.entities.push({
        type: "gear_claws", x: mid.x + mid.w * 0.4, y: mid.y - 38, w: 32, h: 32, alive: true, bob: 0,
      });
    }

    const ep = roofs[roofs.length - 1];
    // Stage 1 teaches jumping; EXIT open. Later stages require claws.
    state.goal = { x: ep.x + ep.w - 70, y: ep.y - 72, w: 56, h: 72, need: stage >= 1 ? "claws" : null };
    state.player.x = 100;
    state.player.y = 380;
    state.chase = {
      type: "horde",
      x: -180,
      speed: CHASE_BASE * scrollMul(),
      width: 100,
    };
  }

  function buildSewerStage(stage) {
    state.autoScroll = true;
    state.scrollSpeed = 2.15 * scrollMul();
    state.levelH = 540;
    const gap = 88 + stage * 14;
    const plats = [];
    let x = 0;
    plats.push({ x: 0, y: 400, w: 240 });
    x = 240 + gap;
    const n = 11 + stage;
    for (let i = 0; i < n; i++) {
      const w = 100 + (i % 3) * 25; // smaller / slippery feel
      const y = 280 + (i % 5) * 28;
      plats.push({ x, y: clamp(y, 250, 430), w, slip: true });
      x += w + gap + 10;
    }
    plats.push({ x, y: 360, w: 240 });
    state.levelW = x + 260;

    plats.forEach((r, i) => {
      state.platforms.push({ x: r.x, y: r.y, w: r.w, h: 16, slip: !!r.slip });
      if (i > 1 && i < plats.length - 1 && i % Math.max(2, Math.floor(3 / hazardFreqMul())) === 0) {
        state.hazards.push({ type: "toxic", x: r.x + 10, y: r.y - 5, w: Math.min(40, r.w - 20), h: 8 });
      }
      if (i > 2 && i % 3 === 0) {
        state.entities.push({
          type: "bat",
          x: r.x + 20, y: r.y - 80, w: 28, h: 20,
          baseY: r.y - 80, phase: Math.random() * 6,
          hp: 12, maxHp: 12, alive: true,
        });
      }
      if (i === 4) addFood(r.x + 30, r.y - 28);
      if (i === 6) addAmmo(r.x + 40, r.y - 28, 4);
    });

    if (stage === 1 && !state.gear.fire) {
      const mid = plats[Math.floor(plats.length / 2)];
      state.entities.push({
        type: "gear_fire", x: mid.x + mid.w * 0.35, y: mid.y - 40, w: 34, h: 34, alive: true, bob: 0,
      });
    }

    const ep = plats[plats.length - 1];
    state.goal = { x: ep.x + ep.w - 70, y: ep.y - 72, w: 56, h: 72, need: stage >= 1 ? "fire" : null };
    state.player.x = 90;
    state.player.y = 360;
    state.chase = {
      type: "sludge",
      x: -200,
      y: 500,
      speed: CHASE_BASE * scrollMul(),
      width: 110,
      rise: 0.04,
    };
  }

  function buildTombStage(stage) {
    state.autoScroll = true;
    state.scrollSpeed = 2.3 * scrollMul();
    state.levelH = 540;
    const gap = 80 + stage * 16;
    const plats = [];
    let x = 0;
    plats.push({ x: 0, y: 420, w: 220 });
    x = 220 + gap;
    const n = 12 + stage;
    for (let i = 0; i < n; i++) {
      const w = 90 + (i % 2) * 30; // narrower safe areas
      const y = 290 + (i % 4) * 32;
      plats.push({ x, y: clamp(y, 260, 430), w });
      x += w + gap + 8;
    }
    plats.push({ x, y: 380, w: 240 });
    state.levelW = x + 260;

    const hazStep = Math.max(1, Math.floor(2 / hazardFreqMul()));
    plats.forEach((r, i) => {
      state.platforms.push({ x: r.x, y: r.y, w: r.w, h: 16 });
      if (i > 1 && i < plats.length - 1 && i % hazStep === 0) {
        state.hazards.push({ type: "spikes", x: r.x + 8, y: r.y - 12, w: Math.min(r.w - 16, 48), h: 14 });
      }
      if (i > 2 && i % 2 === 1) {
        const spd = 1.4 * enemySpeedMul() * (Math.random() > 0.5 ? 1 : -1);
        state.entities.push({
          type: "mummyRat", x: r.x + 20, y: r.y - 24, w: 30, h: 22,
          vx: spd, hp: 20, maxHp: 20, alive: true, facing: Math.sign(spd) || 1,
          minX: r.x + 4, maxX: r.x + r.w - 34,
        });
      }
      if (i === 5) addFood(r.x + 30, r.y - 28);
      if (i === 8) addMiniShield(r.x + 40, r.y - 30);
    });

    // Falling boulders with shadows
    const boulderCount = Math.floor(4 * hazardFreqMul()) + stage;
    for (let i = 0; i < boulderCount; i++) {
      state.hazards.push({
        type: "fallBoulder",
        x: 400 + i * 280 + Math.random() * 40,
        y: -40 - i * 30,
        w: 34, h: 34,
        vy: 0,
        shadowY: 460,
        cd: 40 + i * 35,
        falling: false,
        life: 9999,
      });
    }

    if (stage === 1 && !state.gear.shieldOwned) {
      const mid = plats[Math.floor(plats.length / 2)];
      state.entities.push({
        type: "gear_shield", x: mid.x + mid.w * 0.3, y: mid.y - 40, w: 36, h: 36, alive: true, bob: 0,
      });
    }

    const ep = plats[plats.length - 1];
    state.goal = { x: ep.x + ep.w - 70, y: ep.y - 72, w: 56, h: 72, need: stage >= 1 ? "shield" : null };
    state.player.x = 90;
    state.player.y = 380;
    state.chase = {
      type: "sandstorm",
      x: -220,
      speed: CHASE_BASE * scrollMul(),
      width: 120,
    };
  }

  function makeBossBase(hp, variant, name) {
    state.autoScroll = false;
    state.levelW = W;
    state.levelH = H;
    state.platforms.push({ x: 0, y: 460, w: W, h: 80 });
    state.platforms.push({ x: 80, y: 340, w: 140, h: 16 });
    state.platforms.push({ x: W - 220, y: 340, w: 140, h: 16 });
    state.platforms.push({ x: W / 2 - 70, y: 260, w: 140, h: 16 });
    state.player.x = 120;
    state.player.y = 400;
    state.chase = null;
    state.boss = {
      x: W - 220, y: 370, w: 70, h: 70,
      vx: -2.2, vy: 0, facing: -1,
      hp, maxHp: hp, alive: true,
      phase: "pace", timer: 80, stun: 0, hurt: 0,
      rage: false, beam: null, wave: null,
      variant, name,
    };
    if (state.gear.fire && state.gear.ammo < 12) state.gear.ammo = 12;
    if (variant === "pharaoh" && state.gear.shieldOwned && state.gear.shield < 2) state.gear.shield = 2;
  }

  function buildBossZombieCat() {
    makeBossBase(300, "basic", "ZOMBIE CAT");
    state.boss.vx = -2.0;
  }
  function buildBossArmored() {
    makeBossBase(500, "armored", "ARMORED ZOMBIE CAT");
    state.boss.vx = -2.8;
    state.boss.spitCd = 90;
  }
  function buildBossPharaoh() {
    makeBossBase(800, "pharaoh", "PHARAOH ZOMBIE KING");
    state.boss.vx = -2.4;
    state.boss.phaseMode = 1;
  }

  function hasNeed(need) {
    if (!need) return true;
    if (need === "claws") return !!state.gear.claws;
    if (need === "fire") return !!state.gear.fire;
    if (need === "shield") return !!(state.gear.shieldOwned || state.gear.shield > 0);
    return true;
  }

  // ---------- COMBAT ----------
  function meleeDamage(vsBoss) {
    let dmg = state.gear.claws ? 30 : 10;
    dmg += state.cat.meleeBonus || 0;
    if (vsBoss && state.boss && state.boss.stun > 0) dmg *= 2;
    return dmg;
  }
  function fireDamage() {
    return state.gear.fire ? 40 : 0;
  }

  function attackBox() {
    const p = state.player;
    const reach = state.gear.claws ? 62 : 48;
    return {
      x: p.facing > 0 ? p.x + p.w - 4 : p.x - reach + 4,
      y: p.y + 2,
      w: reach,
      h: 34,
    };
  }

  function doMelee() {
    if (state.mode !== "play" || state.attackT > 0) return;
    state.attackT = 14;
    state.slashT = 12;
    const box = attackBox();
    const vsBoss = !!(state.boss && state.boss.alive);
    const dmg = meleeDamage(vsBoss);
    for (const e of state.entities) {
      if (!e.alive) continue;
      if (["mouse", "zombie", "sewerRat", "bat", "mummyRat"].includes(e.type) && aabb(box, e)) {
        e.hp = (e.hp || 10) - dmg;
        if (e.hp <= 0) {
          e.alive = false;
          state.score += e.type === "bat" ? 25 : 20;
          burst(e.x, e.y, "#f0c14a", 10);
        } else floatText(e.x, e.y, `-${dmg}`, "#ffd56a");
      }
    }
    if (vsBoss && aabb(box, state.boss)) {
      hitBoss(dmg, state.gear.claws ? "claws" : "basic");
    }
  }

  function shootFire() {
    if (state.mode !== "play" || !state.gear.fire || state.gear.ammo <= 0) return;
    const p = state.player;
    state.gear.ammo--;
    state.projectiles.push({
      x: p.facing > 0 ? p.x + p.w : p.x - 16,
      y: p.y + 10,
      w: 18, h: 14,
      vx: p.facing * 9,
      life: 45,
      dmg: fireDamage(),
    });
    updateHud();
  }

  function hitBoss(dmg, source) {
    const b = state.boss;
    if (!b || !b.alive || state.mode !== "play" || dmg <= 0) return;
    b.hp = Math.max(0, b.hp - dmg);
    b.hurt = 12;
    state.stats.damage += dmg;
    floatText(b.x + 20, b.y, `-${dmg}`, source === "fire" ? "#ff8844" : "#ffd56a");
    burst(b.x + 30, b.y + 20, "#b6ff7a", 14);
    updateHud();
    if (b.hp <= 0) {
      b.alive = false;
      b.hp = 0;
      state.score += 500 + worldOf(state.progress) * 250;
      onBossDefeated();
    }
  }

  function collect(e) {
    if (!e.alive) return;
    e.alive = false;
    const p = state.player;
    if (e.type === "fish" || e.type === "meat") {
      p.hp = clamp(p.hp + 25, 0, p.maxHp);
      state.score += 15;
      floatText(e.x, e.y, "+25 HP", "#7dffa0");
      burst(e.x, e.y, "#e85d4c", 12);
    } else if (e.type === "ammo") {
      if (!state.gear.fire) {
        // Early ammo pickup still grants small pack after fire unlocked; stash as score if locked
        state.score += 5;
        floatText(e.x, e.y, "AMMO CACHE", "#ff8844");
      } else {
        state.gear.ammo += e.amount || 3;
        floatText(e.x, e.y, `+${e.amount || 3} FIRE`, "#ff8844");
      }
      burst(e.x, e.y, "#ff6622", 10);
    } else if (e.type === "miniShield") {
      state.tempHits = Math.max(state.tempHits, 1);
      floatText(e.x, e.y, "BLUE SHIELD!", "#4aa8ff");
      burst(e.x, e.y, "#4aa8ff", 14);
    } else if (e.type === "gear_claws") {
      state.gear.claws = true;
      floatText(e.x, e.y, "IRON CLAWS!", "#f0c14a");
      burst(e.x, e.y, "#f0c14a", 22);
      refreshObjective();
    } else if (e.type === "gear_fire") {
      state.gear.fire = true;
      state.gear.ammo += 14;
      floatText(e.x, e.y, "FIRE TAIL!", "#ff8844");
      burst(e.x, e.y, "#ff6622", 22);
      refreshObjective();
    } else if (e.type === "gear_shield") {
      state.gear.shieldOwned = true;
      state.gear.shield = 3;
      floatText(e.x, e.y, "ANKH SHIELD!", "#4aa8ff");
      burst(e.x, e.y, "#4aa8ff", 22);
      refreshObjective();
    }
    updateHud();
  }

  function hurt(amount, label) {
    if (state.invuln > 0 || state.mode !== "play" || inSafeStart()) return;
    const p = state.player;
    if (state.tempHits > 0) {
      state.tempHits--;
      state.invuln = INVULN_FRAMES;
      floatText(p.x, p.y - 22, "BLOCK!", "#4aa8ff");
      burst(p.x, p.y, "#4aa8ff", 14);
      updateHud();
      return;
    }
    if (state.gear.shieldOwned && state.gear.shield > 0) {
      state.gear.shield--;
      state.invuln = INVULN_FRAMES;
      floatText(p.x, p.y - 22, "SHIELD!", "#4aa8ff");
      burst(p.x, p.y, "#4aa8ff", 14);
      updateHud();
      return;
    }
    p.hp -= amount;
    state.invuln = INVULN_FRAMES;
    floatText(p.x, p.y - 12, label || `-${amount} HP`, "#ff6b6b");
    burst(p.x + 10, p.y, "#ff5a5a", 10);
    updateHud();
    if (p.hp <= 0) {
      p.hp = 0;
      clearInput();
      state.mode = "lose";
      showScreen("lose");
    }
  }

  function stageClear(msg) {
    clearInput();
    state.mode = "levelclear";
    state.cleared = true;
    state.clearedCount++;
    document.getElementById("level-title").textContent = progressLabel(state.progress) + " Cleared!";
    document.getElementById("level-text").textContent = msg || "Enemies grow fiercer…";
    showScreen("level");
  }

  function onBossDefeated() {
    clearInput();
    const w = worldOf(state.progress);
    if (w >= 2) {
      victory();
      return;
    }
    state.mode = "levelclear";
    state.cleared = true;
    state.clearedCount++;
    document.getElementById("level-title").textContent = `World ${w + 1} Boss Defeated!`;
    document.getElementById("level-text").textContent =
      w === 0 ? "Onto the Toxic Sewers…" : "Into the Ancient Tombs…";
    showScreen("level");
  }

  function victory() {
    clearInput();
    state.mode = "win";
    state.cleared = true;
    const bx = state.boss ? state.boss.x + 35 : W / 2;
    const by = state.boss ? state.boss.y + 20 : H / 2;
    state.winParts = [];
    for (let i = 0; i < 100; i++) {
      state.winParts.push({
        x: bx, y: by,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14 - 2,
        life: 70 + Math.random() * 50,
        color: ["#f0c14a", "#ff6b35", "#2dd4a8", "#4aa8ff", "#fff", "#ff4d6d"][i % 6],
        size: 2 + Math.random() * 4,
      });
    }
    const elapsed = Math.max(1, Math.floor((performance.now() - state.runStart) / 1000));
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    document.getElementById("win-text").innerHTML =
      `YOU WIN! All three worlds conquered!<br>Final Score: <strong>${state.score}</strong> · Time: <strong>${mins}:${secs.toString().padStart(2, "0")}</strong>`;
    showScreen("win");
  }

  function goToSelect() {
    clearInput();
    state.mode = "select";
    state.autoScroll = false;
    showScreen("select");
    buildSelect();
  }

  function advanceProgress() {
    const next = state.progress + 1;
    if (next >= TOTAL_STAGES) {
      victory();
      return;
    }
    showScreen(null);
    HUD.root.classList.remove("hidden");
    buildLevel(next, { healBonus: 25 });
  }

  // ---------- UPDATE ----------
  function updatePlayer() {
    const p = state.player;
    const cat = state.cat;
    let move = 0;
    if (keys.ArrowLeft || keys.a || keys.A) move -= 1;
    if (keys.ArrowRight || keys.d || keys.D) move += 1;

    p.climbing = false;
    if (keys.ArrowUp || keys.w || keys.W || keys.ArrowDown || keys.s || keys.S) {
      for (const lad of state.ladders) {
        if (aabb(p, lad)) {
          p.climbing = true;
          p.vy = 0;
          if (keys.ArrowUp || keys.w || keys.W) p.y -= 3.3;
          if (keys.ArrowDown || keys.s || keys.S) p.y += 3.3;
          p.x = lad.x - 6;
          break;
        }
      }
    }

    if (!p.climbing) {
      const holdingRight = keys.ArrowRight || keys.d || keys.D;
      const holdingLeft = keys.ArrowLeft || keys.a || keys.A;
      const sprinting = holdingRight && !holdingLeft;
      const sprintMul = sprinting ? 1.35 : 1;
      // Auto-scroll: still need active input — drifting alone is slower than chase
      if (state.autoScroll && move === 0) p.vx = state.scrollSpeed * 0.25;
      else p.vx = move * cat.speed * sprintMul;
      if (move) p.facing = move;
      else if (state.autoScroll) p.facing = 1;

      // Slippery platforms (sewers)
      if (p.onGround) {
        for (const pl of state.platforms) {
          if (pl.slip && aabb(p, pl)) {
            p.vx *= 0.92;
            break;
          }
        }
      }

      const jumpPressed = keys[" "] || keys.ArrowUp || keys.w || keys.W;
      if (jumpPressed && !keys._jumpLock) {
        if (p.onGround || p.jumps < p.maxJumps) {
          if (p.onGround) p.jumps = 0;
          p.vy = cat.jump * (p.jumps === 0 ? 1 : 0.92);
          p.jumps++;
          p.onGround = false;
          keys._jumpLock = true;
        }
      }
      if (!jumpPressed) keys._jumpLock = false;

      p.vy += 0.5;
      p.x += p.vx;
      p.y += p.vy;
    }

    if ((keys.f || keys.F || mouseLeft) && state.attackT <= 0) doMelee();
    if ((keys.x || keys.X || mouseRight) && !keys._fireLock) {
      shootFire();
      keys._fireLock = true;
    }
    if (!(keys.x || keys.X || mouseRight)) keys._fireLock = false;

    p.onGround = false;
    for (const pl of state.platforms) {
      if (!aabb(p, pl)) continue;
      const prevBottom = p.y - p.vy + p.h;
      if (p.vy >= 0 && prevBottom <= pl.y + 12) {
        p.y = pl.y - p.h;
        p.vy = 0;
        p.onGround = true;
        p.jumps = 0;
      }
    }

    if (state.autoScroll) {
      if (p.x > state.cameraX + W - 50) p.x = state.cameraX + W - 50;
      if (p.x + p.w < state.cameraX) {
        hurt(CONTACT_DMG, `-${CONTACT_DMG} HP`);
        if (state.mode === "play") respawnOnPlatform(state.cameraX + 140);
      }
      if (p.y > H + 40) {
        hurt(CONTACT_DMG, "Fell!");
        if (state.mode === "play") respawnOnPlatform(state.cameraX + W * 0.4);
      }
    } else {
      p.x = clamp(p.x, 0, state.levelW - p.w);
      if (p.y > H + 80) {
        hurt(CONTACT_DMG, "Fell!");
        if (state.mode === "play") {
          p.x = 120; p.y = 400; p.vx = 0; p.vy = 0;
          state.invuln = Math.max(state.invuln, INVULN_FRAMES);
        }
      }
    }
  }

  function respawnOnPlatform(preferX) {
    const p = state.player;
    let best = state.platforms[0];
    let bestDist = Infinity;
    for (const pl of state.platforms) {
      const cx = pl.x + pl.w * 0.5;
      const d = Math.abs(cx - preferX);
      if (d < bestDist && pl.x + pl.w > state.cameraX && pl.x < state.cameraX + W) {
        bestDist = d;
        best = pl;
      }
    }
    p.x = best.x + 24;
    p.y = best.y - p.h - 2;
    p.vx = 0; p.vy = 0; p.jumps = 0;
    state.invuln = Math.max(state.invuln, INVULN_FRAMES);
  }

  function updateEntities() {
    const p = state.player;
    for (const e of state.entities) {
      if (!e.alive) continue;
      if (e.type === "mouse" || e.type === "mummyRat" || e.type === "zombie" || e.type === "sewerRat") {
        e.x += e.vx;
        e.facing = Math.sign(e.vx) || e.facing;
        if (e.minX != null && e.maxX != null) {
          if (e.x < e.minX || e.x > e.maxX) e.vx *= -1;
        } else if (e.x < 40 || e.x > state.levelW - 40) e.vx *= -1;
        if (aabb(p, e)) hurt(CONTACT_DMG, `-${CONTACT_DMG} HP`);
      } else if (e.type === "bat") {
        e.phase = (e.phase || 0) + 0.08 * enemySpeedMul();
        e.y = e.baseY + Math.sin(e.phase) * 22;
        e.x += Math.sin(e.phase * 0.4) * 0.8;
        if (aabb(p, e)) hurt(CONTACT_DMG, `-${CONTACT_DMG} HP`);
      } else if (
        e.type === "fish" || e.type === "meat" || e.type === "ammo" ||
        e.type === "miniShield" || e.type.startsWith("gear_")
      ) {
        e.bob = (e.bob || 0) + 0.1;
        if (aabb(p, e)) collect(e);
      }
    }

    for (const h of state.hazards) {
      if (h.type === "toxic" || h.type === "spikes" || h.type === "neon" || h.type === "wire" || h.type === "spark" || h.type === "pipe") {
        if (aabb(p, h)) hurt(CONTACT_DMG, h.type === "spikes" ? "Spikes!" : "Toxic!");
      } else if (h.type === "fallBoulder") {
        if (!h.falling) {
          h.cd--;
          if (h.cd <= 0 && Math.abs(h.x - (p.x)) < 280) {
            h.falling = true;
            h.vy = 0;
          }
        } else {
          h.vy += 0.42;
          h.y += h.vy;
          if (h.y + h.h >= h.shadowY) {
            h.y = h.shadowY - h.h;
            h.falling = false;
            h.cd = 90 + Math.random() * 80;
            h.y = -40;
            burst(h.x, h.shadowY - 20, "#a89060", 8);
          }
          if (aabb(p, h)) hurt(CONTACT_DMG, "Boulder!");
        }
      } else if (h.type === "tombBoulder") {
        if (!h.landed) {
          h.vy += 0.38;
          h.y += h.vy;
          if (h.y + h.h >= h.shadowY) {
            h.y = h.shadowY - h.h;
            h.landed = true;
            burst(h.x, h.y, "#a89060", 10);
          }
        } else h.life--;
        if (h.life > 0 && aabb(p, h)) { hurt(CONTACT_DMG, `-${CONTACT_DMG} HP`); h.life = 0; }
      } else if (h.type === "floorWave") {
        h.life--;
        if (aabb(p, h)) hurt(CONTACT_DMG, "WAVE!");
      }
    }
    state.hazards = state.hazards.filter((h) => {
      if (h.type === "tombBoulder") return h.life > 0;
      if (h.type === "floorWave") return h.life > 0;
      return true;
    });

    for (const pr of state.projectiles) {
      pr.x += pr.vx;
      pr.life--;
      for (const e of state.entities) {
        if (!e.alive) continue;
        if (["mouse", "zombie", "sewerRat", "bat", "mummyRat"].includes(e.type) && aabb(pr, e)) {
          e.alive = false;
          pr.life = 0;
          state.score += 25;
          burst(e.x, e.y, "#ff8844", 12);
          floatText(e.x, e.y, "BOOM", "#ff8844");
        }
      }
      if (state.boss && state.boss.alive && aabb(pr, state.boss)) {
        hitBoss(pr.dmg || fireDamage(), "fire");
        pr.life = 0;
        burst(pr.x, pr.y, "#ff6622", 14);
      }
    }
    state.projectiles = state.projectiles.filter((pr) => pr.life > 0);

    for (const sh of state.enemyShots) {
      sh.x += sh.vx;
      sh.y += sh.vy || 0;
      sh.life--;
      if (aabb(p, sh)) {
        hurt(CONTACT_DMG, "Acid!");
        sh.life = 0;
      }
    }
    state.enemyShots = state.enemyShots.filter((s) => s.life > 0);

    state.entities = state.entities.filter((e) => e.alive !== false);

    if (state.goal && !state.cleared && state.mode === "play" && aabb(p, state.goal)) {
      if (hasNeed(state.goal.need)) {
        state.cleared = true;
        const msgs = [
          "Rooftops secured — keep running!",
          "Iron Claws humming — next rooftop!",
          "World 1 almost done — boss ahead!",
          "",
          "Sewers deepening…",
          "Fire Tail blazing!",
          "Armored boss awaits!",
          "",
          "Tombs closing in…",
          "Ankh Shield charged!",
          "Final boss ahead!",
          "",
        ];
        stageClear(msgs[state.progress] || "Stage clear!");
      } else if (state.goalHintT <= 0) {
        state.goalHintT = 90;
        floatText(p.x, p.y - 20, "Need gear first!", "#ffaa66");
      }
    }
    if (state.goalHintT > 0) state.goalHintT--;
  }

  function updateChase() {
    const c = state.chase;
    const p = state.player;
    if (!c || state.isBoss) return;

    if (inSafeStart()) {
      c.x = state.cameraX - c.width - 80;
      return;
    }

    // Constant forward pressure — standing still = caught in ~5s
    c.x += c.speed;
    // Soft lock near camera left so threat stays relevant on-screen
    const minX = state.cameraX - 40;
    const maxX = state.cameraX + 80;
    if (c.x < minX) c.x += Math.min(c.speed * 0.5, minX - c.x);
    if (c.x > maxX) c.x = maxX;

    if (c.type === "sludge" && typeof c.y === "number") {
      c.y = Math.max(420, c.y - (c.rise || 0.03));
    }

    if (p.x < c.x + c.width) {
      hurt(CONTACT_DMG, `-${CONTACT_DMG} HP`);
      p.x = Math.min(p.x + 90, state.cameraX + W - 60);
      p.vx = Math.max(p.vx, 5);
      state.invuln = Math.max(state.invuln, INVULN_FRAMES);
    }
  }

  function updateBoss() {
    const b = state.boss;
    if (!b || !b.alive) return;
    const p = state.player;
    if (b.hurt > 0) b.hurt--;
    if (b.stun > 0) b.stun--;
    b.rage = b.hp < b.maxHp * 0.5;
    b.timer--;

    if (b.beam) {
      b.beam.life--;
      if (aabb(p, b.beam)) hurt(CONTACT_DMG, "LASER!");
      if (b.beam.life <= 0) b.beam = null;
    }
    if (b.wave) {
      b.wave.x += b.wave.vx;
      b.wave.life--;
      if (aabb(p, b.wave)) hurt(CONTACT_DMG, "WAVE!");
      if (b.wave.life <= 0) b.wave = null;
    }

    // Armored acid spit
    if (b.variant === "armored") {
      b.spitCd = (b.spitCd || 0) - 1;
      if (b.spitCd <= 0 && b.stun <= 0) {
        b.spitCd = b.rage ? 50 : 75;
        const dir = Math.sign(p.x - b.x) || -1;
        state.enemyShots.push({
          x: b.x + b.w / 2, y: b.y + 20, w: 16, h: 16,
          vx: dir * 5.5, vy: -1.2 + Math.random(),
          life: 90,
        });
      }
    }

    if (b.stun > 0) return;

    if (b.phase === "pace") {
      const paceSpd = b.variant === "armored" ? 2.8 : b.variant === "pharaoh" ? 2.5 : 2.0;
      if (Math.abs(b.vx) < 0.5) b.vx = -paceSpd;
      b.x += b.vx;
      b.facing = Math.sign(b.vx) || b.facing;
      if (b.x < 70 || b.x > W - b.w - 70) b.vx *= -1;
      if (b.timer <= 0) {
        if (b.variant === "basic") {
          if (Math.random() < 0.6) {
            b.phase = "leap";
            b.vy = -13.5;
            b.vx = Math.sign(p.x - b.x) * 5.2;
            b.timer = 100;
          } else {
            b.timer = 50 + Math.random() * 40;
            // minion spawn
            state.entities.push({
              type: "mouse", x: b.x, y: 430, w: 28, h: 20,
              vx: Math.sign(p.x - b.x) * 1.5, hp: 15, maxHp: 15, alive: true, facing: 1,
              minX: 40, maxX: W - 60,
            });
          }
        } else if (b.variant === "armored") {
          if (Math.random() < 0.55) {
            b.phase = "leap";
            b.vy = -14;
            b.vx = Math.sign(p.x - b.x) * 6;
            b.timer = 100;
          } else b.timer = 40;
        } else {
          // Pharaoh: 3 phase toolkit by HP
          const pct = b.hp / b.maxHp;
          b.phaseMode = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3;
          const roll = Math.random();
          if (b.phaseMode === 1 || (b.phaseMode >= 1 && roll < 0.34)) {
            b.phase = "beam";
            b.timer = 28;
            b.beam = { x: 40, y: 410, w: W - 80, h: 28, life: 70 };
            floatText(W / 2, 160, "JUMP THE LASER!", "#39ff14");
          } else if (b.phaseMode === 2 || roll < 0.66) {
            b.phase = "wave";
            b.timer = 40;
            b.wave = { x: b.x, y: 440, w: 80, h: 24, vx: Math.sign(p.x - b.x) * 6, life: 100 };
            floatText(b.x, b.y - 20, "FLOOR WAVE!", "#ff8844");
          } else {
            b.phase = "traps";
            b.timer = 36;
            for (let i = 0; i < 4; i++) {
              state.hazards.push({
                type: "tombBoulder",
                x: 80 + Math.random() * (W - 160),
                y: -50 - i * 50,
                w: 36, h: 36, vy: 0, shadowY: 460, life: 200, landed: false,
              });
            }
            floatText(b.x, b.y - 20, "TOMB TRAPS!", "#ff6b6b");
          }
        }
      }
    } else if (b.phase === "leap") {
      b.vy += 0.52;
      b.x += b.vx;
      b.y += b.vy;
      if (b.y >= 370) {
        b.y = 370;
        b.vy = 0;
        b.phase = "pace";
        b.vx = Math.sign(p.x - b.x) * (b.variant === "armored" ? 2.8 : 1.9) || -1.9;
        b.timer = 70;
        b.stun = 100;
        floatText(b.x, b.y - 30, "STUNNED!", "#ffe066");
        burst(b.x + 30, b.y + 50, "#6a8a62", 16);
        if (b.variant === "basic" && Math.random() < 0.6) {
          for (let i = 0; i < 2; i++) {
            state.entities.push({
              type: "mouse", x: b.x + i * 30, y: 430, w: 28, h: 20,
              vx: Math.sign(p.x - b.x) * (1.2 + i * 0.3), hp: 12, maxHp: 12, alive: true, facing: 1,
              minX: 40, maxX: W - 60,
            });
          }
        }
      }
    } else if (b.phase === "beam" || b.phase === "wave" || b.phase === "traps") {
      if (b.timer <= 0) {
        b.phase = "pace";
        b.timer = 55;
      }
    }

    if (aabb(p, b)) hurt(CONTACT_DMG, `-${CONTACT_DMG} HP`);
  }

  function updateCamera() {
    const p = state.player;
    if (state.isBoss) {
      state.cameraX = 0;
      state.cameraY = 0;
    } else if (state.autoScroll) {
      state.cameraX += state.scrollSpeed;
      if (p.x - state.cameraX > W * 0.5) state.cameraX = p.x - W * 0.5;
      // Don't let camera outrun the level end too early
      state.cameraX = Math.min(state.cameraX, Math.max(0, state.levelW - W));
    } else {
      state.cameraX = clamp(p.x - W * 0.4, 0, Math.max(0, state.levelW - W));
      state.cameraY = 0;
    }
  }

  function update() {
    if (state.mode !== "play") return;
    state.t++;
    state.stats.time++;
    if (state.attackT > 0) state.attackT--;
    if (state.slashT > 0) state.slashT--;
    if (state.invuln > 0) state.invuln--;
    if (state.safeStart > 0) state.safeStart--;

    updatePlayer();
    updateEntities();
    updateChase();
    if (state.isBoss) updateBoss();
    updateCamera();

    for (const f of state.floats) { f.y += f.vy; f.life--; }
    state.floats = state.floats.filter((f) => f.life > 0);
    for (const q of state.particles) {
      q.x += q.vx; q.y += q.vy; q.vy += 0.12; q.life--;
    }
    state.particles = state.particles.filter((q) => q.life > 0);
  }

  // ---------- DRAW ----------
  function drawRooftopBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0a1220");
    g.addColorStop(0.55, "#1a2438");
    g.addColorStop(1, "#2a1820");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f0e8c8";
    for (const s of state.stars) {
      ctx.beginPath();
      ctx.arc((s.x - state.cameraX * 0.3) % (W + 40), s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#1a2030";
    for (let i = 0; i < 8; i++) {
      const bx = ((i * 220 - state.cameraX * 0.4) % (W + 220)) - 40;
      ctx.fillRect(bx, 180 + (i % 3) * 20, 90, 360);
    }
  }

  function drawSewerBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0c1814");
    g.addColorStop(1, "#1a3028");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(40,120,70,0.25)";
    ctx.fillRect(0, H - 80, W, 80);
    ctx.strokeStyle = "rgba(80,140,100,0.3)";
    for (let i = 0; i < 6; i++) {
      const x = ((i * 180 - state.cameraX * 0.5) % (W + 180));
      ctx.strokeRect(x, 40, 100, 80);
    }
  }

  function drawTombBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1a1408");
    g.addColorStop(1, "#3a2a14");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(200,160,60,0.12)";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 240 - state.cameraX * 0.35) % (W + 240));
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(x + 60, 120);
      ctx.lineTo(x + 120, H);
      ctx.fill();
    }
  }

  function drawArenaBg() {
    const w = worldOf(state.progress);
    if (w === 0) drawRooftopBg();
    else if (w === 1) drawSewerBg();
    else drawTombBg();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, W, H);
  }

  function drawPlatforms() {
    for (const pl of state.platforms) {
      const x = pl.x - state.cameraX;
      const y = pl.y - state.cameraY;
      if (x + pl.w < -20 || x > W + 20) continue;
      if (pl.roof) {
        ctx.fillStyle = "#3a4558";
        ctx.fillRect(x, y, pl.w, pl.h);
        ctx.fillStyle = "#ff6b35";
        ctx.fillRect(x, y, pl.w, 3);
      } else if (pl.slip) {
        ctx.fillStyle = "#2a4a3a";
        ctx.fillRect(x, y, pl.w, pl.h);
        ctx.fillStyle = "rgba(80,200,120,0.35)";
        ctx.fillRect(x, y, pl.w, 4);
      } else {
        ctx.fillStyle = "#5a4a32";
        ctx.fillRect(x, y, pl.w, pl.h);
        ctx.fillStyle = "#c4a060";
        ctx.fillRect(x, y, pl.w, 3);
      }
    }
    if (state.goal) {
      const g = state.goal;
      const x = g.x - state.cameraX;
      const y = g.y - state.cameraY;
      const pulse = 0.6 + Math.sin(state.t * 0.12) * 0.4;
      ctx.fillStyle = `rgba(80,255,160,${0.25 + pulse * 0.25})`;
      roundPath(ctx, x - 6, y - 6, g.w + 12, g.h + 12, 8);
      ctx.fill();
      ctx.fillStyle = "#2dd4a8";
      roundPath(ctx, x, y, g.w, g.h, 6);
      ctx.fill();
      ctx.fillStyle = "#0b1018";
      ctx.font = "bold 14px Exo 2";
      ctx.textAlign = "center";
      ctx.fillText("EXIT", x + g.w / 2, y + g.h / 2 + 5);
      ctx.textAlign = "left";
    }
  }

  function drawEntities() {
    for (const e of state.entities) {
      if (e.alive === false) continue;
      const x = e.x - state.cameraX;
      const y = e.y - state.cameraY + (e.bob ? Math.sin(e.bob) * 4 : 0);
      if (e.type === "zombie") drawZombieCatMinion(ctx, x + 16, y + 14, e.facing || -1, state.t * 0.05);
      else if (e.type === "mouse" || e.type === "mummyRat" || e.type === "sewerRat") {
        ctx.fillStyle = e.type === "mummyRat" ? "#d4c49a" : e.type === "mouse" ? "#8a6a4a" : "#6a4a32";
        roundPath(ctx, x, y, e.w, e.h, 6); ctx.fill();
        ctx.fillStyle = "#220";
        ctx.beginPath(); ctx.arc(x + e.w - 6, y + 6, 2, 0, Math.PI * 2); ctx.fill();
      } else if (e.type === "bat") {
        ctx.fillStyle = "#2a2030";
        ctx.beginPath();
        ctx.ellipse(x + 14, y + 10, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff4466";
        ctx.beginPath(); ctx.arc(x + 10, y + 8, 1.5, 0, Math.PI * 2); ctx.arc(x + 18, y + 8, 1.5, 0, Math.PI * 2); ctx.fill();
      } else if (e.type === "fish") {
        ctx.fillStyle = "#e85d4c";
        roundPath(ctx, x, y, e.w, e.h, 8); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(x + 16, y + 7, 2, 0, Math.PI * 2); ctx.fill();
      } else if (e.type === "ammo") {
        ctx.fillStyle = "#ff6622";
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 2);
        ctx.quadraticCurveTo(x + 20, y + 12, x + 10, y + 20);
        ctx.quadraticCurveTo(x, y + 12, x + 10, y + 2);
        ctx.fill();
      } else if (e.type === "miniShield") {
        ctx.fillStyle = "#4aa8ff";
        ctx.shadowColor = "#4aa8ff";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x + 13, y + 13, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (e.type === "gear_claws") {
        ctx.strokeStyle = "#f0c14a";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#f0c14a";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 24); ctx.lineTo(x + 10, y + 6);
        ctx.moveTo(x + 14, y + 26); ctx.lineTo(x + 16, y + 4);
        ctx.moveTo(x + 22, y + 24); ctx.lineTo(x + 24, y + 8);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#f0c14a";
        ctx.font = "bold 10px Exo 2";
        ctx.fillText("IRON", x + 2, y - 2);
      } else if (e.type === "gear_fire") {
        const fg = ctx.createRadialGradient(x + 16, y + 16, 2, x + 16, y + 16, 18);
        fg.addColorStop(0, "#ffcc44");
        fg.addColorStop(1, "#ff4400");
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(x + 16, y + 4);
        ctx.quadraticCurveTo(x + 30, y + 18, x + 16, y + 30);
        ctx.quadraticCurveTo(x + 2, y + 18, x + 16, y + 4);
        ctx.fill();
        ctx.fillStyle = "#ff8844";
        ctx.font = "bold 10px Exo 2";
        ctx.fillText("FIRE", x + 2, y - 2);
      } else if (e.type === "gear_shield") {
        ctx.fillStyle = "#4aa8ff";
        ctx.shadowColor = "#4aa8ff";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(x + 16, y + 4); ctx.lineTo(x + 28, y + 12); ctx.lineTo(x + 24, y + 28);
        ctx.lineTo(x + 16, y + 32); ctx.lineTo(x + 8, y + 28); ctx.lineTo(x + 4, y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#d8ecff";
        ctx.font = "bold 9px Exo 2";
        ctx.fillText("ANKH", x + 2, y - 2);
      }
    }

    for (const pr of state.projectiles) {
      const x = pr.x - state.cameraX;
      const y = pr.y - state.cameraY;
      const fg = ctx.createRadialGradient(x + 8, y + 6, 1, x + 8, y + 6, 12);
      fg.addColorStop(0, "#fff0a0");
      fg.addColorStop(1, "#ff4400");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(x + 8, y + 6, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const sh of state.enemyShots) {
      const x = sh.x - state.cameraX;
      const y = sh.y - state.cameraY;
      ctx.fillStyle = "#6dff6a";
      ctx.beginPath();
      ctx.arc(x + 8, y + 8, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHazards() {
    for (const h of state.hazards) {
      const x = h.x - state.cameraX;
      const y = (h.type === "fallBoulder" && !h.falling ? -20 : h.y) - state.cameraY;
      if (h.type === "toxic") {
        ctx.fillStyle = "rgba(60,200,80,0.55)";
        roundPath(ctx, x, y, h.w, h.h, 4); ctx.fill();
      } else if (h.type === "spikes") {
        ctx.fillStyle = "#c0c0c8";
        for (let i = 0; i < h.w; i += 10) {
          ctx.beginPath();
          ctx.moveTo(x + i, y + h.h);
          ctx.lineTo(x + i + 5, y);
          ctx.lineTo(x + i + 10, y + h.h);
          ctx.fill();
        }
      } else if (h.type === "fallBoulder" || h.type === "tombBoulder") {
        // Shadow warning
        const sy = (h.shadowY || 460) - state.cameraY;
        ctx.fillStyle = "rgba(180,40,40,0.35)";
        ctx.beginPath();
        ctx.ellipse(h.x - state.cameraX + h.w / 2, sy, h.w * 0.7, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        if (h.falling || h.type === "tombBoulder") {
          ctx.fillStyle = "#8a7050";
          ctx.beginPath();
          ctx.arc(h.x - state.cameraX + h.w / 2, h.y - state.cameraY + h.h / 2, h.w / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (h.type === "floorWave") {
        ctx.fillStyle = "rgba(255,120,40,0.55)";
        ctx.fillRect(x, y, h.w, h.h);
      }
    }
  }

  function drawChase() {
    const c = state.chase;
    if (!c || state.isBoss) return;
    if (c.type === "horde") {
      const base = c.x - state.cameraX;
      for (let i = 0; i < 5; i++) {
        drawZombieCatMinion(ctx, base + 20 + i * 18, 430 - (i % 2) * 8, 1, state.t * 0.08 + i);
      }
      ctx.fillStyle = "rgba(120,20,20,0.28)";
      ctx.fillRect(0, 0, Math.max(0, base + c.width), H);
    } else if (c.type === "sludge") {
      const base = c.x - state.cameraX;
      const g = ctx.createLinearGradient(base, 0, base + c.width, 0);
      g.addColorStop(0, "rgba(40,120,70,0.7)");
      g.addColorStop(1, "rgba(40,120,70,0)");
      ctx.fillStyle = g;
      ctx.fillRect(base, 0, c.width + 30, H);
    } else if (c.type === "sandstorm") {
      const x = c.x - state.cameraX;
      const g = ctx.createLinearGradient(x, 0, x + c.width, 0);
      g.addColorStop(0, "rgba(180,140,60,0.55)");
      g.addColorStop(1, "rgba(180,140,60,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, c.width + 40, H);
    }
  }

  function drawSlash() {
    if (state.slashT <= 0) return;
    const p = state.player;
    const t = state.slashT / 12;
    const reach = state.gear.claws ? 28 : 18;
    const cx = p.facing > 0 ? p.x - state.cameraX + p.w + 6 : p.x - state.cameraX - 6;
    const cy = p.y - state.cameraY + 16;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(p.facing, 1);
    ctx.strokeStyle = state.gear.claws
      ? `rgba(240,193,74,${0.45 + t * 0.55})`
      : `rgba(255,120,80,${0.35 + t * 0.6})`;
    ctx.lineWidth = state.gear.claws ? 5 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, reach, -1.1, 1.1);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlay() {
    const w = worldOf(state.progress);
    if (state.isBoss) drawArenaBg();
    else if (w === 0) drawRooftopBg();
    else if (w === 1) drawSewerBg();
    else drawTombBg();

    drawPlatforms();
    drawHazards();
    drawChase();
    drawEntities();

    if (state.boss && state.boss.alive) {
      const b = state.boss;
      if (b.beam) {
        ctx.fillStyle = "rgba(80,255,80,0.45)";
        ctx.fillRect(b.beam.x, b.beam.y, b.beam.w, b.beam.h);
      }
      if (b.wave) {
        ctx.fillStyle = "rgba(255,140,40,0.55)";
        ctx.fillRect(b.wave.x, b.wave.y, b.wave.w, b.wave.h);
      }
      drawBossCat(ctx, b.x + b.w / 2, b.y + b.h / 2, b.facing, state.t * 0.05, {
        hurt: b.hurt > 0,
        rage: b.rage,
        stun: b.stun,
        variant: b.variant,
      });
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(W / 2 - 210, 12, 420, 28);
      const pct = clamp(b.hp / b.maxHp, 0, 1);
      ctx.fillStyle = b.rage ? "#e23d3d" : "#6fbf73";
      ctx.fillRect(W / 2 - 208, 14, 416 * pct, 24);
      ctx.fillStyle = "#ead7b4";
      ctx.font = "bold 13px Exo 2";
      ctx.textAlign = "center";
      ctx.fillText(
        `${b.name}  ${Math.ceil(b.hp)}/${b.maxHp}${b.rage ? "  RAGE!" : ""}${b.stun > 0 ? "  STUNNED" : ""}`,
        W / 2, 32
      );
      ctx.textAlign = "left";
    }

    const p = state.player;
    if (!(state.invuln > 0 && Math.floor(state.invuln / 4) % 2 === 0)) {
      drawHeroCat(
        ctx,
        p.x - state.cameraX + p.w / 2,
        p.y - state.cameraY + p.h / 2,
        p.facing,
        state.cat.style,
        state.t * 0.05,
        {
          grounded: p.onGround,
          moving: Math.abs(p.vx) > 0.5,
          fireTail: state.gear.fire,
          shield: state.gear.shieldOwned ? state.gear.shield : state.tempHits,
        }
      );
    }
    drawSlash();

    for (const q of state.particles) {
      ctx.globalAlpha = clamp(q.life / 30, 0, 1);
      ctx.fillStyle = q.color;
      ctx.beginPath();
      ctx.arc(q.x - state.cameraX, q.y - state.cameraY, q.size, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const f of state.floats) {
      ctx.globalAlpha = clamp(f.life / 40, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = "bold 15px Exo 2";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x - state.cameraX, f.y - state.cameraY);
      ctx.textAlign = "left";
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(234,215,180,0.55)";
    ctx.font = "11px Exo 2";
    ctx.fillText("F/LMB claw · X/RMB fireball · Space jump · ESC pause", 12, H - 10);

    if (state.objective) {
      const bannerY = state.isBoss ? 48 : 10;
      ctx.fillStyle = "rgba(8,12,18,0.72)";
      roundPath(ctx, 12, bannerY, Math.min(620, W - 24), 34, 10);
      ctx.fill();
      ctx.fillStyle = "#ffe08a";
      ctx.font = "bold 14px Exo 2";
      ctx.fillText(state.objective, 24, bannerY + 22);
    }
  }

  function drawMenuBackdrop() {
    const saved = state.cameraX;
    state.cameraX = (state.t * 0.5) % 1000;
    drawRooftopBg();
    state.cameraX = saved;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(0, 0, W, H);
    if (state.cat) drawHeroCat(ctx, W / 2, H / 2 + 40, 1, state.cat.style, state.t * 0.05, { grounded: true });
    else {
      drawHeroCat(ctx, W / 2 - 120, H / 2 + 40, 1, "swift", state.t * 0.05, { grounded: true, moving: true });
      drawHeroCat(ctx, W / 2, H / 2 + 40, 1, "brawler", state.t * 0.05, { grounded: true });
      drawHeroCat(ctx, W / 2 + 120, H / 2 + 40, -1, "shadow", state.t * 0.05, { grounded: true });
    }
    state.t++;
  }

  function frame() {
    if (state.mode === "play") {
      update();
      if (state.mode === "play") drawPlay();
    } else if (state.mode === "pause") {
      drawPlay();
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, W, H);
    } else if (state.mode === "win") {
      drawTombBg();
      for (const q of state.winParts) {
        q.x += q.vx; q.y += q.vy; q.vy += 0.15; q.life--;
        ctx.globalAlpha = clamp(q.life / 40, 0, 1);
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size, 0, Math.PI * 2);
        ctx.fill();
      }
      state.winParts = state.winParts.filter((q) => q.life > 0);
      ctx.globalAlpha = 1;
    } else {
      drawMenuBackdrop();
    }
    requestAnimationFrame(frame);
  }

  // ---------- UI ----------
  function buildSelect() {
    const grid = document.getElementById("cat-grid");
    grid.innerHTML = "";
    const beginBtn = document.getElementById("btn-begin");
    beginBtn.disabled = !state.cat;
    CATS.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cat-card" + (state.cat && state.cat.id === cat.id ? " selected" : "");
      const cv = document.createElement("canvas");
      cv.width = 120; cv.height = 100;
      const c = cv.getContext("2d");
      c.fillStyle = "rgba(0,0,0,0.2)";
      c.fillRect(0, 0, 120, 100);
      drawHeroCat(c, 60, 55, 1, cat.style, 0, { grounded: true, moving: cat.style === "swift" });
      btn.appendChild(cv);
      const title = document.createElement("strong");
      title.textContent = cat.name;
      const role = document.createElement("span");
      role.className = "role";
      role.textContent = cat.role;
      const stats = document.createElement("span");
      stats.className = "stats";
      stats.innerHTML = `${cat.blurb}<br>SPD ${cat.speed.toFixed(1)} · HP ${PLAYER_MAX_HP}`;
      btn.appendChild(title);
      btn.appendChild(role);
      btn.appendChild(stats);
      btn.addEventListener("click", () => {
        state.cat = cat;
        document.querySelectorAll(".cat-card").forEach((el) => el.classList.remove("selected"));
        btn.classList.add("selected");
        beginBtn.disabled = false;
      });
      grid.appendChild(btn);
    });
  }

  function startGame() {
    clearInput();
    resetRun();
    showScreen(null);
    HUD.root.classList.remove("hidden");
    buildLevel(0, { freshPlayer: true, fullHeal: true });
  }

  document.getElementById("btn-start").addEventListener("click", () => {
    clearInput();
    state.mode = "select";
    showScreen("select");
    buildSelect();
  });
  document.getElementById("btn-begin").addEventListener("click", () => {
    if (state.cat) startGame();
  });
  document.getElementById("btn-resume").addEventListener("click", () => {
    clearInput();
    state.mode = "play";
    showScreen(null);
    HUD.root.classList.remove("hidden");
  });
  document.getElementById("btn-to-select").addEventListener("click", goToSelect);
  document.getElementById("btn-next").addEventListener("click", () => {
    clearInput();
    advanceProgress();
  });
  document.getElementById("btn-retry").addEventListener("click", () => {
    clearInput();
    showScreen(null);
    HUD.root.classList.remove("hidden");
    buildLevel(state.progress, { fullHeal: true });
  });
  document.getElementById("btn-lose-select").addEventListener("click", goToSelect);
  document.getElementById("btn-replay").addEventListener("click", goToSelect);

  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    if (e.key === "Escape") {
      if (state.mode === "play") {
        clearInput();
        state.mode = "pause";
        showScreen("pause");
      } else if (state.mode === "pause") {
        clearInput();
        state.mode = "play";
        showScreen(null);
        HUD.root.classList.remove("hidden");
      }
    }
  });
  window.addEventListener("keyup", (e) => { keys[e.key] = false; });
  window.addEventListener("blur", () => clearInput());

  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      mouseLeft = true;
      if (state.mode === "play") doMelee();
    } else if (e.button === 2) {
      mouseRight = true;
      if (state.mode === "play") shootFire();
    }
    e.preventDefault();
  });
  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) mouseLeft = false;
    if (e.button === 2) mouseRight = false;
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  paintHudIcons();
  showScreen("title");
  buildSelect();
  frame();
})();

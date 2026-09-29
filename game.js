/**
 * Zombie Cat — arcade Canvas prototype
 * 3 Worlds × (3 Stages + Boss), gear progression, chase pressure
 */
(() => {
  "use strict";

  const W = 960;
  const H = 540;
  const GROUND = H - 48;
  const GRAVITY = 0.55;
  const JUMP_CUT = 0.45;
  const COYOTE_MAX = 8;
  const JUMP_BUFFER = 8;
  const WALL_SLIDE = 1.15;
  const WALL_CLIMB = -3.2;
  const INVULN = 75;
  const SAFE_START = 90;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const HUD = {
    root: document.getElementById("hud"),
    hpFill: document.getElementById("hp-fill"),
    hpNum: document.getElementById("hud-hp-num"),
    score: document.getElementById("hud-score"),
    level: document.getElementById("hud-level"),
    objective: document.getElementById("hud-objective"),
    ammo: document.getElementById("ammo-label"),
    shield: document.getElementById("shield-label"),
    slotClaws: document.getElementById("slot-claws"),
    slotFire: document.getElementById("slot-fire"),
    slotShield: document.getElementById("slot-shield"),
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
    {
      id: "white",
      name: "White Cat",
      role: "The Swift",
      blurb: "Silver speedster with an electric dash trail.",
      speed: 5.4,
      jump: -13.2,
      melee: 10,
      maxHp: 100,
      defense: 0,
      style: "swift",
      stats: { speed: 95, melee: 55, defense: 40 },
    },
    {
      id: "red",
      name: "Red Cat",
      role: "The Brawler",
      blurb: "Crimson muscle with flame paws and a scar.",
      speed: 4.2,
      jump: -12.2,
      melee: 16,
      maxHp: 110,
      defense: 1,
      style: "brawler",
      stats: { speed: 60, melee: 95, defense: 55 },
    },
    {
      id: "black",
      name: "Black Cat",
      role: "The Shadow",
      blurb: "Deep black stealth with neon eyes and aura.",
      speed: 4.0,
      jump: -12.0,
      melee: 11,
      maxHp: 140,
      defense: 4,
      style: "shadow",
      stats: { speed: 50, melee: 65, defense: 95 },
    },
  ];

  const WORLD_META = [
    { name: "Deserted Rooftops", scroll: 2.1, chase: 2.6 },
    { name: "Toxic Sewers", scroll: 0, chase: 0 },
    { name: "Pharaoh's Tomb", scroll: 3.0, chase: 3.2 },
  ];

  const keys = Object.create(null);
  let mouseLeft = false;
  let mouseRight = false;
  let jumpHeld = false;
  let jumpPressedBuffer = 0;

  const state = {
    mode: "title", // title | select | play | pause | level | lose | win
    catId: null,
    cat: null,
    progress: 0, // 0..11
    score: 0,
    hp: 100,
    maxHp: 100,
    invuln: 0,
    safe: 0,
    gear: { claws: false, fire: false, ammo: 0, shield: 0, shieldOwned: false },
    player: null,
    platforms: [],
    hazards: [],
    enemies: [],
    pickups: [],
    projectiles: [],
    particles: [],
    floats: [],
    boulders: [],
    exit: null,
    boss: null,
    cameraX: 0,
    cameraY: 0,
    shake: 0,
    t: 0,
    acidY: H + 40,
    acidRise: 0,
    chaseX: -120,
    worldW: 3200,
    cleared: false,
    slash: null,
    objective: "",
  };

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function worldOf(p) {
    return Math.floor(p / 4);
  }

  function stageOf(p) {
    return p % 4;
  }

  function isBoss(p) {
    return stageOf(p) === 3;
  }

  function levelLabel(p) {
    const w = worldOf(p) + 1;
    if (isBoss(p)) return `WORLD ${w} - BOSS`;
    return `WORLD ${w} - STAGE ${stageOf(p) + 1}`;
  }

  function showScreen(name) {
    Object.keys(screens).forEach((k) => {
      screens[k].classList.toggle("hidden", k !== name);
    });
  }

  function hideScreens() {
    Object.keys(screens).forEach((k) => screens[k].classList.add("hidden"));
  }

  function clearInput() {
    Object.keys(keys).forEach((k) => {
      keys[k] = false;
    });
    mouseLeft = false;
    mouseRight = false;
    jumpHeld = false;
    jumpPressedBuffer = 0;
  }

  function updateHUD() {
    const pct = clamp((state.hp / state.maxHp) * 100, 0, 100);
    HUD.hpFill.style.width = `${pct}%`;
    HUD.hpNum.textContent = Math.ceil(state.hp);
    HUD.score.textContent = String(state.score);
    HUD.level.textContent = levelLabel(state.progress);
    HUD.objective.textContent = state.objective;
    HUD.ammo.textContent = String(state.gear.ammo);
    HUD.shield.textContent = String(state.gear.shield);
    HUD.slotClaws.dataset.off = state.gear.claws ? "0" : "1";
    HUD.slotFire.dataset.off = state.gear.fire ? "0" : "1";
    HUD.slotShield.dataset.off = state.gear.shieldOwned ? "0" : "1";
  }

  function setObjective() {
    const w = worldOf(state.progress);
    if (isBoss(state.progress)) {
      const names = [
        "Defeat the Zombie Cat King!",
        "Defeat the Armored Zombie Cat!",
        "Defeat the Ultimate Pharaoh King!",
      ];
      state.objective = names[w];
      return;
    }
    if (w === 0 && !state.gear.claws) state.objective = "Grab Iron Claws · reach EXIT";
    else if (w === 0) state.objective = "Iron Claws ready · reach glowing EXIT";
    else if (w === 1 && !state.gear.fire) state.objective = "Climb from acid · grab Fire Tail";
    else if (w === 1) state.objective = "Fire Tail ready · climb to EXIT";
    else if (w === 2 && !state.gear.shieldOwned) state.objective = "Dodge boulders · grab Ankh Shield";
    else state.objective = "Ankh ready · race to EXIT";
  }

  /* ---------- juice ---------- */
  function shake(n = 8) {
    state.shake = Math.max(state.shake, n);
  }

  function floatText(x, y, text, color = "#fff") {
    state.floats.push({ x, y, text, color, life: 50, vy: -1.2 });
  }

  function burst(x, y, color, n = 14, speed = 4) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(speed * 0.3, speed);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - rand(0, 2),
        life: rand(18, 36),
        max: 36,
        size: rand(2, 5),
        color,
        grav: 0.12,
      });
    }
  }

  function dustBurst(x, y) {
    burst(x, y, "#6a8a4a", 18, 5);
    burst(x, y, "#c8c0a0", 10, 3);
  }

  /* ---------- entities ---------- */
  function makePlayer() {
    const cat = state.cat;
    return {
      x: 120,
      y: GROUND - 40,
      w: 36,
      h: 40,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      onWall: 0,
      coyote: 0,
      jumps: 0,
      maxJumps: 2,
      attackCd: 0,
      fireCd: 0,
      trail: [],
    };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function platformAt(px, py, pw, ph) {
    return { x: px, y: py, w: pw, h: ph, type: "solid" };
  }

  /* ---------- level builders ---------- */
  function clearLevel() {
    state.platforms = [];
    state.hazards = [];
    state.enemies = [];
    state.pickups = [];
    state.projectiles = [];
    state.particles = [];
    state.floats = [];
    state.boulders = [];
    state.exit = null;
    state.boss = null;
    state.cleared = false;
    state.slash = null;
    state.cameraX = 0;
    state.cameraY = 0;
    state.acidY = H + 80;
    state.acidRise = 0;
    state.chaseX = -160;
  }

  function addEnemy(type, x, y) {
    const base =
      type === "bat"
        ? { w: 28, h: 22, hp: 18, speed: 1.6, score: 40 }
        : { w: 30, h: 22, hp: 22, speed: 1.3, score: 30 };
    state.enemies.push({
      type,
      x,
      y,
      w: base.w,
      h: base.h,
      hp: base.hp,
      maxHp: base.hp,
      vx: type === "bat" ? rand(-1, 1) : -base.speed,
      vy: 0,
      facing: -1,
      score: base.score,
      hurt: 0,
      phase: rand(0, Math.PI * 2),
      dead: false,
    });
  }

  function addPickup(kind, x, y) {
    state.pickups.push({ kind, x, y, w: 28, h: 28, bob: rand(0, 10) });
  }

  function buildRooftop(stage) {
    state.worldW = 2800 + stage * 220;
    state.platforms.push(platformAt(-40, GROUND, state.worldW + 80, 80));
    const gaps = 4 + stage;
    let x = 220;
    for (let i = 0; i < gaps; i++) {
      const gap = 90 + stage * 18 + (i % 2) * 20;
      const platW = 160 + (i % 3) * 40;
      // gap in floor via floating platforms instead
      state.platforms.push(platformAt(x, GROUND - 70 - (i % 2) * 40, 70, 18));
      state.platforms.push(platformAt(x + 100, GROUND - 130, 90, 18));
      // chimney
      state.platforms.push(platformAt(x + platW * 0.4, GROUND - 90, 36, 90));
      x += platW + gap;
      addEnemy("rat", x - 40, GROUND - 24);
      if (i % 2 === 0) addEnemy("rat", x + 60, GROUND - 24);
    }
    // spark hazards
    for (let i = 0; i < 3 + stage; i++) {
      state.hazards.push({
        type: "spark",
        x: 500 + i * 420,
        y: GROUND - 20,
        w: 24,
        h: 24,
        t: rand(0, 40),
      });
    }
    // Iron Claws early
    if (!state.gear.claws) addPickup("claws", 480, GROUND - 110);
    state.exit = { x: state.worldW - 140, y: GROUND - 70, w: 40, h: 70 };
    // floor gaps (damage zones)
    for (let i = 0; i < 5 + stage; i++) {
      const gx = 350 + i * 380;
      state.hazards.push({ type: "gap", x: gx, y: GROUND + 8, w: 80 + stage * 10, h: 60 });
    }
  }

  function buildSewer(stage) {
    state.worldW = 1600;
    // vertical climb — platforms going up-right
    state.platforms.push(platformAt(0, GROUND, 280, 40));
    let x = 80;
    let y = GROUND - 20;
    for (let i = 0; i < 14 + stage * 2; i++) {
      x += 70 + (i % 3) * 20;
      y -= 48 + (i % 2) * 10;
      const pw = 90 + (i % 4) * 16;
      state.platforms.push(platformAt(x, y, pw, 16));
      if (i % 3 === 0) {
        // pipe wall
        state.platforms.push(platformAt(x + pw - 12, y - 80, 14, 80));
      }
      if (i % 2 === 0) addEnemy(i % 4 === 0 ? "bat" : "rat", x + 20, y - 28);
      if (i % 5 === 2) {
        state.hazards.push({ type: "drip", x: x + pw * 0.5, y: y - 60, w: 10, h: 40, t: rand(0, 30) });
      }
    }
    state.worldW = Math.max(state.worldW, x + 300);
    state.acidY = H - 20;
    state.acidRise = 0.22 + stage * 0.04;
    if (!state.gear.fire) addPickup("fire", x - 180, y + 40);
    else addPickup("ammo", x - 120, y + 40);
    state.exit = { x: x + 40, y: y - 80, w: 40, h: 70 };
    state.platforms.push(platformAt(x + 10, y - 10, 120, 16));
  }

  function buildTomb(stage) {
    state.worldW = 3000 + stage * 250;
    state.platforms.push(platformAt(-40, GROUND, state.worldW + 80, 80));
    for (let i = 0; i < 8 + stage; i++) {
      const px = 280 + i * 280;
      state.platforms.push(platformAt(px, GROUND - 80 - (i % 3) * 35, 100, 16));
      state.platforms.push(platformAt(px + 140, GROUND - 140, 80, 16));
      addEnemy(i % 2 === 0 ? "rat" : "bat", px + 30, GROUND - 100);
      // spikes
      state.hazards.push({ type: "spikes", x: px + 90, y: GROUND - 16, w: 50, h: 16 });
    }
    if (!state.gear.shieldOwned) addPickup("shield", 700, GROUND - 160);
    state.exit = { x: state.worldW - 150, y: GROUND - 70, w: 40, h: 70 };
  }

  function buildBossArena(w) {
    state.worldW = 960;
    state.platforms = [platformAt(-20, GROUND, 1000, 80)];
    if (w === 0) {
      state.boss = {
        kind: "king",
        x: 680,
        y: GROUND - 90,
        w: 70,
        h: 90,
        hp: 300,
        maxHp: 300,
        vx: 0,
        vy: 0,
        facing: -1,
        phase: 1,
        cd: 60,
        hurt: 0,
        mode: "idle",
        timer: 0,
      };
    } else if (w === 1) {
      state.boss = {
        kind: "armored",
        x: 700,
        y: GROUND - 95,
        w: 76,
        h: 95,
        hp: 500,
        maxHp: 500,
        vx: 0,
        vy: 0,
        facing: -1,
        phase: 1,
        cd: 50,
        hurt: 0,
        mode: "idle",
        timer: 0,
      };
      state.acidY = H - 8;
      state.acidRise = 0;
    } else {
      state.boss = {
        kind: "pharaoh",
        x: 700,
        y: GROUND - 100,
        w: 80,
        h: 100,
        hp: 800,
        maxHp: 800,
        vx: 0,
        vy: 0,
        facing: -1,
        phase: 1,
        cd: 40,
        hurt: 0,
        mode: "idle",
        timer: 0,
      };
    }
  }

  function loadLevel(progress, keepPlayerPos) {
    clearLevel();
    state.progress = progress;
    state.safe = SAFE_START;
    state.invuln = 20;
    setObjective();

    const w = worldOf(progress);
    if (isBoss(progress)) buildBossArena(w);
    else if (w === 0) buildRooftop(stageOf(progress));
    else if (w === 1) buildSewer(stageOf(progress));
    else buildTomb(stageOf(progress));

    if (!state.player || !keepPlayerPos) {
      state.player = makePlayer();
      if (w === 1 && !isBoss(progress)) {
        state.player.x = 60;
        state.player.y = GROUND - 50;
      }
    } else {
      state.player.x = 100;
      state.player.y = GROUND - 50;
      state.player.vx = 0;
      state.player.vy = 0;
    }
    state.chaseX = state.player.x - 220;
    state.hp = Math.min(state.hp, state.maxHp);
    updateHUD();
  }

  /* ---------- combat ---------- */
  function hurtPlayer(dmg, srcX) {
    if (state.invuln > 0 || state.safe > 0 || state.mode !== "play") return;
    if (state.gear.shield > 0) {
      state.gear.shield -= 1;
      floatText(state.player.x, state.player.y - 10, "SHIELD!", "#6ec8ff");
      shake(6);
      burst(state.player.x + 18, state.player.y + 10, "#6ec8ff", 10, 3);
      state.invuln = 25;
      updateHUD();
      return;
    }
    const def = state.cat.defense || 0;
    const real = Math.max(4, dmg - def);
    state.hp -= real;
    state.invuln = INVULN;
    floatText(state.player.x + 10, state.player.y, `-${real}`, "#ff6b6b");
    shake(10);
    if (srcX != null) state.player.vx = srcX < state.player.x ? 4 : -4;
    state.player.vy = -5;
    updateHUD();
    if (state.hp <= 0) {
      state.hp = 0;
      die();
    }
  }

  function die() {
    clearInput();
    state.mode = "lose";
    HUD.root.classList.add("hidden");
    showScreen("lose");
  }

  function heal(n) {
    state.hp = Math.min(state.maxHp, state.hp + n);
    floatText(state.player.x, state.player.y - 8, `+${n} HP`, "#5dffb0");
    updateHUD();
  }

  function doSlash() {
    const p = state.player;
    if (p.attackCd > 0) return;
    p.attackCd = 16;
    const dmg = (state.gear.claws ? 25 : state.cat.melee) + (Math.random() < 0.15 ? 8 : 0);
    const crit = dmg > state.cat.melee + (state.gear.claws ? 25 : 0);
    const reach = state.gear.claws ? 58 : 44;
    state.slash = {
      x: p.facing > 0 ? p.x + p.w - 4 : p.x - reach + 4,
      y: p.y + 4,
      w: reach,
      h: 34,
      life: 8,
      facing: p.facing,
    };
    shake(state.gear.claws ? 7 : 4);
    const hitBox = state.slash;
    let hit = false;
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (rectsOverlap(hitBox, e)) {
        damageEnemy(e, dmg, crit);
        hit = true;
      }
    }
    if (state.boss && rectsOverlap(hitBox, state.boss)) {
      damageBoss(dmg, crit);
      hit = true;
    }
    if (hit) shake(5);
  }

  function shootFire() {
    const p = state.player;
    if (!state.gear.fire || state.gear.ammo <= 0 || p.fireCd > 0) return;
    p.fireCd = 18;
    state.gear.ammo -= 1;
    updateHUD();
    state.projectiles.push({
      type: "fire",
      x: p.x + (p.facing > 0 ? p.w : -10),
      y: p.y + 12,
      w: 16,
      h: 14,
      vx: p.facing * 9,
      vy: 0,
      life: 70,
      dmg: 28,
    });
  }

  function damageEnemy(e, dmg, crit) {
    e.hp -= dmg;
    e.hurt = 8;
    e.vx = state.player.facing * 3;
    floatText(e.x, e.y, crit ? "CRIT!" : `-${dmg}`, crit ? "#ffd078" : "#fff");
    if (e.hp <= 0) {
      e.dead = true;
      state.score += e.score;
      dustBurst(e.x + e.w / 2, e.y + e.h / 2);
      if (Math.random() < 0.2) heal(10);
      updateHUD();
    }
  }

  function damageBoss(dmg, crit) {
    const b = state.boss;
    if (!b || b.hp <= 0) return;
    b.hp -= dmg;
    b.hurt = 8;
    floatText(b.x, b.y, crit ? "CRIT!" : `-${dmg}`, crit ? "#ffd078" : "#ffe0a0");
    shake(8);
    if (b.kind === "pharaoh") {
      const ratio = b.hp / b.maxHp;
      b.phase = ratio < 0.33 ? 3 : ratio < 0.66 ? 2 : 1;
    }
    if (b.hp <= 0) {
      b.hp = 0;
      dustBurst(b.x + b.w / 2, b.y + b.h / 2);
      burst(b.x + 30, b.y + 40, "#ffd078", 28, 7);
      state.score += 500 + worldOf(state.progress) * 250;
      updateHUD();
      clearStage(true);
    }
  }

  function clearStage(bossKill) {
    if (state.cleared) return;
    state.cleared = true;
    clearInput();
    state.mode = "level";
    HUD.root.classList.add("hidden");
    const last = state.progress >= 11;
    if (last) {
      state.mode = "win";
      document.getElementById("win-text").textContent =
        `You cleared all three worlds! Score ${state.score}`;
      showScreen("win");
      return;
    }
    document.getElementById("level-title").textContent = bossKill ? "Boss Defeated!" : "Stage Clear!";
    document.getElementById("level-text").textContent = bossKill
      ? "Gear and HP carry forward. Ready for the next challenge?"
      : "Nice work — keep your gear for the next stage.";
    showScreen("level");
  }

  function advance() {
    state.progress += 1;
    if (state.progress > 11) {
      state.mode = "win";
      showScreen("win");
      return;
    }
    // small heal between stages
    heal(15);
    hideScreens();
    HUD.root.classList.remove("hidden");
    state.mode = "play";
    loadLevel(state.progress, false);
    clearInput();
    canvas.focus();
  }

  /* ---------- physics ---------- */
  function solidAt(x, y, w, h, ignore) {
    const box = { x, y, w, h };
    for (const p of state.platforms) {
      if (p === ignore) continue;
      if (rectsOverlap(box, p)) return p;
    }
    return null;
  }

  function moveActor(ent, dx, dy) {
    // horizontal
    ent.x += dx;
    let hit = solidAt(ent.x, ent.y, ent.w, ent.h);
    if (hit) {
      if (dx > 0) ent.x = hit.x - ent.w;
      else if (dx < 0) ent.x = hit.x + hit.w;
      ent.vx = 0;
      ent.onWall = dx > 0 ? 1 : -1;
    }
    // vertical
    ent.y += dy;
    hit = solidAt(ent.x, ent.y, ent.w, ent.h);
    ent.onGround = false;
    if (hit) {
      if (dy > 0) {
        ent.y = hit.y - ent.h;
        ent.onGround = true;
        ent.vy = 0;
        ent.jumps = 0;
        ent.coyote = COYOTE_MAX;
      } else if (dy < 0) {
        ent.y = hit.y + hit.h;
        ent.vy = 0;
      }
    }
  }

  function updatePlayer() {
    const p = state.player;
    const cat = state.cat;
    const left = keys.ArrowLeft || keys.a || keys.A;
    const right = keys.ArrowRight || keys.d || keys.D;
    const up = keys.ArrowUp || keys.w || keys.W;
    const down = keys.ArrowDown || keys.s || keys.S;

    p.onWall = 0;
    let move = 0;
    if (left) move -= 1;
    if (right) move += 1;
    if (move) p.facing = move;

    const target = move * cat.speed;
    p.vx += (target - p.vx) * 0.28;
    if (!move) p.vx *= 0.78;

    // wall climb / slide
    const wallL = solidAt(p.x - 2, p.y + 4, 2, p.h - 8);
    const wallR = solidAt(p.x + p.w, p.y + 4, 2, p.h - 8);
    if (!p.onGround && (wallL || wallR)) {
      p.onWall = wallL ? -1 : 1;
      if (up) p.vy = WALL_CLIMB;
      else if (p.vy > WALL_SLIDE) p.vy = WALL_SLIDE;
      if ((wallL && right) || (wallR && left)) {
        // wall jump kick
      }
    }

    if (p.onGround) p.coyote = COYOTE_MAX;
    else if (p.coyote > 0) p.coyote -= 1;

    if (jumpPressedBuffer > 0) {
      const canCoyote = p.coyote > 0;
      const canDouble = p.jumps > 0 && p.jumps < p.maxJumps && !p.onGround;
      const canWall = p.onWall !== 0;
      if (canCoyote || p.onGround || canDouble || canWall) {
        p.vy = cat.jump;
        if (canWall && !p.onGround) {
          p.vx = -p.onWall * cat.speed * 1.1;
          p.facing = -p.onWall;
        }
        p.jumps = p.onGround || canCoyote ? 1 : p.jumps + 1;
        p.coyote = 0;
        p.onGround = false;
        jumpPressedBuffer = 0;
      }
    }

    // variable jump
    if (!jumpHeld && p.vy < 0) p.vy *= JUMP_CUT;

    p.vy += GRAVITY;
    if (p.vy > 16) p.vy = 16;

    p.onGround = false;
    moveActor(p, p.vx, 0);
    moveActor(p, 0, p.vy);

    // gap fall (rooftops)
    for (const h of state.hazards) {
      if (h.type === "gap" && rectsOverlap(p, h) && p.y + p.h > GROUND - 2) {
        hurtPlayer(20, h.x);
        p.y = GROUND - p.h - 2;
        p.vy = -8;
      }
    }

    // bounds
    p.x = clamp(p.x, 0, state.worldW - p.w);
    if (p.y > H + 80) hurtPlayer(999, p.x);

    // trail for swift
    if (cat.style === "swift" && Math.abs(p.vx) > 2) {
      p.trail.push({ x: p.x + p.w / 2, y: p.y + p.h / 2, life: 12 });
      if (p.trail.length > 14) p.trail.shift();
    } else if (p.trail.length) p.trail.shift();

    if (p.attackCd > 0) p.attackCd -= 1;
    if (p.fireCd > 0) p.fireCd -= 1;
    if (jumpPressedBuffer > 0) jumpPressedBuffer -= 1;

    if (mouseLeft || keys.f || keys.F) doSlash();
    if (mouseRight || keys.x || keys.X) shootFire();
    mouseLeft = false;
    mouseRight = false;
  }

  function updateEnemies() {
    const p = state.player;
    for (const e of state.enemies) {
      if (e.dead) continue;
      e.phase += 0.08;
      if (e.hurt > 0) e.hurt -= 1;
      if (e.type === "bat") {
        e.x += Math.sin(e.phase) * e.vx + Math.sign(p.x - e.x) * 0.4;
        e.y += Math.cos(e.phase * 1.3) * 1.2;
      } else {
        e.vy += GRAVITY;
        const below = solidAt(e.x + 2, e.y + e.h, e.w - 4, 4);
        if (!below) e.vx *= -1;
        e.x += e.vx;
        e.y += e.vy;
        const hit = solidAt(e.x, e.y, e.w, e.h);
        if (hit) {
          e.y = hit.y - e.h;
          e.vy = 0;
        }
        e.facing = e.vx >= 0 ? 1 : -1;
      }
      if (rectsOverlap(e, p)) hurtPlayer(14, e.x);
    }
    state.enemies = state.enemies.filter((e) => !e.dead || e.hurt > 0);
  }

  function updateHazards() {
    const p = state.player;
    const w = worldOf(state.progress);
    for (const h of state.hazards) {
      h.t = (h.t || 0) + 1;
      if (h.type === "spark" && h.t % 50 < 18 && rectsOverlap(p, h)) hurtPlayer(12, h.x);
      if (h.type === "spikes" && rectsOverlap(p, h)) hurtPlayer(16, h.x);
      if (h.type === "drip" && h.t % 40 < 12) {
        const box = { x: h.x, y: h.y, w: 8, h: 50 };
        if (rectsOverlap(p, box)) hurtPlayer(10, h.x);
      }
    }

    // acid (W2)
    if (w === 1) {
      if (!isBoss(state.progress)) state.acidY -= state.acidRise;
      if (p.y + p.h > state.acidY) hurtPlayer(18, p.x);
    }

    // chase + camera (W1 / W3 stages)
    if ((w === 0 || w === 2) && !isBoss(state.progress)) {
      const meta = WORLD_META[w];
      const idle = Math.abs(p.vx) < 0.6 && p.onGround;
      state.chaseX += meta.chase * (idle ? 1.4 : 1);
      if (p.x < state.chaseX + 50) hurtPlayer(22, state.chaseX);
      // auto-scroll camera — keep pressure without soft-lock
      state.cameraX = Math.max(state.cameraX + meta.scroll * 0.25, p.x - 300);
      state.cameraX = clamp(state.cameraX, 0, Math.max(0, state.worldW - W));
      if (p.x < state.cameraX + 40) p.x = state.cameraX + 40;
    } else if (w === 1 && !isBoss(state.progress)) {
      state.cameraX = clamp(p.x - W * 0.35, 0, Math.max(0, state.worldW - W));
      state.cameraY = clamp(p.y - H * 0.55, -400, 0);
    } else {
      state.cameraX = clamp(p.x - W * 0.4, 0, Math.max(0, state.worldW - W));
      state.cameraY = 0;
    }

    // boulders W3
    if (w === 2 && !isBoss(state.progress) && state.t % 55 === 0) {
      state.boulders.push({
        x: state.cameraX + rand(100, W - 100),
        y: state.cameraY - 40,
        w: 34,
        h: 34,
        vy: 0,
        shadowY: GROUND - 4,
      });
    }
    for (const b of state.boulders) {
      b.vy += 0.35;
      b.y += b.vy;
      if (rectsOverlap(p, b)) hurtPlayer(20, b.x);
    }
    state.boulders = state.boulders.filter((b) => b.y < H + 60);
  }

  function updateBoss() {
    const b = state.boss;
    const p = state.player;
    if (!b || b.hp <= 0) return;
    if (b.hurt > 0) b.hurt -= 1;
    b.timer += 1;
    b.facing = p.x < b.x ? -1 : 1;
    b.cd -= 1;

    if (b.kind === "king") {
      if (b.cd <= 0) {
        b.mode = b.mode === "charge" ? "leap" : "charge";
        b.cd = b.mode === "charge" ? 70 : 50;
        b.timer = 0;
        if (b.mode === "leap") b.vy = -12;
      }
      if (b.mode === "charge") b.vx = b.facing * 4.5;
      else b.vx *= 0.9;
      b.vy += GRAVITY;
      moveActor(b, b.vx, 0);
      moveActor(b, 0, b.vy);
    } else if (b.kind === "armored") {
      if (b.cd <= 0) {
        b.cd = 55;
        // acid spit
        state.projectiles.push({
          type: "acid",
          x: b.x,
          y: b.y + 30,
          w: 18,
          h: 14,
          vx: b.facing * 6,
          vy: -2,
          life: 80,
          dmg: 18,
        });
        if (Math.random() < 0.5) addEnemy("rat", b.x - 40, GROUND - 24);
      }
      b.vx = Math.sin(state.t * 0.03) * 2.2;
      moveActor(b, b.vx, 0);
    } else if (b.kind === "pharaoh") {
      if (b.cd <= 0) {
        b.cd = b.phase === 3 ? 32 : b.phase === 2 ? 42 : 55;
        if (b.phase === 1) {
          // laser ground beam
          state.hazards.push({
            type: "laser",
            x: p.x - 10,
            y: GROUND - 12,
            w: 120,
            h: 12,
            life: 40,
            t: 0,
          });
        } else if (b.phase === 2) {
          state.boulders.push({
            x: p.x + rand(-40, 40),
            y: -30,
            w: 40,
            h: 40,
            vy: 0,
            shadowY: GROUND - 4,
          });
        } else {
          b.vx = b.facing * 9;
          b.vy = -6;
          b.mode = "pounce";
          b.timer = 0;
        }
      }
      if (b.mode === "pounce") {
        b.timer += 1;
        if (b.timer > 25) {
          b.mode = "idle";
          b.vx *= 0.5;
        }
      } else b.vx *= 0.92;
      b.vy += GRAVITY;
      moveActor(b, b.vx, 0);
      moveActor(b, 0, b.vy);
    }

    if (rectsOverlap(b, p)) hurtPlayer(22, b.x);

    // laser damage
    for (const h of state.hazards) {
      if (h.type === "laser") {
        h.life -= 1;
        h.t += 1;
        if (h.t > 10 && rectsOverlap(p, h)) hurtPlayer(16, h.x);
      }
    }
    state.hazards = state.hazards.filter((h) => h.type !== "laser" || h.life > 0);
  }

  function updateProjectiles() {
    for (const pr of state.projectiles) {
      pr.x += pr.vx;
      pr.y += pr.vy;
      pr.life -= 1;
      if (pr.type === "acid") pr.vy += 0.15;
      if (pr.type === "fire") {
        for (const e of state.enemies) {
          if (!e.dead && rectsOverlap(pr, e)) {
            damageEnemy(e, pr.dmg, false);
            burst(pr.x, pr.y, "#ff8844", 16, 4);
            pr.life = 0;
          }
        }
        if (state.boss && rectsOverlap(pr, state.boss)) {
          damageBoss(pr.dmg, false);
          burst(pr.x, pr.y, "#ff8844", 16, 4);
          pr.life = 0;
        }
      }
      if (pr.type === "acid" && rectsOverlap(pr, state.player)) {
        hurtPlayer(pr.dmg, pr.x);
        pr.life = 0;
      }
    }
    state.projectiles = state.projectiles.filter((pr) => pr.life > 0);
  }

  function updatePickups() {
    for (const pk of state.pickups) {
      pk.bob += 0.1;
      if (!rectsOverlap(state.player, pk)) continue;
      if (pk.kind === "claws") {
        state.gear.claws = true;
        floatText(pk.x, pk.y, "IRON CLAWS!", "#ffd078");
        shake(8);
      } else if (pk.kind === "fire") {
        state.gear.fire = true;
        state.gear.ammo += 12;
        floatText(pk.x, pk.y, "FIRE TAIL!", "#ff8844");
      } else if (pk.kind === "ammo") {
        state.gear.ammo += 8;
        floatText(pk.x, pk.y, "+AMMO", "#ff8844");
      } else if (pk.kind === "shield") {
        state.gear.shieldOwned = true;
        state.gear.shield = 3;
        floatText(pk.x, pk.y, "ANKH SHIELD!", "#6ec8ff");
      }
      pk.dead = true;
      setObjective();
      updateHUD();
      burst(pk.x, pk.y, "#fff", 12, 3);
    }
    state.pickups = state.pickups.filter((p) => !p.dead);
  }

  function updateExit() {
    if (!state.exit || state.cleared || state.boss) return;
    if (rectsOverlap(state.player, state.exit)) clearStage(false);
  }

  function updateJuice() {
    for (const pt of state.particles) {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += pt.grav || 0;
      pt.life -= 1;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const f of state.floats) {
      f.y += f.vy;
      f.life -= 1;
    }
    state.floats = state.floats.filter((f) => f.life > 0);
    if (state.slash) {
      state.slash.life -= 1;
      if (state.slash.life <= 0) state.slash = null;
    }
    if (state.shake > 0) state.shake *= 0.85;
    if (state.shake < 0.5) state.shake = 0;
  }

  /* ---------- drawing ---------- */
  function drawParallax(w) {
    const cam = state.cameraX;
    const camY = state.cameraY;
    if (w === 0) {
      // starry night
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#070b1c");
      g.addColorStop(1, "#1a1230");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#e8eefc";
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 97 + cam * 0.1) % W + W) % W;
        const sy = (i * 53) % (H * 0.55);
        ctx.globalAlpha = 0.4 + (i % 5) * 0.1;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
      // city silhouette
      ctx.fillStyle = "#12182a";
      const base = H * 0.55;
      for (let i = -1; i < 14; i++) {
        const bx = i * 90 - (cam * 0.35) % 90;
        const bh = 60 + ((i * 17) % 90);
        ctx.fillRect(bx, base - bh + (-camY) * 0.1, 70, bh + 40);
      }
      // rooftops layer hint
      ctx.fillStyle = "#2a1c28";
      ctx.fillRect(0, GROUND - camY - 4, W, H);
    } else if (w === 1) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0d1a12");
      g.addColorStop(1, "#1a2e18");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(40, 180, 60, 0.08)";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#5a4030";
      ctx.lineWidth = 10;
      for (let i = 0; i < 8; i++) {
        const px = i * 140 - (cam * 0.4) % 140;
        ctx.beginPath();
        ctx.moveTo(px, 40 - camY * 0.2);
        ctx.lineTo(px + 80, 120 - camY * 0.2);
        ctx.stroke();
      }
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#3a1840");
      g.addColorStop(0.45, "#c45a28");
      g.addColorStop(1, "#e8a040");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#2a1830";
      for (let i = -1; i < 6; i++) {
        const px = i * 220 - (cam * 0.3) % 220;
        ctx.beginPath();
        ctx.moveTo(px, H * 0.62);
        ctx.lineTo(px + 100, H * 0.35);
        ctx.lineTo(px + 200, H * 0.62);
        ctx.fill();
      }
      ctx.fillStyle = "#5a3a18";
      ctx.fillRect(0, GROUND - camY, W, H);
    }
  }

  function drawPlatforms(w) {
    for (const p of state.platforms) {
      const x = p.x - state.cameraX;
      const y = p.y - state.cameraY;
      if (x + p.w < -20 || x > W + 20) continue;
      if (w === 0) {
        ctx.fillStyle = "#6a3a2a";
        ctx.fillRect(x, y, p.w, p.h);
        ctx.fillStyle = "#8a5040";
        ctx.fillRect(x, y, p.w, 5);
        // bricks
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        for (let i = 0; i < p.w; i += 28) ctx.strokeRect(x + i, y, 28, p.h);
      } else if (w === 1) {
        ctx.fillStyle = "#3a4a40";
        ctx.fillRect(x, y, p.w, p.h);
        ctx.fillStyle = "#6a8a50";
        ctx.fillRect(x, y, p.w, 4);
        ctx.strokeStyle = "#2a3028";
        ctx.strokeRect(x, y, p.w, p.h);
      } else {
        ctx.fillStyle = "#c9a44a";
        ctx.fillRect(x, y, p.w, p.h);
        ctx.fillStyle = "#8a6030";
        ctx.fillRect(x, y + p.h - 4, p.w, 4);
        // torch glow on some
        if (p.w > 80) {
          ctx.fillStyle = "rgba(255,160,60,0.25)";
          ctx.beginPath();
          ctx.arc(x + 16, y - 10, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawCat(c, x, y, facing, style, t, opts = {}) {
    c.save();
    c.translate(x, y);
    if (facing < 0) c.scale(-1, 1);
    const sway = Math.sin(t * 0.12) * 4;
    // aura shadow
    if (style === "shadow") {
      c.fillStyle = "rgba(140, 80, 255, 0.28)";
      c.beginPath();
      c.ellipse(0, 8, 28, 22, 0, 0, Math.PI * 2);
      c.fill();
    }
    // body
    let body = "#f2f4f8";
    let eye = "#3ad0ff";
    if (style === "brawler") {
      body = "#c42828";
      eye = "#ffcc44";
    } else if (style === "shadow") {
      body = "#141418";
      eye = "#44ff66";
    } else {
      body = "#e8eef5";
      eye = "#3ad0ff";
    }
    c.fillStyle = body;
    c.beginPath();
    c.ellipse(0, 6, style === "brawler" ? 20 : 17, style === "brawler" ? 16 : 14, 0, 0, Math.PI * 2);
    c.fill();
    // head
    c.beginPath();
    c.ellipse(10, -10, 14, 12, 0, 0, Math.PI * 2);
    c.fill();
    // ears
    c.beginPath();
    c.moveTo(2, -18);
    c.lineTo(6, -30);
    c.lineTo(12, -18);
    c.moveTo(14, -18);
    c.lineTo(20, -30);
    c.lineTo(24, -16);
    c.fill();
    // eyes glow
    c.fillStyle = eye;
    c.shadowColor = eye;
    c.shadowBlur = 10;
    c.beginPath();
    c.ellipse(14, -11, 3.2, 3.8, 0, 0, Math.PI * 2);
    c.ellipse(22, -11, 3.2, 3.8, 0, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    c.fillStyle = "#0a0a12";
    c.beginPath();
    c.ellipse(15, -11, 1.2, 2, 0, 0, Math.PI * 2);
    c.ellipse(23, -11, 1.2, 2, 0, 0, Math.PI * 2);
    c.fill();
    // scar for brawler
    if (style === "brawler") {
      c.strokeStyle = "#5a1010";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(8, -14);
      c.lineTo(12, -6);
      c.stroke();
    }
    // paws flame
    if (style === "brawler") {
      c.fillStyle = "#ff8844";
      c.beginPath();
      c.ellipse(-8, 18, 6, 4, 0, 0, Math.PI * 2);
      c.ellipse(6, 18, 6, 4, 0, 0, Math.PI * 2);
      c.fill();
    }
    // tail
    c.strokeStyle = body;
    c.lineWidth = 6;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(-14, 4);
    c.quadraticCurveTo(-28, -10 + sway, -34, 8 + sway * 0.5);
    c.stroke();
    if (opts.fireTail) {
      c.strokeStyle = "#ff6622";
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(-30, 4 + sway * 0.3);
      c.quadraticCurveTo(-40, -6, -46, 6);
      c.stroke();
    }
    // shield sphere
    if (opts.shield) {
      c.strokeStyle = "rgba(100,180,255,0.85)";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 0, 30, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = "rgba(100,180,255,0.12)";
      c.fill();
    }
    c.restore();
  }

  function drawEnemy(e) {
    const x = e.x - state.cameraX + e.w / 2;
    const y = e.y - state.cameraY + e.h / 2;
    ctx.save();
    ctx.translate(x, y);
    if (e.facing < 0) ctx.scale(-1, 1);
    ctx.fillStyle = e.hurt ? "#a0c060" : "#4a6a28";
    if (e.type === "bat") {
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a5020";
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.quadraticCurveTo(-22, -14 + Math.sin(e.phase) * 4, -6, 4);
      ctx.moveTo(12, 0);
      ctx.quadraticCurveTo(22, -14 + Math.sin(e.phase) * 4, 6, 4);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 2, 14, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(10, -2, 8, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ff2244";
    ctx.shadowColor = "#ff2244";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(8, -4, 2.5, 0, Math.PI * 2);
    ctx.arc(14, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBoss(b) {
    const x = b.x - state.cameraX + b.w / 2;
    const y = b.y - state.cameraY + b.h / 2;
    ctx.save();
    ctx.translate(x, y);
    if (b.facing < 0) ctx.scale(-1, 1);
    const skin = b.hurt ? "#7a9a60" : "#3a5a28";
    // ribs
    ctx.fillStyle = "#d8d0c0";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-18, -10 + i * 12, 36, 4);
    }
    // body
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(0, 10, 32, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8, -28, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    // nemes headdress
    ctx.fillStyle = "#e0b020";
    ctx.beginPath();
    ctx.moveTo(-18, -40);
    ctx.lineTo(0, -58);
    ctx.lineTo(28, -36);
    ctx.lineTo(22, -18);
    ctx.lineTo(-14, -20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1a2040";
    ctx.fillRect(-8, -48, 24, 8);
    // eyes
    ctx.fillStyle = "#ff2030";
    ctx.shadowColor = "#ff2030";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(10, -30, 4, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(20, -30, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (b.kind === "armored") {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#8a9a88";
      ctx.lineWidth = 5;
      ctx.strokeRect(-26, -8, 52, 40);
    }
    if (b.kind === "pharaoh") {
      ctx.fillStyle = "#ffd700";
      ctx.fillRect(-6, -66, 12, 10);
    }
    ctx.restore();
    // HP bar
    const bx = b.x - state.cameraX;
    const by = b.y - state.cameraY - 18;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(bx, by, b.w, 8);
    ctx.fillStyle = "#ff4050";
    ctx.fillRect(bx, by, (b.hp / b.maxHp) * b.w, 8);
  }

  function drawPlayer() {
    const p = state.player;
    // dash trail
    if (state.cat.style === "swift") {
      for (const tr of p.trail) {
        ctx.globalAlpha = tr.life / 14;
        ctx.fillStyle = "#5ec8ff";
        ctx.beginPath();
        ctx.arc(tr.x - state.cameraX, tr.y - state.cameraY, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const blink = state.invuln > 0 && Math.floor(state.t / 3) % 2 === 0;
    if (blink) return;
    drawCat(
      ctx,
      p.x - state.cameraX + p.w / 2,
      p.y - state.cameraY + p.h / 2,
      p.facing,
      state.cat.style,
      state.t,
      { fireTail: state.gear.fire, shield: state.gear.shield > 0 }
    );
  }

  function drawSlash() {
    const s = state.slash;
    if (!s) return;
    const x = s.x - state.cameraX;
    const y = s.y - state.cameraY;
    ctx.save();
    ctx.translate(x + (s.facing > 0 ? 0 : s.w), y + s.h / 2);
    ctx.scale(s.facing, 1);
    ctx.strokeStyle = state.gear.claws ? "#ffd078" : "#e8eef8";
    ctx.shadowColor = state.gear.claws ? "#ffaa33" : "#a0c0ff";
    ctx.shadowBlur = 12;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, s.w * 0.7, -0.9, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(4, -4, s.w * 0.55, -0.7, 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(8, 4, s.w * 0.45, -0.5, 0.8);
    ctx.stroke();
    ctx.restore();
  }

  function drawPickups() {
    for (const pk of state.pickups) {
      const x = pk.x - state.cameraX + 14;
      const y = pk.y - state.cameraY + 14 + Math.sin(pk.bob) * 4;
      ctx.save();
      ctx.translate(x, y);
      if (pk.kind === "claws") {
        ctx.strokeStyle = "#ffd078";
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-8 + i * 8, 8);
          ctx.quadraticCurveTo(-4 + i * 8, -10, 0 + i * 4, -14);
          ctx.stroke();
        }
      } else if (pk.kind === "fire" || pk.kind === "ammo") {
        ctx.fillStyle = "#ff6622";
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.quadraticCurveTo(12, 0, 0, 14);
        ctx.quadraticCurveTo(-12, 0, 0, -12);
        ctx.fill();
      } else {
        ctx.strokeStyle = "#6ec8ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#e8c060";
        ctx.fillRect(-3, -8, 6, 16);
      }
      ctx.restore();
    }
  }

  function drawExit() {
    if (!state.exit) return;
    const e = state.exit;
    const x = e.x - state.cameraX;
    const y = e.y - state.cameraY;
    const pulse = 0.5 + Math.sin(state.t * 0.1) * 0.5;
    ctx.fillStyle = `rgba(90, 255, 170, ${0.25 + pulse * 0.25})`;
    ctx.fillRect(x - 6, y - 6, e.w + 12, e.h + 12);
    ctx.fillStyle = "#1a3a28";
    ctx.fillRect(x, y, e.w, e.h);
    ctx.strokeStyle = "#5dffb0";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, e.w, e.h);
    ctx.fillStyle = "#5dffb0";
    ctx.font = "700 12px Exo 2, sans-serif";
    ctx.fillText("EXIT", x + 6, y - 8);
  }

  function drawOverlayFx() {
    const w = worldOf(state.progress);
    // chase horde (world X)
    if ((w === 0 || w === 2) && !isBoss(state.progress)) {
      const threatX = state.chaseX - state.cameraX;
      const g = ctx.createLinearGradient(threatX - 40, 0, threatX + 80, 0);
      g.addColorStop(0, "rgba(80,0,20,0.85)");
      g.addColorStop(1, "rgba(80,0,20,0)");
      ctx.fillStyle = g;
      ctx.fillRect(threatX - 60, 0, 140, H);
      ctx.fillStyle = "#4a6a28";
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(threatX + 10, 80 + i * 80, 22, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff2244";
        ctx.beginPath();
        ctx.arc(threatX + 18, 76 + i * 80, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#4a6a28";
      }
    }
    // acid
    if (w === 1) {
      const ay = state.acidY - state.cameraY;
      const g = ctx.createLinearGradient(0, ay - 20, 0, H);
      g.addColorStop(0, "rgba(60,200,40,0.55)");
      g.addColorStop(1, "rgba(20,80,20,0.9)");
      ctx.fillStyle = g;
      ctx.fillRect(0, ay, W, H);
      ctx.strokeStyle = "rgba(180,255,80,0.5)";
      ctx.beginPath();
      for (let i = 0; i <= W; i += 20) {
        ctx.lineTo(i, ay + Math.sin(state.t * 0.15 + i * 0.05) * 4);
      }
      ctx.stroke();
    }
    // boulders + shadows
    for (const b of state.boulders) {
      const sx = b.x - state.cameraX;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(sx + b.w / 2, b.shadowY - state.cameraY, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6a5a4a";
      ctx.beginPath();
      ctx.arc(sx + b.w / 2, b.y - state.cameraY + b.h / 2, b.w / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // projectiles
    for (const pr of state.projectiles) {
      const x = pr.x - state.cameraX;
      const y = pr.y - state.cameraY;
      if (pr.type === "fire") {
        ctx.fillStyle = "#ff6622";
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffcc44";
        ctx.beginPath();
        ctx.arc(x - 2, y, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#66ff44";
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // particles
    for (const pt of state.particles) {
      ctx.globalAlpha = pt.life / (pt.max || 30);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - state.cameraX, pt.y - state.cameraY, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
    // floats
    ctx.font = "800 14px Exo 2, sans-serif";
    for (const f of state.floats) {
      ctx.globalAlpha = clamp(f.life / 50, 0, 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x - state.cameraX, f.y - state.cameraY);
    }
    ctx.globalAlpha = 1;
  }

  function drawHazards() {
    for (const h of state.hazards) {
      const x = h.x - state.cameraX;
      const y = h.y - state.cameraY;
      if (h.type === "spikes") {
        ctx.fillStyle = "#c0c8d0";
        for (let i = 0; i < h.w; i += 10) {
          ctx.beginPath();
          ctx.moveTo(x + i, y + h.h);
          ctx.lineTo(x + i + 5, y);
          ctx.lineTo(x + i + 10, y + h.h);
          ctx.fill();
        }
      } else if (h.type === "spark" && (h.t % 50) < 18) {
        ctx.fillStyle = "#ffe066";
        ctx.shadowColor = "#ffe066";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(x + 12, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (h.type === "laser") {
        ctx.fillStyle = h.t < 10 ? "rgba(255,80,80,0.35)" : "rgba(255,40,40,0.85)";
        ctx.fillRect(x, y, h.w, h.h);
      } else if (h.type === "drip") {
        ctx.fillStyle = "#66ff44";
        ctx.fillRect(x, y + (h.t % 40), 4, 12);
      }
    }
  }

  function render() {
    const w = worldOf(state.progress);
    ctx.save();
    if (state.shake > 0) {
      ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
    }
    drawParallax(w);
    drawPlatforms(w);
    drawHazards();
    drawPickups();
    drawExit();
    for (const e of state.enemies) if (!e.dead) drawEnemy(e);
    if (state.boss && state.boss.hp > 0) drawBoss(state.boss);
    drawSlash();
    if (state.player && state.cat) drawPlayer();
    drawOverlayFx();
    // safe banner
    if (state.safe > 0 && state.mode === "play") {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "700 16px Exo 2, sans-serif";
      ctx.fillText("GET READY", W / 2 - 48, 48);
    }
    ctx.restore();
  }

  function tick() {
    state.t += 1;
    if (state.mode === "play") {
      if (state.safe > 0) state.safe -= 1;
      if (state.invuln > 0) state.invuln -= 1;
      updatePlayer();
      updateEnemies();
      updateBoss();
      updateProjectiles();
      updatePickups();
      updateHazards();
      updateExit();
      updateJuice();
    } else {
      updateJuice();
    }
    if (state.mode === "play" || state.mode === "pause") render();
    else if (state.player) render();
    requestAnimationFrame(tick);
  }

  /* ---------- UI / flow ---------- */
  function drawSelectPreview(canvasEl, style) {
    const c = canvasEl.getContext("2d");
    c.clearRect(0, 0, canvasEl.width, canvasEl.height);
    drawCat(c, 44, 40, 1, style, performance.now() / 50, {});
  }

  function buildSelect() {
    const grid = document.getElementById("cat-grid");
    grid.innerHTML = "";
    CATS.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cat-card";
      btn.dataset.id = cat.id;
      btn.innerHTML = `
        <canvas class="cat-preview" width="88" height="72"></canvas>
        <h3>${cat.name}</h3>
        <p class="role">${cat.role}</p>
        <p class="blurb">${cat.blurb}</p>
        <div class="stat-row"><span>Speed</span><span>${cat.stats.speed}</span></div>
        <div class="stat-bar"><span style="width:${cat.stats.speed}%"></span></div>
        <div class="stat-row"><span>Melee</span><span>${cat.stats.melee}</span></div>
        <div class="stat-bar"><span style="width:${cat.stats.melee}%"></span></div>
        <div class="stat-row"><span>Defense</span><span>${cat.stats.defense}</span></div>
        <div class="stat-bar"><span style="width:${cat.stats.defense}%"></span></div>
      `;
      btn.addEventListener("click", () => {
        state.catId = cat.id;
        document.querySelectorAll(".cat-card").forEach((el) => el.classList.remove("selected"));
        btn.classList.add("selected");
        document.getElementById("btn-begin").disabled = false;
      });
      grid.appendChild(btn);
      drawSelectPreview(btn.querySelector("canvas"), cat.style);
    });
    // animate previews
    setInterval(() => {
      document.querySelectorAll(".cat-card").forEach((card) => {
        const id = card.dataset.id;
        const cat = CATS.find((c) => c.id === id);
        if (cat) drawSelectPreview(card.querySelector("canvas"), cat.style);
      });
    }, 80);
  }

  function startRun() {
    const cat = CATS.find((c) => c.id === state.catId);
    if (!cat) return;
    state.cat = cat;
    state.progress = 0;
    state.score = 0;
    state.maxHp = cat.maxHp;
    state.hp = cat.maxHp;
    state.gear = { claws: false, fire: false, ammo: 0, shield: 0, shieldOwned: false };
    state.player = null;
    hideScreens();
    HUD.root.classList.remove("hidden");
    state.mode = "play";
    loadLevel(0, false);
    clearInput();
    canvas.focus();
  }

  function retryStage() {
    hideScreens();
    HUD.root.classList.remove("hidden");
    state.mode = "play";
    state.hp = Math.max(40, Math.floor(state.maxHp * 0.7));
    loadLevel(state.progress, false);
    clearInput();
    updateHUD();
    canvas.focus();
  }

  function toSelect() {
    clearInput();
    state.mode = "select";
    HUD.root.classList.add("hidden");
    showScreen("select");
    document.getElementById("btn-begin").disabled = !state.catId;
  }

  // input
  window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      if (!jumpHeld) jumpPressedBuffer = JUMP_BUFFER;
      jumpHeld = true;
    }
    if (e.key === "Escape" && state.mode === "play") {
      state.mode = "pause";
      clearInput();
      showScreen("pause");
    } else if (e.key === "Escape" && state.mode === "pause") {
      hideScreens();
      state.mode = "play";
      clearInput();
      canvas.focus();
    }
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
    if (e.key === " " || e.code === "Space") jumpHeld = false;
  });

  canvas.addEventListener("mousedown", (e) => {
    canvas.focus();
    if (e.button === 0) mouseLeft = true;
    if (e.button === 2) mouseRight = true;
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("blur", clearInput);

  document.getElementById("btn-start").addEventListener("click", () => {
    state.mode = "select";
    showScreen("select");
  });
  document.getElementById("btn-begin").addEventListener("click", startRun);
  document.getElementById("btn-resume").addEventListener("click", () => {
    hideScreens();
    state.mode = "play";
    clearInput();
    canvas.focus();
  });
  document.getElementById("btn-to-select").addEventListener("click", toSelect);
  document.getElementById("btn-next").addEventListener("click", advance);
  document.getElementById("btn-retry").addEventListener("click", retryStage);
  document.getElementById("btn-lose-select").addEventListener("click", toSelect);
  document.getElementById("btn-replay").addEventListener("click", toSelect);

  // boot
  buildSelect();
  showScreen("title");
  state.mode = "title";
  // draw idle backdrop
  state.progress = 0;
  state.player = makePlayer();
  state.platforms = [platformAt(-20, GROUND, 1200, 80)];
  render();
  requestAnimationFrame(tick);
})();

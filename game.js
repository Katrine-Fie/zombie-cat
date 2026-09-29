/**
 * Zombie Cat — Phaser 3 arcade action game
 * Worlds → stages → gear quest → Zombie Cat King
 */
(() => {
  "use strict";

  const W = 960;
  const H = 540;
  const TILE = 48;
  const MAP_WIDTH = 3200;
  const WORLD_HEIGHT = 720;
  const LEVEL_TIMER_SEC = 45;
  const FALL_Y = 650;
  const SAFE_SPAWN = { x: 100, y: 400 };
  const KEY_POS = { x: 2200, y: 250 };
  const EXIT_X = 3000;

  /** Level-scoped key progress (reset each stage) */
  let hasKeyItem = false;

  const CATS = {
    white: {
      id: "white",
      name: "White Swift",
      role: "Speed + Dash Trail",
      blurb: "Zip past danger. Best for aerial routes.",
      color: 0xf4f0e8,
      glow: 0x4ec8ff,
      eye: 0x5dffb0,
      speed: 280,
      jump: 520,
      melee: 14,
      maxHp: 100,
      defense: 0,
      stats: { spd: 95, atk: 55, def: 40 },
    },
    red: {
      id: "red",
      name: "Red Brawler",
      role: "Heavy Claws",
      blurb: "Smash mid-bosses. Strongest melee.",
      color: 0xe84a3a,
      glow: 0xff8a3d,
      eye: 0xffd078,
      speed: 230,
      jump: 500,
      melee: 22,
      maxHp: 120,
      defense: 2,
      stats: { spd: 60, atk: 95, def: 55 },
    },
    black: {
      id: "black",
      name: "Black Shadow",
      role: "Tank + Neon Eyes",
      blurb: "Soak hits. Great for boss phases.",
      color: 0x1a1a22,
      glow: 0x3dffb0,
      eye: 0xff5a6a,
      speed: 210,
      jump: 490,
      melee: 16,
      maxHp: 150,
      defense: 5,
      stats: { spd: 50, atk: 65, def: 95 },
    },
  };

  /** Level catalog: distinct stages per world + mid-bosses + final king */
  const LEVELS = [
    {
      id: "w1s1",
      world: 1,
      stage: 1,
      label: "WORLD 1 · STAGE 1",
      title: "Rainy Rooftops",
      objective: "Escape the chase! Reach the EXIT portal.",
      theme: "rooftop",
      length: 28,
      chase: true,
      chaseSpeed: 95,
      rain: true,
      goal: "exit",
      intro: "Night rooftops. Gaps ahead — jump and keep moving!",
    },
    {
      id: "w1s2",
      world: 1,
      stage: 2,
      label: "WORLD 1 · STAGE 2",
      title: "Neon Alley",
      objective: "Find Iron Claws, then hit the EXIT.",
      theme: "rooftop",
      length: 30,
      chase: true,
      chaseSpeed: 110,
      rain: true,
      gear: "claws",
      goal: "exit",
      intro: "Rats swarm the neon signs. Grab Iron Claws!",
    },
    {
      id: "w1mb",
      world: 1,
      stage: 3,
      label: "WORLD 1 · MID-BOSS",
      title: "Horde Captain",
      objective: "Defeat the Horde Captain!",
      theme: "rooftop",
      length: 16,
      chase: false,
      rain: true,
      midBoss: "captain",
      goal: "midBoss",
      intro: "A bigger zombie cat blocks the EXIT. Claw it down!",
    },
    {
      id: "w2s1",
      world: 2,
      stage: 1,
      label: "WORLD 2 · STAGE 1",
      title: "Pipe Climb",
      objective: "Climb above the rising sludge!",
      theme: "sewer",
      length: 22,
      vertical: true,
      rising: true,
      risingSpeed: 28,
      goal: "exit",
      intro: "Sewers! Climb ladders and crates before the sludge rises.",
    },
    {
      id: "w2s2",
      world: 2,
      stage: 2,
      label: "WORLD 2 · STAGE 2",
      title: "Toxic Reservoir",
      objective: "Claim Fire Tail, then EXIT up top.",
      theme: "sewer",
      length: 24,
      vertical: true,
      rising: true,
      risingSpeed: 34,
      gear: "fire",
      goal: "exit",
      intro: "Find the Fire Tail relic. Mice refill ammo later!",
    },
    {
      id: "w2mb",
      world: 2,
      stage: 3,
      label: "WORLD 2 · MID-BOSS",
      title: "Bat Matriarch",
      objective: "Beat the Bat Matriarch!",
      theme: "sewer",
      length: 14,
      vertical: false,
      rising: true,
      risingSpeed: 18,
      midBoss: "batQueen",
      goal: "midBoss",
      intro: "Huge bat overhead. Fireballs or claws — finish it!",
    },
    {
      id: "w3s1",
      world: 3,
      stage: 1,
      label: "WORLD 3 · STAGE 1",
      title: "Desert Approach",
      objective: "Dodge boulders. Reach the EXIT.",
      theme: "desert",
      length: 28,
      chase: true,
      chaseSpeed: 100,
      boulders: true,
      goal: "exit",
      intro: "Sand and shadows. Watch boulder warning zones!",
    },
    {
      id: "w3s2",
      world: 3,
      stage: 2,
      label: "WORLD 3 · STAGE 2",
      title: "Spike Corridor",
      objective: "Grab Ankh Shield, avoid spikes, EXIT!",
      theme: "desert",
      length: 30,
      chase: true,
      chaseSpeed: 115,
      spikes: true,
      gear: "shield",
      goal: "exit",
      intro: "Mummy rats and spikes. The Ankh Shield waits.",
    },
    {
      id: "w3mb",
      world: 3,
      stage: 3,
      label: "WORLD 3 · MID-BOSS",
      title: "Mummy Guard",
      objective: "Defeat the Mummy Guard!",
      theme: "desert",
      length: 16,
      midBoss: "mummy",
      goal: "midBoss",
      intro: "Last guardian before the tomb. Use all your gear!",
    },
    {
      id: "boss",
      world: 4,
      stage: 1,
      label: "FINAL BOSS",
      title: "Zombie Cat King",
      objective: "Stun after leaps → CRIT claws! Fireballs for range.",
      theme: "boss",
      length: 18,
      boss: true,
      goal: "boss",
      intro: "The King awaits. Three phases. Collect remedies = power!",
    },
  ];

  function defaultRun(catId) {
    const cat = CATS[catId] || CATS.white;
    return {
      catId: cat.id,
      hp: cat.maxHp,
      maxHp: cat.maxHp,
      score: 0,
      levelIndex: 0,
      lives: 3,
      claws: false,
      fire: false,
      ammo: 0,
      shield: 0,
      mice: 0,
      secrets: 0,
    };
  }

  // ─── Texture / juice helpers ───────────────────────────────────────────────
  function makeTextures(scene) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    function tex(key, draw, w, h) {
      g.clear();
      draw(g);
      g.generateTexture(key, w, h);
    }

    // Platforms
    tex("plat_rooftop", (gr) => {
      gr.fillStyle(0x2a3348, 1);
      gr.fillRoundedRect(0, 0, TILE, 20, 4);
      gr.fillStyle(0x4ec8ff, 0.35);
      gr.fillRect(2, 2, TILE - 4, 3);
      gr.lineStyle(2, 0xffc857, 0.5);
      gr.strokeRoundedRect(1, 1, TILE - 2, 18, 3);
    }, TILE, 20);

    tex("plat_sewer", (gr) => {
      gr.fillStyle(0x1e3a2f, 1);
      gr.fillRoundedRect(0, 0, TILE, 18, 3);
      gr.fillStyle(0x3dffb0, 0.3);
      gr.fillRect(0, 0, TILE, 4);
      gr.fillStyle(0x0a1c14, 1);
      gr.fillCircle(12, 10, 3);
      gr.fillCircle(30, 9, 2);
    }, TILE, 18);

    tex("plat_desert", (gr) => {
      gr.fillStyle(0xc49a4a, 1);
      gr.fillRoundedRect(0, 0, TILE, 18, 2);
      gr.fillStyle(0xe8c878, 1);
      gr.fillRect(0, 0, TILE, 5);
      gr.fillStyle(0x8a6230, 0.6);
      gr.fillRect(8, 8, 10, 4);
    }, TILE, 18);

    tex("plat_boss", (gr) => {
      gr.fillStyle(0x3a2218, 1);
      gr.fillRoundedRect(0, 0, TILE, 20, 4);
      gr.fillStyle(0xff5a6a, 0.4);
      gr.fillRect(2, 2, TILE - 4, 4);
      gr.lineStyle(2, 0xffc857, 0.7);
      gr.strokeRoundedRect(1, 1, TILE - 2, 18, 3);
    }, TILE, 20);

    tex("crate", (gr) => {
      gr.fillStyle(0x6b4226, 1);
      gr.fillRect(0, 0, 40, 40);
      gr.lineStyle(2, 0xffc857, 0.6);
      gr.strokeRect(2, 2, 36, 36);
      gr.lineBetween(2, 2, 38, 38);
      gr.lineBetween(38, 2, 2, 38);
    }, 40, 40);

    tex("ladder", (gr) => {
      gr.lineStyle(4, 0xb8860b, 1);
      gr.lineBetween(4, 0, 4, 48);
      gr.lineBetween(20, 0, 20, 48);
      for (let y = 6; y < 48; y += 12) gr.lineBetween(4, y, 20, y);
    }, 24, 48);

    tex("spike", (gr) => {
      gr.fillStyle(0xff5a6a, 1);
      gr.fillTriangle(12, 0, 0, 24, 24, 24);
      gr.fillStyle(0xffc857, 0.5);
      gr.fillTriangle(12, 4, 6, 20, 18, 20);
    }, 24, 24);

    tex("exit", (gr) => {
      gr.fillStyle(0x4ec8ff, 0.25);
      gr.fillCircle(28, 36, 28);
      gr.lineStyle(3, 0x4ec8ff, 1);
      gr.strokeCircle(28, 36, 26);
      gr.lineStyle(3, 0xffc857, 0.9);
      gr.strokeCircle(28, 36, 18);
      gr.fillStyle(0xffc857, 1);
      gr.fillCircle(28, 36, 6);
    }, 56, 72);

    tex("fish", (gr) => {
      gr.fillStyle(0xff5a6a, 1);
      gr.fillEllipse(16, 10, 28, 14);
      gr.fillTriangle(2, 10, 0, 4, 0, 16);
      gr.fillStyle(0xffffff, 1);
      gr.fillCircle(22, 8, 2);
    }, 32, 20);

    tex("mouse", (gr) => {
      gr.fillStyle(0xc0c0c8, 1);
      gr.fillEllipse(14, 12, 22, 14);
      gr.fillCircle(24, 8, 6);
      gr.fillStyle(0xff8a3d, 1);
      gr.fillCircle(26, 7, 1.5);
      gr.fillStyle(0xc0c0c8, 1);
      gr.fillTriangle(4, 10, 0, 2, 8, 6);
    }, 30, 20);

    tex("gear_claws", (gr) => {
      gr.lineStyle(4, 0xffc857, 1);
      gr.lineBetween(6, 28, 14, 4);
      gr.lineBetween(16, 28, 20, 2);
      gr.lineBetween(26, 28, 28, 6);
      gr.fillStyle(0xffc857, 0.3);
      gr.fillCircle(18, 18, 10);
    }, 36, 32);

    tex("gear_fire", (gr) => {
      gr.fillStyle(0xff8a3d, 1);
      gr.fillCircle(16, 18, 12);
      gr.fillStyle(0xffc857, 1);
      gr.fillCircle(16, 14, 7);
      gr.fillStyle(0xffffff, 1);
      gr.fillCircle(16, 11, 3);
    }, 32, 32);

    tex("gear_shield", (gr) => {
      gr.fillStyle(0x4ec8ff, 0.35);
      gr.fillCircle(18, 18, 16);
      gr.lineStyle(3, 0x4ec8ff, 1);
      gr.strokeCircle(18, 18, 15);
      gr.fillStyle(0xffc857, 1);
      gr.fillTriangle(18, 6, 10, 22, 26, 22);
    }, 36, 36);

    tex("particle", (gr) => {
      gr.fillStyle(0xffffff, 1);
      gr.fillCircle(4, 4, 4);
    }, 8, 8);

    tex("slash", (gr) => {
      gr.lineStyle(5, 0xffffff, 1);
      gr.beginPath();
      gr.arc(24, 24, 18, -0.8, 1.2, false);
      gr.strokePath();
    }, 48, 48);

    tex("fireball", (gr) => {
      gr.fillStyle(0xff5a6a, 1);
      gr.fillCircle(12, 12, 11);
      gr.fillStyle(0xffc857, 1);
      gr.fillCircle(12, 12, 6);
      gr.fillStyle(0xffffff, 1);
      gr.fillCircle(12, 10, 3);
    }, 24, 24);

    tex("secret", (gr) => {
      gr.fillStyle(0xffc857, 1);
      gr.fillTriangle(12, 2, 8, 10, 16, 10);
      gr.fillTriangle(12, 22, 8, 12, 16, 12);
      gr.fillTriangle(2, 12, 10, 8, 10, 16);
      gr.fillTriangle(22, 12, 14, 8, 14, 16);
    }, 24, 24);

    tex("keystar", (gr) => {
      gr.fillStyle(0xffe066, 1);
      gr.fillTriangle(18, 2, 12, 14, 24, 14);
      gr.fillTriangle(18, 34, 12, 18, 24, 18);
      gr.fillTriangle(2, 18, 14, 12, 14, 24);
      gr.fillTriangle(34, 18, 22, 12, 22, 24);
      gr.fillStyle(0xffffff, 0.9);
      gr.fillCircle(18, 18, 5);
    }, 36, 36);

    g.destroy();
  }

  function drawCatTexture(scene, cat) {
    const key = "cat_" + cat.id;
    if (scene.textures.exists(key)) return key;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    // body
    g.fillStyle(cat.color, 1);
    g.fillEllipse(22, 28, 36, 28);
    // head
    g.fillEllipse(22, 14, 26, 22);
    // ears
    g.fillTriangle(10, 8, 6, -2, 16, 4);
    g.fillTriangle(34, 8, 28, 4, 38, -2);
    g.fillStyle(cat.glow, 0.85);
    g.fillTriangle(10, 6, 8, 0, 14, 4);
    g.fillTriangle(34, 6, 30, 4, 36, 0);
    // eyes
    g.fillStyle(cat.eye, 1);
    g.fillEllipse(16, 14, 6, 7);
    g.fillEllipse(28, 14, 6, 7);
    g.fillStyle(0x050508, 1);
    g.fillCircle(17, 15, 2);
    g.fillCircle(29, 15, 2);
    // nose
    g.fillStyle(0xff8a9a, 1);
    g.fillTriangle(22, 18, 19, 21, 25, 21);
    // tail
    g.lineStyle(6, cat.color, 1);
    g.lineBetween(38, 28, 48, 12);
    // paws glow
    g.fillStyle(cat.glow, 0.55);
    g.fillCircle(12, 40, 5);
    g.fillCircle(32, 40, 5);
    if (cat.id === "red") {
      g.lineStyle(2, 0x2a1010, 0.8);
      g.lineBetween(26, 10, 34, 16);
    }
    g.generateTexture(key, 52, 48);
    g.destroy();
    return key;
  }

  function drawEnemyTexture(scene, kind) {
    const key = "enemy_" + kind;
    if (scene.textures.exists(key)) return key;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    if (kind === "rat") {
      g.fillStyle(0x5a4a3a, 1);
      g.fillEllipse(18, 16, 28, 16);
      g.fillCircle(30, 12, 8);
      g.fillStyle(0xff5a6a, 1);
      g.fillCircle(32, 11, 2);
      g.lineStyle(2, 0x5a4a3a, 1);
      g.lineBetween(4, 16, 0, 8);
    } else if (kind === "zombie") {
      g.fillStyle(0x6a8a5a, 1);
      g.fillEllipse(20, 26, 30, 24);
      g.fillEllipse(20, 12, 22, 18);
      g.fillStyle(0xff5a6a, 1);
      g.fillCircle(14, 12, 3);
      g.fillCircle(26, 12, 3);
      g.fillStyle(0x3a5a2a, 1);
      g.fillTriangle(10, 6, 6, -2, 14, 4);
      g.fillTriangle(30, 6, 26, 4, 34, -2);
    } else if (kind === "bat") {
      g.fillStyle(0x3a2a4a, 1);
      g.fillTriangle(20, 16, 0, 8, 8, 20);
      g.fillTriangle(20, 16, 40, 8, 32, 20);
      g.fillStyle(0x2a1a2a, 1);
      g.fillCircle(20, 16, 7);
      g.fillStyle(0xff5a6a, 1);
      g.fillCircle(17, 15, 2);
      g.fillCircle(23, 15, 2);
    } else if (kind === "mummy") {
      g.fillStyle(0xe8d8a8, 1);
      g.fillEllipse(20, 26, 28, 24);
      g.fillEllipse(20, 12, 20, 16);
      g.lineStyle(2, 0xc4b070, 1);
      for (let y = 8; y < 36; y += 5) g.lineBetween(8, y, 32, y);
      g.fillStyle(0x1a1010, 1);
      g.fillRect(12, 10, 6, 3);
      g.fillRect(22, 10, 6, 3);
    } else if (kind === "captain") {
      g.fillStyle(0x4a6a3a, 1);
      g.fillEllipse(36, 44, 56, 44);
      g.fillEllipse(36, 20, 40, 32);
      g.fillStyle(0xffc857, 1);
      g.fillRect(18, 4, 36, 8);
      g.fillStyle(0xff5a6a, 1);
      g.fillCircle(26, 20, 5);
      g.fillCircle(46, 20, 5);
      g.fillStyle(0x2a3a1a, 1);
      g.fillTriangle(18, 10, 10, -4, 26, 6);
      g.fillTriangle(54, 10, 46, 6, 62, -4);
    } else if (kind === "batQueen") {
      g.fillStyle(0x2a1830, 1);
      g.fillTriangle(40, 30, 0, 10, 14, 40);
      g.fillTriangle(40, 30, 80, 10, 66, 40);
      g.fillStyle(0x1a0a20, 1);
      g.fillCircle(40, 30, 16);
      g.fillStyle(0x3dffb0, 1);
      g.fillCircle(34, 28, 4);
      g.fillCircle(46, 28, 4);
    } else if (kind === "mummyGuard") {
      g.fillStyle(0xd8c878, 1);
      g.fillEllipse(40, 50, 56, 48);
      g.fillEllipse(40, 22, 36, 28);
      g.lineStyle(3, 0xa89050, 1);
      for (let y = 12; y < 70; y += 7) g.lineBetween(16, y, 64, y);
      g.fillStyle(0xff5a6a, 1);
      g.fillRect(28, 18, 8, 4);
      g.fillRect(44, 18, 8, 4);
      g.fillStyle(0xffc857, 0.5);
      g.fillCircle(40, 40, 20);
    } else if (kind === "king") {
      g.fillStyle(0x3a5a2a, 1);
      g.fillEllipse(50, 60, 80, 60);
      g.fillEllipse(50, 28, 56, 44);
      g.fillStyle(0xffc857, 1);
      g.fillRect(28, 2, 44, 12);
      g.fillTriangle(50, -8, 40, 8, 60, 8);
      g.fillStyle(0xff5a6a, 1);
      g.fillCircle(36, 28, 7);
      g.fillCircle(64, 28, 7);
      g.fillStyle(0x1a2a10, 1);
      g.fillTriangle(24, 14, 12, -6, 34, 8);
      g.fillTriangle(76, 14, 66, 8, 88, -6);
      g.lineStyle(8, 0x2a4a1a, 1);
      g.lineBetween(88, 50, 110, 20);
    }
    const sizes = {
      rat: [36, 28],
      zombie: [40, 42],
      bat: [40, 28],
      mummy: [40, 42],
      captain: [72, 70],
      batQueen: [80, 48],
      mummyGuard: [80, 80],
      king: [110, 100],
    };
    const [tw, th] = sizes[kind] || [40, 40];
    g.generateTexture(key, tw, th);
    g.destroy();
    return key;
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────
  class BootScene extends Phaser.Scene {
    constructor() {
      super("Boot");
    }
    create() {
      makeTextures(this);
      Object.values(CATS).forEach((c) => drawCatTexture(this, c));
      ["rat", "zombie", "bat", "mummy", "captain", "batQueen", "mummyGuard", "king"].forEach(
        (k) => drawEnemyTexture(this, k)
      );
      this.scene.start("Title");
    }
  }

  // ─── Title ─────────────────────────────────────────────────────────────────
  class TitleScene extends Phaser.Scene {
    constructor() {
      super("Title");
    }
    create() {
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x0a1525, 0x0a1525, 0x1a1008, 0x1a1008, 1);
      bg.fillRect(0, 0, W, H);

      // Parallax city silhouettes
      for (let i = 0; i < 12; i++) {
        const x = i * 90 - 20;
        const h = 80 + (i % 5) * 40;
        this.add.rectangle(x + 40, H - h / 2 - 40, 70, h, 0x121a28, 0.9);
      }
      // Neon signs
      this.add.rectangle(200, 180, 120, 18, 0x4ec8ff, 0.7).setAngle(-6);
      this.add.rectangle(620, 140, 100, 16, 0xff8a3d, 0.75).setAngle(4);
      this.add.rectangle(780, 220, 90, 14, 0x3dffb0, 0.6);

      const title = this.add
        .text(W / 2, 150, "ZOMBIE CAT", {
          fontFamily: "Bangers, system-ui",
          fontSize: "84px",
          color: "#ffc857",
          stroke: "#1a1008",
          strokeThickness: 8,
        })
        .setOrigin(0.5);
      this.tweens.add({
        targets: title,
        scale: { from: 0.96, to: 1.04 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      this.add
        .text(W / 2, 230, "Collect Iron Claws · Fire Tail · Ankh Shield\nThen face the Zombie Cat King!", {
          fontFamily: "Exo 2, system-ui",
          fontSize: "18px",
          color: "#c8d0dc",
          align: "center",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      const btn = this.add
        .rectangle(W / 2, 340, 280, 64, 0xff6b3d, 1)
        .setStrokeStyle(3, 0xffc857)
        .setInteractive({ useHandCursor: true });
      const btnText = this.add
        .text(W / 2, 340, "CHOOSE YOUR CAT", {
          fontFamily: "Exo 2, system-ui",
          fontSize: "22px",
          color: "#ffffff",
          fontStyle: "800",
        })
        .setOrigin(0.5);

      btn.on("pointerover", () => btn.setFillStyle(0xff864f));
      btn.on("pointerout", () => btn.setFillStyle(0xff6b3d));
      btn.on("pointerdown", () => this.scene.start("Select"));
      btnText.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.scene.start("Select"));

      this.add
        .text(W / 2, 420, "3 Worlds · Mid-bosses · Secrets · Final Showdown", {
          fontFamily: "Exo 2, system-ui",
          fontSize: "14px",
          color: "#8b95a8",
        })
        .setOrigin(0.5);

      this.add
        .text(W / 2, 500, "Built as an AI-native product prototype", {
          fontFamily: "Exo 2, system-ui",
          fontSize: "12px",
          color: "#5a6578",
        })
        .setOrigin(0.5);

      // floating particles
      for (let i = 0; i < 18; i++) {
        const p = this.add.circle(
          Phaser.Math.Between(0, W),
          Phaser.Math.Between(0, H),
          Phaser.Math.Between(1, 3),
          0x4ec8ff,
          0.4
        );
        this.tweens.add({
          targets: p,
          y: p.y - 60,
          alpha: 0,
          duration: Phaser.Math.Between(2000, 4000),
          repeat: -1,
          delay: i * 120,
        });
      }
    }
  }

  // ─── Select (click cat = start immediately) ────────────────────────────────
  class SelectScene extends Phaser.Scene {
    constructor() {
      super("Select");
    }
    create() {
      this.starting = false;
      this.add.rectangle(0, 0, W, H, 0x0a1018).setOrigin(0);

      this.add
        .text(W / 2, 40, "PICK YOUR FIGHTER", {
          fontFamily: "Bangers, system-ui",
          fontSize: "48px",
          color: "#ffc857",
        })
        .setOrigin(0.5);

      this.add
        .text(W / 2, 84, "Click a cat — mission starts immediately!", {
          fontFamily: "Exo 2, system-ui",
          fontSize: "16px",
          color: "#3dffb0",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      const ids = ["white", "red", "black"];
      const startX = 160;
      ids.forEach((id, i) => {
        const cat = CATS[id];
        const x = startX + i * 320;
        const y = 270;

        // Full-card hit target (rectangle is more reliable than container hit areas)
        const hit = this.add
          .rectangle(x, y, 270, 340, 0x121a28, 1)
          .setStrokeStyle(3, cat.glow)
          .setInteractive({ useHandCursor: true });

        const sprite = this.add.image(x, y - 90, "cat_" + id).setScale(2.4);
        this.add
          .text(x, y - 10, cat.name, {
            fontFamily: "Exo 2, system-ui",
            fontSize: "22px",
            color: "#ffffff",
            fontStyle: "800",
          })
          .setOrigin(0.5);
        this.add
          .text(x, y + 18, cat.role, {
            fontFamily: "Exo 2, system-ui",
            fontSize: "14px",
            color: Phaser.Display.Color.IntegerToColor(cat.glow).rgba,
          })
          .setOrigin(0.5);
        this.add
          .text(x, y + 48, cat.blurb, {
            fontFamily: "Exo 2, system-ui",
            fontSize: "13px",
            color: "#a9b0c4",
            align: "center",
            wordWrap: { width: 230 },
          })
          .setOrigin(0.5);

        [
          ["SPD", cat.stats.spd, 0x4ec8ff],
          ["ATK", cat.stats.atk, 0xff8a3d],
          ["DEF", cat.stats.def, 0x3dffb0],
        ].forEach((row, ri) => {
          const by = y + 95 + ri * 22;
          this.add
            .text(x - 100, by, row[0], {
              fontSize: "12px",
              color: "#8b95a8",
              fontFamily: "Exo 2",
            })
            .setOrigin(0, 0.5);
          this.add.rectangle(x - 40, by, 140, 10, 0x1a2438).setOrigin(0, 0.5);
          this.add
            .rectangle(x - 40, by, 140 * (row[1] / 100), 10, row[2])
            .setOrigin(0, 0.5);
        });

        const playBtn = this.add
          .rectangle(x, y + 175, 160, 40, cat.glow, 1)
          .setInteractive({ useHandCursor: true });
        const playLbl = this.add
          .text(x, y + 175, "PLAY", {
            fontFamily: "Exo 2, system-ui",
            fontSize: "18px",
            color: "#0a1018",
            fontStyle: "800",
          })
          .setOrigin(0.5);

        const startRun = () => this.launchCat(id);

        hit.on("pointerover", () => {
          hit.setFillStyle(0x1a2840);
          hit.setScale(1.03);
        });
        hit.on("pointerout", () => {
          hit.setFillStyle(0x121a28);
          hit.setScale(1);
        });
        hit.on("pointerup", startRun);
        playBtn.on("pointerup", startRun);
        playLbl.setInteractive({ useHandCursor: true }).on("pointerup", startRun);

        // Number keys also work without clicking
        this.input.keyboard.on("keydown-" + ["ONE", "TWO", "THREE"][i], startRun);

        this.tweens.add({
          targets: sprite,
          y: sprite.y - 8,
          duration: 900 + i * 100,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      });

      this.add
        .text(W / 2, 520, "Click a card / PLAY · or press 1 / 2 / 3", {
          fontFamily: "Exo 2, system-ui",
          fontSize: "13px",
          color: "#5a6578",
        })
        .setOrigin(0.5);
    }

    launchCat(id) {
      if (this.starting) return;
      this.starting = true;
      this.input.enabled = false;
      this.registry.set("run", defaultRun(id));
      this.cameras.main.flash(180, 255, 200, 87);
      this.time.delayedCall(80, () => {
        this.scene.start("Play");
      });
    }
  }

  // ─── Play ──────────────────────────────────────────────────────────────────
  class PlayScene extends Phaser.Scene {
    constructor() {
      super("Play");
    }

    init() {
      this.run = this.registry.get("run") || defaultRun("white");
      if (this.run.lives == null) this.run.lives = 3;
      this.registry.set("run", this.run);
      this.level = LEVELS[this.run.levelIndex] || LEVELS[0];
      this.won = false;
      this.dead = false;
      this.safeUntil = 0;
      this.invulnUntil = 0;
      this.canDouble = true;
      this.jumpHeld = false;
      this.clawCd = 0;
      this.fireCd = 0;
      this.facing = 1;
      this.objectiveFlash = 0;
      this.levelTimer = LEVEL_TIMER_SEC;
      this.fallLockUntil = 0;
      hasKeyItem = false;
    }

    create() {
      const L = this.level;
      this.physics.world.gravity.y = 1400;
      const worldH = L.vertical
        ? Math.max(WORLD_HEIGHT, L.length * TILE + 240)
        : WORLD_HEIGHT;
      this.physics.world.setBounds(0, 0, MAP_WIDTH, worldH);

      this.platforms = this.physics.add.staticGroup();
      this.hazards = this.physics.add.staticGroup();
      this.ladders = this.physics.add.staticGroup();
      this.pickups = this.physics.add.group();
      this.enemies = this.physics.add.group();
      this.projectiles = this.physics.add.group();
      this.enemyShots = this.physics.add.group();

      this.playerSpawn = { x: SAFE_SPAWN.x, y: SAFE_SPAWN.y };
      this.buildWorld();
      this.ensureCoreRoute();
      this.playerSpawn = { x: SAFE_SPAWN.x, y: SAFE_SPAWN.y };
      this.spawnPlayer();
      this.setupInput();
      this.setupCollisions();
      this.buildHUD();
      this.showIntro();

      this.safeUntil = this.time.now + 3000;
      document.addEventListener("contextmenu", this._blockMenu);

      this.events.on("shutdown", () => {
        document.removeEventListener("contextmenu", this._blockMenu);
      });
    }

    _blockMenu = (e) => e.preventDefault();

    themeColors() {
      const t = this.level.theme;
      if (t === "rooftop") return { skyTop: 0x0a1528, skyBot: 0x1a1020, accent: 0x4ec8ff, fog: 0x4ec8ff };
      if (t === "sewer") return { skyTop: 0x0a1a14, skyBot: 0x102818, accent: 0x3dffb0, fog: 0x3dffb0 };
      if (t === "desert") return { skyTop: 0x2a1a08, skyBot: 0x4a3010, accent: 0xff8a3d, fog: 0xffc857 };
      return { skyTop: 0x1a0808, skyBot: 0x2a1018, accent: 0xff5a6a, fog: 0xffc857 };
    }

    platKey() {
      const t = this.level.theme;
      if (t === "sewer") return "plat_sewer";
      if (t === "desert") return "plat_desert";
      if (t === "boss") return "plat_boss";
      return "plat_rooftop";
    }

    buildWorld() {
      const L = this.level;
      const col = this.themeColors();
      const worldW = L.vertical ? W : L.length * TILE;
      const worldH = L.vertical ? L.length * TILE + 240 : H;

      this.physics.world.setBounds(0, 0, worldW, worldH);

      // Gradient background
      const bg = this.add.graphics().setScrollFactor(0).setDepth(-20);
      bg.fillGradientStyle(col.skyTop, col.skyTop, col.skyBot, col.skyBot, 1);
      bg.fillRect(0, 0, W, H);

      // Parallax layers
      this.parallax = [];
      for (let layer = 0; layer < 3; layer++) {
        const cont = this.add.container(0, 0).setDepth(-10 + layer);
        const sf = 0.15 + layer * 0.2;
        cont.setScrollFactor(sf);
        if (L.theme === "rooftop") {
          for (let i = 0; i < 20; i++) {
            const bx = i * 100;
            const bh = 60 + ((i + layer) % 6) * 35;
            cont.add(
              this.add.rectangle(bx, H - bh / 2 - 20, 80 - layer * 10, bh, 0x101828 + layer * 0x080810, 0.7)
            );
          }
          // neon
          cont.add(this.add.rectangle(180 + layer * 40, 120, 90, 10, col.accent, 0.45).setAngle(-5));
          cont.add(this.add.rectangle(500, 160, 70, 8, 0xff8a3d, 0.4).setAngle(3));
        } else if (L.theme === "sewer") {
          for (let i = 0; i < 8; i++) {
            cont.add(this.add.ellipse(120 + i * 140, 80 + layer * 40, 100, 50, 0x0a2018, 0.5));
            cont.add(this.add.rectangle(i * 160, 0, 40, worldH, 0x143028, 0.35));
          }
        } else if (L.theme === "desert") {
          for (let i = 0; i < 10; i++) {
            cont.add(
              this.add.rectangle(
                i * 140 + 40,
                H - 60 - layer * 15,
                100 + layer * 20,
                50 + layer * 20,
                0x3a2810 + layer * 0x101000,
                0.55
              )
            );
          }
        } else {
          // boss tomb
          cont.add(this.add.rectangle(W / 2, H / 2, W, H, 0x1a0808, 0.3));
          for (let i = 0; i < 6; i++) {
            const torch = this.add.circle(80 + i * 160, 100, 18, 0xff8a3d, 0.35);
            cont.add(torch);
            this.tweens.add({
              targets: torch,
              alpha: { from: 0.25, to: 0.55 },
              scale: { from: 0.9, to: 1.2 },
              duration: 500 + i * 80,
              yoyo: true,
              repeat: -1,
            });
          }
        }
        this.parallax.push(cont);
      }

      if (L.rain) {
        this.rainEmitter = this.add.particles(0, 0, "particle", {
          x: { min: 0, max: worldW },
          y: -20,
          lifespan: 1800,
          speedY: { min: 280, max: 420 },
          scale: { start: 0.15, end: 0.05 },
          alpha: { start: 0.35, end: 0 },
          tint: 0x8ec8ff,
          frequency: 30,
          quantity: 2,
          advance: 1000,
        });
        this.rainEmitter.setDepth(-5).setScrollFactor(0.6);
      }

      // Ground / platforms
      const pk = this.platKey();
      if (L.boss) {
        this.buildBossArena(pk);
      } else if (L.vertical) {
        this.buildVertical(pk);
      } else if (L.midBoss) {
        this.buildArena(pk);
      } else {
        this.buildSideScroll(pk);
      }

      // Rising sludge
      if (L.rising) {
        this.sludge = this.add.rectangle(worldW / 2, worldH + 40, worldW + 200, 120, 0x3dffb0, 0.45);
        this.physics.add.existing(this.sludge, true);
        this.sludgeLevel = worldH - 20;
        this.sludge.body.updateFromGameObject();
      }

      // Chase pack visual
      if (L.chase) {
        this.chaseX = -120;
        this.chaseGroup = this.add.container(this.chaseX, H - 80).setDepth(5);
        for (let i = 0; i < 5; i++) {
          const z = this.add.image(-i * 28, Phaser.Math.Between(-10, 10), "enemy_zombie").setScale(0.7);
          this.chaseGroup.add(z);
        }
        const warn = this.add
          .text(40, -50, "HORDE!", {
            fontFamily: "Bangers",
            fontSize: "18px",
            color: "#ff5a6a",
          })
          .setOrigin(0.5);
        this.chaseGroup.add(warn);
      }
    }

    addPlatform(x, y, tiles, key) {
      for (let i = 0; i < tiles; i++) {
        const p = this.platforms.create(x + i * TILE + TILE / 2, y, key || this.platKey());
        p.refreshBody();
        p.body.setSize(TILE, 16);
        p.body.setOffset(0, 2);
      }
    }

    buildSideScroll(pk) {
      const L = this.level;
      const groundY = H - 36;
      const tileSpan = Math.ceil(MAP_WIDTH / TILE);
      let x = 0;
      const segments = [];
      while (x < tileSpan - 4) {
        const len = Phaser.Math.Between(3, 6);
        segments.push({ x, len: Math.min(len, tileSpan - x) });
        x += len + Phaser.Math.Between(2, 3);
      }
      segments[0] = { x: 0, len: 6 };
      segments.push({ x: Math.floor(KEY_POS.x / TILE) - 1, len: 4 });
      segments.push({ x: Math.floor(EXIT_X / TILE) - 2, len: 5 });
      segments.forEach((s, si) => {
        this.addPlatform(s.x * TILE, groundY, s.len, pk);
        if (si > 0 && si % 2 === 0) {
          this.addPlatform(s.x * TILE + 40, groundY - 100 - (si % 3) * 30, 2, pk);
        }
        if (si > 1 && L.theme === "rooftop" && si % 3 === 1) {
          this.addPlatform(s.x * TILE + 20, groundY - 180, 2, pk);
        }
      });

      // Gear
      if (L.gear) {
        const mid = segments[Math.min(3, segments.length - 1)];
        this.spawnGear(L.gear, mid.x * TILE + 60, groundY - 120);
      }

      // Enemies & pickups
      segments.forEach((s, si) => {
        if (si === 0) return;
        const ex = s.x * TILE + (s.len * TILE) / 2;
        if (ex > MAP_WIDTH - 160) return;
        const ey = groundY - 30;
        if (L.theme === "rooftop") {
          this.spawnEnemy(si % 2 === 0 ? "rat" : "zombie", ex, ey, 40);
        } else if (L.theme === "desert") {
          this.spawnEnemy(si % 2 === 0 ? "mummy" : "rat", ex, ey, 50);
        }
        if (si % 3 === 0) this.spawnPickup("fish", ex, groundY - 90);
        if (si % 4 === 1) this.spawnPickup("mouse", ex + 30, groundY - 50);
        if (si === 2 || si === segments.length - 2) {
          this.spawnPickup("secret", ex, groundY - 200);
        }
      });

      if (L.spikes) {
        segments.forEach((s, si) => {
          if (si > 1 && si % 3 === 0) {
            const hx = s.x * TILE + TILE;
            const sp = this.hazards.create(hx, groundY - 18, "spike");
            sp.refreshBody();
          }
        });
      }

      if (L.boulders) {
        this.boulderTimer = this.time.addEvent({
          delay: 2200,
          loop: true,
          callback: () => this.dropBoulder(),
        });
      }

      this.addPlatform(8 * TILE, groundY - 220, 3, pk);
      this.spawnPickup("secret", 8 * TILE + 60, groundY - 260);
      this.spawnPickup("mouse", 9 * TILE, groundY - 250);
    }

    /** Fixed key + exit + spawn platforms (exact design params) */
    ensureCoreRoute() {
      hasKeyItem = false;
      const groundY = H - 36;
      const pk = this.platKey();

      // Safe spawn ledge
      this.addPlatform(0, groundY, 7, pk);
      this.addPlatform(SAFE_SPAWN.x - TILE, SAFE_SPAWN.y + 48, 4, pk);

      // Key star platform + object at fixed position
      this.addPlatform(KEY_POS.x - TILE, KEY_POS.y + 48, 4, pk);
      this.spawnKeyStar(KEY_POS.x, KEY_POS.y);

      // Exit portal at X: 3000 (replace any prior exit)
      if (this.exit) {
        this.exit.destroy();
        this.exit = null;
      }
      this.addPlatform(EXIT_X - 2 * TILE, groundY, 6, pk);
      this.spawnExit(EXIT_X, groundY - 50);

      // Bridge toward exit on vertical themes so route is reachable
      if (this.level.vertical) {
        this.addPlatform(W - 40, groundY, Math.ceil((MAP_WIDTH - W) / TILE), pk);
      }
    }

    spawnKeyStar(x, y) {
      if (this.keyStar && this.keyStar.active) this.keyStar.destroy();
      this.keyStar = this.pickups.create(x, y, "keystar");
      this.keyStar.pickupType = "key";
      this.keyStar.body.setAllowGravity(false);
      this.tweens.add({
        targets: this.keyStar,
        y: y - 14,
        angle: 360,
        duration: 900,
        yoyo: true,
        repeat: -1,
      });
      this.add
        .text(x, y - 40, "KEY", {
          fontFamily: "Bangers",
          fontSize: "16px",
          color: "#ffe066",
        })
        .setOrigin(0.5);
    }

    buildVertical(pk) {
      const L = this.level;
      const worldH = L.length * TILE + 240;
      // staggered platforms going up
      let y = worldH - 60;
      this.addPlatform(0, y, 6, pk);
      this.playerSpawn = { x: 120, y: y - 40 };

      let row = 0;
      while (y > 120) {
        y -= Phaser.Math.Between(70, 100);
        const side = row % 2 === 0 ? 80 : W - 80 - 4 * TILE;
        const tiles = Phaser.Math.Between(3, 5);
        this.addPlatform(side, y, tiles, pk);
        // crates / ladders
        if (row % 2 === 1) {
          const crate = this.platforms.create(side + 20, y - 28, "crate");
          crate.refreshBody();
          const lad = this.ladders.create(side + tiles * TILE - 20, y - 40, "ladder");
          lad.refreshBody();
          lad.body.setSize(20, 48);
        }
        if (row % 3 === 0) this.spawnEnemy("bat", side + 60, y - 40, 0);
        if (row % 4 === 1) this.spawnPickup("fish", side + 40, y - 50);
        if (row % 5 === 2) this.spawnPickup("mouse", side + 80, y - 50);
        if (row === 4) this.spawnPickup("secret", side + 30, y - 80);
        row++;
      }

      if (L.gear) {
        this.spawnGear(L.gear, W / 2, 180);
      }

      // side walls feel
      this.add.rectangle(10, worldH / 2, 20, worldH, 0x143028, 0.5).setScrollFactor(1);
      this.add.rectangle(W - 10, worldH / 2, 20, worldH, 0x143028, 0.5).setScrollFactor(1);
    }

    buildArena(pk) {
      const groundY = H - 40;
      this.addPlatform(0, groundY, Math.ceil(W / TILE), pk);
      this.addPlatform(100, groundY - 120, 3, pk);
      this.addPlatform(W - 100 - 3 * TILE, groundY - 120, 3, pk);
      this.addPlatform(W / 2 - TILE, groundY - 200, 2, pk);
      this.spawnPickup("fish", W / 2, groundY - 240);
      this.spawnPickup("mouse", 150, groundY - 160);

      const kind =
        this.level.midBoss === "captain"
          ? "captain"
          : this.level.midBoss === "batQueen"
            ? "batQueen"
            : "mummyGuard";
      this.midBoss = this.spawnEnemy(kind, W / 2, groundY - 60, 0);
      this.midBoss.isBoss = true;
      this.midBoss.hp = kind === "captain" ? 180 : kind === "batQueen" ? 160 : 200;
      this.midBoss.maxHp = this.midBoss.hp;
      this.midBoss.setScale(kind === "batQueen" ? 1.2 : 1);
      if (kind === "batQueen") {
        this.midBoss.body.allowGravity = false;
        this.midBoss.y = 140;
      }
    }

    buildBossArena(pk) {
      const groundY = H - 40;
      this.addPlatform(0, groundY, Math.ceil(W / TILE), pk);
      this.addPlatform(80, groundY - 130, 2, pk);
      this.addPlatform(W - 80 - 2 * TILE, groundY - 130, 2, pk);
      this.addPlatform(W / 2 - TILE, groundY - 220, 2, pk);

      // torch glow sprites
      [100, W - 100, W / 2].forEach((tx, i) => {
        const glow = this.add.circle(tx, 90, 40, 0xff8a3d, 0.2).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: glow,
          alpha: { from: 0.15, to: 0.4 },
          scale: { from: 0.85, to: 1.25 },
          duration: 600 + i * 100,
          yoyo: true,
          repeat: -1,
        });
      });

      this.king = this.spawnEnemy("king", W / 2, groundY - 70, 0);
      this.king.isBoss = true;
      this.king.isKing = true;
      this.king.hp = 900;
      this.king.maxHp = 900;
      this.king.phase = 1;
      this.king.stunUntil = 0;
      this.king.attackCd = 0;
      this.king.setScale(1.1);
      this.spawnPickup("fish", 120, groundY - 170);
      this.spawnPickup("fish", W - 120, groundY - 170);
      this.spawnPickup("mouse", W / 2, groundY - 260);
    }

    spawnExit(x, y) {
      this.exit = this.physics.add.staticImage(x, y, "exit");
      this.exit.refreshBody();
      this.tweens.add({
        targets: this.exit,
        scale: { from: 0.95, to: 1.1 },
        alpha: { from: 0.85, to: 1 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
      const label = this.add
        .text(x, y - 48, "EXIT", {
          fontFamily: "Bangers",
          fontSize: "20px",
          color: "#4ec8ff",
        })
        .setOrigin(0.5);
      this.tweens.add({ targets: label, y: y - 56, duration: 800, yoyo: true, repeat: -1 });
    }

    spawnGear(type, x, y) {
      const key = type === "claws" ? "gear_claws" : type === "fire" ? "gear_fire" : "gear_shield";
      const g = this.pickups.create(x, y, key);
      g.pickupType = "gear";
      g.gearType = type;
      g.body.setAllowGravity(false);
      this.tweens.add({ targets: g, y: y - 12, duration: 700, yoyo: true, repeat: -1 });
      const names = { claws: "IRON CLAWS", fire: "FIRE TAIL", shield: "ANKH SHIELD" };
      this.add
        .text(x, y - 36, names[type], {
          fontFamily: "Exo 2",
          fontSize: "12px",
          color: "#ffc857",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
    }

    spawnPickup(type, x, y) {
      const key = type === "fish" ? "fish" : type === "mouse" ? "mouse" : "secret";
      const p = this.pickups.create(x, y, key);
      p.pickupType = type;
      p.body.setAllowGravity(false);
      this.tweens.add({
        targets: p,
        y: y - 8,
        duration: 600,
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 400),
      });
      return p;
    }

    spawnEnemy(kind, x, y, patrol) {
      const tex = "enemy_" + (kind === "mummyGuard" ? "mummyGuard" : kind);
      const e = this.enemies.create(x, y, tex);
      e.kind = kind;
      e.hp = kind === "zombie" ? 30 : kind === "rat" ? 15 : kind === "bat" ? 20 : kind === "mummy" ? 35 : 100;
      e.maxHp = e.hp;
      e.damage = kind === "bat" ? 8 : 12;
      e.patrol = patrol;
      e.homeX = x;
      e.dir = 1;
      e.setCollideWorldBounds(true);
      e.setBounce(0);
      e.setDepth(4);
      if (kind === "bat" || kind === "batQueen") {
        e.body.setAllowGravity(false);
        e.setVelocity(Phaser.Math.Between(-40, 40), 0);
      }
      return e;
    }

    spawnPlayer() {
      const cat = CATS[this.run.catId];
      const spawn = this.playerSpawn || SAFE_SPAWN;
      this.player = this.physics.add.sprite(spawn.x, spawn.y, "cat_" + cat.id);
      this.player.setCollideWorldBounds(true);
      this.player.setDepth(10);
      this.player.body.setSize(28, 36);
      this.player.body.setOffset(12, 10);
      this.playerMaxSpeed = cat.speed;
      this.playerJump = cat.jump;
      this.meleeDmg = cat.melee;
      this.defense = cat.defense;

      // glow trail
      this.trail = this.add.particles(0, 0, "particle", {
        follow: this.player,
        scale: { start: 0.35, end: 0 },
        alpha: { start: 0.45, end: 0 },
        lifespan: 280,
        frequency: 40,
        tint: cat.glow,
        blendMode: "ADD",
      });
      this.trail.setDepth(9);

      // Free camera left/right within X: 0 .. MAP_WIDTH (3200)
      const worldH = this.physics.world.bounds.height;
      this.cameras.main.setBounds(0, 0, MAP_WIDTH, worldH);
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
      this.cameras.main.setDeadzone(40, 40);
    }

    setupInput() {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
        F: Phaser.Input.Keyboard.KeyCodes.F,
        X: Phaser.Input.Keyboard.KeyCodes.X,
        SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
        ESC: Phaser.Input.Keyboard.KeyCodes.ESC,
      });

      this.input.mouse.disableContextMenu();
      this.input.on("pointerdown", (pointer) => {
        if (this.dead || this.won) return;
        if (pointer.rightButtonDown()) this.tryFireball();
        else if (pointer.leftButtonDown()) this.tryClaw();
      });

      this.keys.ESC.on("down", () => {
        if (this.scene.isPaused("Play")) return;
        this.scene.pause();
        this.scene.launch("Pause");
      });
    }

    setupCollisions() {
      this.physics.add.collider(this.player, this.platforms);
      this.physics.add.collider(this.enemies, this.platforms);
      this.physics.add.overlap(this.player, this.pickups, (_p, item) => this.collectPickup(item));
      this.physics.add.overlap(this.player, this.hazards, () => this.hurt(15, true));
      this.physics.add.overlap(this.player, this.enemies, (_p, e) => {
        if (e.stunUntil && this.time.now < e.stunUntil) return;
        this.hurt(e.damage || 10);
      });
      this.physics.add.overlap(this.projectiles, this.enemies, (shot, e) => {
        this.damageEnemy(e, shot.damage || 20, false);
        shot.destroy();
      });
      this.physics.add.overlap(this.player, this.enemyShots, (_p, shot) => {
        this.hurt(shot.damage || 12);
        shot.destroy();
      });
      if (this.exit) {
        this.physics.add.overlap(this.player, this.exit, () => this.tryClear());
      }
    }

    buildHUD() {
      this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(100);
      const panel = this.add.rectangle(W / 2, 28, W - 20, 48, 0x0a1018, 0.72).setStrokeStyle(1, 0xffc857, 0.35);
      this.hpText = this.add.text(20, 14, "", { fontFamily: "Exo 2", fontSize: "14px", color: "#ff5a6a", fontStyle: "bold" });
      this.scoreText = this.add.text(160, 14, "", { fontFamily: "Exo 2", fontSize: "14px", color: "#ffc857", fontStyle: "bold" });
      this.livesText = this.add.text(300, 14, "", { fontFamily: "Exo 2", fontSize: "14px", color: "#ff8a9a", fontStyle: "bold" });
      this.timerText = this.add.text(400, 14, "", { fontFamily: "Exo 2", fontSize: "14px", color: "#3dffb0", fontStyle: "bold" });
      this.keyText = this.add.text(520, 14, "", { fontFamily: "Exo 2", fontSize: "14px", color: "#ffe066", fontStyle: "bold" });
      this.levelText = this.add.text(W / 2, 10, this.level.label, {
        fontFamily: "Bangers",
        fontSize: "18px",
        color: "#4ec8ff",
      }).setOrigin(0.5, 0);
      this.objText = this.add.text(W / 2, 32, "Find KEY STAR → EXIT (45s)", {
        fontFamily: "Exo 2",
        fontSize: "12px",
        color: "#3dffb0",
        fontStyle: "bold",
      }).setOrigin(0.5, 0);
      this.gearText = this.add.text(W - 20, 14, "", {
        fontFamily: "Exo 2",
        fontSize: "13px",
        color: "#c8d0dc",
        fontStyle: "bold",
      }).setOrigin(1, 0);

      this.hpBarBg = this.add.rectangle(90, 40, 100, 8, 0x2a1010).setOrigin(0, 0.5);
      this.hpBar = this.add.rectangle(90, 40, 100, 8, 0xff5a6a).setOrigin(0, 0.5);

      this.hud.add([
        panel,
        this.hpText,
        this.scoreText,
        this.livesText,
        this.timerText,
        this.keyText,
        this.levelText,
        this.objText,
        this.gearText,
        this.hpBarBg,
        this.hpBar,
      ]);

      // gear icons
      this.iconClaws = this.add.image(W - 150, 40, "gear_claws").setScale(0.7).setAlpha(0.25).setScrollFactor(0).setDepth(101);
      this.iconFire = this.add.image(W - 110, 40, "gear_fire").setScale(0.7).setAlpha(0.25).setScrollFactor(0).setDepth(101);
      this.iconShield = this.add.image(W - 70, 40, "gear_shield").setScale(0.7).setAlpha(0.25).setScrollFactor(0).setDepth(101);

      this.safeBanner = this.add
        .text(W / 2, 80, "SAFE START — get ready!", {
          fontFamily: "Bangers",
          fontSize: "22px",
          color: "#3dffb0",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(102);

      this.bossHpBg = this.add.rectangle(W / 2, H - 24, 400, 14, 0x2a1010).setScrollFactor(0).setDepth(101).setVisible(false);
      this.bossHp = this.add.rectangle(W / 2 - 200, H - 24, 400, 14, 0xff5a6a).setOrigin(0, 0.5).setScrollFactor(0).setDepth(102).setVisible(false);
      this.bossLabel = this.add
        .text(W / 2, H - 42, "", { fontFamily: "Exo 2", fontSize: "12px", color: "#ffc857", fontStyle: "bold" })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(102)
        .setVisible(false);

      this.refreshHUD();
    }

    showIntro() {
      const card = this.add.container(W / 2, H / 2).setScrollFactor(0).setDepth(200);
      const bg = this.add.rectangle(0, 0, 520, 160, 0x0a1018, 0.92).setStrokeStyle(2, 0xffc857);
      const t = this.add
        .text(0, -40, this.level.title, { fontFamily: "Bangers", fontSize: "36px", color: "#ffc857" })
        .setOrigin(0.5);
      const s = this.add
        .text(0, 16, this.level.intro, {
          fontFamily: "Exo 2",
          fontSize: "15px",
          color: "#c8d0dc",
          align: "center",
          wordWrap: { width: 460 },
        })
        .setOrigin(0.5);
      card.add([bg, t, s]);
      this.time.delayedCall(2200, () => {
        this.tweens.add({
          targets: card,
          alpha: 0,
          y: H / 2 - 40,
          duration: 400,
          onComplete: () => card.destroy(),
        });
      });
    }

    refreshHUD() {
      const r = this.run;
      this.hpText.setText("HP");
      this.hpBar.scaleX = Phaser.Math.Clamp(r.hp / r.maxHp, 0, 1);
      this.scoreText.setText("SCORE " + r.score);
      this.livesText.setText("LIVES " + (r.lives != null ? r.lives : 3));
      this.timerText.setText("TIME " + Math.max(0, Math.ceil(this.levelTimer)));
      this.keyText.setText(hasKeyItem ? "KEY ✓" : "KEY ✗");
      const gearBits = [];
      if (r.claws) gearBits.push("CLAWS");
      if (r.fire) gearBits.push("FIRE " + r.ammo);
      if (r.shield > 0) gearBits.push("SHIELD " + r.shield);
      this.gearText.setText(gearBits.join(" · ") || "NO GEAR YET");
      this.iconClaws.setAlpha(r.claws ? 1 : 0.25);
      this.iconFire.setAlpha(r.fire ? 1 : 0.25);
      this.iconShield.setAlpha(r.shield > 0 ? 1 : 0.25);

      const boss = this.king || this.midBoss;
      if (boss && boss.active) {
        this.bossHpBg.setVisible(true);
        this.bossHp.setVisible(true);
        this.bossLabel.setVisible(true);
        this.bossHp.scaleX = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
        this.bossLabel.setText(
          boss.isKing
            ? `ZOMBIE CAT KING · PHASE ${boss.phase} · ${Math.ceil(boss.hp)} HP`
            : `${this.level.title} · ${Math.ceil(boss.hp)} HP`
        );
      }
    }

    collectPickup(item) {
      if (!item.active) return;
      const r = this.run;
      if (item.pickupType === "key") {
        hasKeyItem = true;
        this.floatText(item.x, item.y, "KEY GET!", "#ffe066");
        this.objText.setText("Key secured! Reach the EXIT portal.");
        this.cameras.main.flash(180, 255, 224, 102);
        r.score += 150;
        item.destroy();
        this.refreshHUD();
        return;
      }
      if (item.pickupType === "fish") {
        r.hp = Math.min(r.maxHp, r.hp + 25);
        r.score += 50;
        this.floatText(item.x, item.y, "+HP", "#ff5a6a");
      } else if (item.pickupType === "mouse") {
        r.mice++;
        if (r.fire) r.ammo += 3;
        else r.ammo += 1;
        r.score += 30;
        this.floatText(item.x, item.y, "+AMMO", "#ff8a3d");
      } else if (item.pickupType === "secret") {
        r.secrets++;
        r.score += 200;
        this.floatText(item.x, item.y, "SECRET +200", "#ffc857");
        this.cameras.main.flash(150, 255, 200, 87);
      } else if (item.pickupType === "gear") {
        if (item.gearType === "claws") {
          r.claws = true;
          this.floatText(item.x, item.y, "IRON CLAWS!", "#ffc857");
          this.objText.setText("Iron Claws unlocked! Grab the KEY, then EXIT.");
        } else if (item.gearType === "fire") {
          r.fire = true;
          r.ammo += 8;
          this.floatText(item.x, item.y, "FIRE TAIL!", "#ff8a3d");
          this.objText.setText("Fire Tail ready! Grab the KEY, then EXIT.");
        } else if (item.gearType === "shield") {
          r.shield = 3;
          this.floatText(item.x, item.y, "ANKH SHIELD!", "#4ec8ff");
          this.objText.setText("Shield online! Grab the KEY, then EXIT.");
        }
        r.score += 500;
        this.cameras.main.shake(200, 0.01);
      }
      item.destroy();
      this.refreshHUD();
    }

    hurt(amount, fromHazard) {
      if (this.dead || this.won) return;
      if (this.time.now < this.safeUntil) return;
      if (this.time.now < this.invulnUntil) return;
      const r = this.run;
      if (r.shield > 0) {
        r.shield--;
        this.floatText(this.player.x, this.player.y - 30, "SHIELD!", "#4ec8ff");
        this.invulnUntil = this.time.now + 1500;
        this.player.setTint(0x4ec8ff);
        this.time.delayedCall(1500, () => this.player.clearTint());
        this.refreshHUD();
        this.cameras.main.shake(100, 0.008);
        return;
      }
      const dmg = Math.max(1, amount - this.defense);
      r.hp -= dmg;
      this.invulnUntil = this.time.now + 1500;
      this.floatText(this.player.x, this.player.y - 30, "-" + dmg, "#ff5a6a");
      this.player.setTint(0xff5a6a);
      this.cameras.main.shake(160, fromHazard ? 0.015 : 0.01);
      this.time.delayedCall(1500, () => {
        if (this.player && this.player.active) this.player.clearTint();
      });
      // knockback
      this.player.setVelocityY(-220);
      this.player.setVelocityX(-this.facing * 160);
      this.refreshHUD();
      if (r.hp <= 0) this.die();
    }

    die() {
      this.GameOver();
    }

    GameOver() {
      if (this.dead) return;
      this.dead = true;
      if (this.player) {
        this.player.setTint(0x440000);
        this.player.setVelocity(0, 0);
      }
      if (this.trail) this.trail.stop();
      this.cameras.main.shake(400, 0.03);
      this.time.delayedCall(700, () => {
        this.scene.start("GameOver");
      });
    }

    handleFallOff() {
      if (this.dead || this.won) return;
      if (this.time.now < this.fallLockUntil) return;
      this.fallLockUntil = this.time.now + 500;

      this.run.lives = Math.max(0, (this.run.lives || 0) - 1);
      this.player.setVelocity(0, 0);
      this.player.setPosition(SAFE_SPAWN.x, SAFE_SPAWN.y);
      this.floatText(SAFE_SPAWN.x, SAFE_SPAWN.y - 40, "LIFE -1", "#ff5a6a");
      this.invulnUntil = this.time.now + 1500;
      this.refreshHUD();

      if (this.run.lives <= 0) {
        this.GameOver();
      }
    }

    tryClear() {
      if (this.won || this.dead) return;
      if (this.level.goal === "midBoss" || this.level.goal === "boss") return;

      if (!hasKeyItem) {
        this.player.setVelocityX(this.player.x > EXIT_X ? 180 : -180);
        this.objText.setText("Need the KEY STAR first! (at X 2200)");
        this.floatText(this.player.x, this.player.y - 40, "LOCKED — NEED KEY!", "#ff5a6a");
        return;
      }

      if (this.level.gear && this.level.gear === "claws" && !this.run.claws) {
        this.objText.setText("Grab Iron Claws first!");
        return;
      }
      if (this.level.gear && this.level.gear === "fire" && !this.run.fire) {
        this.objText.setText("Grab Fire Tail first!");
        return;
      }
      if (this.level.gear && this.level.gear === "shield" && this.run.shield <= 0) {
        this.objText.setText("Grab Ankh Shield first!");
        return;
      }
      this.clearLevel();
    }

    clearLevel() {
      if (this.won) return;
      this.won = true;
      this.run.score += 300;
      this.player.setVelocity(0, 0);
      this.cameras.main.flash(300, 62, 255, 176);
      this.time.delayedCall(500, () => this.scene.start("StageClear"));
    }

    tryClaw() {
      if (this.time.now < this.clawCd || this.dead || this.won) return;
      this.clawCd = this.time.now + 280;
      const cat = CATS[this.run.catId];
      let dmg = this.meleeDmg + (this.run.claws ? 12 : 0);
      const slash = this.add
        .image(this.player.x + this.facing * 28, this.player.y, "slash")
        .setTint(this.run.claws ? 0xffc857 : cat.glow)
        .setFlipX(this.facing < 0)
        .setDepth(12)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: slash,
        alpha: 0,
        scale: 1.4,
        duration: 180,
        onComplete: () => slash.destroy(),
      });

      // hit enemies in arc
      this.enemies.getChildren().forEach((e) => {
        if (!e.active) return;
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        if (Math.sign(dx) === this.facing || Math.abs(dx) < 20) {
          if (Math.abs(dx) < 70 && Math.abs(dy) < 50) {
            let crit = false;
            if (e.isKing && e.stunUntil && this.time.now < e.stunUntil) {
              dmg = Math.floor(dmg * 2.2);
              crit = true;
            }
            this.damageEnemy(e, dmg, crit);
          }
        }
      });
    }

    tryFireball() {
      if (!this.run.fire || this.run.ammo <= 0) return;
      if (this.time.now < this.fireCd || this.dead || this.won) return;
      this.fireCd = this.time.now + 320;
      this.run.ammo--;
      this.refreshHUD();
      const fb = this.projectiles.create(this.player.x + this.facing * 24, this.player.y, "fireball");
      fb.damage = 28;
      fb.body.setAllowGravity(false);
      fb.setVelocityX(this.facing * 420);
      fb.setDepth(11);
      this.time.delayedCall(1500, () => {
        if (fb.active) fb.destroy();
      });
      this.floatText(this.player.x, this.player.y - 20, "WHOOSH", "#ff8a3d");
    }

    damageEnemy(e, dmg, crit) {
      if (!e.active) return;
      e.hp -= dmg;
      this.floatText(e.x, e.y - 30, (crit ? "CRIT " : "") + dmg, crit ? "#ffc857" : "#ffffff");
      e.setTint(0xffffff);
      this.time.delayedCall(80, () => {
        if (e.active) e.clearTint();
      });
      this.cameras.main.shake(50, crit ? 0.012 : 0.004);
      this.run.score += Math.floor(dmg);
      if (e.hp <= 0) {
        this.killEnemy(e);
      }
      this.refreshHUD();
    }

    killEnemy(e) {
      const x = e.x;
      const y = e.y;
      const wasKing = e.isKing;
      const wasMid = e.isBoss && !e.isKing;
      // particles
      const burst = this.add.particles(x, y, "particle", {
        speed: { min: 40, max: 160 },
        scale: { start: 0.5, end: 0 },
        lifespan: 400,
        quantity: 12,
        tint: [0x3dffb0, 0xffc857, 0xff5a6a],
        emitting: false,
      });
      burst.explode(16);
      this.time.delayedCall(500, () => burst.destroy());
      e.destroy();
      this.run.score += wasKing ? 5000 : wasMid ? 1000 : 100;
      if (wasMid) {
        this.objText.setText("Mid-boss down! Stage clear!");
        this.time.delayedCall(600, () => this.clearLevel());
      }
      if (wasKing) {
        this.objText.setText("THE KING FALLS!");
        this.cameras.main.flash(500, 255, 200, 87);
        this.time.delayedCall(900, () => {
          this.won = true;
          this.scene.start("Victory");
        });
      }
      // chance fish on safe clear
      if (!wasKing && !wasMid && Math.random() < 0.25) {
        this.spawnPickup("fish", x, y - 10);
      }
      this.refreshHUD();
    }

    floatText(x, y, msg, color) {
      const t = this.add
        .text(x, y, msg, {
          fontFamily: "Exo 2",
          fontSize: "16px",
          color: color || "#ffffff",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(50);
      this.tweens.add({
        targets: t,
        y: y - 40,
        alpha: 0,
        duration: 700,
        onComplete: () => t.destroy(),
      });
    }

    dropBoulder() {
      if (this.dead || this.won || !this.player) return;
      const px = this.player.x + Phaser.Math.Between(-40, 200);
      const shadow = this.add.ellipse(px, H - 50, 40, 14, 0x000000, 0.45).setDepth(3);
      this.tweens.add({
        targets: shadow,
        scaleX: 1.4,
        alpha: 0.7,
        duration: 700,
        onComplete: () => {
          shadow.destroy();
          const rock = this.physics.add.image(px, -20, "crate");
          rock.setTint(0x8a7060);
          rock.setVelocityY(280);
          rock.setDepth(6);
          this.physics.add.overlap(this.player, rock, () => {
            if (rock.active) {
              this.hurt(18, true);
              rock.destroy();
            }
          });
          this.time.delayedCall(2500, () => {
            if (rock.active) rock.destroy();
          });
        },
      });
    }

    update(_t, dt) {
      if (this.dead || this.won || !this.player) return;
      const onGround = this.player.body.blocked.down || this.player.body.touching.down;
      if (onGround) this.canDouble = true;

      // movement
      let move = 0;
      if (this.cursors.left.isDown || this.keys.A.isDown) move = -1;
      if (this.cursors.right.isDown || this.keys.D.isDown) move = 1;
      this.player.setVelocityX(move * this.playerMaxSpeed);
      if (move !== 0) {
        this.facing = move;
        this.player.setFlipX(move < 0);
      }

      // climb ladders
      let onLadder = false;
      this.ladders.getChildren().forEach((lad) => {
        if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), lad.getBounds())) {
          onLadder = true;
        }
      });
      if (onLadder) {
        this.player.body.setAllowGravity(false);
        let vy = 0;
        if (this.cursors.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown) vy = -160;
        else if (this.cursors.down.isDown || this.keys.S.isDown) vy = 160;
        this.player.setVelocityY(vy);
      } else {
        this.player.body.setAllowGravity(true);
      }

      // variable jump
      const jumpPressed =
        Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.keys.W) ||
        Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
      const jumpDown = this.cursors.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown;

      if (jumpPressed && !onLadder) {
        if (onGround) {
          this.player.setVelocityY(-this.playerJump);
          this.jumpHeld = true;
        } else if (this.canDouble) {
          this.canDouble = false;
          this.player.setVelocityY(-this.playerJump * 0.9);
          this.jumpHeld = true;
          this.floatText(this.player.x, this.player.y, "DOUBLE!", "#4ec8ff");
        }
      }
      if (this.jumpHeld && !jumpDown && this.player.body.velocity.y < -80) {
        this.player.setVelocityY(this.player.body.velocity.y * 0.45);
        this.jumpHeld = false;
      }
      if (!jumpDown) this.jumpHeld = false;

      if (Phaser.Input.Keyboard.JustDown(this.keys.F)) this.tryClaw();
      if (Phaser.Input.Keyboard.JustDown(this.keys.X)) this.tryFireball();

      // safe banner
      if (this.time.now < this.safeUntil) {
        this.safeBanner.setVisible(true);
        this.safeBanner.setText("SAFE START " + Math.ceil((this.safeUntil - this.time.now) / 1000) + "s");
      } else {
        this.safeBanner.setVisible(false);
      }

      // invuln blink
      if (this.time.now < this.invulnUntil) {
        this.player.setAlpha(Math.sin(this.time.now / 50) > 0 ? 1 : 0.4);
      } else {
        this.player.setAlpha(1);
      }

      // 45s level timer
      this.levelTimer -= dt / 1000;
      if (this.levelTimer <= 0) {
        this.levelTimer = 0;
        this.GameOver();
        return;
      }

      // chase
      if (this.level.chase && this.chaseGroup) {
        this.chaseX += (this.level.chaseSpeed * dt) / 1000;
        this.chaseGroup.x = this.chaseX;
        this.chaseGroup.y = this.player.y + 20;
        if (this.player.x < this.chaseX + 40 && this.time.now > this.safeUntil) {
          this.hurt(18);
          this.chaseX = this.player.x - 160;
        }
      }

      // rising sludge
      if (this.sludge && this.level.rising) {
        this.sludgeLevel -= (this.level.risingSpeed * dt) / 1000;
        this.sludge.y = this.sludgeLevel + 60;
        this.sludge.body.updateFromGameObject();
        if (this.player.y > this.sludgeLevel - 10 && this.time.now > this.safeUntil) {
          this.hurt(20, true);
          this.player.setVelocityY(-300);
        }
      }

      // enemy AI
      this.enemies.getChildren().forEach((e) => this.updateEnemy(e, dt));

      // Fall off platforms: Y > 650 → lose life, reset velocity, teleport to spawn
      if (this.player.y > FALL_Y) {
        this.handleFallOff();
      }

      // Keep camera free within map bounds (follow already set; clamp player to map)
      this.player.x = Phaser.Math.Clamp(this.player.x, 16, MAP_WIDTH - 16);

      this.refreshHUD();
    }

    updateEnemy(e, dt) {
      if (!e.active) return;
      if (e.isKing) {
        this.updateKing(e, dt);
        return;
      }
      if (e.isBoss) {
        this.updateMidBoss(e, dt);
        return;
      }
      if (e.kind === "bat") {
        e.x += Math.sin(this.time.now / 400 + e.homeX) * 0.6;
        e.y += Math.cos(this.time.now / 500 + e.homeX) * 0.4;
        return;
      }
      if (e.patrol) {
        e.x += e.dir * 40 * (dt / 1000);
        if (Math.abs(e.x - e.homeX) > e.patrol) e.dir *= -1;
        e.setFlipX(e.dir < 0);
      }
    }

    updateMidBoss(e, dt) {
      if (e.kind === "batQueen") {
        e.x = W / 2 + Math.sin(this.time.now / 800) * 220;
        e.y = 130 + Math.cos(this.time.now / 600) * 30;
        if (!e.attackCd) e.attackCd = 0;
        e.attackCd -= dt;
        if (e.attackCd <= 0) {
          e.attackCd = 1600;
          const shot = this.enemyShots.create(e.x, e.y + 20, "fireball");
          shot.setTint(0x3dffb0);
          shot.damage = 14;
          shot.body.setAllowGravity(false);
          const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
          this.physics.velocityFromRotation(angle, 220, shot.body.velocity);
          this.time.delayedCall(3000, () => shot.active && shot.destroy());
        }
        return;
      }
      // captain / mummy — pace and leap
      if (!e.attackCd) e.attackCd = 0;
      e.attackCd -= dt;
      const dx = this.player.x - e.x;
      e.setVelocityX(Phaser.Math.Clamp(dx, -90, 90));
      e.setFlipX(dx < 0);
      if (e.attackCd <= 0 && Math.abs(dx) < 200) {
        e.attackCd = 2000;
        e.setVelocityY(-420);
        this.floatText(e.x, e.y - 40, "LEAP!", "#ff5a6a");
      }
    }

    updateKing(e, dt) {
      if (!e.attackCd) e.attackCd = 1000;
      e.attackCd -= dt;

      // phases
      const ratio = e.hp / e.maxHp;
      const phase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
      if (phase !== e.phase) {
        e.phase = phase;
        this.floatText(e.x, e.y - 60, "PHASE " + phase + "!", "#ffc857");
        this.cameras.main.shake(250, 0.02);
        this.objText.setText(
          phase === 2
            ? "Phase 2: dodge curse beams & stones!"
            : "Phase 3: RAGE! Keep firing and claw stun windows!"
        );
      }

      if (e.stunUntil && this.time.now < e.stunUntil) {
        e.setVelocityX(0);
        e.setTint(0xffc857);
        this.objText.setText("STUNNED — claw for CRIT!");
        return;
      }
      e.clearTint();

      const dx = this.player.x - e.x;
      const speed = 60 + e.phase * 35;
      e.setVelocityX(Phaser.Math.Clamp(dx, -speed, speed));
      e.setFlipX(dx < 0);

      if (e.attackCd > 0) return;
      e.attackCd = e.phase === 3 ? 900 : e.phase === 2 ? 1200 : 1600;
      const roll = Math.random();

      if (e.phase === 1 || (e.phase >= 2 && roll < 0.4)) {
        // pounce + minions
        e.setVelocityY(-480);
        this.floatText(e.x, e.y - 50, "POUNCE!", "#ff5a6a");
        this.time.delayedCall(500, () => {
          if (!e.active) return;
          e.stunUntil = this.time.now + 900;
          this.floatText(e.x, e.y - 40, "STUN WINDOW!", "#ffc857");
          // spawn minions
          for (let i = 0; i < e.phase; i++) {
            this.spawnEnemy("zombie", e.x + (i - 1) * 50, e.y, 30);
          }
        });
      } else if (e.phase >= 2 && roll < 0.75) {
        // curse beam
        this.floatText(e.x, e.y - 50, "CURSE BEAM!", "#3dffb0");
        const beam = this.add.rectangle(e.x, e.y, 20, 8, 0x3dffb0, 0.8).setDepth(8);
        this.physics.add.existing(beam);
        beam.body.setAllowGravity(false);
        beam.damage = 16;
        this.enemyShots.add(beam);
        const ang = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
        this.physics.velocityFromRotation(ang, 320, beam.body.velocity);
        this.tweens.add({
          targets: beam,
          scaleX: 8,
          duration: 400,
        });
        this.time.delayedCall(2000, () => beam.active && beam.destroy());
        // falling stones
        for (let i = 0; i < 3; i++) {
          this.time.delayedCall(i * 200, () => this.dropBoulder());
        }
      } else {
        // rage projectiles
        this.floatText(e.x, e.y - 50, "RAGE!", "#ff8a3d");
        for (let i = -1; i <= 1; i++) {
          const shot = this.enemyShots.create(e.x, e.y, "fireball");
          shot.setTint(0xff5a6a);
          shot.damage = 14;
          shot.body.setAllowGravity(false);
          shot.setVelocity(Math.sign(dx || 1) * 260, i * 80);
          this.time.delayedCall(2500, () => shot.active && shot.destroy());
        }
      }
    }
  }

  // ─── Stage Clear ───────────────────────────────────────────────────────────
  class StageClearScene extends Phaser.Scene {
    constructor() {
      super("StageClear");
    }
    create() {
      const run = this.registry.get("run");
      const cleared = LEVELS[run.levelIndex];
      run.levelIndex++;
      this.registry.set("run", run);

      this.add.rectangle(0, 0, W, H, 0x0a1018, 0.92).setOrigin(0);
      this.add
        .text(W / 2, 140, "STAGE CLEAR!", {
          fontFamily: "Bangers",
          fontSize: "64px",
          color: "#3dffb0",
        })
        .setOrigin(0.5);
      this.add
        .text(W / 2, 210, cleared.title + " complete", {
          fontFamily: "Exo 2",
          fontSize: "20px",
          color: "#ffc857",
        })
        .setOrigin(0.5);

      const next = LEVELS[run.levelIndex];
      const lines = [
        `Score: ${run.score}`,
        `Gear: ${[run.claws && "Iron Claws", run.fire && "Fire Tail", run.shield > 0 && "Ankh Shield"].filter(Boolean).join(" · ") || "—"}`,
        `Secrets found: ${run.secrets}`,
        next ? `Next: ${next.label} — ${next.title}` : "Victory!",
      ];
      this.add
        .text(W / 2, 300, lines.join("\n"), {
          fontFamily: "Exo 2",
          fontSize: "16px",
          color: "#c8d0dc",
          align: "center",
          lineSpacing: 8,
        })
        .setOrigin(0.5);

      const btn = this.add
        .rectangle(W / 2, 420, 260, 56, 0xff6b3d)
        .setStrokeStyle(2, 0xffc857)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(W / 2, 420, next ? "CONTINUE" : "VICTORY", {
          fontFamily: "Exo 2",
          fontSize: "22px",
          color: "#fff",
          fontStyle: "800",
        })
        .setOrigin(0.5);
      btn.on("pointerdown", () => {
        if (next) this.scene.start("Play");
        else this.scene.start("Victory");
      });
    }
  }

  // ─── Pause / GameOver / Victory ────────────────────────────────────────────
  class PauseScene extends Phaser.Scene {
    constructor() {
      super("Pause");
    }
    create() {
      this.add.rectangle(0, 0, W, H, 0x000000, 0.65).setOrigin(0);
      this.add
        .text(W / 2, 180, "PAUSED", { fontFamily: "Bangers", fontSize: "56px", color: "#ffc857" })
        .setOrigin(0.5);

      const resume = this.add
        .rectangle(W / 2, 280, 220, 50, 0xff6b3d)
        .setInteractive({ useHandCursor: true });
      this.add.text(W / 2, 280, "RESUME", { fontFamily: "Exo 2", fontSize: "20px", color: "#fff", fontStyle: "800" }).setOrigin(0.5);
      resume.on("pointerdown", () => {
        this.scene.stop();
        this.scene.resume("Play");
      });

      const sel = this.add
        .rectangle(W / 2, 350, 220, 50, 0x1a2438)
        .setStrokeStyle(2, 0x4ec8ff)
        .setInteractive({ useHandCursor: true });
      this.add.text(W / 2, 350, "CHANGE CAT", { fontFamily: "Exo 2", fontSize: "18px", color: "#4ec8ff", fontStyle: "bold" }).setOrigin(0.5);
      sel.on("pointerdown", () => {
        this.scene.stop("Play");
        this.scene.stop();
        this.scene.start("Select");
      });

      this.input.keyboard.once("keydown-ESC", () => {
        this.scene.stop();
        this.scene.resume("Play");
      });
    }
  }

  class GameOverScene extends Phaser.Scene {
    constructor() {
      super("GameOver");
    }
    create() {
      const run = this.registry.get("run");
      // keep gear & level on retry — restore HP
      run.hp = CATS[run.catId].maxHp;
      this.registry.set("run", run);

      this.add.rectangle(0, 0, W, H, 0x1a0808, 0.95).setOrigin(0);
      this.add
        .text(W / 2, 160, "DEFEATED…", { fontFamily: "Bangers", fontSize: "64px", color: "#ff5a6a" })
        .setOrigin(0.5);
      this.add
        .text(W / 2, 240, "Gear stays for this run. Try again!", {
          fontFamily: "Exo 2",
          fontSize: "18px",
          color: "#c8d0dc",
        })
        .setOrigin(0.5);

      const retry = this.add
        .rectangle(W / 2, 330, 240, 54, 0xff6b3d)
        .setInteractive({ useHandCursor: true });
      this.add.text(W / 2, 330, "RETRY STAGE", { fontFamily: "Exo 2", fontSize: "20px", color: "#fff", fontStyle: "800" }).setOrigin(0.5);
      retry.on("pointerdown", () => this.scene.start("Play"));

      const change = this.add
        .rectangle(W / 2, 400, 240, 50, 0x1a2438)
        .setStrokeStyle(2, 0x4ec8ff)
        .setInteractive({ useHandCursor: true });
      this.add.text(W / 2, 400, "CHANGE CAT", { fontFamily: "Exo 2", fontSize: "18px", color: "#4ec8ff" }).setOrigin(0.5);
      change.on("pointerdown", () => this.scene.start("Select"));
    }
  }

  class VictoryScene extends Phaser.Scene {
    constructor() {
      super("Victory");
    }
    create() {
      const run = this.registry.get("run");
      this.add.rectangle(0, 0, W, H, 0x0a1520, 1).setOrigin(0);

      for (let i = 0; i < 40; i++) {
        const star = this.add.circle(
          Phaser.Math.Between(0, W),
          Phaser.Math.Between(0, H),
          Phaser.Math.Between(2, 5),
          Phaser.Math.RND.pick([0xffc857, 0x4ec8ff, 0x3dffb0, 0xff8a3d]),
          0.8
        );
        this.tweens.add({
          targets: star,
          y: star.y + 200,
          alpha: 0,
          duration: Phaser.Math.Between(1500, 3500),
          delay: i * 40,
          repeat: -1,
        });
      }

      this.add
        .text(W / 2, 120, "VICTORY!", {
          fontFamily: "Bangers",
          fontSize: "72px",
          color: "#ffc857",
        })
        .setOrigin(0.5);
      this.add
        .text(W / 2, 190, "The Zombie Cat King is defeated.\nRemedies united. Night is saved!", {
          fontFamily: "Exo 2",
          fontSize: "18px",
          color: "#c8d0dc",
          align: "center",
        })
        .setOrigin(0.5);

      this.add
        .text(
          W / 2,
          280,
          [
            `Hero: ${CATS[run.catId].name}`,
            `Final Score: ${run.score}`,
            `Secrets: ${run.secrets} · Mice: ${run.mice}`,
            `Gear: Iron Claws · Fire Tail · Ankh Shield`,
          ].join("\n"),
          {
            fontFamily: "Exo 2",
            fontSize: "16px",
            color: "#3dffb0",
            align: "center",
            lineSpacing: 6,
            fontStyle: "bold",
          }
        )
        .setOrigin(0.5);

      const btn = this.add
        .rectangle(W / 2, 420, 260, 56, 0xff6b3d)
        .setStrokeStyle(2, 0xffc857)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(W / 2, 420, "PLAY AGAIN", {
          fontFamily: "Exo 2",
          fontSize: "22px",
          color: "#fff",
          fontStyle: "800",
        })
        .setOrigin(0.5);
      btn.on("pointerdown", () => this.scene.start("Select"));
    }
  }

  // ─── Boot game ─────────────────────────────────────────────────────────────
  const config = {
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: "game-container",
    backgroundColor: "#0a1018",
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 1400 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, TitleScene, SelectScene, PlayScene, StageClearScene, PauseScene, GameOverScene, VictoryScene],
  };

  function startGame() {
    try {
      window.ZombieCatGame = new Phaser.Game(config);
    } catch (err) {
      console.error("Zombie Cat failed to start:", err);
      const el = document.getElementById("game-container");
      if (el) {
        el.innerHTML =
          '<p style="color:#ff5a6a;padding:24px;font-family:Exo 2,sans-serif">Game failed to start. Check the console.</p>';
      }
    }
  }

  if (document.readyState === "complete") startGame();
  else window.addEventListener("load", startGame);
})();

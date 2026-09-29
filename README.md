# Zombie Cat

A browser action game for kids (~8–10): pick your cat, race through three worlds, collect remedies, and face the **Zombie Cat King**.

**Play live:** [katrine-fie.github.io/zombie-cat](https://katrine-fie.github.io/zombie-cat/) · **Repo:** [github.com/Katrine-Fie/zombie-cat](https://github.com/Katrine-Fie/zombie-cat)

---

## About the game

**Zombie Cat** is built with **Phaser 3** (Arcade Physics, CDN — no build step). Players choose one of three cats, clear **distinct stages per world** (not one endless corridor), beat mid-bosses, collect gear, and finish in a 3-phase final boss fight.

The fantasy is a **gear quest**: Iron Claws → Fire Tail → Ankh Shield → showdown with the King. Chase hordes and rising sludge force action — no idle wins.

---

## Product leadership & AI-native prototyping

This prototype was created by a **Senior Product Leader** focused on moving from idea to a playable experience quickly — without a traditional production team.

The workflow was **AI-native**: LLM-guided scope (audience, progression, fairness), iterative implementation in **Cursor**, and design refinement with models including **Gemini**. The result is a concrete portfolio piece for AI-accelerated product development.

---

## How to run

No install or bundler:

1. Clone or download the repo  
2. Open `index.html` in a modern browser, **or** use a simple static server (recommended)

```text
index.html   → shell + Phaser 3 CDN
style.css    → page chrome
game.js      → all scenes, worlds, combat, HUD
```

**GitHub Pages:** push to `main` — site updates at the URL above (may take a minute).

---

## Controls

| Action | Inputs |
|--------|--------|
| Move / climb | WASD / arrows |
| Jump (hold for height, double-jump) | Space / W / Up |
| Claw slash | **F** / left-click |
| Fireball | **X** / right-click (needs Fire Tail + ammo) |
| Pause | ESC |

**Cats** — click a card on the select screen to **start immediately**:

- **White Swift** — high speed, dash trail  
- **Red Brawler** — strongest melee  
- **Black Shadow** — highest HP / defense  

**Gear (persists for the run)**

- **Iron Claws** (World 1) — stronger melee / gold slash  
- **Fire Tail** (World 2) — fireballs; mice refill ammo  
- **Ankh Shield** (World 3) — absorbs 3 hits  

Fair for kids: 3s safe start, ~1.5s invulnerability after hits, Red Fish HP on safe platforms.

---

## Worlds & stages

| World | Stages | Feel | Gear / climax |
|-------|--------|------|----------------|
| 1 Rooftops | Rainy chase → Neon alley → **Horde Captain** mid-boss | Neon night, gaps, rats | Iron Claws |
| 2 Sewers | Pipe climb → Toxic reservoir → **Bat Matriarch** | Rising sludge, ladders | Fire Tail |
| 3 Desert | Approach → Spike corridor → **Mummy Guard** | Boulders, spikes, mummy rats | Ankh Shield |
| Final | Boss arena | Torch-lit tomb | **Zombie Cat King** (~900 HP, 3 phases) |

Secrets (stars) and mice reward exploration. On-screen **quest objectives** keep the gear fantasy clear.

---

## Tech stack

- **Phaser 3.80** via jsDelivr CDN  
- Arcade Physics, procedural/vector textures (no asset pipeline)  
- Vanilla HTML/CSS shell for GitHub Pages  

---

*Zombie Cat — portfolio prototype · [Play](https://katrine-fie.github.io/zombie-cat/) · [GitHub](https://github.com/Katrine-Fie/zombie-cat)*

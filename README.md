# Zombie Cat

A browser action game for kids (~8–10): pick your cat, race through three worlds, collect gear — and outrun the chase.

**Play:** [Open `index.html`](./index.html) · **Repo:** [github.com/Katrine-Fie/zombie-cat](https://github.com/Katrine-Fie/zombie-cat)

---

## About the game

**Zombie Cat** is an HTML5 Canvas prototype built with vanilla JavaScript. Players choose one of three cats (White, Red, Black), each with a distinct play style, then clear **3 worlds × 3 stages + boss** — 12 levels in total.

The loop is easy to grasp but keeps the pace high: jump gaps, fight threats, collect gear, and reach the EXIT before the chase catches you. World progression unlocks gear (Iron Claws, Fire Tail, Ankh Shield) and leads into world bosses.

---

## Product leadership & AI-native prototyping

This prototype was created by a **Senior Product Leader** focused on moving from idea to a playable experience quickly — without a traditional production team.

The workflow was **AI-native**:

| Stage | Approach |
|-------|----------|
| Idea & scope | LLM-guided specification (audience, feature set, progression) |
| Design → code | Iterative development in **Cursor** with AI-assisted implementation |
| Refinement | Feedback loops with LLMs (including **Gemini**) to sharpen gameplay, structure, and polish |

The outcome is a concrete, runnable prototype that shows how product leadership plus AI tools can shorten the path from brief to something you can play — a portfolio case for AI-accelerated product development.

---

## How to run

No build step or install:

1. Clone or download the repo  
2. Open `index.html` in a modern browser (Chrome, Edge, Firefox …)

```text
index.html   → title screen
style.css    → layout & UI
game.js      → game logic, levels, combat
```

> Tip: If the browser restricts local files, serve the folder with a simple local server (e.g. Live Server in VS Code / Cursor).

---

## Controls & core gameplay

| Action | Inputs |
|--------|--------|
| Move | WASD / arrow keys |
| Jump (double-jump) | Space |
| Claw (melee) | **F** / left-click |
| Fireball | **X** / right-click |
| Pause | ESC |

**Character select**

- **White Cat** — The Swift: fast runner  
- **Red Cat** — The Brawler: stronger melee  
- **Black Cat** — The Shadow: survival-oriented  

**Gear (collected along the way)**

- **Iron Claws** — melee  
- **Fire Tail** — fireballs (limited ammo)  
- **Ankh Shield** — protection  

Gear is typically kept on stage retry, so progression feels fair for the target age group.

---

## World structure (overview)

| World | Focus | Boss |
|-------|--------|------|
| World 1 — Deserted Rooftops | Jumps, mice, Iron Claws | Zombie Cat |
| World 2 — Toxic Sewers | Platforming, bats, Fire Tail | Armored Zombie Cat |
| World 3 — Ancient Egyptian Tombs | Hazards, Ankh Shield | Pharaoh King |

Each world: **3 stages + 1 boss**. Objectives and the HUD guide the player (collect gear → find EXIT → boss).

---

## Tech stack

- **HTML5 Canvas** — rendering  
- **Vanilla JavaScript** — game loop, input, level building, combat  
- **CSS** — HUD, panels, typography  
- No frameworks, bundlers, or backends — a deliberate choice for a fast prototype and easy sharing  

---

## Learnings & next steps

**What this case shows**

- A clear product brief (audience, loop, progression) can translate into a playable build with AI-assisted development  
- Scope discipline (one clear loop: chase → gear → exit → boss) keeps the prototype focused  

**Possible next steps**

- Audio, tutorials, and stronger onboarding for younger players  
- Balance tuning per cat and world  
- Saved progress / high score  
- Light deploy (GitHub Pages) for sharing without a download  

---

*Zombie Cat — portfolio prototype · [GitHub](https://github.com/Katrine-Fie/zombie-cat)*

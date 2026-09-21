import type { NewGame } from "@/db/schema";

/** New entries only are inserted. Existing catalogue edits are never overwritten. */
export const seedGames: NewGame[] = [
  {
    slug: "snake", title: "Snake ’97", tagline: "One more bite. One more round.",
    description: "A small tribute to the game that lived in your first phone. Eat, grow, and try not to meet your own tail. A lightweight, original browser demo with keyboard, swipe and touch controls. No download and no sign-in.",
    category: "Arcade", tags: "classic,retro,snake,quick play", accent: "#d4fb54", accent2: "#769333", glyph: "S", coverUrl: "/images/snake-cover.svg",
    source: "local", controls: "Arrow keys / WASD · Swipe on mobile · Space to pause", weight: "light", status: "live", featured: true, sortOrder: 1,
  },
  {
    slug: "tetris", title: "Tetris", tagline: "Less thinking. More fitting in.",
    description: "A simple falling-block demo. Rotate the pieces, clear complete rows and find your flow. Includes a ghost piece, next-piece preview, hold and touch controls. This independent demo is not affiliated with The Tetris Company.",
    category: "Puzzle", tags: "classic,blocks,puzzle,tetris,quick play", accent: "#c6acfa", accent2: "#614d99", glyph: "T", coverUrl: "/images/tetris-cover.svg",
    source: "local", controls: "← → move · ↑ rotate · Space drop · C hold · P pause", weight: "light", status: "live", featured: true, sortOrder: 2,
  },
  {
    slug: "midnight-drift", title: "Midnight Drift", tagline: "The city sleeps. You don’t.",
    description: "A late-night drive with nowhere to be. This is a concept slot for a future racing game, not a playable build. Save it to your library or join the release list.",
    category: "Racing", tags: "racing,drift,retro", accent: "#a0a2ff", accent2: "#4b4b93", glyph: "M", coverUrl: "/images/midnight-drift.png",
    source: "local", controls: "To be announced", weight: "medium", status: "soon", sortOrder: 3,
  },
  {
    slug: "orbit-zero", title: "Orbit Zero", tagline: "Out of orbit. Into the unknown.",
    description: "Space to get a little lost. A future home for an orbital adventure. This illustrated concept is coming soon; there is no playable build yet.",
    category: "Action", tags: "space,action,arcade", accent: "#f79b69", accent2: "#954c32", glyph: "O", coverUrl: "/images/orbit-zero.png",
    source: "local", controls: "To be announced", weight: "medium", status: "soon", sortOrder: 4,
  },
  {
    slug: "dusk-valley", title: "Dusk Valley", tagline: "Take the scenic way out.",
    description: "A quieter kind of adventure. This is a placeholder for a future exploration game, with no release date or playable build yet. Keep it on your radar by saving it.",
    category: "Adventure", tags: "adventure,cozy,exploration", accent: "#add3a0", accent2: "#527257", glyph: "D", coverUrl: "/images/dusk-valley.png",
    source: "local", controls: "To be announced", weight: "medium", status: "soon", sortOrder: 5,
  },
  {
    slug: "dead-pixel", title: "Dead Pixel", tagline: "Small hero. Very big problems.",
    description: "A little character with a whole universe to figure out. An upcoming action-game concept, waiting for its first build. Join the release list to follow the next chapter.",
    category: "Action", tags: "action,platformer,pixel", accent: "#9bdbea", accent2: "#3c717c", glyph: "D", coverUrl: "/images/dead-pixel.png",
    source: "local", controls: "To be announced", weight: "medium", status: "soon", sortOrder: 6,
  },
];

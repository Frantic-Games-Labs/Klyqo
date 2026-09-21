# Your game, on KLYQO

Snake and Tetris are the only bundled playable demos. All other catalogue entries are concepts.

For your own trusted browser build, use the protected `/admin` ZIP uploader, or deploy `public/games/<slug>/index.html` with relative asset paths. Pick same-domain delivery in the creator studio. The catalogue card opens a full-window panel with fullscreen, restart and a new-tab option.

Optional score bridge: send `{ type: 'klyqo:score', score: 1250 }` to the parent with `location.origin` as the target origin. The host verifies the sending frame. The built-in score API is for casual demos, not cheat-proof competition.

No game engine is loaded on the browsing page. Assets mount only when a player chooses a game. No pre-roll is imposed. Hardware, engine and asset optimisation still determine real performance.

See the project README for upload limits, persistent storage, WebAssembly/compressed assets, AdSense setup and privacy requirements.

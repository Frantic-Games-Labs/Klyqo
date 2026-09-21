# KLYQO — less scroll, more play

A rebuilt, independent arcade with two working samples (Snake ’97 and Tetris), four clearly labelled concept entries, a full-window player, keyboard/touch controls, personal bests, persistent favourites/recent history, PostgreSQL-backed scores and opt-ins, and a protected creator studio.

## Run / deploy

Use the normal Next.js build and start pipeline. Apply `npx drizzle-kit push` after the PostgreSQL environment is available. The catalogue migration runs once in a transaction, replaces only the previous eight demo entries, and never recreates games you delete later.

Set these server variables:
- `DATABASE_URL`: PostgreSQL connection.
- `ADMIN_SECRET`: private publisher key, at least 16 characters. `/admin` remains locked when unset. Publisher sessions last eight hours in a secure, HTTP-only, SameSite=Strict cookie. Use HTTPS.
- `GAME_STORAGE_DIR` (optional): persistent writable directory for uploaded game builds. Defaults to `storage/games`. Back it up and mount it on persistent storage; ephemeral/serverless filesystems are not durable upload storage.
- `PUBLISHER_CONTACT_EMAIL`: public operator contact on the privacy page.
- `NEXT_PUBLIC_SITE_URL`: public HTTPS canonical site URL for metadata and sitemap.

## Add a game

1. Sign in at `/admin` with the publisher key.
2. Enter a title, description, category, cover URL and controls.
3. For **same-domain** play: upload a standard ZIP containing `index.html` and browser assets, or deploy the build to `public/games/<slug>/index.html`. Uploaded archives may have one enclosing folder. Use relative asset paths and a real HTML5/WebGL/WebAssembly export (not a native executable).
4. Preview your build, then switch status from Coming soon to Live. The API checks for an entry point before publishing a local game.
5. Launching the catalogue card opens the game's own panel. Restart, fullscreen, a separate same-domain tab, Escape-to-close and personal bests are built in.

The ZIP endpoint is publisher-only, rate limited, rejects traversal and hidden paths, limits archives to 30 MB compressed / 150 MB expanded / 2,000 files, and replaces builds atomically. For larger engines, deploy directly to the persistent game directory. Only upload trusted code: local builds share this origin. Third-party iframes are sandboxed without same-origin access; games that need permissions or disallow embedding should use External new tab.

Uploaded files are streamed, support byte ranges, send the correct WebAssembly MIME and support precompressed `.br` / `.gz` builds. HTML revalidates; fingerprinted assets cache for a year. Use hashed asset filenames when updating a build. Deployments on read-only platforms should use object storage/CDN behind a same-domain route instead of the filesystem adapter.

Search, category, status, sort and pagination happen in PostgreSQL (24 maximum games per response). The home page renders twelve at a time. Favourites and recent history are stored on the visitor's device. Add database trigram indexes / full-text search and a shared rate limiter as traffic and catalogue size grow.

## Optional game bridge

Games can report a score with `parent.postMessage({ type: 'klyqo:score', score: 1250 }, location.origin)` and ask to close the panel with `{ type: 'klyqo:close' }`. The host checks the sending iframe and origin before accepting a message. Scores are rate limited and range checked, but demo scores are still client-reported, **not cheat-proof**. Use server-authoritative scoring for prizes or competitive rankings.

## Monetisation: page ads first

Display ads are deliberately outside the game UI. This build has no forced pre-roll, no mid-round interruptions, no fake skip timers, no auto-refresh, no popunders and no ads disguised as game cards. Only actual visible placements request ads, and new requests are suspended while the player is open. House placements earn nothing and make no network requests to Google.

Before enabling AdSense:
1. Obtain site approval. Two demos and concept artwork alone do not guarantee approval; add substantive original playable content and complete real publisher/legal information.
2. Create responsive display ad units in your real account. Configure `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-<your 16 digits>`, `NEXT_PUBLIC_ADSENSE_SLOT_COLLECTION=<numeric slot ID>` and optionally `NEXT_PUBLIC_ADSENSE_SLOT_FOOTER=<numeric slot ID>`.
3. Publish Google's certified consent message in **AdSense → Privacy & messaging** (or deploy another certified CMP). Configure regional privacy messages, the real operator contact, revocation and consent behaviour. Check this in the actual production region/device flow before serving ads. A homemade cookie popup is not a substitute for a certified CMP.
4. Disable automatic overlay formats, anchors and vignettes for this site's player experience.
5. Set `NEXT_PUBLIC_ADS_ENABLED=true` and rebuild. Next.js public variables are fixed at build time. `/ads.txt` then publishes the standard Google direct-seller line for your real publisher ID.
6. Verify numeric units, authorized domain, consent, ads.txt, mobile layout, reserved heights and placement spacing in production. Never test by clicking your own ads or generating invalid impressions.

Page advertising is the revenue foundation: editorial content, viewability, real returning traffic and controlled density. Catalogue display units are separated from click targets and delayed until actually in view. Public privacy controls can stop future ad requests on a device. The optional Footer slot is a reusable integration point and is not mounted by default at launch.

**In-game ads are not enabled.** If you later want opt-in rewarded or natural-break interstitial ads, apply separately for Google's H5 Games Ads and use its `adBreak` API plus real pause/resume/reward callbacks. Skip controls and fill are decided by Google, not by a custom timer. Do not put a standard AdSense unit into a game overlay.

No honest implementation can guarantee AdSense approval, revenue, fill, CPM, or zero lag on arbitrary hardware. Use your actual AdSense reports and load/retention data; test density slowly rather than increasing irritation.

## Release list

Signup forms record explicit email opt-in, game and timestamp in PostgreSQL. `/admin` exports opted-in entries as CSV for an email delivery service. **No automatic email delivery is configured.** Visitors can remove an address from stored release lists on `/privacy`. If you export lists, honor unsubscribe/deletion requests in that downstream service too.

## Name and artwork

KLYQO is a proposed name pronounced “click-oh.” An exact indexed-web search found no clear existing brand at development time. This is not trademark, company-name, social-handle or domain clearance; verify before commercial launch. Concept illustrations are not promises of playable titles. The independent falling-block demo is not affiliated with The Tetris Company; review naming and rights before commercial distribution.

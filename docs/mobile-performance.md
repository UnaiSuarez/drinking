# Mobile web performance

## Changes

- Vercel functions use cdg1 (Paris), beside the existing eu-west-3 database.
- Home queries for profile/membership run together. Room queries run in a group
  of seven after the room is found; league still waits for its season. The live
  night loads eight independent datasets together, after membership validation.
- Header/home/room/night share verified authentication within one React server
  render. No persistent or cross-user authentication cache is used.
- The level celebration is a separate client chunk loaded on demand.
- Medal artwork uses Next Image with lazy loading and a small requested size.
- Frame timelines and delayed effects pause offscreen and in background tabs.
- Pinch zoom is enabled. Existing artwork is reused for install icons.

## PWA

Run the normal build script, which invokes scripts/prepare-pwa.mjs before Next.
For a direct Next build, run that script first. It produces ignored
public/sw-build.js; Vercel uses the commit hash as the release ID.

The worker registers automatically in production, not in development. It checks
for updates on registration and on return to the tab (at most hourly).
Users choose when to activate a waiting update. Other tabs are not forced to
reload. Existing push notification support stays in the same worker.

Only hashed /_next/static/ assets and the public offline fallback are cached.
There is a limit of 80 runtime entries. Authenticated pages, RSC responses,
API responses, external requests and mutations are not cached or replayed.
An offline navigation shows a retry page, not an old authenticated page.
This is an installable web app, not a fully offline app.

## Verification

- node --test scripts/sw.test.mjs
- node node_modules/typescript/bin/tsc --noEmit
- node node_modules/eslint/bin/eslint.js <changed files>
- npm run build
- Check /sw.js and /sw-build.js return JavaScript without authentication,
  /offline.html returns HTML, and /manifest.webmanifest includes PNG icons.
- Check authenticated home, room, night and medals at mobile widths.
- Test installing, losing connectivity, and updating on real Android/iOS devices.

Query grouping is a structural improvement, not a measured latency percentage.
Do not compare next dev timings with production. Use the same authenticated
account/device/network when measuring before/after.

## Follow-up measurements

The historical room streak still reads record timestamps. For larger datasets,
measure it and move aggregation to the database with equivalent timezone rules.
Profile/statistics datasets and dense store catalogs should be profiled with
real account sizes before adding pagination or reducing visual effects.

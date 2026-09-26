import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

// Imported worker scripts are checked for updates too, so each release prompts
// existing installs without forcing an in-progress page to reload.
const release = process.env.VERCEL_GIT_COMMIT_SHA || randomUUID();
await writeFile("public/sw-build.js", `self.APP_BUILD = ${JSON.stringify(release)};\n`);

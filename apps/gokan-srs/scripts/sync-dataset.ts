import fs from 'fs';
import path from 'path';

// The compiled dataset now lives in the gokan-dataset submodule (apps/gokan-srs/dataset),
// not in this repo. This copies its output into public/data/compiled so Vite's public-dir
// passthrough and the existing runtime fetch('/data/compiled/...') calls keep working
// unchanged. Run automatically before dev/build (see package.json) - not committed to git.

const SRC = path.join(__dirname, '..', 'dataset', 'compiled');
const DEST = path.join(__dirname, '..', 'public', 'data', 'compiled');

if (!fs.existsSync(SRC)) {
    console.error(
        `[sync-dataset] Submodule not found at ${SRC}.\n` +
        `Run: git submodule update --init --recursive`
    );
    process.exit(1);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.cpSync(SRC, DEST, { recursive: true });

console.log(`[sync-dataset] Synced ${SRC} -> ${DEST}`);

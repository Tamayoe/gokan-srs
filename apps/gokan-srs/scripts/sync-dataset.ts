import fs from 'fs';
import path from 'path';

// The compiled dataset now lives in the gokan-dataset submodule (apps/gokan-srs/dataset),
// not in this repo. This copies its output into public/data/compiled so Vite's public-dir
// passthrough and the existing runtime fetch('/data/compiled/...') calls keep working
// unchanged. Run automatically before dev/build (see package.json) - not committed to git.

const SRC = path.join(__dirname, '..', 'dataset', 'compiled');
const DEST = path.join(__dirname, '..', 'public', 'data', 'compiled');
// Outside DEST (and outside public/ entirely) so it's never swept up by Vite's
// public-dir passthrough into dist/ and deployed - this is a build-time cache
// marker, not app data.
const MARKER = path.join(__dirname, '..', 'node_modules', '.cache', 'sync-dataset-signature');

if (!fs.existsSync(SRC)) {
    console.error(
        `[sync-dataset] Submodule not found at ${SRC}.\n` +
        `Run: git submodule update --init --recursive`
    );
    process.exit(1);
}

// A cheap staleness signature: the latest mtime across every file in SRC. Only
// stats files (no content reads), so it's fast even across tens of thousands
// of small files - orders of magnitude cheaper than the rm+cp this guards.
// Catches real rebuilds (build-data.ts rimrafs + recreates vocab/sentences/,
// build-kanji.ts/build-jlpt-index.ts overwrite their own files in place - both
// change an mtime this walk sees) but won't notice a file being deleted from
// SRC without anything else changing. If that ever happens (or you just don't
// trust the cache), delete public/data/compiled to force a full resync.
function latestMtimeMs(dir: string): number {
    let latest = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        latest = Math.max(latest, entry.isDirectory() ? latestMtimeMs(full) : fs.statSync(full).mtimeMs);
    }
    return latest;
}

const signature = String(latestMtimeMs(SRC));

if (fs.existsSync(DEST) && fs.existsSync(MARKER) && fs.readFileSync(MARKER, 'utf-8') === signature) {
    console.log('[sync-dataset] Already up to date, skipping.');
    process.exit(0);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.cpSync(SRC, DEST, { recursive: true });
fs.mkdirSync(path.dirname(MARKER), { recursive: true });
fs.writeFileSync(MARKER, signature);

console.log(`[sync-dataset] Synced ${SRC} -> ${DEST}`);

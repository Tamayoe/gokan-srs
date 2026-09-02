#!/usr/bin/env bun
// Content-addressed deploy of dist/ to the dictionary's S3 prefix.
//
// Replaces a three-pass `aws s3 sync`. Sync compares mtime by default, and CI rebuilds from a
// fresh checkout every run, so all ~38k generated pages looked new on every deploy: a deploy
// touching only the SRS app still re-uploaded the whole dictionary, ~20 minutes each time.
// `--size-only` is not a safe substitute here - see src/lib/deployManifest.ts for why it would
// silently leave every page pointing at a deleted stylesheet.
//
// Instead: hash every built file, compare against a manifest stored alongside the site in S3,
// and upload only what actually differs. A dataset change touching 200 entries uploads 200
// pages. The manifest is written LAST, so an interrupted deploy leaves the previous manifest in
// place and the next run simply redoes the work rather than believing files it never uploaded
// are present.
//
// Transfers go through the AWS CLI rather than the SDK: it is already installed and
// authenticated on the runner, and it parallelizes a directory upload far better than
// per-file calls would (spawning one `aws` process per file would take hours on a full run).
// Changed files are hardlinked into a staging tree so one recursive upload moves exactly the
// intended set.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
    diffManifests,
    groupByCacheControl,
    type BuildManifest,
} from '../src/lib/deployManifest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(APP_ROOT, 'dist');
const STAGE_DIR = path.join(APP_ROOT, '.deploy-stage');

const MANIFEST_KEY = '.build-manifest.json';
/** S3 caps a single delete-objects request at 1000 keys. */
const DELETE_BATCH_SIZE = 1000;

interface Args {
    bucket: string;
    prefix: string;
    /** Report what would be uploaded and deleted, touching nothing. */
    dryRun: boolean;
}

function parseArgs(): Args {
    const argv = process.argv.slice(2);
    const get = (flag: string): string | undefined => {
        const i = argv.indexOf(flag);
        return i === -1 ? undefined : argv[i + 1];
    };
    const dryRun = argv.includes('--dry-run');
    const bucket = get('--bucket');
    if (!bucket) throw new Error('usage: deploy-s3.ts --bucket <name> [--prefix dictionary] [--dry-run]');
    const prefix = (get('--prefix') ?? 'dictionary').replace(/^\/+|\/+$/g, '');
    return { bucket, prefix, dryRun };
}

function aws(args: string[], options: { allowFailure?: boolean } = {}): string | null {
    try {
        return execFileSync('aws', args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
        if (options.allowFailure) return null;
        throw error;
    }
}

/** Every file under dist/, as POSIX-separated paths relative to dist/. */
function listFiles(dir: string, base = dir): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...listFiles(full, base));
        else out.push(path.relative(base, full).split(path.sep).join('/'));
    }
    return out;
}

function buildManifest(files: string[]): BuildManifest {
    const manifest: BuildManifest = {};
    for (const file of files) {
        const hash = crypto.createHash('md5');
        hash.update(fs.readFileSync(path.join(DIST_DIR, file)));
        manifest[file] = hash.digest('hex');
    }
    return manifest;
}

function readRemoteManifest(bucket: string, prefix: string): BuildManifest | null {
    const uri = `s3://${bucket}/${prefix}/${MANIFEST_KEY}`;
    // A missing manifest is the expected case on the first deploy, so a failure here is not an
    // error: it just means "upload everything".
    const raw = aws(['s3', 'cp', uri, '-'], { allowFailure: true });
    if (raw === null) {
        console.log('[deploy] no previous manifest found, uploading everything.');
        return null;
    }
    try {
        return JSON.parse(raw) as BuildManifest;
    } catch {
        console.warn('[deploy] previous manifest is unreadable, uploading everything.');
        return null;
    }
}

/** Hardlinks (falling back to a copy) the given files into a clean staging tree. */
function stageFiles(files: string[]): void {
    fs.rmSync(STAGE_DIR, { recursive: true, force: true });
    for (const file of files) {
        const target = path.join(STAGE_DIR, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        const source = path.join(DIST_DIR, file);
        try {
            fs.linkSync(source, target);
        } catch {
            // Hardlinks fail across filesystems; a copy is correct either way, just slower.
            fs.copyFileSync(source, target);
        }
    }
}

function uploadGroup(bucket: string, prefix: string, files: string[], cacheControl: string): void {
    stageFiles(files);
    console.log(`[deploy] uploading ${files.length} file(s) with "${cacheControl}"...`);
    aws([
        's3', 'sync', STAGE_DIR, `s3://${bucket}/${prefix}/`,
        '--cache-control', cacheControl,
        '--no-progress',
    ]);
}

function deleteKeys(bucket: string, prefix: string, files: string[]): void {
    for (let i = 0; i < files.length; i += DELETE_BATCH_SIZE) {
        const batch = files.slice(i, i + DELETE_BATCH_SIZE);
        const payload = JSON.stringify({
            Objects: batch.map(file => ({ Key: `${prefix}/${file}` })),
            Quiet: true,
        });
        aws(['s3api', 'delete-objects', '--bucket', bucket, '--delete', payload]);
    }
    console.log(`[deploy] deleted ${files.length} stale object(s).`);
}

function main(): void {
    const { bucket, prefix, dryRun } = parseArgs();

    if (!fs.existsSync(DIST_DIR)) {
        throw new Error(`[deploy] ${DIST_DIR} not found - run the build first.`);
    }

    const files = listFiles(DIST_DIR);
    console.log(`[deploy] hashing ${files.length} built file(s)...`);
    const next = buildManifest(files);
    const previous = readRemoteManifest(bucket, prefix);

    const { changed, removed, unchanged } = diffManifests(previous, next);
    console.log(`[deploy] ${changed.length} changed, ${removed.length} removed, ${unchanged} unchanged.`);

    if (dryRun) {
        for (const [cacheControl, group] of groupByCacheControl(changed)) {
            console.log(`[deploy]   would upload ${group.length} file(s) with "${cacheControl}"`);
        }
        console.log(`[deploy]   would delete ${removed.length} object(s)`);
        console.log('[deploy] dry run, nothing was uploaded.');
        return;
    }

    if (changed.length === 0 && removed.length === 0) {
        console.log('[deploy] nothing to do; leaving the existing manifest in place.');
        return;
    }

    for (const [cacheControl, group] of groupByCacheControl(changed)) {
        uploadGroup(bucket, prefix, group, cacheControl);
    }

    if (removed.length > 0) deleteKeys(bucket, prefix, removed);

    // Written last, and only after every upload and delete has succeeded: if anything above
    // throws, the old manifest survives and the next deploy retries the same work.
    const manifestPath = path.join(APP_ROOT, '.build-manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(next));
    aws([
        's3', 'cp', manifestPath, `s3://${bucket}/${prefix}/${MANIFEST_KEY}`,
        '--cache-control', 'no-store',
        '--no-progress',
    ]);

    fs.rmSync(STAGE_DIR, { recursive: true, force: true });
    console.log(`[deploy] done: ${changed.length} uploaded, ${removed.length} deleted.`);
}

main();

// Pure diff logic behind the content-addressed deploy (see scripts/deploy-s3.ts).
//
// Why this exists: `aws s3 sync`'s default comparison uploads a file when the local mtime is
// newer than the S3 object's, and CI rebuilds from a fresh checkout every run, so every one of
// the ~38k generated pages looks new on every deploy. That made a deploy that touched only the
// SRS app still re-upload the entire dictionary, ~20 minutes each time.
//
// `--size-only` is NOT the fix, and this is the trap worth remembering: asset filenames are
// content-hashed to a fixed length, so a CSS-only change produces HTML of identical byte
// length. `--size-only` would skip every page, leaving all 38k of them pointing at a stylesheet
// filename that no longer exists. Comparing content hashes handles that case correctly and by
// construction: if the stylesheet's name changes, every page embedding it changes too.

/** Map of dist-relative path (POSIX separators, no leading slash) to a content hash. */
export type BuildManifest = Record<string, string>;

export interface ManifestDiff {
    /** Files to upload: new, or whose content changed. */
    changed: string[];
    /** Keys present in the previous deploy but no longer built, to delete. */
    removed: string[];
    unchanged: number;
}

export function diffManifests(previous: BuildManifest | null, next: BuildManifest): ManifestDiff {
    // No previous manifest (first deploy to this bucket, or a manifest we could not read) means
    // we cannot know what is already there, so everything is uploaded. That degrades to exactly
    // the old full-sync behaviour rather than risking a partial deploy.
    if (previous === null) {
        return { changed: Object.keys(next), removed: [], unchanged: 0 };
    }

    const changed: string[] = [];
    let unchanged = 0;
    for (const [file, hash] of Object.entries(next)) {
        if (previous[file] === hash) unchanged++;
        else changed.push(file);
    }

    const removed = Object.keys(previous).filter(file => !(file in next));

    return { changed, removed, unchanged };
}

/**
 * Cache-control for a dist-relative path.
 *
 * Only files under `assets/` may be immutable, and the rule is the filename: Vite content-hashes
 * everything it emits there, so changed content is always a new key and caching the old one
 * forever is harmless.
 *
 * Everything else keeps a stable filename and therefore must not be immutable, however rarely it
 * changes. `favicon.svg` is the cautionary case: the sibling gokan-srs deploy marked its own
 * unhashed root icons immutable, and a favicon fix then sat invisible behind a CloudFront copy
 * cached months earlier while the deploy reported success. An hour is long enough to be worth
 * caching and short enough that a stale copy heals itself.
 *
 * Page HTML always revalidates: it is the only thing that knows which hashed asset filenames are
 * current, so serving a stale page means serving links to assets that may already be pruned.
 */
export function cacheControlFor(file: string): string {
    if (file.endsWith('.html')) return 'public, max-age=0, must-revalidate';
    if (file.startsWith('assets/')) return 'public, max-age=31536000, immutable';
    return 'public, max-age=3600';
}

/** Groups files by the cache-control header they need, so each group uploads as one batch. */
export function groupByCacheControl(files: string[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    for (const file of files) {
        const header = cacheControlFor(file);
        const group = groups.get(header);
        if (group) group.push(file);
        else groups.set(header, [file]);
    }
    return groups;
}

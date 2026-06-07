const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '../../web/public/data/compiled');
const destPath = path.join(__dirname, '../android/app/src/main/assets/data/compiled');

if (!fs.existsSync(sourcePath)) {
    console.error(`Source directory not found: ${sourcePath}`);
    process.exit(1);
}

fs.mkdirSync(destPath, { recursive: true });

// ── Index files — copy as-is (only 4 files) ─────────────────────────────────
const indexSrc = path.join(sourcePath, 'index');
const indexDest = path.join(destPath, 'index');
fs.mkdirSync(indexDest, { recursive: true });

for (const entry of fs.readdirSync(indexSrc, { withFileTypes: true })) {
    if (entry.isFile()) {
        fs.copyFileSync(path.join(indexSrc, entry.name), path.join(indexDest, entry.name));
    }
}
console.log('✓ Index files copied');

// ── Vocab — bundle all 36k files into one JSON lookup map ───────────────────
// An APK is a ZIP file limited to 65535 entries; individual files would exceed
// that limit, so we merge them all into a single bundle loaded once at runtime.
const vocabSrc = path.join(sourcePath, 'vocab');
const vocabBundle = {};
const vocabFiles = fs.readdirSync(vocabSrc);

console.log(`Bundling ${vocabFiles.length} vocab files…`);
for (let i = 0; i < vocabFiles.length; i++) {
    const file = vocabFiles[i];
    if (!file.endsWith('.json')) continue;
    const id = file.slice(0, -5); // strip .json
    vocabBundle[id] = JSON.parse(fs.readFileSync(path.join(vocabSrc, file), 'utf8'));
    if ((i + 1) % 5000 === 0) process.stdout.write(`  ${i + 1}/${vocabFiles.length}\n`);
}

fs.writeFileSync(path.join(destPath, 'vocab-bundle.json'), JSON.stringify(vocabBundle));
const bundleSizeMb = (fs.statSync(path.join(destPath, 'vocab-bundle.json')).size / 1e6).toFixed(1);
console.log(`✓ vocab-bundle.json written (${bundleSizeMb} MB, ${vocabFiles.length} entries)`);

// ── Sentences — excluded from APK (891 MB uncompressed, impractical) ─────────
// The native FetchAdapter returns [] for all sentence paths. Meaning quizzes
// on mobile currently show vocab without example sentences.
console.log('⚠ Sentences skipped (891 MB — too large for APK assets)');

console.log('\nCopy complete!');

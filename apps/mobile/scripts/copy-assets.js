const fs = require('fs');
const path = require('path');

function copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

const sourcePath = path.join(__dirname, '../../web/public/data/compiled');
const destPath = path.join(__dirname, '../android/app/src/main/assets/data/compiled');

if (fs.existsSync(sourcePath)) {
    console.log(`Copying data from ${sourcePath} to ${destPath}...`);
    copyDirectory(sourcePath, destPath);
    console.log('Copy complete!');
} else {
    console.error(`Source directory not found: ${sourcePath}`);
    process.exit(1);
}

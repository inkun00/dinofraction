const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const TARGET_DIRS = [
  path.join(REPO_ROOT, 'godot_dinofraction', 'assets'),
  path.join(REPO_ROOT, 'public', 'godot'),
];
const OXIPNG = process.env.OXIPNG_BIN || (process.platform === 'win32' ? 'oxipng.exe' : 'oxipng');

function walkPngFiles(root, output = []) {
  if (!fs.existsSync(root)) return output;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) walkPngFiles(fullPath, output);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) output.push(fullPath);
  }
  return output;
}

function sizeOf(files) {
  return files.reduce((total, filePath) => total + fs.statSync(filePath).size, 0);
}

const versionCheck = spawnSync(OXIPNG, ['--version'], { encoding: 'utf8' });
if (versionCheck.error || versionCheck.status !== 0) {
  console.error(
    'OxiPNG is required for pixel-preserving image optimization. Install it from ' +
    'https://github.com/oxipng/oxipng/releases and add it to PATH, or set OXIPNG_BIN.',
  );
  process.exit(1);
}

const files = TARGET_DIRS.flatMap((targetDir) => walkPngFiles(targetDir)).sort();
const beforeBytes = sizeOf(files);
const batchSize = 30;

for (let index = 0; index < files.length; index += batchSize) {
  const batch = files.slice(index, index + batchSize);
  const result = spawnSync(
    OXIPNG,
    ['-o', 'max', '--strip', 'safe', '--preserve', ...batch],
    { stdio: 'inherit' },
  );
  if (result.error || result.status !== 0) {
    console.error(`OxiPNG failed while processing batch ${Math.floor(index / batchSize) + 1}.`);
    process.exit(result.status || 1);
  }
}

const afterBytes = sizeOf(files);
const savedBytes = beforeBytes - afterBytes;
const savedPercent = beforeBytes > 0 ? ((savedBytes / beforeBytes) * 100).toFixed(2) : '0.00';

console.log(`Losslessly optimized ${files.length} PNG files.`);
console.log(`Before: ${beforeBytes} bytes`);
console.log(`After:  ${afterBytes} bytes`);
console.log(`Saved:  ${savedBytes} bytes (${savedPercent}%)`);

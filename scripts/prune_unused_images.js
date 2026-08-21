const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const GODOT_ROOT = path.join(REPO_ROOT, 'godot_dinofraction');
const APPLY = process.argv.includes('--apply');
const IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.svg', '.ico', '.psd',
]);

function walkFiles(root, output = []) {
  if (!fs.existsSync(root)) return output;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '.git' && entry.name !== 'node_modules' && entry.name !== '.next') {
        walkFiles(fullPath, output);
      }
    } else if (entry.isFile()) {
      output.push(fullPath);
    }
  }
  return output;
}

function isImage(filePath) {
  return IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function normalizeRelative(filePath) {
  return path.relative(REPO_ROOT, filePath).split(path.sep).join('/');
}

function assertInsideRepo(filePath) {
  const relative = path.relative(REPO_ROOT, filePath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to modify a path outside the repository: ${filePath}`);
  }
}

function collectGodotImageReferences() {
  const keep = new Set();
  const sourceFiles = walkFiles(GODOT_ROOT).filter((filePath) =>
    ['.gd', '.tscn', '.tres', '.godot'].includes(path.extname(filePath).toLowerCase()),
  );
  const resourcePattern = /res:\/\/([^"'\s\]]+?\.(?:png|jpe?g|webp|gif|bmp|tiff?|svg|ico|psd))/gi;

  for (const sourceFile of sourceFiles) {
    const content = fs.readFileSync(sourceFile, 'utf8');
    for (const match of content.matchAll(resourcePattern)) {
      if (!match[1].includes('%')) {
        keep.add(`godot_dinofraction/${match[1].replaceAll('\\', '/')}`);
      }
    }
  }

  // These resources are loaded from paths assembled at runtime, so static scanning cannot see them.
  for (let index = 1; index <= 30; index += 1) {
    const id = `dino_${String(index).padStart(2, '0')}`;
    for (const animation of ['run', 'jump', 'attack']) {
      keep.add(`godot_dinofraction/assets/sprites/dinos/${id}_${animation}.png`);
    }
    keep.add(`godot_dinofraction/assets/sprites/dinos/${id}_icon.png`);
  }

  return keep;
}

function removeEmptyDirectories(root) {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirectories(path.join(root, entry.name));
  }
  if (root !== REPO_ROOT && fs.readdirSync(root).length === 0) fs.rmdirSync(root);
}

const requiredImages = collectGodotImageReferences();
for (const runtimeImage of [
  'public/godot/index.png',
  'public/godot/index.icon.png',
  'public/godot/index.apple-touch-icon.png',
]) {
  requiredImages.add(runtimeImage);
}

const allImages = walkFiles(REPO_ROOT).filter(isImage);
const missingRequiredImages = [...requiredImages]
  .filter((relativePath) => !fs.existsSync(path.join(REPO_ROOT, ...relativePath.split('/'))))
  .sort();
const candidates = allImages
  .filter((filePath) => !requiredImages.has(normalizeRelative(filePath)))
  .sort((a, b) => normalizeRelative(a).localeCompare(normalizeRelative(b)));

let totalBytes = 0;
const deletedFiles = [];
for (const filePath of candidates) {
  assertInsideRepo(filePath);
  totalBytes += fs.statSync(filePath).size;
  if (APPLY) {
    fs.unlinkSync(filePath);
    deletedFiles.push(normalizeRelative(filePath));

    const importSidecar = `${filePath}.import`;
    if (fs.existsSync(importSidecar)) {
      assertInsideRepo(importSidecar);
      fs.unlinkSync(importSidecar);
      deletedFiles.push(normalizeRelative(importSidecar));
    }
  }
}

if (APPLY) {
  for (const root of [
    path.join(REPO_ROOT, 'image'),
    path.join(REPO_ROOT, 'public', 'images'),
    path.join(GODOT_ROOT, 'assets'),
    path.join(GODOT_ROOT, 'public'),
  ]) {
    removeEmptyDirectories(root);
  }
}

console.log(JSON.stringify({
  mode: APPLY ? 'apply' : 'dry-run',
  requiredImageCount: requiredImages.size,
  missingRequiredImageCount: missingRequiredImages.length,
  missingRequiredImages,
  candidateImageCount: candidates.length,
  candidateBytes: totalBytes,
  candidateMiB: Number((totalBytes / 1024 / 1024).toFixed(2)),
  deletedFileCount: deletedFiles.length,
  candidates: candidates.map(normalizeRelative),
}, null, 2));

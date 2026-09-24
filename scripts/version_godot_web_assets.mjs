import {createHash} from 'node:crypto';
import {readFile, readdir, rename, unlink, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const webDirectory = resolve('public/godot');
const htmlPath = resolve(webDirectory, 'index.html');
const wasmPath = resolve(webDirectory, 'index.wasm');
const packPath = resolve(webDirectory, 'index.pck');
const audioWorkletPath = resolve(webDirectory, 'index.audio.worklet.js');
const positionWorkletPath = resolve(
  webDirectory,
  'index.audio.position.worklet.js',
);
const vercelConfigPath = resolve('vercel.json');

const [wasm, pack, htmlSource] = await Promise.all([
  readFile(wasmPath),
  readFile(packPath),
  readFile(htmlPath, 'utf8'),
]);
const version = createHash('sha256')
  .update(wasm)
  .update(pack)
  .digest('hex')
  .slice(0, 12);
const executable = `index-${version}`;

for (const fileName of await readdir(webDirectory)) {
  if (/^index-[a-f0-9]{12}\.(?:wasm|pck|audio(?:\.position)?\.worklet\.js)$/.test(fileName)) {
    await unlink(resolve(webDirectory, fileName));
  }
}

const html = htmlSource
  .replace(/"executable":"[^"]+"/, `"executable":"${executable}"`)
  .replace(
    /"fileSizes":\{[^}]+\}/,
    `"fileSizes":{"${executable}.pck":${pack.length},"${executable}.wasm":${wasm.length}}`,
  );
if (html === htmlSource || !html.includes(`"executable":"${executable}"`)) {
  throw new Error('Could not update GODOT_CONFIG in public/godot/index.html');
}

await Promise.all([
  rename(wasmPath, resolve(webDirectory, `${executable}.wasm`)),
  rename(packPath, resolve(webDirectory, `${executable}.pck`)),
  rename(audioWorkletPath, resolve(webDirectory, `${executable}.audio.worklet.js`)),
  rename(
    positionWorkletPath,
    resolve(webDirectory, `${executable}.audio.position.worklet.js`),
  ),
  writeFile(htmlPath, html, 'utf8'),
]);

const vercelConfig = JSON.parse(await readFile(vercelConfigPath, 'utf8'));
vercelConfig.headers ??= [];
const immutableRule = {
  source: '/godot/index-([a-f0-9]{12})(.*)',
  headers: [
    {
      key: 'Cache-Control',
      value: 'public, max-age=31536000, immutable',
    },
  ],
};
const ruleIndex = vercelConfig.headers.findIndex(
  (rule) => rule.source === immutableRule.source,
);
if (ruleIndex >= 0) vercelConfig.headers[ruleIndex] = immutableRule;
else vercelConfig.headers.unshift(immutableRule);
await writeFile(vercelConfigPath, `${JSON.stringify(vercelConfig, null, 2)}\n`, 'utf8');

console.log(
  `Versioned Godot assets as ${executable} ` +
  `(${(wasm.length / 1024 / 1024).toFixed(2)} MiB wasm, ` +
  `${(pack.length / 1024 / 1024).toFixed(2)} MiB pck)`,
);

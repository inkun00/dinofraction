import assert from 'node:assert/strict';
import {existsSync, readFileSync, statSync} from 'node:fs';
import test from 'node:test';
import {resolve} from 'node:path';

const publicGodot = resolve('public/godot');
const html = readFileSync(resolve(publicGodot, 'index.html'), 'utf8');
const configMatch = html.match(/const GODOT_CONFIG = (\{.+\});/);
if (!configMatch) throw new Error('GODOT_CONFIG not found in web export');
const config = JSON.parse(configMatch[1]) as {
  executable: string;
  fileSizes: Record<string, number>;
};

test('Godot web export uses content-versioned engine assets', () => {
  assert.match(config.executable, /^index-[a-f0-9]{12}$/);
  assert.equal(existsSync(resolve(publicGodot, 'index.wasm')), false);
  assert.equal(existsSync(resolve(publicGodot, 'index.pck')), false);

  for (const extension of [
    'wasm',
    'pck',
    'audio.worklet.js',
    'audio.position.worklet.js',
  ]) {
    const fileName = `${config.executable}.${extension}`;
    const filePath = resolve(publicGodot, fileName);
    assert.equal(existsSync(filePath), true, `${fileName} must exist`);
    if (extension === 'wasm' || extension === 'pck') {
      assert.equal(config.fileSizes[fileName], statSync(filePath).size);
    }
  }
});

test('large versioned assets receive immutable browser caching', () => {
  const vercel = JSON.parse(readFileSync(resolve('vercel.json'), 'utf8')) as {
    headers: Array<{
      source: string;
      headers: Array<{key: string; value: string}>;
    }>;
  };
  const rule = vercel.headers.find((entry) =>
    entry.source.includes('index-'),
  );
  assert.ok(rule);
  assert.ok(rule.headers.some(
    (header) =>
      header.key === 'Cache-Control' &&
      header.value === 'public, max-age=31536000, immutable',
  ));
});

test('web pack stays below the transfer budget', () => {
  const packSize = statSync(resolve(publicGodot, `${config.executable}.pck`)).size;
  const fontSize = statSync(
    resolve('godot_dinofraction/assets/fonts/GameFontBold.ttf'),
  ).size;
  assert.ok(packSize < 12 * 1024 * 1024, `PCK is ${(packSize / 1024 / 1024).toFixed(2)} MiB`);
  assert.ok(fontSize < 3 * 1024 * 1024, `font is ${(fontSize / 1024 / 1024).toFixed(2)} MiB`);
});

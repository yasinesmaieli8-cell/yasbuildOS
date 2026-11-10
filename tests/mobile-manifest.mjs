import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const manifest=JSON.parse(await readFile('manifest.webmanifest','utf8'));
const html=await readFile('index.html','utf8');
assert.equal(manifest.name.startsWith('YasBuildOS'),true);
assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
assert.ok(html.includes('rel="manifest" href="manifest.webmanifest"'));
assert.ok((await readFile('mobile-help.js','utf8')).includes('نصب یا افزودن به صفحه اصلی'));
for(const icon of manifest.icons){const png=await readFile(icon.src);assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);const [w,h]=icon.sizes.split('x').map(Number);assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h);}
console.log('PASS mobile manifest, relative scope, icons and Android instructions');

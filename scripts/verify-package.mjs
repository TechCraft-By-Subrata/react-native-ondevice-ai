import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));

for (const path of [pkg.main, pkg.types, 'android/src/main/AndroidManifest.xml', 'react-native-ondevice-ai.podspec']) {
  await access(new URL(path, root));
}

if (pkg.main.endsWith('.ts')) throw new Error('Package main must be compiled JavaScript.');
if (!pkg.files.includes('lib')) throw new Error('Compiled output is missing from the publish allowlist.');
if (pkg.files.includes('android') || pkg.files.includes('ios')) {
  throw new Error('Broad native directories would publish local build artifacts.');
}

console.log('Package structure verified.');

import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('package exposes compiled JavaScript and declarations', async () => {
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  assert.equal(pkg.main, 'lib/index.js');
  assert.equal(pkg.types, 'lib/index.d.ts');
  assert.equal(pkg.publishConfig.access, 'public');
});

test('native source allowlist excludes build directories', async () => {
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  assert.ok(!pkg.files.includes('android'));
  assert.ok(!pkg.files.includes('ios'));
  assert.ok(pkg.files.includes('android/src/main/java'));
  assert.ok(pkg.files.includes('ios/vendor/CLiteRTLM.xcframework'));
});

test('compiled package exposes audio inference and recording APIs', async () => {
  const declarations = await readFile(new URL('lib/index.d.ts', root), 'utf8');
  assert.match(declarations, /generateTextWithAudio/);
  assert.match(declarations, /startAudioRecording/);
  assert.match(declarations, /stopAudioRecording/);
  assert.match(declarations, /cancelAudioRecording/);
  assert.match(declarations, /pickAudioFile/);
});

test('compiled package exposes LiteRT-LM 0.16 lifecycle and streaming APIs', async () => {
  const declarations = await readFile(new URL('lib/index.d.ts', root), 'utf8');
  for (const api of [
    'generateTextStream',
    'cancelTextGeneration',
    'resetConversation',
    'unloadModel',
    'getLiteRTLMCapabilities',
    'getLiteRTLMRuntimeInfo',
    'benchmarkLiteRTLM',
  ]) assert.match(declarations, new RegExp(api));
});

test('object detection is not part of this package', async () => {
  const [declarations, pkg, podspec, gradle] = await Promise.all([
    readFile(new URL('lib/index.d.ts', root), 'utf8'),
    readFile(new URL('package.json', root), 'utf8'),
    readFile(new URL('react-native-ondevice-ai.podspec', root), 'utf8'),
    readFile(new URL('android/build.gradle', root), 'utf8'),
  ]);
  for (const content of [declarations, pkg, podspec, gradle]) {
    assert.doesNotMatch(content, /YOLO|yolo|detectObjects|TensorFlowLite/i);
  }
});

test('AI-assisted development entry points are present and publishable', async () => {
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  for (const path of [
    'AGENTS.md',
    'CLAUDE.md',
    'CONTRIBUTING.md',
    'llms.txt',
    'docs',
    'example',
  ]) {
    assert.ok(pkg.files.includes(path), `${path} must be included in npm files`);
  }

  const [agents, claude, copilot, llms] = await Promise.all([
    readFile(new URL('AGENTS.md', root), 'utf8'),
    readFile(new URL('CLAUDE.md', root), 'utf8'),
    readFile(new URL('.github/copilot-instructions.md', root), 'utf8'),
    readFile(new URL('llms.txt', root), 'utf8'),
  ]);
  assert.match(agents, /canonical instruction file/i);
  assert.match(claude, /AGENTS\.md/);
  assert.match(copilot, /AGENTS\.md/);
  assert.match(llms, /AGENTS\.md/);
});

test('public availability type is exported from the package root', async () => {
  const declarations = await readFile(new URL('lib/index.d.ts', root), 'utf8');
  assert.match(
    declarations,
    /SystemLanguageModelAvailability[^}]*} from '\.\/types'/,
  );
});

test('automatic tool calling has a safe native default', async () => {
  const [android, ios] = await Promise.all([
    readFile(
      new URL(
        'android/src/main/java/com/tcbs/reactnativegemma/TcbsGemmaModule.kt',
        root,
      ),
      'utf8',
    ),
    readFile(new URL('ios/TcbsGemmaModule.swift', root), 'utf8'),
  ]);
  assert.match(android, /automaticToolCalling\s*=.*\?: false/);
  assert.match(ios, /automaticToolCalling:.*\?\? false/);
});

test('iOS serializes access to the shared LiteRT-LM engine', async () => {
  const ios = await readFile(new URL('ios/TcbsGemmaModule.swift', root), 'utf8');
  assert.match(ios, /inferenceQueue = DispatchQueue/);
  assert.match(ios, /enqueueInferenceOperation/);
  assert.doesNotMatch(ios, /automaticToolCalling:.*\?\? true/);
});

test('iOS guards the upstream Int32 sampler-seed trap', async () => {
  const ios = await readFile(new URL('ios/TcbsGemmaModule.swift', root), 'utf8');
  assert.match(ios, /seed: normalizedSamplerSeed\(options\)/);
  assert.match(ios, /seed % upperBound/);
});

test('obsolete SwiftPM integration files are absent', async () => {
  for (const path of ['Package.swift', 'LITERT_SETUP.md', 'ios/setup-litert.sh']) {
    await assert.rejects(access(new URL(path, root)));
  }
});

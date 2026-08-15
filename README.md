# @tcbs/react-native-ondevice-ai

Production-oriented React Native bindings for Google LiteRT-LM 0.16.0, generic
model-file management, and multimodal Gemma inference. The package runs
inference locally and does not upload prompts or media.

## Highlights

- Text, image, and audio generation with one conversational native engine
- Google LiteRT-LM 0.16.0 on Android and the official 0.16.0 iOS XCFramework
- CPU/GPU backend selection plus Android NPU and Google Tensor backends
- Sampling, deterministic seeds, output/context limits, LoRA, thinking,
  repetition controls, no-repeat n-grams, and constrained responses
- Regex and JSON Schema output, reasoning channels, and parsed tool calls
- Speculative-decoding capability checks and experimental decoding controls
- Explicit conversation reset, model unload, token count, and runtime status
- Download recovery, storage checks, import/export, speech/audio helpers, OCR,
  and Apple system-language-model integration

## Compatibility

| Requirement | Supported |
| --- | --- |
| React Native | 0.72 or newer (legacy Native Module bridge) |
| React | 18 or newer |
| Android | API 24+, compile SDK 34+ |
| iOS | 15.0+ |
| Node.js | 18+ |

The package works in New Architecture applications through React Native's
interop layer, but it is not yet implemented as a TurboModule.

## AI-assisted development

This repository is prepared for AI-assisted coding. Start with
[`AGENTS.md`](AGENTS.md), which is the canonical instruction file for coding
agents. Supporting context is split into
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
[`docs/API.md`](docs/API.md), and
[`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md). A small consumer example
lives in [`example/`](example/).

`CLAUDE.md`, `.github/copilot-instructions.md`, and `llms.txt` point tools to
the same sources so that project rules do not drift between assistants.

Google's 0.16.0 iOS simulator slice is arm64-only. On an Intel Mac, use a
physical iOS device; on Apple silicon, exclude `x86_64` if an existing project
forces universal simulator architectures.

## Installation

```sh
npm install @tcbs/react-native-ondevice-ai
```

For iOS, install pods after adding the package:

```sh
cd ios && pod install
```

The Android library manifest contributes `INTERNET`, `ACCESS_NETWORK_STATE`,
and `RECORD_AUDIO`. The consuming iOS app must provide an
`NSMicrophoneUsageDescription`. Model downloads and inference should be tested
on a physical device before shipping; simulator performance is not
representative.

## Current scope

- Android native download manager integration
- iOS native URLSession download integration
- Storage preflight check
- Download progress polling
- Finalize/cancel model download
- Model file metadata lookup
- Generic import, export, and deletion by model filename
- Gemma text, image, and audio inference through LiteRT-LM 0.16.0
- Advanced sampling, penalties, thinking, constrained output, LoRA, and
  experimental decoding controls
- Conversation reset, engine unload, token count, and model capability lookup
- Cross-platform 16 kHz mono WAV recording helpers

## Design boundary

This package intentionally keeps model selection outside the package.

- The package is responsible for native download/file lifecycle primitives.
- The app is responsible for model policy constants such as:
  - model URL (for example Hugging Face artifact URL),
  - expected model size in bytes,
  - storage safety buffer.

This keeps the package reusable across apps and model variants while letting each app choose its own model/version policy.

## LiteRT-LM model lifecycle

The package owns the native operations in this lifecycle:

`check storage → download → monitor/restore → finalize → infer → export/import → delete`

The consuming application owns the model URL, expected size, filename, UI, and
downloaded-artifact integrity policy. The Gemma model itself is not bundled.

### Defaults and current model constraint

- Default model filename: `gemma_4_e2b.litertlm`.
- Default download policy: Wi-Fi only.
- Default storage safety buffer: 250 MiB.
- Default export directory name: `SubraAI`.
- `generateText`, `generateTextWithImage`, and `generateTextWithAudio`
  currently load only
  `gemma_4_e2b.litertlm`. Although lifecycle APIs accept other filenames, move or
  import the inference model under this default name.
- Finalizing or importing over an existing filename replaces that file.
- Model files live in application-private storage. Uninstalling the application
  removes them.

### Complete download and restore example

```ts
import {
  cancelDownload,
  checkStorage,
  finalizeModelDownload,
  getActiveDownloadIdForFile,
  getDownloadStatus,
  getModelFileInfo,
  startModelDownload,
} from '@tcbs/react-native-ondevice-ai';

const fileName = 'gemma_4_e2b.litertlm';

export async function ensureModel(url: string, modelBytes: number) {
  const existing = await getModelFileInfo(fileName);
  if (existing.exists && existing.sizeBytes > 0) return existing;

  const storage = await checkStorage({ requiredBytes: modelBytes });
  if (!storage.hasEnoughSpace) throw new Error('Insufficient model storage');

  // Reattach after an app restart, or start a new native download.
  const restoredId = await getActiveDownloadIdForFile(fileName);
  const downloadId = restoredId ?? await startModelDownload({
    url,
    fileName,
    wifiOnly: true,
  });

  while (true) {
    const snapshot = await getDownloadStatus(downloadId);
    if (snapshot.status === 'Successful') break;
    if (snapshot.status === 'NotFound' || snapshot.status.startsWith('Failed')) {
      throw new Error(`Model download failed: ${snapshot.status}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (!await finalizeModelDownload(fileName)) {
    throw new Error('Downloaded model could not be finalized');
  }
  return getModelFileInfo(fileName);
}

export async function cancelModelDownload() {
  const id = await getActiveDownloadIdForFile(fileName);
  return id === null ? false : cancelDownload(id);
}
```

`getActiveDownloadId()` returns the most recently persisted download and exists
for compatibility. Prefer `getActiveDownloadIdForFile()` when managing more than
one filename. A returned ID is not proof that a task is still running; always
call `getDownloadStatus()`.

### Text, image, and audio inference

```ts
import {
  generateText,
  benchmarkLiteRTLM,
  generateTextWithAudio,
  generateTextWithImage,
  pickAudioFile,
  startAudioRecording,
  stopAudioRecording,
} from '@tcbs/react-native-ondevice-ai';

const answer = await generateText('Explain on-device inference briefly.', {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxTokens: 512,
});
console.log(answer.text);

const description = await generateTextWithImage(
  'Describe this image.',
  'file:///absolute/path/to/image.jpg',
  { temperature: 0.2 },
);
console.log(description.text);

// iOS normalizes supported source images to an upright, bounded JPEG before
// passing them to LiteRT-LM. Invalid image files reject without entering the
// native vision decoder.

await startAudioRecording();
// Stop in response to the user's action. Keep each model input under the
// audio-duration limit documented for the selected model.
const recording = await stopAudioRecording();
const transcript = await generateTextWithAudio(
  'Transcribe this audio accurately.',
  recording.uri,
);
console.log(transcript.text, recording.durationMs);

const selectedAudio = await pickAudioFile();
console.log(selectedAudio.uri, selectedAudio.durationMs);
```

Inference defaults are `temperature: 0.7`, `topK: 40`, and `topP: 0.95`.
Changing engine or conversation options recreates the cached native
conversation. `maxTokens` limits output and `seed` controls the sampler. Empty text
prompts resolve to `{ text: '' }`. Image inference requires a local readable
file and a vision-capable LiteRT-LM model. Audio inference requires a local
audio file and an audio-capable model. The recording helpers produce 16 kHz,
mono, 16-bit PCM WAV files in temporary/cache storage. Use
`cancelAudioRecording()` to discard an active recording.

The native module retains one engine/conversation per platform module instance.
Treat inference calls as serial operations; `cancelTextGeneration()` cancels
the active call where supported, and `generateTextStream()` delivers incremental
native chunks. The package does not provide a concurrency queue.

### Advanced LiteRT-LM 0.16 generation

All three generation functions accept the same options. Only enable a modality
backend when the selected `.litertlm` model contains that modality.

```ts
import {
  generateText,
  getLiteRTLMCapabilities,
  getLiteRTLMRuntimeInfo,
  resetConversation,
  unloadModel,
} from '@tcbs/react-native-ondevice-ai';

const capabilities = await getLiteRTLMCapabilities();

const result = await generateText('Return a compact hydration plan.', {
  backend: 'cpu',
  visionBackend: 'disabled',
  audioBackend: 'disabled',
  maxContextTokens: 4096,
  maxTokens: 256,
  temperature: 0.4,
  topK: 40,
  topP: 0.9,
  seed: 7,
  systemPrompt: 'Be concise and use metric units.',
  repetitionPenalty: 1.1,
  presencePenalty: 0.1,
  frequencyPenalty: 0.1,
  penaltyWindowSize: 256,
  noRepeatNgramSize: 3,
  noRepeatNgramWindowSize: 256,
  thinking: {enabled: true, tokenBudget: 128},
  enableSpeculativeDecoding: capabilities.speculativeDecoding,
  filterChannelContentFromKvCache: true,
  responseFormat: {
    type: 'json_schema',
    schema: {
      type: 'object',
      properties: {summary: {type: 'string'}},
      required: ['summary'],
    },
  },
});

console.log(result.text, result.channels, result.toolCalls);
console.log(await getLiteRTLMRuntimeInfo());
await resetConversation(); // retain engine, clear chat/KV state
await unloadModel();       // release conversation and model memory

const perf = await benchmarkLiteRTLM({
  backend: 'cpu',
  prefillTokens: 256,
  decodeTokens: 128,
});
console.log(perf.lastPrefillTokensPerSecond, perf.lastDecodeTokensPerSecond);
```

For incremental UI updates, use the event-backed streaming wrapper. Each call
has its own request ID internally, removes its listener on completion/error,
and returns the final accumulated response as a promise.

```ts
import {generateTextStream} from '@tcbs/react-native-ondevice-ai';

const stream = generateTextStream(
  'Write three short reminders.',
  chunk => console.log('delta:', chunk.text, chunk.channels),
  {maxTokens: 128},
);

// Optional: await stream.cancel();
const complete = await stream.result;
console.log('complete:', complete.text);
```

Backend values are `cpu`, `gpu`, `npu`, and `google-tensor`; NPU and Google
Tensor are Android-only. iOS retries CPU if GPU initialization fails. LoRA is
configured with `loraPath`/`audioLoraPath` and the corresponding rank options.
Gemma 4 visual token budgets are `70`, `140`, `280`, `560`, or `1120`.

`responseFormat` accepts `{type: 'regex', pattern}` or
`{type: 'json_schema', schema}`. Enable it only for a model that supports
constrained decoding. `suppressTokens` is supported on iOS; it is deliberately
ignored on Android 0.16.0 because the upstream JNI path can terminate the
process instead of returning an error. Tool declarations contain native
callbacks and therefore cannot be registered from JavaScript in this bridge;
model-emitted tool calls are returned in `result.toolCalls` for app-side
dispatch. Automatic tool calling defaults to `false`; leave it disabled for
that manual workflow.

`maxImages` is supported by the Android 0.16.0 engine configuration. Google's
iOS 0.16.0 wrapper does not expose an equivalent setting, so iOS ignores it.

The experimental options mirror Google flags and may change upstream:
`enableSpeculativeDecoding`, `enableConversationConstrainedDecoding`, and
`filterChannelContentFromKvCache`. Check capabilities before forcing
speculative decoding; requesting it for an unsupported model fails engine load.

### Export and import

```ts
import {
  exportModelToDownloads,
  getExportedModelInfo,
  importModelFromDownloads,
  openExportedModelInFiles,
  subscribeTransferProgress,
} from '@tcbs/react-native-ondevice-ai';

const unsubscribe = subscribeTransferProgress(event => {
  console.log(event.operation, event.progressPercent);
});

try {
  const exported = await exportModelToDownloads({
    fileName: 'gemma_4_e2b.litertlm',
    exportDirName: 'MyModels',
  });
  console.log(exported.uri, exported.sizeBytes);

  const info = await getExportedModelInfo({
    fileName: 'gemma_4_e2b.litertlm',
    exportDirName: 'MyModels',
  });
  if (info?.exists) await openExportedModelInFiles({
    fileName: 'gemma_4_e2b.litertlm',
    exportDirName: 'MyModels',
  });

  const imported = await importModelFromDownloads({
    fileName: 'gemma_4_e2b.litertlm',
    exportDirName: 'MyModels',
  });
  console.log(imported.path, imported.sizeBytes);
} finally {
  unsubscribe();
}
```

Platform behavior differs:

| Operation | Android | iOS |
| --- | --- | --- |
| Export | Copies to Downloads using MediaStore (modern Android) or legacy Downloads | Presents the system share sheet with a temporary copy |
| Import | Looks in the requested Downloads folder, then opens a picker if needed | Always presents the system document picker |
| Progress events | Emitted while native copy operations run | Not currently emitted |
| `exportDirName` | Selects the Downloads subdirectory | Used only by exported-file lookup helpers; share-sheet destination is user-controlled |
| Open exported file | Opens Downloads/file handler | Presents document interaction options |

Only one document-picker import can be active at a time. Cancelling the picker
rejects with `import_cancelled`. Import/export does not validate the file as a
LiteRT-LM model; validate its size and a trusted cryptographic checksum in the
application before inference.

On iOS, completing the share sheet does not create a package-managed exported
copy. Consequently, `getExportedModelInfo()` and `openExportedModelInFiles()`
may report no exported file after a share-sheet export; the destination selected
by the user is outside the package's private storage. Use the share sheet itself
as the authoritative iOS export workflow.

### File inspection and deletion

```ts
import { deleteModel, getModelFileInfo } from '@tcbs/react-native-ondevice-ai';

const info = await getModelFileInfo('gemma_4_e2b.litertlm');
if (info.exists) {
  console.log(info.path, info.sizeBytes);
  await deleteModel('gemma_4_e2b.litertlm');
}
```

`deleteModel()` is idempotent for downloaded/imported files. It cannot remove a
resource embedded in the application bundle.

## API reference

| API | Result | Notes |
| --- | --- | --- |
| `checkStorage({requiredBytes, safetyBufferBytes?})` | `StorageCheckResult` | `requiredBytes` in the result includes the safety buffer |
| `startModelDownload({url, wifiOnly?, fileName?})` | download ID | Persists the ID natively for restoration |
| `getDownloadStatus(downloadId)` | `DownloadSnapshot` | Status includes `Pending`, `Downloading`, `Paused`, `Successful`, `Failed(...)`, or `NotFound` |
| `getActiveDownloadId()` | ID or `null` | Most recently persisted download |
| `getActiveDownloadIdForFile(fileName)` | ID or `null` | Preferred restoration API |
| `finalizeModelDownload(fileName?)` | boolean | Copies/moves staged download into private model storage |
| `cancelDownload(downloadId)` | boolean | Cancels the native download task |
| `getModelFileInfo(fileName?)` | `ModelFileInfo` | Returns existence, size, and private path |
| `deleteModel(fileName?)` | boolean | Removes downloaded/imported model |
| `exportModelToDownloads(options?)` | `ExportResult` | Downloads on Android; share sheet on iOS |
| `importModelFromDownloads(options?)` | `ModelFileInfo` | May present a native picker |
| `getExportedModelInfo(options?)` | info or `null` | Returns `null` only when unsupported by the native build |
| `openExportedModelInFiles(options?)` | boolean | Presents the platform file UI |
| `subscribeTransferProgress(listener)` | unsubscribe function | Copy progress is currently Android-only |
| `getCurrentNetworkClass()` | network classification | Returns a conservative fallback if native support is unavailable |
| `generateText(prompt, options?)` | `GemmaGenerateTextResult` | Text generation with LiteRT-LM 0.16 controls |
| `generateTextStream(prompt, onChunk, options?)` | `GemmaGenerationStream` | Incremental chunks, final result promise, and cancellation |
| `generateTextWithImage(prompt, imagePath, options?)` | `GemmaGenerateTextResult` | Requires local image and multimodal model |
| `generateTextWithAudio(prompt, audioPath, options?)` | `GemmaGenerateTextResult` | Requires local audio and audio-capable model |
| `cancelTextGeneration()` | boolean | Requests cancellation of active inference |
| `resetConversation()` | boolean | Clears chat/KV state and retains the loaded engine |
| `unloadModel()` | boolean | Releases the conversation and engine |
| `getLiteRTLMCapabilities(fileName?)` | `LiteRTLMCapabilities` | Reads model capabilities without loading inference |
| `getLiteRTLMRuntimeInfo()` | `LiteRTLMRuntimeInfo` | Returns 0.16.0 version, load state, and token count |
| `benchmarkLiteRTLM(options?)` | `LiteRTLMBenchmarkResult` | Experimental prefill/decode performance benchmark |
| `startAudioRecording()` | `boolean` | Records 16 kHz mono WAV audio |
| `stopAudioRecording()` | `{uri, durationMs}` | Returns a temporary/cache file URI |
| `cancelAudioRecording()` | `boolean` | Stops and deletes the active recording |
| `pickAudioFile()` | `{uri, durationMs}` | Copies a user-selected audio file into temporary/cache storage |
| `recognizeTextInImage(imagePath)` | `{text, lineCount}` | Native on-device OCR |
| `isImageTextRecognitionAvailable()` | availability | OCR availability and languages |
| `getSystemLanguageModelAvailability()` | availability | Apple system model status; unavailable elsewhere |
| `generateTextWithSystemLanguageModel(prompt)` | `{text}` | Apple Foundation Models where available |
| `speakText(text)` / `stopSpeaking()` | boolean | Native text-to-speech controls |

### Promise rejection codes

Native failures reject with a code and platform error message. Handle at least:

- `storage_check_failed`
- `download_start_failed`, `download_status_failed`,
  `download_finalize_failed`, `download_cancel_failed`
- `active_download_read_failed`
- `model_info_failed`, `model_delete_failed`, `model_not_ready`
- `generate_text_failed`, `generate_image_text_failed`, `image_not_found`
- `export_failed`, `import_failed`, `import_cancelled`
- `exported_model_info_failed`, `open_exported_failed`
- `network_info_failed`

React Native exposes the native code on the rejected error as `error.code`.
Messages can differ by platform and should not be used as stable identifiers.

## iOS setup

The pod vendors Google's official 0.16.0 `CLiteRTLM.xcframework` and its Swift
wrapper sources, so the app must not add the upstream Swift package separately.
The deployment target is iOS 15.0 or newer.

## Implementation example (app side)

```ts
import {
  checkStorage,
  startModelDownload,
  getDownloadStatus,
  finalizeModelDownload,
  getModelFileInfo,
} from '@tcbs/react-native-ondevice-ai';

const GEMMA_MODEL_URL =
  'https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm';
const REQUIRED_MODEL_BYTES = 2_581_242_684;
const SAFETY_BUFFER_BYTES = 250 * 1024 * 1024;

export async function downloadGemmaModel() {
  const storage = await checkStorage({
    requiredBytes: REQUIRED_MODEL_BYTES,
    safetyBufferBytes: SAFETY_BUFFER_BYTES,
  });

  if (!storage.hasEnoughSpace) {
    throw new Error('INSUFFICIENT_STORAGE');
  }

  const downloadId = await startModelDownload({
    url: GEMMA_MODEL_URL,
    wifiOnly: true,
    fileName: 'gemma_4_e2b.litertlm',
  });

  let status = 'Pending';
  while (status === 'Pending' || status === 'Downloading' || status === 'Paused') {
    const snapshot = await getDownloadStatus(downloadId);
    status = snapshot.status;
    // update UI with snapshot.progressPercent / snapshot.downloadedBytes / snapshot.totalBytes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (status !== 'Successful') {
    throw new Error(`DOWNLOAD_FAILED: ${status}`);
  }

  const saved = await finalizeModelDownload('gemma_4_e2b.litertlm');
  if (!saved) {
    throw new Error('FINALIZE_FAILED');
  }

  const modelInfo = await getModelFileInfo('gemma_4_e2b.litertlm');
  if (!modelInfo.exists) {
    throw new Error('MODEL_NOT_FOUND');
  }

  return modelInfo;
}
```

## Notes

- Default model file name: `gemma_4_e2b.litertlm`
- Download APIs accept arbitrary model `url` and `fileName` values.
- A model embedded in the application cannot be permanently deleted at
  runtime; only downloaded/imported copies can be removed.

## iOS LiteRT-LM linking

`generateText` on iOS is provided by the native `react-native-ondevice-ai` pod.

### Important

Direct SwiftPM `LiteRTLM` linking can fail with:
`The package product 'LiteRTLM' cannot be used as a dependency ... because it uses unsafe build flags.`

This package avoids that by embedding the LiteRT-LM Swift wrapper sources in the pod and linking the vendored `CLiteRTLM.xcframework` directly through CocoaPods.

After upgrading, run `pod install`. If the build requests an unavailable
`x86_64` simulator slice, remove a project-wide architecture override or set
`EXCLUDED_ARCHS[sdk=iphonesimulator*] = x86_64`; the official 0.16.0 simulator
framework contains arm64 only.

### Runtime verification checklist

After launching app in debug and sending a chat message:

- You should see app log:
  - `[SubraAI][Inference] response_native ...`
- You should **not** see:
  - `[SubraAI][Inference] response_fallback ... reason: 'NATIVE_GENERATION_UNAVAILABLE_OR_EMPTY'`

### Troubleshooting

- If Xcode still shows `LiteRTLM` under Package Dependencies for the app or Pods target, remove it and reinstall pods.

## Package size and bundled artifacts

The package includes Google's LiteRT-LM iOS XCFramework. Model weights are not
bundled; applications download or import their chosen `.litertlm` model.

Before redistributing this package, maintainers must verify that the versions of
LiteRT-LM and the vendored XCFramework remain compatible with their upstream
licenses. See `THIRD_PARTY_NOTICES.md`.

## Maintainer release checklist

```sh
npm ci
npm run verify
npm pack --dry-run
```

Also install the resulting `.tgz` in a clean React Native example application,
build Android and iOS release configurations, and run download, Gemma text/image
generation, cancellation/restoration, and import/export on physical devices.
Do not publish when any of those checks are skipped.

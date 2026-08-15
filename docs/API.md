# Public API map

The exported TypeScript declarations in `src/index.ts` and `src/types.ts` are
authoritative. This page helps humans and coding agents choose the right API;
the README contains complete usage examples.

## Model files and downloads

| APIs | Purpose |
| --- | --- |
| `checkStorage` | Verify capacity before a download |
| `startModelDownload`, `getDownloadStatus` | Start and poll a native download |
| `getActiveDownloadId`, `getActiveDownloadIdForFile` | Restore an active download |
| `finalizeModelDownload`, `cancelDownload` | Complete or cancel a download |
| `getModelFileInfo`, `deleteModel` | Inspect or remove app-private models |
| `exportModelToDownloads`, `importModelFromDownloads` | Move models across app/public storage |
| `getExportedModelInfo`, `openExportedModelInFiles` | Inspect/open an exported model |
| `subscribeTransferProgress` | Observe import/export copy progress |
| `getCurrentNetworkClass` | Apply app-owned network policy |

The application supplies URLs and artifact-integrity rules. The package does
not bundle or automatically choose a model.

## Inference

| APIs | Purpose |
| --- | --- |
| `generateText` | One complete text response |
| `generateTextStream` | Native chunks plus a final result and cancel handle |
| `generateTextWithImage` | Prompt plus a local image path |
| `generateTextWithAudio` | Prompt plus a local audio path |
| `cancelTextGeneration` | Interrupt the active generation |
| `resetConversation` | Clear conversation state |
| `unloadModel` | Release engine memory |

Results contain `text` and may contain reasoning `channels` or parsed
`toolCalls`. Dispatch tool calls in application code. Generation options cover
sampling, backends, context/output limits, LoRA, thinking, penalties,
constrained formats, and experimental decoding. Capability-check experimental
features before enabling them.

`automaticToolCalling` defaults to `false`. `maxImages` configures Android;
Google's iOS 0.16.0 wrapper does not expose the corresponding engine option.

## Runtime and diagnostics

- `getLiteRTLMCapabilities(fileName?)`
- `getLiteRTLMRuntimeInfo()`
- `benchmarkLiteRTLM(options?)`

Benchmarks are experimental and should run on a physical device under stable
thermal conditions. They are not a substitute for end-to-end UX measurements.

## OCR, Apple models, audio, and speech

- `recognizeTextInImage`, `isImageTextRecognitionAvailable`
- `getSystemLanguageModelAvailability`,
  `generateTextWithSystemLanguageModel`
- `startAudioRecording`, `stopAudioRecording`, `cancelAudioRecording`,
  `subscribeAudioLevel`, `pickAudioFile`
- `speakText`, `stopSpeaking`, `subscribeSpeechStatus`

Availability differs by platform, OS, hardware, permissions, and native build.
Query availability where provided and handle rejected promises.

## Compatibility facade

`GemmaModule` is a small compatibility facade with `generateText`, `generate`,
`interrupt`, and `configure`. New integrations should generally prefer the
named functions because they expose structured results and lifecycle controls.

`DEFAULT_GEMMA_MODEL_FILE_NAME` is `gemma_4_e2b.litertlm`.

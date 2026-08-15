# Architecture

## Layers

```text
React Native application
        |
src/index.ts + src/types.ts
        |
legacy Native Module bridge (New Architecture interop supported)
        |
Kotlin / Swift module
        |
Google LiteRT-LM 0.16.0 engine + app-private model file
```

The TypeScript layer validates defaults, normalizes generation configuration,
maps event subscriptions, and exposes one cross-platform API. It is not a
TurboModule. Android uses Google's Maven artifact; iOS embeds the matching
official Swift wrappers and `CLiteRTLM.xcframework` through CocoaPods.

## Engine and conversation lifecycle

Each native module retains one LiteRT-LM engine and conversation. Calls are
serialized. Reusing a compatible configuration preserves conversation state;
configuration/model changes may recreate native state. Use:

- `resetConversation()` to clear chat/KV-cache state while keeping the engine.
- `unloadModel()` to release the engine and its multi-gigabyte runtime memory.
- `cancelTextGeneration()` to interrupt the active request.

Streaming uses the `tcbsGemmaGenerationChunk` native event with a generated
request ID. The TypeScript wrapper filters events by request ID and removes the
listener when the result settles.

## Memory-sensitive multimodal setup

The wrapper enables only the executor required by the call:

| Call | Vision | Audio |
| --- | --- | --- |
| `generateText` | disabled by default | disabled by default |
| `generateTextWithImage` | enabled | disabled by default |
| `generateTextWithAudio` | disabled by default | enabled |

This avoids eagerly allocating unused multimodal executors. iOS additionally
normalizes image orientation, encoding, and size before passing the image to
LiteRT-LM; removing that protection can reintroduce native `SIGABRT`/signal 6
failures.

## Model ownership

The package does not select or bundle model weights. It supplies download,
resume/finalize, import/export, storage, metadata, and delete primitives. The
app owns the artifact URL, expected size/checksum, policy, and UI. Inference
currently expects `gemma_4_e2b.litertlm` in app-private storage.

## Platform-specific behavior

- Android supports CPU, GPU, NPU, and Google Tensor backend values where the
  device/runtime supports them. iOS falls back from GPU to CPU.
- Android LiteRT-LM 0.16.0 has an upstream JNI abort path for
  `suppressTokens`; the option is intentionally not forwarded there.
- Google's iOS 0.16.0 simulator XCFramework slice is arm64-only.
- Apple system language model APIs and Vision OCR are iOS-specific convenience
  features and report availability at runtime.
- JavaScript tool callbacks cannot be registered through this legacy bridge.
  Parsed model tool calls are returned for app-side dispatch.

## Vendored native dependency

The iOS wrappers and XCFramework must match the Android LiteRT-LM version. The
current source is upstream tag `v0.16.0`, commit
`924e79c30ffb748a42643d37c3c2027ecf905a84`. The recorded XCFramework SHA-256
is `4e0f683da07566ee79c143d2d58d387f77052b0e6a41562c969e5d2728fc9f4b`.
See `THIRD_PARTY_NOTICES.md` for provenance and licenses.

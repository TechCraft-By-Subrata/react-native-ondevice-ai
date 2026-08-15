# Changelog

All notable changes to this package are documented here.

## 1.0.1

- Serialized iOS LiteRT-LM inference, streaming, benchmark, reset, unload, and
  runtime-state access around the shared engine and conversation.
- Guarded iOS against LiteRT-LM 0.16.0's native sampler trap when temperature
  is exactly zero.
- Changed automatic tool calling to the safe default of `false` on Android and
  iOS; model-emitted tool calls remain available for app-side dispatch.
- Exported `SystemLanguageModelAvailability` from the package root.
- Documented that `maxImages` is Android-only with Google's 0.16.0 wrappers.
- Removed obsolete SwiftPM setup files that conflicted with the vendored
  CocoaPods integration.
- Added canonical guidance for AI-assisted development and package checks that
  protect those published entry points.

## 1.0.0

- Upgraded Android and iOS to Google LiteRT-LM 0.16.0.
- Replaced the iOS binary and Swift wrapper with the official v0.16.0 release.
- Added text, vision, and audio backend selection, context/output limits,
  deterministic seeds, LoRA, thinking, repetition penalties, no-repeat n-grams,
  response formats, reasoning channels, and model-emitted tool calls.
- Added experimental speculative/constrained decoding controls and capability
  lookup.
- Added conversation reset, deterministic model unload, runtime status, and
  native token-count reporting.
- Added Google's experimental prefill/decode benchmark API.
- Added cross-platform streaming generation with request-scoped events,
  automatic listener cleanup, final-response accumulation, and cancellation.
- Disabled unused vision/audio executors by default; multimodal calls enable
  only the executor they need, reducing peak native memory pressure.
- Raised the iOS deployment target to 15.0, matching LiteRT-LM 0.16.0.
- Documented the upstream Android suppress-token limitation and arm64-only iOS
  simulator binary.
- Removed YOLO object detection, its two bundled model copies, and TensorFlow
  Lite dependencies. Object detection will move to a separate package.

## 0.1.0

- Initial public API for model lifecycle management.
- Gemma text and image inference on Android and iOS.
- iOS image inference normalizes HEIC/HEIF, orientation, and oversized inputs to a bounded JPEG before LiteRT processing.
- Android import/export and transfer progress APIs.

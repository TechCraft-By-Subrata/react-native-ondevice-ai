# AI coding guide

This is the canonical instruction file for AI coding tools working in this
repository. Read it before changing code. Tool-specific instruction files must
point here instead of duplicating these rules.

## Project in one paragraph

`@tcbs/react-native-ondevice-ai` is a React Native native module for model-file
management and on-device Gemma inference with Google LiteRT-LM 0.16.0. It
supports text, image, and audio prompts, streaming, lifecycle controls, OCR,
speech helpers, and Apple system language models. It does not bundle a model.
Object detection and YOLO are deliberately outside this package.

## Read before editing

- `README.md`: installation, examples, support matrix, and release checklist.
- `docs/ARCHITECTURE.md`: bridge, engine lifecycle, native layout, and design
  constraints.
- `docs/API.md`: grouped public API map and platform behavior.
- `docs/TROUBLESHOOTING.md`: known build/runtime failures and fixes.
- `src/index.ts` and `src/types.ts`: authoritative JavaScript API and types.

When documentation and implementation disagree, treat the implementation as
current behavior and update the documentation in the same change.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/` | TypeScript public API and types |
| `android/src/main/java/` | Kotlin React Native module |
| `android/build.gradle` | Android dependency/version configuration |
| `ios/TcbsGemmaModule.swift` | iOS module implementation |
| `ios/TcbsGemmaModule.m` | Objective-C React Native exports |
| `ios/LiteRTLM/` | Official Google 0.16.0 Swift wrapper sources |
| `ios/vendor/CLiteRTLM.xcframework` | Official Google binary artifact |
| `tests/` | Package-contract tests |
| `scripts/` | Build, clean, and package verification |
| `example/` | Minimal consumer code; not a standalone app |

Generated paths such as `lib/`, `node_modules/`, `.build/`, `android/build/`,
and `ios/Pods/` must not be edited or committed.

## Non-negotiable constraints

1. Preserve the public package name and version policy unless explicitly asked.
2. Keep Android and iOS behavior aligned where the native SDK permits it.
3. Do not add YOLO or object-detection code, dependencies, types, or docs.
4. Do not bundle model weights. The consuming app owns model URLs, selection,
   expected size, and integrity policy.
5. The bridge is currently a legacy React Native Native Module. New Architecture
   support is through interoperability; do not describe it as a TurboModule.
6. The native implementation owns one engine/conversation. Generation is
   serialized; do not introduce concurrent inference without redesigning the
   lifecycle and testing memory behavior.
7. Text requests keep vision and audio executors disabled by default. Image
   requests enable vision; audio requests enable audio. Preserve this memory
   optimization.
8. Keep iOS image normalization (orientation, format, and dimensions). It is a
   runtime safety measure, not cosmetic preprocessing.
9. On Android 0.16.0, `suppressTokens` is intentionally ignored because the
   upstream JNI path can abort the process. iOS supports it.
10. Check `getLiteRTLMCapabilities()` before enabling speculative decoding.
11. The legacy bridge cannot register arbitrary JavaScript tool callbacks.
    Return parsed `toolCalls` for app-side dispatch and keep automatic tool
    calling disabled unless a safe native registration design is implemented.

## LiteRT-LM upgrades

An SDK upgrade is a coordinated native change, not a one-line version bump.
Update and verify all of the following:

- `android/build.gradle` Maven dependency.
- `ios/LiteRTLM/` from the exact upstream release.
- `ios/vendor/CLiteRTLM.xcframework` from the matching release.
- Hard-coded runtime version values in TypeScript, Kotlin, and Swift.
- `THIRD_PARTY_NOTICES.md`, source tag/commit, and artifact checksum.
- README compatibility notes and changelog.

Do not casually modify the vendored Google Swift wrappers. Prefer an exact copy
from the matching upstream tag, followed by native compilation and device tests.

## Change workflow

1. Inspect both native implementations and the TypeScript wrapper for the area
   being changed.
2. Change public types and validation together with native behavior.
3. Add or update package-contract tests for exports and packaging rules.
4. Update README/docs for any public behavior, limitation, or setup change.
5. Run `npm run verify`.
6. For native changes, compile through a React Native host app on both platforms.
7. For inference, image/audio, memory, or cancellation changes, test a release-like
   build on physical Android and iOS devices.

## Definition of done

A change is complete only when TypeScript builds, tests pass, the npm allowlist
contains every required runtime file and no build output, native platforms
compile when affected, documentation matches behavior, and relevant device
paths have been exercised. Never claim physical-device validation unless it was
actually performed and recorded.

## Useful commands

```sh
npm install
npm run typecheck
npm run build
npm test
npm run verify
npm pack --dry-run
```

For native validation commands and common failures, see
`docs/TROUBLESHOOTING.md`.

# Troubleshooting

## First checks

Run `npm run verify`, reinstall the package in the host app, reinstall pods on
iOS, clean the host build, and confirm the model exists under
`DEFAULT_GEMMA_MODEL_FILE_NAME`. Test inference on a physical device and retain
the complete native log, not only the JavaScript exception.

## Native module is unavailable

This package contains native code and does not work in Expo Go. Rebuild the
native app after installation. On iOS run `pod install`; on Android confirm
autolinking sees the package. The package uses the legacy Native Module bridge,
including in New Architecture applications through interop.

## iOS linker or architecture errors

Google's LiteRT-LM 0.16.0 simulator binary is arm64-only. On Apple silicon,
remove settings that force an x86_64 simulator or build with x86_64 excluded.
Intel Macs require a physical device. Do not add a second LiteRT-LM SwiftPM
dependency to the host app; the pod already embeds the wrappers and binary.

A generic host validation command is:

```sh
xcodebuild -workspace ios/<App>.xcworkspace \
  -scheme <App> -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  EXCLUDED_ARCHS=x86_64 CODE_SIGNING_ALLOWED=NO build
```

## Signal 6 / SIGABRT during image inference

Use `generateTextWithImage()` rather than trying to encode image data into a
text request. Pass a readable local file path, keep vision enabled only for the
image call, and preserve the package's iOS image normalization. Confirm the
model supports vision and reduce `visualTokenBudget` if memory is tight. On
Android, also reduce `maxImages`; Google's iOS 0.16.0 wrapper does not expose
that setting. Capture the native backtrace and device memory report.

If the crash appears only when `suppressTokens` is configured on Android,
remove the option. LiteRT-LM 0.16.0 has an upstream JNI abort path; this package
intentionally does not forward it on Android.

## SIGTRAP in `Engine.createConversation` on iOS

Google's LiteRT-LM 0.16.0 Swift wrapper converts the sampler seed using
`Int32(seed)`. Values outside the signed 32-bit range, including an unmodified
JavaScript `Date.now()`, cause an unrecoverable overflow trap while creating the
conversation. This package normalizes oversized seeds before calling Google's
wrapper. A crash report may still mention the preceding temperature setter;
inspect the crashing thread's register values for an oversized seed.

## Out of memory or termination

Do not run generations concurrently. Keep unused vision/audio backends
disabled, reduce context and output limits, call `resetConversation()` between
unrelated chats, and call `unloadModel()` when inference is no longer needed.
Measure a release-like build on the lowest-memory supported physical device.

## Experimental option fails

Call `getLiteRTLMCapabilities()` before speculative decoding. Experimental
flags and backend names are model/device dependent. Retry with CPU and default
options to separate model compatibility from accelerator issues.

## Model download succeeds but inference cannot load it

Lifecycle APIs accept custom filenames, but inference currently expects
`gemma_4_e2b.litertlm`. Finalize or import the compatible model under that name.
Validate the app-owned expected size/checksum; the package cannot infer whether
an arbitrary downloaded artifact is the correct model.

## Android compile check

From a React Native host application's `android` directory:

```sh
./gradlew :tcbs_react-native-ondevice-ai:compileDebugKotlin
```

If Gradle uses a different autolinked project name, list projects with
`./gradlew projects` and use the reported name.

## Before filing an issue

Include package/React Native versions, platform and OS, physical device,
architecture, model source/name, generation options, clean reproduction steps,
and complete native logs. State whether CPU/default options and a fresh model
load reproduce the problem.

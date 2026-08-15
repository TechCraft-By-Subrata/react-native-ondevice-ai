# Minimal consumer example

This folder contains copyable integration code, not a standalone React Native
project. Add `App.tsx` to an existing native React Native app after installing
and linking `@tcbs/react-native-ondevice-ai`.

Before running it, download or import a compatible model as
`gemma_4_e2b.litertlm`. The application—not this package—must choose the model
URL and verify the artifact. Run on a physical device for meaningful results.

The example demonstrates runtime status, complete and streaming text
generation, cancellation, conversation reset, and model unload. See the README
for download, image, audio, OCR, and speech examples.

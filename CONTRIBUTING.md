# Contributing

Thank you for improving `@tcbs/react-native-ondevice-ai`. Begin with
[`AGENTS.md`](AGENTS.md); it contains the canonical engineering constraints and
definition of done for both human and AI-assisted contributions.

## Development setup

Use Node.js 18 or newer, install dependencies with `npm install`, and run:

```sh
npm run verify
```

This checks TypeScript, rebuilds `lib/`, runs contract tests, and validates the
npm package contents. `lib/` is generated and ignored by Git; edit `src/`.

Native changes must also be compiled from a React Native host application on
Android and iOS. Runtime changes must be tested on physical devices with a
compatible `.litertlm` model. Include the devices, OS versions, model artifact,
backends, and scenarios tested in the pull request.

## Pull requests

Keep changes focused and include:

- The problem and intended behavior.
- Public API/type changes, including backward-compatibility impact.
- Android and iOS implementation notes or an explicit platform limitation.
- Tests and documentation updated with the code.
- `npm run verify` output and applicable native/device validation.
- Package-size impact when native binaries or dependencies change.

Do not commit credentials, model files, generated builds, Pods, Gradle caches,
or npm tarballs. Do not include object detection or YOLO; that feature belongs
in a separate package.

## Reporting issues

Use the GitHub issue tracker and provide a minimal reproduction, platform,
device, React Native version, model filename/source, backend/options, native
crash log or stack trace, and whether the issue reproduces after
`resetConversation()` or a clean reinstall.

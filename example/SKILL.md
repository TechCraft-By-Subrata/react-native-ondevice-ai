---
name: react-native-current-api-guardrails
description: Build, review, or update React Native code using APIs that are current for the project's installed React Native version. Use for React Native screens, tutorials, examples, refactors, dependency setup, safe-area handling, keyboard behavior, navigation, native modules, background tasks and synchronization, local filesystem access, SQLite-backed chat history, media persistence, or when an API may be deprecated or version-sensitive.
---

# React Native Current API Guardrails

Use the project's installed versions and current official documentation as the source of truth. Do not rely on remembered React Native examples when an API may have changed.

## Establish the project version

Before writing or correcting version-sensitive code:

1. Inspect `package.json` and the lockfile.
2. Identify the installed React Native version and relevant library versions.
3. Inspect existing project conventions and native setup.
4. Check official documentation for that version when there is any reasonable chance an API, installation step, or recommendation changed.
5. Prefer React Native documentation and the relevant library's official documentation or repository over blogs and copied snippets.

When producing a tutorial without an application repository, state the assumed React Native version or describe the supported version range.

## Safe-area rule

React Native core `SafeAreaView` is deprecated. Do not write:

```ts
import { SafeAreaView } from 'react-native';
```

Use `react-native-safe-area-context` instead:

```bash
npm install react-native-safe-area-context
```

For iOS projects with CocoaPods, install pods and rebuild the native app after adding the dependency:

```bash
npx pod-install
```

Wrap the application near its root with `SafeAreaProvider`, then use the package's `SafeAreaView`:

```ts
import { StatusBar, StyleSheet } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <RootScreen />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
```

Choose `edges` deliberately. Do not add every edge automatically when a navigation container, tab bar, modal, or parent already handles some insets.

Use `useSafeAreaInsets()` when a custom layout needs individual inset values rather than a wrapper:

```ts
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function FloatingComposer() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      <Composer />
    </View>
  );
}
```

Official reference: <https://reactnative.dev/docs/safeareaview>

## Deprecation review

For every React Native import in new tutorial or application code:

1. Confirm the symbol exists in the installed version.
2. Check whether its official documentation marks it deprecated.
3. Use the recommended replacement when practical.
4. Include required dependency installation, pod installation, and rebuild steps.
5. Explain why a replacement is used when learners may encounter the older API in existing tutorials.

Pay particular attention to:

- safe-area components;
- keyboard and input handling;
- navigation APIs;
- permissions;
- storage libraries;
- lists and performance props;
- image and media APIs;
- animation libraries;
- native module linking and architecture compatibility; and
- APIs that behave differently on Android and iOS.

Do not call an API deprecated without checking documentation for the relevant version. Do not silently modernize code in a way that changes behavior.

## Dependency and native-build checks

When adding a React Native library:

1. Read its official installation and compatibility instructions.
2. Check peer dependencies against the current project.
3. Determine whether it or any transitive dependency contains native code.
4. Ensure native libraries that require autolinking are direct application dependencies; do not assume transitive npm installation makes them visible to React Native autolinking.
5. Verify native discovery with `npx react-native config` when autolinking matters.
6. Include CocoaPods installation for iOS when required.
7. Tell the learner to rebuild the native application when a JavaScript refresh is insufficient.
8. Avoid claiming Expo Go compatibility unless the dependency and installed Expo SDK support it.
9. Avoid installing unnecessary peer packages merely because an old example included them.

## Local filesystem rule

Prefer the actively maintained `@dr.pogodin/react-native-fs` fork for bare React Native applications. Do not add the abandoned `react-native-fs` package to new projects.

```bash
npm install @dr.pogodin/react-native-fs
```

Use named imports:

```ts
import {
  copyFile,
  DocumentDirectoryPath,
  mkdir,
} from '@dr.pogodin/react-native-fs';
```

After installation:

1. Verify the installed release supports the project's React Native version and architecture.
2. Run `npx react-native config` to confirm native discovery.
3. Run CocoaPods installation for iOS and rebuild both native applications.
4. Keep application-owned media under a dedicated directory inside `DocumentDirectoryPath`.
5. Store relative media paths in databases or state. Resolve them against `DocumentDirectoryPath` at runtime. Do not persist absolute iOS container paths because the container identifier can change between installs or builds.
6. Copy picker or camera output into application-owned storage before persisting its path; temporary picker URLs are not durable.
7. Delete owned media when its parent record is permanently deleted, unless another record still references it.

When migrating from legacy `react-native-fs`, remove that dependency, replace imports with `@dr.pogodin/react-native-fs`, reinstall pods, rebuild, and confirm no legacy imports or native pods remain.

## Persistent chat history

For offline chat sessions that may contain images:

1. Use SQLite for structured session and message records; do not store growing chat transcripts in MMKV.
2. Use separate `sessions` and `messages` tables linked by `session_id`.
3. Store message text, role, timestamps, processing metadata, and an optional relative image path.
4. Save the user message before inference, then save the assistant result or error afterward.
5. Create a session on the first sent message so empty drafts do not clutter history.
6. Derive the initial title from the first user prompt and order history by `updated_at`.
7. Copy images into app-owned document storage and store only their relative paths in SQLite; never store image bytes in SQLite for this flow.
8. Use foreign keys and indexes for message lookup. Define deletion behavior for both database rows and owned image files.
9. Add schema versioning and migrations before changing a shipped database schema.
10. Restore the most recent session on launch and expose loading, empty, and storage-error states.

## Background-task rule

Use `react-native-background-fetch` only for short, deferrable work that may run periodically, such as syncing pending records, refreshing cached API data, processing a small queue, or scheduling a local notification from newly fetched data.

Before adding it:

1. Confirm the installed React Native version and follow the package's current official setup guide for both native platforms.
2. Explain that the operating system controls execution. Treat `minimumFetchInterval` as a request, not a guaranteed schedule; events cannot occur more frequently than about 15 minutes and may occur much less often.
3. Do not use it for exact timers, cron-like guarantees, continuous execution, real-time tracking, long computation, or large uploads.
4. Account for platform lifecycle differences. In particular, do not promise execution after app termination on iOS; use Android headless-task support only when the product requirement calls for it and it is configured correctly.
5. Keep callbacks bounded and always call `BackgroundFetch.finish(taskId)`, including timeout and error paths, so the operating system knows the task completed.
6. Make synchronization idempotent and resilient to duplicate, delayed, skipped, offline, and partially completed runs.
7. Persist queued work and checkpoints before relying on a background callback; never assume the JavaScript process will remain alive.
8. Include CocoaPods/native setup and rebuild steps when required, then test with the package's documented platform-specific debugging tools.
9. For Expo projects, verify development-build and config-plugin requirements for the installed Expo SDK. Do not claim Expo Go support for a native module without confirming it.

Official reference: <https://fetch.transistorsoft.com/react-native/>

## Tutorial-code checks

Before publishing React Native code:

- Confirm every import comes from the correct package.
- Confirm prop names and TypeScript signatures against installed types or official source.
- Keep `.ts` for files without JSX and `.tsx` for files containing JSX.
- If the documentation renderer does not highlight `tsx`, a `ts` Markdown fence may be used for display while the actual filename remains `.tsx`.
- Provide complete imports in copyable examples.
- Include loading, disabled, empty, and error behavior where relevant.
- Add accessibility roles and labels to custom interactive components.
- Verify Android and iOS differences instead of assuming parity.
- Separate implemented behavior from mocked or planned behavior.

## Verification

After making changes:

1. Run the project's type checker and linter when available.
2. Build or run the most relevant platform in proportion to the change.
3. Verify native dependency installation when imports cross the JavaScript/native boundary.
4. Render tutorial output and inspect the generated code block when documentation is being edited.
5. Search the changed files for the deprecated import or pattern that was replaced.

For the safe-area migration, verification must confirm that no changed example imports `SafeAreaView` from `react-native` and that `react-native-safe-area-context` is included in setup instructions.

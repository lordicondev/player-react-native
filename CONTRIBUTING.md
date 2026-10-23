# Contributing

## Building and tests

```sh
npm install
npm run check   # types, lint, formatting
npm test        # the player, triggers, component and registry, on stubs (vitest)
npm run build   # dist/: the web build (index.js, lordicon.worker.js, lordicon.wasm), types
```

`@lordicon/runtime` comes from npm, the version in `package-lock.json`. To work on both at once,
put a clone of [player-runtime](https://github.com/lordicondev/player-runtime) next to this one,
build it there (`npm run build:wasm && npm run build && npm run vendor:thorvg`) and link it:

```sh
npm install --no-save ../player-runtime   # node_modules/@lordicon/runtime -> the clone
npm ci                                    # back to the published one
```

`--no-save` leaves `package.json` and `package-lock.json` as they are. The native builds find the
runtime through Node (`android/build.gradle`, the podspec), so they follow the link too; after
switching, delete `android/.cxx` (CMake keeps the old path). A change that needs a new runtime
is released there first, then this package asks for it.

## Layout

| Path                      | What                                                                       |
| ------------------------- | -------------------------------------------------------------------------- |
| `src/player/`             | the player (TypeScript, no React): states, segments, promises, looks       |
| `src/triggers/`           | the triggers (TypeScript, no React), from `@lordicon/element`, on signals  |
| `src/LordIcon.tsx`        | the component on iOS and Android: the Fabric view and the module           |
| `src/LordIcon.web.tsx`    | the component on the web: a canvas, the engine in wasm or in workers       |
| `src/web/`                | the web renderer, registry and workers                                     |
| `android/`, `ios/`        | the native views (Kotlin with JNI, Objective-C++)                          |
| `cpp/`                    | the registry and models shared by both                                     |
| `bin/lordicon-assets.mjs` | copies the web build's files for bundlers that do not (Expo web)           |
| `example/`                | the example app: the gallery the README follows, and the developer screens |
| `consumer/`               | apps made as a user makes them, from `npm pack`                            |

## The example app

`example/` shows the library from source: the gallery (`example/gallery/`, one topic per screen,
in the order of the README) and the developer screens (`example/dev/`: the self-test, 200 icons,
the playground, the web bench). How to run it: [example/README.md](example/README.md); the
developer screens, release builds and the scripts: [example/dev/README.md](example/dev/README.md).
A new topic in the README gets a screen in the gallery, and the other way round.

```sh
cd example && npm install
npm run web        # the gallery in the browser
npm run e2e:web    # the self-test in Chromium and Firefox
./e2e-android.sh   # the self-test on a device or emulator
```

## The consumer apps

`consumer/` makes apps with both packages from `npm pack` (Vite, webpack, Expo, the oldest React
Native) and checks they show icons: it catches what the example, built from source, cannot. See
[consumer/README.md](consumer/README.md).

## CI

- `ci.yml`: checks and tests; the example's self-test in Chromium, Firefox and WebKit
  (`e2e-web`) and on an Android emulator (`e2e-android`); the consumer apps on the web and
  Android.
- `ios.yml` (manual: macOS minutes cost 10x on private repositories): the example on the iOS
  simulator with its self-test, and the consumer apps.

Both take `@lordicon/runtime` from npm: no secrets.

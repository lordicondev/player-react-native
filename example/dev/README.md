# Developer screens and scripts

The part of the example app that is not for learning: what CI runs, and what measures the
library. In the app, **Developer** at the end of the gallery:

- **Self-test** (`SelfTest.tsx`, `TriggerTest.tsx`, `GalleryTest.tsx`): in each render mode 48
  icons load, play to the end and change state, then mount again; then the triggers (a loop
  resting in the renderer, `value` as loop, morph and count, `sequence`, a tap on a
  `LordIcon.Target`, `in` once scrolled into view); then every example of the gallery mounts in
  turn, with no render error and no message of the library.
- **List 200** (`List.tsx`): load: how many animate, sizes, render modes, frame rate; FlashList.
- **Playground** (`Playground.tsx`): one icon, its states, colours and stroke.
- **Bench** (`Bench.web.tsx`): the web renderer under load.

Links: `lordicon-example://selftest` (or `selftest-tap`, `list`, `demo`, `bench`; `/selftest` on
the web). Icons in `../icons/dev/` test special cases: files narrowed to a state, blend modes.

## Android

A release build carries its JS bundle. With JDK 17, the Android SDK with NDK 27.1 and an
emulator or a phone:

```sh
# x86_64 for an emulator, arm64-v8a for a phone
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=x86_64 && cd ..
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell am start -n com.lordicon.example/.MainActivity
```

- `./e2e-android.sh [out-dir]` runs the self-test (`lordicon-example://selftest-tap`) and fails
  when it does not pass, on a crash or when Fabric drops view commands; it taps the Target when
  the log asks (`uiautomator`, `adb shell input tap`) and keeps the log and a screenshot. It first
  waits for the device to be idle (a freshly booted emulator keeps its CPUs busy). CI runs it on
  an emulator. With a phone and an emulator connected, pick one with `ANDROID_SERIAL`.
- `./memory-android.sh [cycles] [gc|nogc]`: native and Java heap on the Playground, with the list
  and over list/Playground cycles; with `gc`, a JS garbage collection before each reading.
- `./perf-android.sh`: the list test (sizes, render modes, animating counts), frame stats and the
  frame clock's timings. The clock logs every 2 s, with the number of live icons:

    ```sh
    adb shell setprop log.tag.LordIconTicker DEBUG
    adb logcat -s LordIconTicker
    ```

## iOS

Without a Mac: the `iOS` workflow on GitHub Actions (manual) builds the app, runs the self-test on
the simulator (`-tab selftest`, without the tap) and keeps screenshots of the list and the
self-test.

## Web

```sh
npm run e2e:web   # the self-test in Chromium and Firefox, with a real click; --headed to watch
npm run e2e:web -- --browsers chromium,firefox,webkit
```

Once: `npx playwright install chromium firefox webkit`. Logs, and a screenshot on failure, go to
`e2e-web-out/`.

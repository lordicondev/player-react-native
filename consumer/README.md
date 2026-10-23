# Consumer apps

Apps made the way a user makes them, with `@lordicon/react-native` and `@lordicon/runtime` from
`npm pack` instead of the sources: they catch what the example cannot see, such as a file left
out of the package, a web build a bundler cuts down, or a dependency that resolves only in this
repository. Each shows `App.tsx`, which passes when every icon loads, `play()` plays to the end
and the library logs nothing.

```sh
./create.sh vite /tmp/consumer/vite       # also: webpack, expo, rn (RN_VERSION=0.82.1)
node check-web.mjs vite /tmp/consumer/vite chromium,firefox   # builds, serves, opens; also ?workers

./create.sh rn /tmp/consumer/rn
(cd /tmp/consumer/rn/android && ./gradlew assembleRelease -PreactNativeArchitectures=x86_64)
./check-android.sh /tmp/consumer/rn/android/app/build/outputs/apk/release/app-release.apk
```

`create.sh` packs the library and takes the runtime from npm (the version in
`package-lock.json`; `RUNTIME=<a built clone of player-runtime>` to try it unpublished), or takes
both from `PACKS`. The Expo app runs `lordicon-assets public/lordicon` after every install and sets
`LordIconProvider assets`, as the README tells Expo web users to. CI: `consumer-*` jobs in
`ci.yml` (web: Vite, webpack, Expo; Android: Expo, RN 0.82) and in `ios.yml` (Expo, RN 0.82).

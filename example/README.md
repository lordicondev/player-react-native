# Example app

The examples of the [README](../README.md), one topic per screen: on Android, iOS and the web.

## Run it

Install the library (this repository) and the app:

```sh
(cd .. && npm install)
npm install
```

**In the browser**, the quickest, with nothing more to install:

```sh
npm run web        # http://localhost:8081
```

**On Android**, with [Android Studio](https://reactnative.dev/docs/set-up-your-environment): an
emulator, or a phone with USB debugging:

```sh
npm run android
```

**On iOS**, on a Mac with Xcode:

```sh
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios
```

## What's inside

| Section            | Examples                                                                                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Basics             | [01 First icon](gallery/01-first-icon.tsx), [02 States](gallery/02-states.tsx), [03 Colours and stroke](gallery/03-looks.tsx)                                                                        |
| On its own         | [04 Intro](gallery/04-intro.tsx), [05 In view](gallery/05-in-view.tsx), [06 Loops](gallery/06-loops.tsx), [07 Sequence](gallery/07-sequence.tsx)                                                     |
| Taps               | [08 Any button](gallery/08-any-button.tsx), [09 Your own button](gallery/09-own-button.tsx)                                                                                                          |
| Following your app | [10 Toggle](gallery/10-toggle.tsx), [11 Busy](gallery/11-busy.tsx), [12 Count](gallery/12-count.tsx), [13 Stages](gallery/13-stages.tsx)                                                             |
| In an app          | [14 Tab bar](gallery/14-tab-bar.tsx), [15 List](gallery/15-list.tsx), [16 Search field](gallery/16-search-field.tsx), [17 Theme](gallery/17-theme.tsx)                                               |
| Further            | [18 Ref and events](gallery/18-ref-and-events.tsx), [19 Custom trigger](gallery/19-custom-trigger.tsx), [20 Accessibility](gallery/20-accessibility.tsx), [21 Many icons](gallery/21-many-icons.tsx) |

Each file starts with a comment naming its section of the README. One example opens straight
away at `/examples/08` in the browser, or `lordicon-example://examples/08` on a phone.

The icons in `icons/` are from [lordicon.com](https://lordicon.com/), under the
[Lordicon License Terms](https://lordicon.com/licenses). The library comes from this repository's
source, so a change to it shows at once.

The developer screens at the end of the gallery, and the scripts CI runs:
[dev/README.md](dev/README.md).

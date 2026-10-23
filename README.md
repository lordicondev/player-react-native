# Lordicon React Native

`<LordIcon>` plays animated [Lordicon](https://lordicon.com/) icons in a React Native app: on
iOS, Android and the web, drawn by the same engine everywhere, so an icon looks and moves the same
on each.

```tsx
import { LordIcon } from '@lordicon/react-native';
import lock from './icons/lock.json';

<LordIcon icon={lock} trigger="in" size={48} />;
```

The sections below link to runnable examples in the [example app](example/README.md), one topic
per screen.

## Install

```sh
npx expo install @lordicon/react-native   # Expo
npm install @lordicon/react-native        # React Native without Expo
```

React Native 0.82 or newer with the New Architecture, and React 19.

- **Expo:** the package has native code, so it runs in a
  [development build](https://docs.expo.dev/develop/development-builds/introduction/)
  (`npx expo run:android`, `npx expo run:ios` or EAS Build), not in Expo Go. No config plugin is
  needed. On the web, see [Web](#web).
- **React Native without Expo:** on iOS, `cd ios && pod install` after installing; on Android
  nothing more.
- **Web** (react-native-web): nothing more with Vite or webpack; see [Web](#web).

## Your first icon

Pick an icon on [lordicon.com](https://lordicon.com/), give it your style and colours there, and
download it as **Lottie JSON**. Put the file with your app's code and import it:

```tsx
import lock from './icons/lock.json';

<LordIcon icon={lock} />                          // still, on its first frame
<LordIcon icon={lock} trigger="in" size={48} />   // plays once it comes into view
<LordIcon icon={lock} trigger="loop(1000)" />     // over and over, a second's rest between
```

An icon holds several animations, called states, named for what they are for: `in-*` enters,
`hover-*` plays once, `loop-*` repeats, `morph-*` goes to a second look and back. `state` picks
one; without it the icon's default plays. lordicon.com lists the states of each icon, and so does
the ref (`icon.current.states`).

```tsx
<LordIcon icon={trash} state="hover-trash-full" trigger="loop(800)" />
```

`size` is the width and height, 32 by default. Examples:
[01 First icon](example/gallery/01-first-icon.tsx), [02 States](example/gallery/02-states.tsx).

## Which way to play an icon

| The icon should…                                                | Use                                               |
| --------------------------------------------------------------- | ------------------------------------------------- |
| animate on its own: enter, loop, a script                       | `trigger`: `in`, `loop`, `sequence`; or `intro`   |
| react to a tap of any button                                    | the ref: `play()` in the button's `onPress`       |
| react to a tap, hover or focus in a button of your own          | `LordIcon.Target` in that button, and a `trigger` |
| show a state of your app: a selected tab, on/off, busy, a count | `value`                                           |

### On its own

```tsx
<LordIcon icon={card.icon} intro={`in-reveal, delay=${i * 200}`} />    // enters, cards one by one
<LordIcon icon={bulb} state="in-reveal" trigger="in" />                // once half is in view
<LordIcon icon={spinner} state="loop-snake-alt" trigger="loop" />
<LordIcon icon={cog} state="hover-mechanic" trigger="loop(1500)" />    // now and then
<LordIcon icon={download} trigger="sequence(play in-reveal, wait 600, play hover-slide, stop)" />
```

`intro` plays a state once the icon is in view, then its `trigger` takes over. A `loop-*`
state loops without a seam; with a rest, `loop(1500)`, loop a state that plays once, such as a
`hover-*` one. Loops run in the renderer, rests included: they stay smooth when JavaScript is
busy. A `sequence` is a script of steps (`play` a state, `wait`), repeated unless it ends with
`stop`. Examples:
[04 Intro](example/gallery/04-intro.tsx), [05 In view](example/gallery/05-in-view.tsx),
[06 Loops](example/gallery/06-loops.tsx), [07 Sequence](example/gallery/07-sequence.tsx).

### Taps

In React Native a touch belongs to the button, not to what is in it: an icon in a button does not
know it was tapped. Two ways to tell it.

**Any button** (a UI library's, say): play the icon from its `onPress`. `play()` returns a
promise, true once the animation has played to the end.

```tsx
const icon = useRef<LordIconHandle>(null);

<Pressable
    onPress={() => {
        icon.current?.play();
        download();
    }}
>
    <LordIcon ref={icon} icon={downloadIcon} />
</Pressable>;
```

**A button of your own:** put `LordIcon.Target` in place of its Pressable, once. It is a
Pressable with no look of its own that tells the icons inside when it is tapped, hovered or
focused; they play their `trigger`, before your `onPress` runs.

```tsx
function Button({ label, children, ...props }: PressableProps & { label: string }) {
    return (
        <LordIcon.Target
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            {...props}
        >
            {children}
            <Text>{label}</Text>
        </LordIcon.Target>
    );
}

<Button label="Like" onPress={like}>
    <LordIcon icon={heart} state="morph-select" trigger="morph" />
</Button>;
```

| Trigger         | On a touch screen        | With a pointer (web, mouse)                | Keyboard, TV                  |
| --------------- | ------------------------ | ------------------------------------------ | ----------------------------- |
| `hover`         | once, on a tap           | once, when the pointer enters              | on focus                      |
| `click`         | on every tap             | on every click                             | Enter, Space, a screen reader |
| `morph`         | there and back, on a tap | to the second look on enter, back on leave | on focus, back on blur        |
| `boomerang`     | on a tap                 | there and straight back, on enter          | on focus                      |
| `loop-on-hover` | one round, on a tap      | over and over while the pointer is over    | while focused                 |

An icon animates when the finger lifts, as system icons do: a scroll that starts on the button
plays nothing. Hover comes where React Native reports it: on the web, and on iPad and Android
with a mouse once React Native does. For a pressed look, the Target's `pressed` is a
[`value`](#following-your-app-value): `{({ pressed }) => <LordIcon … value={pressed} />}`.
Examples:
[08 Any button](example/gallery/08-any-button.tsx),
[09 Your own button](example/gallery/09-own-button.tsx).

### Following your app: `value`

Give the icon a piece of your app's state as `value`: a boolean, a number or a string. When it
changes, the icon plays what fits; you never call `play()`. What fits depends on the value and on
the icon's `state`:

```tsx
<LordIcon icon={star} state="morph-select" value={saved} />   // fills when saved, back when not
<LordIcon icon={upload} state="loop-cycle" value={busy} />    // loops while busy
<LordIcon icon={bell} value={unread} />                       // plays when the count goes up
// stage: 'idle', 'busy' or 'done'
<LordIcon icon={download} trigger="follow(busy=loop-cycle, done=morph-check)" value={stage} />
```

- **`true`/`false` with a `morph-*` state:** true goes to the second look (a filled star, a
  ticked box), false back. For toggles, selections, tabs.
- **`true`/`false` with a `loop-*` state:** loops while true; when it turns false, the round in
  progress ends and the icon stops. For something running.
- **`true`/`false` with another state:** plays once each time it turns true.
- **A number:** plays when it goes up: from 0 its `state` (or its default), then its default
  state as a short nudge; going down plays nothing. For counts and badges.
- **A string:** each value names its state in `trigger="follow(busy=loop-cycle, …)"`; a loop
  finishes its round before the next state, a value with no state leaves the icon at rest. For
  the stages of a task.

On mount the icon shows the look of the value it finds, without animating: an item saved
before shows a filled star. Examples:
[10 Toggle](example/gallery/10-toggle.tsx), [11 Busy](example/gallery/11-busy.tsx),
[12 Count](example/gallery/12-count.tsx), [13 Stages](example/gallery/13-stages.tsx),
[16 Search field](example/gallery/16-search-field.tsx).

## Colours and themes

```tsx
<LordIcon icon={lock} colors={{ primary: '#e5484d', secondary: '#3e63dd' }} />
<LordIcon icon={lock} color="#3e63dd" />       // the whole icon in one colour
<LordIcon icon={lock} stroke="bold" speed={2} />
```

`colors` names the icon's colours; `color` draws the whole icon in one, like a tinted image
(any colour string React Native takes, `rgba()` included); `stroke` is `light`, `regular` or `bold`
(or 1, 2, 3), for icons that have it (wired icons do, system icons do not). They change live,
without reloading the icon.

`LordIconProvider` gives every icon inside its colours, colour or stroke, unless an icon has its
own: a theme in one place.

```tsx
const dark = useColorScheme() === 'dark';

<LordIconProvider colors={{ primary: dark ? '#ffffff' : '#121331', secondary: '#08a88a' }}>
    <App />
</LordIconProvider>;
```

Examples: [03 Colours and stroke](example/gallery/03-looks.tsx),
[17 Theme](example/gallery/17-theme.tsx).

## In an app

### Tabs

A tab's icon follows its tab: `useTabFocus(navigation)` is its value, in a small component of
your own, for `tabBarIcon` of React Navigation and of `Tabs` in Expo Router.

```tsx
import {
    LordIcon,
    useTabFocus,
    type FocusSource,
    type LordIconProps,
} from '@lordicon/react-native';

function TabIcon({ navigation, ...props }: LordIconProps & { navigation: FocusSource }) {
    return <LordIcon {...props} state="morph-select" value={useTabFocus(navigation)} />;
}

<Tabs
    screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ color, size }) => (
            <TabIcon icon={icons[route.name]} navigation={navigation} color={color} size={size} />
        ),
    })}
/>;
```

The icon morphs when its tab is chosen and back when it is left, in the bar's colour. Native tab
bars (`NativeTabs` of Expo Router, which its template starts with; `react-native-bottom-tabs`)
take only system symbols and images. Example: [14 Tab bar](example/gallery/14-tab-bar.tsx).

### Lists

In a list that recycles its rows (FlashList, LegendList), give the icon the item's key: a
recycled row shows its new item's value at once instead of animating to it.

```tsx
<LordIcon icon={checkCircle} state="morph-select" value={item.done} recyclingKey={item.id} />
```

Each icon file is parsed once, however many rows show it. Example:
[15 List](example/gallery/15-list.tsx).

## Props

| `<LordIcon>`   | Value                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `icon`         | the icon's Lottie JSON: `import lock from './lock.json'`                                                                    |
| `state`        | the state to play and rest on; the icon's default when left out, `'*'` the whole file                                       |
| `trigger`      | what plays it: `in`, `loop`, `sequence`, `hover`, `click`, `morph`, `boomerang`, `loop-on-hover`, `follow`, or one of yours |
| `value`        | a state of your app to follow: boolean, number or string                                                                    |
| `recyclingKey` | the item's key, in a list that recycles its rows                                                                            |
| `intro`        | a state to play once in view, before the trigger: `in-reveal`, `in-reveal, delay=300`                                       |
| `colors`       | `{ primary: '#e5484d', secondary: 'teal' }`                                                                                 |
| `color`        | the whole icon in one colour: a colour string, as in styles (not `PlatformColor`)                                           |
| `stroke`       | `light`, `regular`, `bold` (1, 2, 3)                                                                                        |
| `speed`        | 1 by default                                                                                                                |
| `size`         | width and height, 32 by default                                                                                             |
| `motion`       | `always`: animates even when the viewer asked for less motion                                                               |
| `children`     | shown until the icon is ready: a still of it, say                                                                           |
| `onReady`      | the icon is ready to play                                                                                                   |
| `onComplete`   | a segment played to its end: `{ segment, direction, state }`                                                                |
| `onError`      | the icon did not load: a `LordIconLoadError`, `kind` `icon`, `wasm` or `worker`                                             |
| `ref`          | the icon's player, see below                                                                                                |
| also           | `style`, `testID`, `pointerEvents`, `accessible`, `accessibilityLabel`, `accessibilityRole`                                 |

| `<LordIconProvider>`                  | Value                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| `colors`, `color`, `stroke`, `motion` | for the icons inside that set none                                                |
| `render`                              | `{ thread, workers, frameRate }`: see [Performance](#performance)                 |
| `cache`                               | `{ icons: 32 }`: icons kept once unused; set at the root, one setting for the app |
| `assets`                              | web: where the `.wasm` and the worker are; see [Web](#web)                        |

## The ref and events

The ref is the icon's player. `play()` returns a promise: true when the animation played to the
end, false when something took over. So states chain:

```tsx
const icon = useRef<LordIconHandle>(null);

<LordIcon ref={icon} icon={trash} onComplete={(detail) => console.log(detail.state)} />;

if (await icon.current?.play({ state: 'morph-trash-full' })) {
    await icon.current?.play({ state: 'morph-trash-full-to-empty' });
}
```

```ts
player.play({ state: 'hover-locked', reverse: true, from: 'start' });
player.pause(); // a pending play() stays pending
player.stop(); // back to the first frame
player.seek('end'); // or a frame
player.states; // [{ name: 'in-reveal', time: 0, duration: 120, ... }, ...]
player.state = 'hover-locked'; // null: the default state, '*': the whole file
player.loop = true;
player.speed = 2;
player.direction = -1;
player.progress = 0.5; // 0..1 of the segment
player.frame; // the frame on screen; also frameCount, frameRate, duration, currentState
player.segment = [140, 161]; // null: back to the state's
player.colors.primary = 'red'; // delete puts it back; player.colors = null: the icon's own
player.stroke = 'bold';
player.tint = '#3e63dd';
player.addEventListener('complete', (event) => event.detail);
const off = player.on('play', () => {}); // ready, complete, play, pause, refresh, destroy
```

It is the `Player` of `@lordicon/web`. With a trigger, `play()`, `pause()`, `stop()` and
`seek()` go by it first: `pause()` holds its waits too, a command ends an intro. Frames are
absolute, as the icon's markers count them. The state helpers of `@lordicon/web` come along
(`splitSegment(player.currentState, 0.6)` for a morph to a proportion, `stateType`, …).
Example: [18 Ref and events](example/gallery/18-ref-and-events.tsx).

## Accessibility and less motion

Screen readers skip an icon, as decoration, until it has an `accessibilityLabel`; then it is an
image with that label.

When the viewer asks for less motion (iOS Reduce Motion, Android Remove animations,
`prefers-reduced-motion` on the web), icons calm down: one-shot animations do not play, morphs and
`value` jump to their look, loops and intros stay still. `motion="always"` opts an icon out, on
the icon or on a `LordIconProvider`. Example:
[20 Accessibility](example/gallery/20-accessibility.tsx).

## Custom triggers

```tsx
import { BaseTrigger, defineTrigger, type TriggerContext } from '@lordicon/react-native';

// A bin: it enters once ready, a tap fills or empties it, a hover nudges it.
class Bin extends BaseTrigger {
    #full = false;

    constructor(context: TriggerContext) {
        super(context);
        this.on('press', () => {
            this.#full = !this.#full;
            void this.player.play({
                state: this.#full ? 'morph-trash-full' : 'morph-trash-full-to-empty',
            });
        });
        this.on('enter', () => {
            void this.player.play({ state: this.#full ? 'hover-trash-full' : 'hover-trash-empty' });
        });
    }

    onReady(): void {
        void this.player.play({ state: 'in-trash-empty' });
    }
}

defineTrigger('bin', Bin);

<LordIcon.Target>
    <LordIcon icon={trash} trigger="bin" />
</LordIcon.Target>;
```

A trigger hears signals: `enter`, `leave`, `press`, `focus`, `blur` from a `LordIcon.Target`,
`visible` once asked with `this.watchVisibility()`, and the `value` (`this.value()`); it plays
`this.player`. `onReady()` runs once the icon is ready, `onState()` when its `state` changes.
`this.timeout()` waits along with a paused icon. As `BaseTrigger` of `@lordicon/react`, with
`this.on()` in place of DOM listeners. Example:
[19 Custom trigger](example/gallery/19-custom-trigger.tsx).

## Performance

Icons render on a background thread: the UI thread only swaps finished frames in, so many
animating icons do not slow the app down. Icons off screen are not drawn. Icons of the same file
share one parsed copy, and icons no longer shown stay cached (32), so showing one again costs
nothing.

```tsx
<LordIconProvider
    render={{ thread: 'background', workers: 2, frameRate: 60 }}
    cache={{ icons: 64 }}
>
```

- `thread`: `background` (default) or `ui` (the UI thread, in the frame callback). On the web:
  the main thread by default, `background` for render workers.
- `workers`: render threads to spread icons over (1 by default on iOS and Android; on the web up
  to 2, one fewer than the cores).
- `frameRate`: frames per second at most. On iOS and Android 60 by default: Lordicon icons are
  made at 60, and on a 120 Hz screen it takes about a third less CPU. `0`: every display frame;
  on iPhones with ProMotion, above 60 needs `CADisableMinimumFrameDurationOnPhone` in
  `Info.plist`.
- `cache`: `0` lets unused icons go at once. On a memory warning the cache empties.

Example: [21 Many icons](example/gallery/21-many-icons.tsx).

## Web

With react-native-web the package's web build draws with the same engine compiled to
WebAssembly, on a canvas. Its two files, `lordicon.wasm` (about 140 KB gzipped) and
`lordicon.worker.js`, sit next to its code: **Vite and webpack** copy them into your build.

**Expo web** (Metro) does not copy them. Copy them into `public/` after every install and say
where they are:

```json
"scripts": { "postinstall": "lordicon-assets public/lordicon" }
```

```tsx
<LordIconProvider assets="/lordicon/">…</LordIconProvider>
```

The same `assets` serves your own hosting or a strict Content Security Policy:
`assets={{ 'lordicon.wasm': wasmUrl, 'lordicon.worker.js': workerUrl }}`; the worker has to be
on the page's origin. The first icons on the page decide: the engine loads once.

`render={{ thread: 'background' }}` draws in render workers (OffscreenCanvas): the main thread
stays free even with a hundred animating icons, at some more CPU in all. Where the browser cannot,
icons draw on the main thread. Hover and keyboard focus reach icons in a `LordIcon.Target`.

A react-native-web app without Expo: alias `react-native` to `react-native-web` and resolve
`.web.*` files first, as [consumer/web](consumer/web) does for Vite and webpack.

## Coming from `@lordicon/react`

The same icons, props, trigger names and options, ref and events. Where React Native differs:

| `@lordicon/react`                              | `@lordicon/react-native`                                         |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| `src="/icons/lock.json"`                       | `icon={lock}`, the JSON imported                                 |
| `target="button"`, `target={ref}`              | `LordIcon.Target` in your button, or `play()` from its `onPress` |
| `trigger="follow"` with `aria-pressed`         | `value={pressed}`                                                |
| `currentColor`                                 | `color`                                                          |
| CSS: `:state()`, `--lord-icon-primary`         | props, `LordIconProvider`                                        |
| `loading`, `onState`, `onTrigger`, SSR         | not yet                                                          |
| `defineElement({ triggers })`, `this.listen()` | `defineTrigger()`, `this.on()`                                   |
| `hover` plays on the icon itself               | in a `LordIcon.Target`; on touch, on a tap                       |

## Troubleshooting

- **An empty icon on iOS:** run `pod install` again after installing; the pod builds the engine
  from `@lordicon/runtime`.
- **Expo Go, or an error about a missing native module:** it needs a development build and the
  New Architecture.
- **Web: `lordicon.wasm did not load`:** your bundler did not copy it (Expo web): see [Web](#web).
- **`unknown trigger`, `the icon has no state`, `is not a colour`** in development: a name or
  value the icon or the library does not know; the message says which, and lists the icon's
  states.
- **Android: a ripple over a tab's icon:** the tab bar's own. A transparent one leaves the icon
  to answer the tap (`PlatformPressable` from `@react-navigation/elements`; in Expo Router, from
  `expo-router/react-navigation`):

    ```tsx
    tabBarButton: (props) => (
        <PlatformPressable {...props} pressColor="transparent" />
    ),
    ```

- **`hover` plays nothing:** it needs a `LordIcon.Target` around the icon (a warning says so in
  development), or `play()` from your button's `onPress`.

## How it works

The player (states, segments, promises) and the triggers are TypeScript, the same on every
platform. The player drives a renderer with commands: on iOS and Android a Fabric view
(Objective-C++, Kotlin with JNI) through a TurboModule, on the web the WebAssembly engine on a
canvas, on the main thread or in workers. The engine is
[`@lordicon/runtime`](https://github.com/lordicondev/player-runtime): ThorVG with our patches,
built from its sources by CMake on Android and CocoaPods on iOS.

An icon's JSON crosses to the native side once however many `<LordIcon>` show it, into a registry
that keeps the icons in use and the cache. Icons of one file on one render thread draw from one
parsed model, each with its own frame and look. Loops and their rests run in the renderer.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md): building, tests, the example app, the consumer apps, CI.

## License

MIT, see [LICENSE.md](LICENSE.md). ThorVG and the engine: see `@lordicon/runtime`.

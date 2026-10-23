# Changelog

## 1.0.0 (2026-10-23)

The first version: `<LordIcon>` for React Native, on iOS, Android and the web, drawn by
[`@lordicon/runtime`](https://www.npmjs.com/package/@lordicon/runtime) (ThorVG).

- `<LordIcon>`: states, colours, one colour, stroke, speed; the triggers of `@lordicon/react`,
  `intro`, and `value` to follow the app's state; the ref is the icon's player.
- `LordIcon.Target` for icons in buttons of your own, `useTabFocus` for tab bars,
  `LordIconProvider` for themes and render options, custom triggers.
- Icons render on a background thread, off-screen icons are not drawn, icons of one file share
  one parsed copy. Less motion respected, screen reader labels.
- The web through react-native-web, with WebAssembly. For Expo web, the `lordicon-assets` command
  copies the engine's files into `public/`.

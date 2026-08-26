# EasyRecipes

An Android app for saving recipes, built with Expo and React Native. Everything
lives on the phone — recipes, tags and photos are stored in a local SQLite
database, with no account and no server.

## Running it

```bash
npm install
npx expo start
```

Install **Expo Go** from the Play Store, then scan the QR code the dev server
prints. The app reloads as you edit.

The project is pinned to **Expo SDK 54** because Expo Go supports exactly one
SDK, and 54 is what the Play Store build on the target phone runs. Don't upgrade
the SDK without checking Expo Go first — a newer project fails with "Project is
incompatible with this version of Expo Go" even though the bundle downloads
fine. Check with:

```bash
curl -s https://exp.host/--/api/v2/versions \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const v=JSON.parse(d).sdkVersions;for(const k of Object.keys(v).slice(-4))console.log(k,'-> Expo Go',v[k].androidClientVersion)})"
```

Expo Go's own version number matches the SDK it supports (54.x runs SDK 54).

## What it does

- **Recipes** — a two-column grid of cards showing photo, title, description and
  tags. Each recipe holds a photo, description, total time, an ingredient list
  with amounts, and cooking instructions.
- **Tags** — create your own, assign them to recipes, and tap them on the home
  screen to filter. Selecting several tags narrows the list: a recipe has to
  carry all of them. Long-press a tag — on the home screen or in the recipe
  form — to delete it everywhere.
- **Ingredients** — every ingredient across every recipe, deduplicated and
  alphabetised, with a checkbox for what you have in the kitchen.
- **"Only what I can make"** — the toggle on the home screen hides every recipe
  that needs something you haven't ticked.
- **Appearance** — the sliders button in the home header opens Settings, where
  the app can follow the phone's light/dark setting or be pinned to one of them.

Ingredients are matched on a normalised name (trimmed, lowercased, whitespace
collapsed), so "Garlic" and "garlic " are one entry.

## Layout

```
src/
  app/                  file-based routes (expo-router)
    (tabs)/index.tsx    home: recipe grid, tag filters, can-make toggle
    (tabs)/ingredients.tsx
    recipe/[id].tsx     recipe detail
    recipe/edit.tsx     create and edit form
    settings.tsx        appearance picker
  lib/db.ts             schema, migrations and every query
  lib/images.ts         gallery picking and image file housekeeping
  hooks/use-theme.tsx   resolves the palette; holds the saved preference
  components/           cards, chips, icons
  constants/theme.ts    colour and type tokens (light and dark)
design/                 the design canvas source (.dc.html artboards)
```

Photos are copied out of the picker's cache into the app's document directory so
they survive a restart; images no recipe points at any more are swept on launch.

## Keyboard handling

Android normally keeps the focused field visible by shrinking the window when
the keyboard opens. Under edge-to-edge — the default since SDK 54 — the window
keeps its full height and the keyboard just draws over the bottom of it, so that
no longer happens on its own and `KeyboardAvoidingView` has nothing to react to.
`src/hooks/use-keyboard-aware-scroll.ts` does it by hand: it pads the scroll
content by the keyboard's height and scrolls the focused input clear of it, both
when the keyboard opens and when focus moves between fields while it is already
up. The multiline fields are capped with `maxHeight` so they scroll inside
themselves rather than growing taller than the space left above the keyboard.

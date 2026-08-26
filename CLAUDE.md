# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

An offline Android recipe app: Expo + React Native, expo-router, everything
stored locally in SQLite. No account, no server, no network calls at runtime.

## The SDK 54 pin — read before touching dependencies

The project is pinned to **Expo SDK 54** because it is developed and tested
through **Expo Go on the owner's phone**, Expo Go supports exactly one SDK
version, and 54 is what its Play Store build runs. A project on a newer SDK
fails on device with "Project is incompatible with this version of Expo Go"
*after* the bundle downloads and compiles cleanly — so the failure looks like a
code bug and is not one.

Never bump the SDK, and never install a package with `npm install` (which
resolves `latest`), without checking Expo Go first:

```bash
curl -s https://exp.host/--/api/v2/versions \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const v=JSON.parse(d).sdkVersions;for(const k of Object.keys(v).slice(-4))console.log(k,'-> Expo Go',v[k].androidClientVersion)})"
```

Use `npx expo install <pkg>` so versions are resolved against the SDK. Expo Go's
own version number matches the SDK it runs (54.x → SDK 54).

Config-plugin entries in `app.json` must exist as plugins *in this SDK* —
`expo config` fails outright otherwise, and `expo install --fix` has been known
to add entries valid only for a newer SDK.

Note that `app.json`'s `android` block does **not** apply under Expo Go, which
ships its own manifest. Anything needing a native config change cannot be tested
this way.

## Commands

```bash
npx expo start                      # dev server; scan the QR with Expo Go
npx tsc --noEmit                    # typecheck
npx expo lint                       # eslint (silent + exit 0 means clean)
npx expo config --type public       # validates app.json plugin resolution
npx expo export --platform android  # full bundle build — the strongest check
```

There is no test runner. `tsc`, `lint` and `export` are the automated checks;
everything else needs the physical phone.

### Verifying without a device

Two things can be checked properly off-device, and both are worth doing rather
than assuming:

- **SQL and migrations.** `src/lib/db.ts` holds its schema in template literals
  that can be pulled out of the source and replayed against Node's built-in
  `node:sqlite` in a throwaway script — seed a database at the old
  `user_version`, run the upgrade blocks, and assert the data survived. Use this
  for anything touching the schema, the migration ladder, or the can-make query.
- **The bundle actually compiling.** Fetch the dev bundle over HTTP; the
  manifest at `http://127.0.0.1:8081/` (with header `expo-platform: android`)
  gives both `runtimeVersion` (should read `exposdk:54.0.0`) and the exact
  `launchAsset.url` to request.

## Architecture

### SQLite is the state layer

There is no client state library and no in-memory cache. `src/lib/db.ts` is the
only module that writes SQL; it exports plain `async (db, ...) => data`
functions returning camelCase types, and screens call them through
`useDbQuery`. Keep it that way — SQL does not belong in a screen.

`src/hooks/use-db-query.ts` re-runs its query whenever the screen regains focus,
so an edit made on one screen shows up on the way back without any invalidation
plumbing. Its second argument is a **string `key`** standing in for a dependency
list (change it when the query's inputs change), and it returns a `reload()` for
refreshing in place after a write on the same screen. The string-key design
exists because `react-hooks/exhaustive-deps` demands a literal array; don't
"simplify" it back into a deps array.

### Migrations

`SCHEMA_VERSION` plus `PRAGMA user_version` drive a ladder of `if (current < N)`
blocks in `migrateDb`. To change the schema, bump the constant and **add** a
block — never edit an earlier one, since phones in the wild are at older
versions. `migrateDb` runs in `SQLiteProvider`'s `onInit`, which resolves before
any child renders, so the schema is guaranteed present everywhere below it.

### The normalised name key

`normalizeName()` (trim, lowercase, collapse whitespace) is what makes "Garlic",
"garlic " and "GARLIC" one thing. It is the join between `recipe_ingredients`
and `pantry`, and it enforces tag uniqueness via `tags.name_key`. Any new
name-matching feature should go through it rather than comparing raw text.

`CAN_MAKE_PREDICATE` is a shared SQL fragment used by both `listRecipes` and
`getStats` so the grid and the header count can never disagree. A recipe with no
ingredients recorded is deliberately never "makeable".

Tag filtering is **AND** semantics: a recipe must carry every selected tag.

### Provider nesting is load-bearing

`src/app/_layout.tsx` is split into `RootLayout` (providers) and
`RootNavigator` (the Stack) for a reason: `ThemeProvider` reads the saved
appearance out of SQLite, so it must sit *inside* `SQLiteProvider`, and anything
that consumes the theme must therefore sit inside `ThemeProvider`. Adding a
top-level `useTheme()` call to `RootLayout` would break this.

### Theming

Every colour comes from `src/constants/theme.ts` via `useTheme()` — no colour
literals in screens. The palettes were lifted from the design canvas, so the two
should move together.

Appearance is user-selectable (system / light / dark), stored in the `settings`
table and read **synchronously** at first render (`getSettingSync`) so the app
never flashes the wrong palette. `useTheme`/`useIsDark` read from context, not
`useColorScheme` directly, so a change repaints every screen at once.

Tag colours are a single stored hex per tag; `tagPalette()` in `src/lib/color.ts`
adapts it per scheme at render time rather than storing two colours.

Icons are hand-written `react-native-svg` in `src/components/icons.tsx` — there
is no icon font or icon package. Add new ones there in the same stroke style.

### Keyboard handling on Android

Edge-to-edge (default from SDK 54) means the window no longer shrinks when the
keyboard opens — it just draws over the bottom — so `KeyboardAvoidingView` has
nothing to react to and lower fields end up hidden.
`src/hooks/use-keyboard-aware-scroll.ts` handles this manually and every form
should use it: pad the scroll content by the keyboard height, and give **every**
`TextInput` the hook's `onInputFocus`, because moving between fields while the
keyboard is already up fires no keyboard event. Multiline inputs need a
`maxHeight` so they scroll internally instead of outgrowing the visible area.

### Images

Picked photos live in the picker's cache, which Android may purge, so
`src/lib/images.ts` copies them into the document directory and stores that URI.
Abandoning a half-finished form can strand a file, so orphans are swept at
launch instead of being tracked through every exit path. `File.copy()` is
**synchronous** in SDK 54.

## Conventions

- `@/` maps to `src/`. Routes live under `src/app` (`transform.routerRoot`),
  not the repo root.
- Files are kebab-case; components are PascalCase within them.
- Comments explain *why* — a constraint, a workaround, a non-obvious ordering.
  Don't add comments that restate the code.
- Two eslint rules have shaped code here and will again: `exhaustive-deps`
  requires literal dependency arrays, and setting state inside an effect is
  rejected (hence the local-override map in `ingredients.tsx` rather than
  mirroring query results into state).

## Design canvas

`design/` holds `.dc.html` artboards plus `canvas.json`; they are the design
source of truth and are seeded into a published Claude Design canvas. When a
screen's design changes, update the matching artboard, re-seed with the design
skill's `seed-canvas.mjs`, and republish to the **same** artifact URL. Don't
edit the seeded `easyrecipes-app-design.html` directly — it is regenerated.
